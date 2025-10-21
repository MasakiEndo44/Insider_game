import { test as base, Browser, BrowserContext, Page } from '@playwright/test';

export type PlayerContext = {
  context: BrowserContext;
  page: Page;
  nickname: string;
  index: number;
};

export type MultiContextFixtures = {
  players: PlayerContext[];
  host: PlayerContext;
  peers: PlayerContext[];
};

/**
 * Multi-context fixture for testing simultaneous players
 *
 * Creates N isolated browser contexts that share no cookies/localStorage
 * Each context represents one player in the game
 *
 * Usage:
 * ```typescript
 * test('5 players join room', async ({ players, host, peers }) => {
 *   // host = players[0]
 *   // peers = players[1..4]
 * });
 * ```
 */
export const test = base.extend<MultiContextFixtures>({
  players: async ({ browser }, use) => {
    const NUM_PLAYERS = 5;
    const playerContexts: PlayerContext[] = [];

    // Create N isolated browser contexts
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const context = await browser.newContext({
        // Isolated storage
        storageState: undefined,
        // User-agent variation for realistic testing
        userAgent: `Player${i + 1}/${process.env.npm_package_version || '1.0.0'}`,
        // Viewport variation
        viewport: i === 0
          ? { width: 390, height: 844 } // iPhone 12 Pro (host)
          : { width: 393, height: 851 }, // Pixel 5 (peers)
      });

      const page = await context.newPage();

      playerContexts.push({
        context,
        page,
        nickname: `Player${i + 1}`,
        index: i,
      });
    }

    await use(playerContexts);

    // Cleanup
    for (const player of playerContexts) {
      await player.context.close();
    }
  },

  host: async ({ players }, use) => {
    await use(players[0]);
  },

  peers: async ({ players }, use) => {
    await use(players.slice(1));
  },
});

export { expect } from '@playwright/test';
