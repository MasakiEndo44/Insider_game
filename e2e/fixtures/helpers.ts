import { Page, expect } from '@playwright/test';
import { PlayerContext } from './multiContext';

/**
 * Wait for all players to receive a specific Realtime broadcast
 *
 * @param players - Array of player contexts
 * @param channel - Supabase channel name (e.g., 'game:session-id')
 * @param event - Event name (e.g., 'phase_update')
 * @param predicate - Function to verify payload (returns true if match)
 * @param timeout - Max wait time in ms (default: 5000)
 */
export async function expectSync(
  players: PlayerContext[],
  channel: string,
  event: string,
  predicate: (payload: any) => boolean,
  timeout = 5000
): Promise<void> {
  const promises = players.map((player) =>
    player.page.evaluate(
      ({ channel, event, predicate, timeout }) => {
        return new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for ${event} on ${channel}`));
          }, timeout);

          // Access Supabase client from window (assumed to be available)
          const supabase = (window as any).supabase;
          if (!supabase) {
            clearTimeout(timer);
            reject(new Error('Supabase client not found on window'));
            return;
          }

          const subscription = supabase
            .channel(channel)
            .on('broadcast', { event }, (payload: any) => {
              // Note: predicate is serialized, cannot use closures
              const predicateFn = new Function('payload', `return ${predicate.toString()}`);
              if (predicateFn(payload.payload)) {
                clearTimeout(timer);
                subscription.unsubscribe();
                resolve();
              }
            })
            .subscribe();
        });
      },
      { channel, event, predicate: predicate.toString(), timeout }
    )
  );

  await Promise.all(promises);
}

/**
 * Wait for element to appear on all player pages
 *
 * @param players - Array of player contexts
 * @param selector - CSS selector or test ID
 * @param timeout - Max wait time in ms (default: 5000)
 */
export async function waitForAllPlayers(
  players: PlayerContext[],
  selector: string,
  timeout = 5000
): Promise<void> {
  const promises = players.map((player) =>
    player.page.waitForSelector(selector, { timeout })
  );

  await Promise.all(promises);
}

/**
 * Inject fake timers into page for deterministic time testing
 *
 * @param page - Playwright page
 * @param initialTime - Initial timestamp in ms (default: 0)
 */
export async function injectFakeTimers(
  page: Page,
  initialTime = 0
): Promise<void> {
  await page.addInitScript((initialTime) => {
    let currentTime = initialTime;

    // Override Date
    const OriginalDate = Date;
    (window as any).Date = class extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(currentTime);
        } else {
          super(...args);
        }
      }

      static now() {
        return currentTime;
      }
    };

    // Override Performance
    const originalPerformanceNow = performance.now;
    performance.now = () => currentTime;

    // Expose time control
    (window as any).__advanceTime = (ms: number) => {
      currentTime += ms;
    };

    (window as any).__setTime = (time: number) => {
      currentTime = time;
    };

    (window as any).__getCurrentTime = () => currentTime;
  }, initialTime);
}

/**
 * Advance fake time on all player pages simultaneously
 *
 * @param players - Array of player contexts
 * @param ms - Milliseconds to advance
 */
export async function advanceTimeForAll(
  players: PlayerContext[],
  ms: number
): Promise<void> {
  await Promise.all(
    players.map((player) =>
      player.page.evaluate((ms) => {
        (window as any).__advanceTime(ms);
      }, ms)
    )
  );
}

/**
 * Get current displayed time from countdown timer
 *
 * @param page - Playwright page
 * @param selector - Timer element selector (default: '[data-testid="countdown-timer"]')
 * @returns Displayed time in seconds
 */
export async function getDisplayedTime(
  page: Page,
  selector = '[data-testid="countdown-timer"]'
): Promise<number> {
  const text = await page.locator(selector).textContent();
  if (!text) return 0;

  // Parse "MM:SS" format
  const [minutes, seconds] = text.split(':').map(Number);
  return minutes * 60 + seconds;
}

/**
 * Submit vote for a player
 *
 * @param page - Player's page
 * @param voteValue - Vote value (e.g., 'yes', 'no', or player ID)
 */
export async function submitVote(
  page: Page,
  voteValue: string
): Promise<void> {
  await page.click(`button[data-vote="${voteValue}"]`);
}

/**
 * Wait for phase transition on all players
 *
 * @param players - Array of player contexts
 * @param expectedPhase - Expected phase name (e.g., 'QUESTION', 'VOTE1')
 * @param timeout - Max wait time in ms (default: 10000)
 */
export async function waitForPhaseTransition(
  players: PlayerContext[],
  expectedPhase: string,
  timeout = 10000
): Promise<void> {
  await Promise.all(
    players.map((player) =>
      player.page.waitForSelector(
        `[data-testid="phase-${expectedPhase}"]`,
        { timeout }
      )
    )
  );
}
