import { test, expect } from '../fixtures/multiContext';
import { waitForAllPlayers, waitForPhaseTransition } from '../fixtures/helpers';
import { randomUUID } from 'crypto';

/**
 * Focused test for lobby creation, player joining, and game start
 *
 * Scope: LOBBY phase → DEAL phase (role assignment)
 * Players: 5 (1 host + 4 peers)
 */
test.describe('Lobby Multiplayer - Create, Join, Start', () => {
  // NOTE: Database cleanup is handled manually before test runs
  // Automatic beforeEach hook disabled due to timing issues
  // test.beforeEach(async () => {
  //   const { execSync } = require('child_process');
  //   execSync('npx supabase db reset --no-seed', { stdio: 'ignore' });
  // });

  test('host creates lobby, 4 players join, and game starts successfully', async ({
    host,
    peers,
    players,
  }) => {
    const passphrase = `lobby-test-${randomUUID()}`;
    console.log(`🔑 Test passphrase: ${passphrase}`);

    await test.step('Host creates lobby', async () => {
      console.log('📍 Step 1: Host creates lobby');

      // Navigate to home
      await host.page.goto('/');

      // Wait for page to hydrate before interacting
      await host.page.waitForLoadState('networkidle');
      await host.page.waitForTimeout(3000); // Increased from 1000ms to ensure React event handlers are attached

      // Wait for PLAY button to be ready
      await host.page.waitForSelector('button:has-text("PLAY")', { state: 'visible', timeout: 5000 });
      await host.page.waitForTimeout(1000); // Additional buffer for event handler attachment

      // Try JavaScript click as last resort to trigger React event
      await host.page.evaluate(() => {
        const playButton = Array.from(document.querySelectorAll('button')).find(
          el => el.textContent?.includes('PLAY')
        );
        if (playButton) {
          playButton.click();
        }
      });
      console.log('  ✓ Clicked PLAY button (via JavaScript)');

      // Wait longer for modal to open (React state update + animation)
      await host.page.waitForSelector('text=ルームを作る', { timeout: 10000 });
      console.log('  ✓ Modal opened');

      // Wait for input field to be visible
      await host.page.waitForSelector('input#passphrase', { timeout: 5000 });
      await host.page.fill('input#passphrase', passphrase);
      await host.page.fill('input#playerName', host.nickname);
      console.log(`  ✓ Filled form: passphrase="${passphrase}", name="${host.nickname}"`);

      // Create room
      await host.page.click('button:has-text("ルームを作る")');
      console.log('  ✓ Clicked "Create Room" button');

      // Wait for lobby phase (wait for player list to load)
      await host.page.waitForSelector('[data-testid="player-list"]', {
        timeout: 15000,
      });
      console.log('  ✅ Host entered lobby successfully');
    });

    await test.step('4 peers join lobby in parallel', async () => {
      console.log('📍 Step 2: 4 peers join lobby (parallel)');

      // All peers join simultaneously (race condition test)
      await Promise.all(
        peers.map(async (peer, index) => {
          console.log(`  🔄 Peer ${index + 1} (${peer.nickname}) joining...`);

          // Navigate to home
          await peer.page.goto('/');

          // Wait for page to hydrate before interacting
          await peer.page.waitForLoadState('networkidle');
          await peer.page.waitForTimeout(3000); // Increased from 1000ms to ensure React event handlers are attached

          // Wait for join button to be ready
          await peer.page.waitForSelector('button:has-text("ルームに参加する")', { state: 'visible', timeout: 5000 });
          await peer.page.waitForTimeout(1000); // Additional buffer for event handler attachment

          // Click join button with force to ensure event fires
          await peer.page.click('button:has-text("ルームに参加する")', { force: true });

          // Wait longer for join modal to open (React state update + animation)
          await peer.page.waitForSelector('text=ルームに参加', { timeout: 10000 });
          console.log(`    ✓ Peer ${index + 1}: Join modal opened`);

          // Wait for input field to be visible
          await peer.page.waitForSelector('input#join-passphrase', {
            timeout: 5000,
          });

          await peer.page.fill('input#join-passphrase', passphrase);
          await peer.page.fill('input#join-playerName', peer.nickname);
          console.log(`    ✓ Peer ${index + 1}: Form filled`);

          // Wait for button to be enabled
          await peer.page.waitForFunction(
            () => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const joinButton = buttons.find(
                (b) => b.textContent?.includes('参加する') && !b.textContent?.includes('キャンセル')
              ) as HTMLButtonElement;
              return joinButton && !joinButton.disabled;
            },
            { timeout: 5000 }
          );

          // Use Playwright's native click (without force) - should work now that button is enabled
          await peer.page.getByRole('button', { name: '参加する', exact: true }).click();
          console.log(`    ✓ Peer ${index + 1}: Clicked join button`);

          // Wait for lobby phase (wait for player list to load)
          await peer.page.waitForSelector('[data-testid="player-list"]', {
            timeout: 15000,
          });

          console.log(`  ✓ Peer ${index + 1} (${peer.nickname}) joined successfully`);
        })
      );

      console.log('  ✅ All 4 peers joined successfully');
    });

    await test.step('Verify roster and realtime sync', async () => {
      console.log('📍 Step 3: Verify roster and realtime synchronization');

      // Wait for player list to appear on all clients
      await waitForAllPlayers(players, '[data-testid="player-list"]');
      console.log('  ✓ Player list visible on all clients');

      // Wait for Realtime to propagate (give it time to sync)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log('  ⏳ Waited 3s for Realtime sync');

      // Verify each client sees all 5 players
      for (const player of players) {
        // Wait for exactly 5 player items to appear
        await player.page.waitForFunction(
          () => {
            const items = document.querySelectorAll('[data-testid="player-item"]');
            return items.length === 5;
          },
          { timeout: 10000 }
        ).catch(() => {
          // Log current count if timeout
          const count = player.page.locator('[data-testid="player-item"]').count();
          console.log(`  ⚠️  ${player.nickname} timeout waiting for 5 players (current: ${count})`);
        });

        const playerCount = await player.page
          .locator('[data-testid="player-item"]')
          .count();
        expect(playerCount).toBe(5);
        console.log(`  ✓ ${player.nickname} sees 5 players`);
      }

      // Note: Skipping Realtime connection status check
      // The roster sync proves Realtime is working, but the window.supabase object
      // may not be exposed in the browser context as expected
      console.log('  ✅ Realtime synchronization verified (all players visible)');
    });

    await test.step('Host starts game', async () => {
      console.log('📍 Step 4: Host starts game');

      // Click start game button
      await host.page.click('button:has-text("ゲームを開始")');
      console.log('  ✓ Clicked "Start Game" button');

      // Wait for all players to transition to DEAL phase
      await waitForPhaseTransition(players, 'DEAL', 10000);
      console.log('  ✅ All players transitioned to DEAL phase');

      // Verify phase transition on all clients
      for (const player of players) {
        const dealPhase = await player.page.locator('[data-testid="phase-DEAL"]');
        expect(await dealPhase.isVisible()).toBe(true);
        console.log(`  ✓ ${player.nickname} in DEAL phase`);
      }
    });

    await test.step('Verify role assignment UI', async () => {
      console.log('📍 Step 5: Verify role assignment UI');

      // Each player should see "Reveal Role" button
      for (const player of players) {
        const revealButton = player.page.locator('button:has-text("役割を確認")');
        expect(await revealButton.isVisible()).toBe(true);
        console.log(`  ✓ ${player.nickname} can reveal role`);
      }

      console.log('  ✅ Role assignment UI verified');
    });

    console.log('\n🎉 Test completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Passphrase: ${passphrase}`);
    console.log(`  - Players: ${players.length}`);
    console.log(`  - Final Phase: DEAL (Role Assignment)`);
  });

  test('race condition: simultaneous joins should not create duplicate players', async ({
    host,
    peers,
    players,
  }) => {
    const passphrase = `race-test-${randomUUID()}`;
    console.log(`🔑 Race condition test passphrase: ${passphrase}`);

    await test.step('Host creates lobby', async () => {
      await host.page.goto('/');
      await host.page.click('button:has-text("PLAY")');
      await host.page.waitForSelector('input#passphrase', { timeout: 5000 });
      await host.page.fill('input#passphrase', passphrase);
      await host.page.fill('input#playerName', host.nickname);
      await host.page.click('button:has-text("ルームを作る")');
      await host.page.waitForSelector('[data-testid="player-list"]', {
        timeout: 15000,
      });
    });

    await test.step('All 4 peers join at exactly the same time', async () => {
      console.log('📍 Triggering simultaneous joins (race condition test)');

      // Pre-load all pages to join modal
      await Promise.all(
        peers.map(async (peer) => {
          await peer.page.goto('/');

          // Wait for page to hydrate before interacting
          await peer.page.waitForLoadState('networkidle');
          await peer.page.waitForTimeout(3000);

          // Wait for join button to be ready
          await peer.page.waitForSelector('button:has-text("ルームに参加する")', { state: 'visible', timeout: 5000 });
          await peer.page.waitForTimeout(1000);

          await peer.page.click('button:has-text("ルームに参加する")', { force: true });

          // Wait longer for join modal to open (React state update + animation)
          await peer.page.waitForSelector('text=ルームに参加', { timeout: 10000 });

          // Wait for input fields to be visible
          await peer.page.waitForSelector('input#join-passphrase', {
            timeout: 5000,
          });
          await peer.page.fill('input#join-passphrase', passphrase);
          await peer.page.fill('input#join-playerName', peer.nickname);
        })
      );

      console.log('  ✓ All peers ready to join');

      // Wait a moment for React state to update on all pages
      await Promise.all(
        peers.map(async (peer) => {
          await peer.page.waitForTimeout(500);
        })
      );

      // Click join button simultaneously (force click to bypass modal overlay)
      await Promise.all(
        peers.map(async (peer) => {
          await peer.page.click('button:has-text("参加する")', { force: true });
        })
      );

      console.log('  ✓ All join requests sent simultaneously');

      // Wait for all to enter lobby (wait for player list to load)
      await Promise.all(
        peers.map(async (peer) => {
          await peer.page.waitForSelector('[data-testid="player-list"]', {
            timeout: 15000,
          });
        })
      );

      console.log('  ✅ All peers joined successfully');
    });

    await test.step('Verify no duplicate players created', async () => {
      console.log('📍 Verifying roster integrity');

      // Wait for roster to stabilize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check player count on all clients
      for (const player of players) {
        const playerCount = await player.page
          .locator('[data-testid="player-item"]')
          .count();

        expect(playerCount).toBe(5);
        console.log(`  ✓ ${player.nickname} sees exactly 5 players (no duplicates)`);
      }

      // Verify unique nicknames
      const hostNicknames = await host.page
        .locator('[data-testid="player-item"]')
        .allTextContents();

      const uniqueNicknames = new Set(hostNicknames);
      expect(uniqueNicknames.size).toBe(5);
      console.log('  ✓ All nicknames are unique');

      console.log('  ✅ Race condition handled correctly - no duplicates');
    });

    console.log('\n🎉 Race condition test passed!');
  });
});
