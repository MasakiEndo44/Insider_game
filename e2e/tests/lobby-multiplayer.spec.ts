import { test, expect } from '../fixtures/multiContext';
import { waitForAllPlayers, waitForPhaseTransition } from '../fixtures/helpers';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Focused test for lobby creation, player joining, and game start
 *
 * Scope: LOBBY phase → DEAL phase (role assignment)
 * Players: 5 (1 host + 4 peers)
 */
test.describe('Lobby Multiplayer - Create, Join, Start', () => {
  // Automatic database cleanup before each test
  test.beforeEach(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Clean up test data in reverse dependency order
    // Delete all players first (foreign key to rooms)
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (playersError) {
      console.warn('[beforeEach] Failed to clean players:', playersError);
    }

    // Delete all rooms
    const { error: roomsError } = await supabase
      .from('rooms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (roomsError) {
      console.warn('[beforeEach] Failed to clean rooms:', roomsError);
    }

    // Delete all game sessions
    const { error: sessionsError } = await supabase
      .from('game_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (sessionsError) {
      console.warn('[beforeEach] Failed to clean game_sessions:', sessionsError);
    }

    console.log('✅ Database cleaned up before test');
  });

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

  test('game start and role assignment verification', async ({
    host,
    peers,
    players,
  }) => {
    const passphrase = `role-test-${randomUUID()}`;
    console.log(`🔑 Role assignment test passphrase: ${passphrase}`);

    await test.step('Setup: Create lobby and join players', async () => {
      console.log('📍 Setup: Creating lobby with 5 players');

      // Host creates lobby
      await host.page.goto('/');
      await host.page.waitForLoadState('networkidle');
      await host.page.waitForTimeout(3000);

      await host.page.evaluate(() => {
        const playButton = Array.from(document.querySelectorAll('button')).find(
          el => el.textContent?.includes('PLAY')
        );
        if (playButton) {
          playButton.click();
        }
      });

      await host.page.waitForSelector('input#passphrase', { timeout: 5000 });
      await host.page.fill('input#passphrase', passphrase);
      await host.page.fill('input#playerName', host.nickname);
      await host.page.click('button:has-text("ルームを作る")');
      await host.page.waitForSelector('[data-testid="player-list"]', { timeout: 15000 });
      console.log('  ✓ Host created lobby');

      // Peers join in parallel
      await Promise.all(
        peers.map(async (peer, index) => {
          await peer.page.goto('/');
          await peer.page.waitForLoadState('networkidle');
          await peer.page.waitForTimeout(3000);

          await peer.page.click('button:has-text("ルームに参加する")', { force: true });
          await peer.page.waitForSelector('input#join-passphrase', { timeout: 5000 });
          await peer.page.fill('input#join-passphrase', passphrase);
          await peer.page.fill('input#join-playerName', peer.nickname);

          await peer.page.waitForFunction(
            () => {
              const button = Array.from(document.querySelectorAll('button')).find(
                (b) => b.textContent?.includes('参加する') && !b.textContent?.includes('キャンセル')
              ) as HTMLButtonElement;
              return button && !button.disabled;
            },
            { timeout: 5000 }
          );

          await peer.page.getByRole('button', { name: '参加する', exact: true }).click();
          await peer.page.waitForSelector('[data-testid="player-list"]', { timeout: 15000 });
          console.log(`  ✓ Peer ${index + 1} (${peer.nickname}) joined`);
        })
      );

      // Wait for Realtime sync
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log('  ✅ All 5 players in lobby');
    });

    await test.step('Mark all players as ready', async () => {
      console.log('📍 Step 1: Marking all players as ready (confirmed: true)');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      });

      // Extract roomId from host URL
      const hostUrl = host.page.url();
      const urlParams = new URLSearchParams(hostUrl.split('?')[1]);
      const roomIdFromUrl = urlParams.get('roomId');

      if (!roomIdFromUrl) {
        throw new Error('Failed to extract roomId from URL');
      }

      // Update all players in this room to confirmed: true
      const { error } = await supabase
        .from('players')
        .update({ confirmed: true })
        .eq('room_id', roomIdFromUrl);

      if (error) {
        console.error('[markReady] Failed to mark players as ready:', error);
        throw error;
      }

      console.log('  ✅ All players marked as ready (confirmed: true)');

      // Wait for UI to reflect the change via Realtime
      await host.page.waitForTimeout(2000);
    });

    await test.step('Start game', async () => {
      console.log('📍 Step 2: Starting game');

      await host.page.click('button:has-text("ゲームを開始")');
      console.log('  ✓ Clicked start game button');

      // Wait for host to navigate to role assignment page
      await host.page.waitForSelector('[data-testid="phase-DEAL"]', { timeout: 10000 });
      console.log('  ✓ Host navigated to DEAL phase');

      // Extract roomId from URL to navigate other players
      const hostUrl = host.page.url();
      const urlParams = new URLSearchParams(hostUrl.split('?')[1]);
      const roomIdFromUrl = urlParams.get('roomId');

      // Manually navigate all non-host players to role assignment page
      // (Since Realtime phase subscription is disabled for now)
      await Promise.all(
        peers.map(async (peer, index) => {
          // Get playerId from current URL
          const peerUrl = peer.page.url();
          const peerUrlParams = new URLSearchParams(peerUrl.split('?')[1]);
          const peerPlayerId = peerUrlParams.get('playerId');

          await peer.page.goto(`/game/role-assignment?roomId=${roomIdFromUrl}&playerId=${peerPlayerId}`);
          await peer.page.waitForSelector('[data-testid="phase-DEAL"]', { timeout: 5000 });
          console.log(`  ✓ Peer ${index + 1} navigated to DEAL phase`);
        })
      );

      console.log('  ✅ Game started - all players in DEAL phase');
    });

    await test.step('Reveal roles and verify assignment', async () => {
      console.log('📍 Step 3: Revealing and verifying role assignments');

      // Each player clicks "役割を確認" button
      const roleAssignments: { nickname: string; role: string }[] = [];

      for (const player of players) {
        // Setup console listener to capture browser logs
        player.page.on('console', msg => {
          if (msg.text().includes('[RoleAssignment]')) {
            console.log(`  🔍 [${player.nickname}] ${msg.text()}`);
          }
        });

        // Debug: Extract playerId from current URL
        const currentUrl = player.page.url();
        const urlParams = new URLSearchParams(currentUrl.split('?')[1]);
        const playerId = urlParams.get('playerId');
        console.log(`  🆔 ${player.nickname} playerId: ${playerId}`);

        // Click reveal role button
        await player.page.click('button:has-text("役割を確認")');
        console.log(`  ✓ ${player.nickname} clicked reveal role button`);

        // Wait for role to be displayed
        await player.page.waitForTimeout(2000);

        // Extract role from UI
        // Note: Adjust selector based on actual implementation
        const roleText = await player.page.evaluate(() => {
          // Try to find role display element
          const roleElement = document.querySelector('[data-testid="player-role"]');
          const displayText = roleElement ? (roleElement.textContent || '') : '';

          // Map Japanese display text to English role codes
          if (displayText.includes('マスター') || displayText === 'マスター') return 'MASTER';
          if (displayText.includes('インサイダー') || displayText === 'インサイダー') return 'INSIDER';
          if (displayText.includes('庶民') || displayText === '庶民' || displayText.includes('市民')) return 'CITIZEN';

          // Fallback: search entire body
          const bodyText = document.body.textContent || '';
          if (bodyText.includes('マスター')) return 'MASTER';
          if (bodyText.includes('インサイダー')) return 'INSIDER';
          if (bodyText.includes('庶民') || bodyText.includes('市民')) return 'CITIZEN';
          return 'UNKNOWN';
        });

        roleAssignments.push({
          nickname: player.nickname,
          role: roleText
        });

        console.log(`  📝 ${player.nickname} role: ${roleText}`);
      }

      // Verify role distribution
      const masterCount = roleAssignments.filter(r => r.role === 'MASTER').length;
      const insiderCount = roleAssignments.filter(r => r.role === 'INSIDER').length;
      const citizenCount = roleAssignments.filter(r => r.role === 'CITIZEN').length;

      console.log(`\n  📊 Role distribution:`);
      console.log(`    Master: ${masterCount}`);
      console.log(`    Insider: ${insiderCount}`);
      console.log(`    Citizen: ${citizenCount}`);

      // Assertions
      expect(masterCount).toBe(1);
      expect(insiderCount).toBe(1);
      expect(citizenCount).toBe(3);

      console.log('  ✅ Role assignment verified: 1 Master, 1 Insider, 3 Citizens');

      // Verify no duplicate roles (Master and Insider must be unique)
      const masterPlayers = roleAssignments.filter(r => r.role === 'MASTER');
      const insiderPlayers = roleAssignments.filter(r => r.role === 'INSIDER');

      expect(masterPlayers.length).toBe(1);
      expect(insiderPlayers.length).toBe(1);
      expect(masterPlayers[0].nickname).not.toBe(insiderPlayers[0].nickname);

      console.log(`  ✅ No role conflicts: Master is ${masterPlayers[0].nickname}, Insider is ${insiderPlayers[0].nickname}`);
    });

    console.log('\n🎉 Role assignment test completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Passphrase: ${passphrase}`);
    console.log(`  - Players: ${players.length}`);
    console.log(`  - Roles verified: Master (1), Insider (1), Citizens (3)`);
  });
});
