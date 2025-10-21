import { test, expect } from '../fixtures/multiContext';
import {
  injectFakeTimers,
  advanceTimeForAll,
  getDisplayedTime,
  waitForPhaseTransition,
} from '../fixtures/helpers';

test.describe('Timer Synchronization', () => {
  test('server deadline_epoch synchronizes across clients', async ({ players }) => {
    // Inject fake timers with different initial times (simulate clock drift)
    await injectFakeTimers(players[0].page, 1000000000); // Player 1: 1970-01-12
    await injectFakeTimers(players[1].page, 1000000500); // Player 2: +500ms
    await injectFakeTimers(players[2].page, 1000000200); // Player 3: +200ms
    await injectFakeTimers(players[3].page, 1000001000); // Player 4: +1000ms
    await injectFakeTimers(players[4].page, 999999800); // Player 5: -200ms

    // Create and join room (abbreviated setup)
    const passphrase = `timer-test-${Date.now()}`;
    await players[0].page.goto('/');
    // ... room creation flow ...

    // Start game and reach QUESTION phase
    // ... game flow ...

    // Server sends deadline_epoch = 1000300000 (300s from "real" server time)
    // Each client calculates: remaining = deadline_epoch - local_time

    // Verify all clients show approximately same remaining time
    // despite having different local clocks
    const times = await Promise.all(
      players.map((player) => getDisplayedTime(player.page))
    );

    // All times should be within ±1 second of each other
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    expect(maxTime - minTime).toBeLessThanOrEqual(1);
  });

  test('drift correction with server_offset', async ({ players }) => {
    // Inject fake timers
    await Promise.all(
      players.map((player) => injectFakeTimers(player.page, Date.now()))
    );

    // Create and join room
    const passphrase = `drift-test-${Date.now()}`;
    // ... setup ...

    // Start game
    await waitForPhaseTransition(players, 'QUESTION', 10000);

    // Get initial displayed times
    const initialTimes = await Promise.all(
      players.map((player) => getDisplayedTime(player.page))
    );

    // Advance time by 10 seconds on all clients simultaneously
    await advanceTimeForAll(players, 10000);

    // Wait for UI to update (React re-render)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get updated displayed times
    const updatedTimes = await Promise.all(
      players.map((player) => getDisplayedTime(player.page))
    );

    // Verify all timers decreased by ~10 seconds
    for (let i = 0; i < players.length; i++) {
      const delta = initialTimes[i] - updatedTimes[i];
      expect(delta).toBeGreaterThanOrEqual(9);
      expect(delta).toBeLessThanOrEqual(11);
    }

    // Verify all clients still synchronized (within ±1s)
    const maxTime = Math.max(...updatedTimes);
    const minTime = Math.min(...updatedTimes);
    expect(maxTime - minTime).toBeLessThanOrEqual(1);
  });

  test('timer accuracy under real time', async ({ players }) => {
    // Use real time (no fake timers)
    const passphrase = `real-time-test-${Date.now()}`;

    // Create and join room
    // ... setup ...

    // Start game and reach QUESTION phase
    await waitForPhaseTransition(players, 'QUESTION', 10000);

    // Record start time
    const startTime = Date.now();
    const initialTimes = await Promise.all(
      players.map((player) => getDisplayedTime(player.page))
    );

    // Wait 30 real seconds
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Record end time
    const endTime = Date.now();
    const elapsedRealTime = (endTime - startTime) / 1000; // seconds

    // Get updated times
    const updatedTimes = await Promise.all(
      players.map((player) => getDisplayedTime(player.page))
    );

    // Verify timers decreased by approximately elapsedRealTime
    for (let i = 0; i < players.length; i++) {
      const delta = initialTimes[i] - updatedTimes[i];
      expect(delta).toBeGreaterThanOrEqual(elapsedRealTime - 2); // ±2s tolerance
      expect(delta).toBeLessThanOrEqual(elapsedRealTime + 2);
    }
  });

  test('time inheritance from QUESTION to DEBATE', async ({ host, peers, players }) => {
    const passphrase = `inherit-test-${Date.now()}`;

    // Create and join room
    // ... setup ...

    // Start game and reach QUESTION phase
    await waitForPhaseTransition(players, 'QUESTION', 10000);

    // Wait 30 seconds
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Get QUESTION remaining time
    const questionTimeRemaining = await getDisplayedTime(host.page);

    // Master reports answer
    await host.page.selectOption('select[name="answerer"]', { index: 1 });
    await host.page.click('button:has-text("正解者を報告")');

    // Transition to DEBATE
    await waitForPhaseTransition(players, 'DEBATE', 10000);

    // Get DEBATE initial time
    const debateTimeRemaining = await getDisplayedTime(host.page);

    // DEBATE time should approximately equal QUESTION remaining time
    expect(debateTimeRemaining).toBeGreaterThanOrEqual(questionTimeRemaining - 2);
    expect(debateTimeRemaining).toBeLessThanOrEqual(questionTimeRemaining + 2);
  });
});
