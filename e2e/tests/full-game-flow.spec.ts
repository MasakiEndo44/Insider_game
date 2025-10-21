import { test, expect } from '../fixtures/multiContext';
import {
  waitForAllPlayers,
  waitForPhaseTransition,
  submitVote,
  getDisplayedTime,
} from '../fixtures/helpers';

test.describe('Full Game Flow - 5 Players', () => {
  test('complete game from lobby to result', async ({ host, peers, players }) => {
    const passphrase = `test-${Date.now()}`;

    // ═══════════════════════════════════════════════════════════════════
    // Phase 1: Room Creation & Joining
    // ═══════════════════════════════════════════════════════════════════

    // Host creates room
    await host.page.goto('/');
    await host.page.click('button:has-text("ルームを作成")');
    await host.page.fill('input[name="passphrase"]', passphrase);
    await host.page.fill('input[name="nickname"]', host.nickname);
    await host.page.click('button[type="submit"]');

    // Wait for host to enter lobby
    await host.page.waitForSelector('[data-testid="phase-LOBBY"]', {
      timeout: 10000,
    });

    // All peers join room in parallel
    await Promise.all(
      peers.map(async (peer) => {
        await peer.page.goto('/');
        await peer.page.click('button:has-text("ルームに参加")');
        await peer.page.fill('input[name="passphrase"]', passphrase);
        await peer.page.fill('input[name="nickname"]', peer.nickname);
        await peer.page.click('button[type="submit"]');

        // Wait for peer to enter lobby
        await peer.page.waitForSelector('[data-testid="phase-LOBBY"]', {
          timeout: 10000,
        });
      })
    );

    // Verify all players see all 5 participants
    await waitForAllPlayers(players, '[data-testid="player-list"]');
    for (const player of players) {
      const playerCount = await player.page.locator('[data-testid="player-item"]').count();
      expect(playerCount).toBe(5);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 2: Game Start & Role Assignment
    // ═══════════════════════════════════════════════════════════════════

    // Host starts game
    await host.page.click('button:has-text("ゲームを開始")');

    // Wait for all players to transition to DEAL phase
    await waitForPhaseTransition(players, 'DEAL', 10000);

    // Each player reveals their role
    for (const player of players) {
      await player.page.click('button:has-text("役割を確認")');
      await player.page.waitForSelector('[data-testid="revealed-role"]', {
        timeout: 5000,
      });
    }

    // Verify role distribution (1 Master, 1 Insider, 3 Citizens)
    let masterCount = 0;
    let insiderCount = 0;
    let citizenCount = 0;

    for (const player of players) {
      const roleText = await player.page.locator('[data-testid="revealed-role"]').textContent();
      if (roleText?.includes('マスター')) masterCount++;
      else if (roleText?.includes('インサイダー')) insiderCount++;
      else if (roleText?.includes('市民')) citizenCount++;
    }

    expect(masterCount).toBe(1);
    expect(insiderCount).toBe(1);
    expect(citizenCount).toBe(3);

    // Find Master player
    const masterPlayer = players.find(async (player) => {
      const roleText = await player.page.locator('[data-testid="revealed-role"]').textContent();
      return roleText?.includes('マスター');
    });

    // All players confirm role
    for (const player of players) {
      await player.page.click('button:has-text("確認")');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 3: Topic Confirmation
    // ═══════════════════════════════════════════════════════════════════

    // Wait for TOPIC phase
    await waitForPhaseTransition(players, 'TOPIC', 10000);

    // Master and Insider see topic, Citizens don't
    // Topic auto-hides after 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 11000));

    // All players should auto-transition to QUESTION after topic hide
    await waitForPhaseTransition(players, 'QUESTION', 5000);

    // ═══════════════════════════════════════════════════════════════════
    // Phase 4: Question Phase (5 minutes)
    // ═══════════════════════════════════════════════════════════════════

    // Verify timer displays 5:00
    for (const player of players) {
      const displayedTime = await getDisplayedTime(player.page);
      expect(displayedTime).toBeGreaterThanOrEqual(295); // Allow 5s variance
      expect(displayedTime).toBeLessThanOrEqual(300);
    }

    // Wait 30 seconds (simulate questioning)
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Verify timer decreased
    for (const player of players) {
      const displayedTime = await getDisplayedTime(player.page);
      expect(displayedTime).toBeGreaterThanOrEqual(265); // ~270s remaining
      expect(displayedTime).toBeLessThanOrEqual(275);
    }

    // Master reports correct answer (select first peer as answerer)
    if (masterPlayer) {
      const answererNickname = peers[0].nickname;
      await masterPlayer.page.selectOption(
        'select[name="answerer"]',
        { label: answererNickname }
      );
      await masterPlayer.page.click('button:has-text("正解者を報告")');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 5: Debate Phase (Inherited Time)
    // ═══════════════════════════════════════════════════════════════════

    // Wait for DEBATE phase
    await waitForPhaseTransition(players, 'DEBATE', 10000);

    // Verify time was inherited (~270s should remain)
    for (const player of players) {
      const displayedTime = await getDisplayedTime(player.page);
      expect(displayedTime).toBeGreaterThanOrEqual(265);
      expect(displayedTime).toBeLessThanOrEqual(275);
    }

    // Wait for debate to end naturally or skip to voting
    // For test speed, we'll trigger vote transition after 10s
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Host triggers transition to VOTE1
    await host.page.click('button:has-text("投票へ進む")');

    // ═══════════════════════════════════════════════════════════════════
    // Phase 6: Vote 1 - "Is answerer the Insider?"
    // ═══════════════════════════════════════════════════════════════════

    // Wait for VOTE1 phase
    await waitForPhaseTransition(players, 'VOTE1', 10000);

    // All players vote (3 "yes", 2 "no" for majority)
    for (let i = 0; i < players.length; i++) {
      const vote = i < 3 ? 'yes' : 'no';
      await submitVote(players[i].page, vote);
    }

    // Wait for votes to be submitted
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Auto-tally should trigger, transitioning to VOTE2 or RESULT
    // (Depends on whether answerer was actually Insider)

    // ═══════════════════════════════════════════════════════════════════
    // Phase 7: Vote 2 (if needed) - Select Insider
    // ═══════════════════════════════════════════════════════════════════

    // Check current phase
    const currentPhaseHost = await host.page
      .locator('[data-testid^="phase-"]')
      .getAttribute('data-testid');

    if (currentPhaseHost === 'phase-VOTE2') {
      // VOTE2 phase - select Insider from candidates
      // For test purposes, all players vote for the same candidate
      const firstCandidate = await host.page
        .locator('[data-testid="candidate-item"]')
        .first()
        .getAttribute('data-player-id');

      if (firstCandidate) {
        for (const player of players) {
          await submitVote(player.page, firstCandidate);
        }
      }

      // Wait for auto-tally
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 8: Result
    // ═══════════════════════════════════════════════════════════════════

    // Wait for RESULT phase
    await waitForPhaseTransition(players, 'RESULT', 15000);

    // Verify all players see result
    for (const player of players) {
      const outcomeElement = await player.page.locator('[data-testid="game-outcome"]');
      expect(await outcomeElement.isVisible()).toBe(true);

      const outcomeText = await outcomeElement.textContent();
      expect(outcomeText).toMatch(/(市民の勝利|インサイダーの勝利|全員敗北)/);
    }

    // Verify role reveals
    for (const player of players) {
      const revealedRoles = await player.page.locator('[data-testid="revealed-player-role"]').count();
      expect(revealedRoles).toBe(5); // All 5 roles revealed
    }

    // ═══════════════════════════════════════════════════════════════════
    // Test Complete
    // ═══════════════════════════════════════════════════════════════════
    console.log('✅ Full game flow test completed successfully');
  });
});
