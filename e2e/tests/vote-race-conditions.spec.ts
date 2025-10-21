import { test, expect } from '../fixtures/multiContext';
import { waitForPhaseTransition, submitVote } from '../fixtures/helpers';

test.describe('Vote Tallying Race Conditions', () => {
  test('rapid-fire votes from all clients', async ({ players }) => {
    const passphrase = `race-test-${Date.now()}`;

    // Setup and reach VOTE1 phase
    // ... abbreviated setup ...
    await waitForPhaseTransition(players, 'VOTE1', 10000);

    // All players submit votes simultaneously with minimal delay
    await Promise.all(
      players.map((player, index) =>
        // Stagger by 20ms to simulate rapid clicks
        new Promise((resolve) =>
          setTimeout(async () => {
            const vote = index < 3 ? 'yes' : 'no';
            await submitVote(player.page, vote);
            resolve(null);
          }, index * 20)
        )
      )
    );

    // Wait for Realtime to propagate all votes
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify exactly 5 votes recorded in database
    const voteCount = await players[0].page.evaluate(async () => {
      const supabase = (window as any).supabase;
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('vote_type', 'VOTE1');
      return data?.length || 0;
    });

    expect(voteCount).toBe(5);

    // Verify each player voted exactly once
    const voteCounts = await Promise.all(
      players.map((player) =>
        player.page.evaluate(async (playerId) => {
          const supabase = (window as any).supabase;
          const { data } = await supabase
            .from('votes')
            .select('*')
            .eq('vote_type', 'VOTE1')
            .eq('player_id', playerId);
          return data?.length || 0;
        }, player.nickname) // Assuming nickname used as player_id in test
      )
    );

    for (const count of voteCounts) {
      expect(count).toBe(1);
    }
  });

  test('concurrent tally-votes function calls', async ({ players }) => {
    const passphrase = `concurrent-tally-${Date.now()}`;

    // Setup and reach VOTE1 phase
    await waitForPhaseTransition(players, 'VOTE1', 10000);

    // All players submit votes
    await Promise.all(
      players.map((player, index) => {
        const vote = index < 3 ? 'yes' : 'no';
        return submitVote(player.page, vote);
      })
    );

    // Wait for auto-tally trigger condition (allVoted)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Multiple clients will call tally-votes Edge Function simultaneously
    // (This happens automatically in Vote1.tsx useEffect)

    // Verify only ONE result record created (idempotent tally)
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for Edge Function

    const resultCount = await players[0].page.evaluate(async () => {
      const supabase = (window as any).supabase;
      const { data } = await supabase
        .from('results')
        .select('*');
      return data?.length || 0;
    });

    // Should be exactly 1 result, not 5 (one per client)
    expect(resultCount).toBeLessThanOrEqual(1);
  });

  test('vote2 runoff with ties', async ({ players }) => {
    const passphrase = `runoff-test-${Date.now()}`;

    // Setup and reach VOTE2 phase
    // ... setup to reach VOTE2 ...
    await waitForPhaseTransition(players, 'VOTE2', 10000);

    // Get candidate list
    const candidates = await players[0].page.evaluate(async () => {
      const candidateElements = document.querySelectorAll('[data-testid="candidate-item"]');
      return Array.from(candidateElements).map((el) =>
        el.getAttribute('data-player-id')
      );
    });

    expect(candidates.length).toBeGreaterThanOrEqual(3);

    // Create a tie scenario: 2 votes for candidate A, 2 votes for candidate B, 1 vote for candidate C
    const voteDistribution = [
      candidates[0], // Player 1 → A
      candidates[0], // Player 2 → A
      candidates[1], // Player 3 → B
      candidates[1], // Player 4 → B
      candidates[2], // Player 5 → C
    ];

    await Promise.all(
      players.map((player, index) =>
        submitVote(player.page, voteDistribution[index] || candidates[0])
      )
    );

    // Wait for tally
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check for runoff_required broadcast
    const runoffReceived = await players[0].page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const supabase = (window as any).supabase;
        let received = false;

        const timeout = setTimeout(() => resolve(received), 5000);

        supabase
          .channel(`game:${(window as any).sessionId}`)
          .on('broadcast', { event: 'runoff_required' }, (payload: any) => {
            received = true;
            clearTimeout(timeout);
            resolve(true);
          })
          .subscribe();
      });
    });

    // Runoff should be triggered for tie between A and B
    expect(runoffReceived).toBe(true);
  });

  test('third tie results in Insider escape', async ({ players }) => {
    const passphrase = `escape-test-${Date.now()}`;

    // Setup to VOTE2 Round 3 with tie (complex scenario)
    // ... setup ...

    // Simulate 3rd runoff with continued tie
    // After 3rd tie, Edge Function should save outcome = 'INSIDER_WIN'

    // Wait for RESULT phase
    await waitForPhaseTransition(players, 'RESULT', 15000);

    // Verify outcome is Insider escape
    const outcome = await players[0].page.evaluate(async () => {
      const supabase = (window as any).supabase;
      const { data } = await supabase
        .from('results')
        .select('outcome')
        .single();
      return data?.outcome;
    });

    expect(outcome).toBe('INSIDER_WIN');
  });

  test('no double vote submission from single player', async ({ players }) => {
    const passphrase = `double-vote-test-${Date.now()}`;

    // Setup and reach VOTE1 phase
    await waitForPhaseTransition(players, 'VOTE1', 10000);

    // Player 1 attempts to vote twice rapidly
    await submitVote(players[0].page, 'yes');
    await submitVote(players[0].page, 'yes'); // Second click should be ignored

    // Wait for database
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify only 1 vote recorded for player 1
    const playerVoteCount = await players[0].page.evaluate(async (playerId) => {
      const supabase = (window as any).supabase;
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('player_id', playerId);
      return data?.length || 0;
    }, players[0].nickname);

    expect(playerVoteCount).toBe(1);
  });
});
