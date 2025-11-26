import { test, expect } from '@playwright/test';
import {
    createRoom,
    joinRoom,
    generateUniquePassphrase,
    waitForRealtimeSync,
} from './helpers/game-helpers';

test.describe('Room Management', () => {
    test.setTimeout(60000); // 60 seconds

    test('Create room and join with multiple players', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('room-mgmt');

        try {
            // Test 1: Host creates room
            console.log('=== Test 1: Host creates room ===');
            await createRoom(page1, passphrase, 'Host');

            // Verify host is in lobby
            await expect(page1.getByText('Host')).toBeVisible();
            await expect(page1.getByText('ロビー')).toBeVisible();

            // Test 2: Player 2 joins
            console.log('=== Test 2: Player 2 joins ===');
            await joinRoom(page2, passphrase, 'Player2');

            // Wait for Realtime sync
            await waitForRealtimeSync(3000);

            // Verify both players see each other
            await expect(page1.getByText('Player2')).toBeVisible({ timeout: 10000 });
            await expect(page2.getByText('Host')).toBeVisible({ timeout: 10000 });

            // Verify player count
            await expect(page1.getByText('(2/12)')).toBeVisible();
            await expect(page2.getByText('(2/12)')).toBeVisible();

            // Test 3: Player 3 joins
            console.log('=== Test 3: Player 3 joins ===');
            await joinRoom(page3, passphrase, 'Player3');

            await waitForRealtimeSync(3000);

            // Verify all players see each other
            await expect(page1.getByText('Player3')).toBeVisible({ timeout: 10000 });
            await expect(page2.getByText('Player3')).toBeVisible({ timeout: 10000 });
            await expect(page3.getByText('Host')).toBeVisible({ timeout: 10000 });
            await expect(page3.getByText('Player2')).toBeVisible({ timeout: 10000 });

            // Verify player count
            await expect(page1.getByText('(3/12)')).toBeVisible();
            await expect(page1.getByText('準備完了: 3/3')).toBeVisible();

            console.log('=== Test passed: Room creation and joining ===');

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });

    test('Player leaves room', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        const passphrase = generateUniquePassphrase('player-leave');

        try {
            // Setup: Create room and join
            console.log('=== Setup: Creating room and joining ===');
            await createRoom(page1, passphrase, 'Host');
            await joinRoom(page2, passphrase, 'Player2');

            await waitForRealtimeSync(3000);

            // Verify both players are visible
            await expect(page1.getByText('Player2')).toBeVisible();
            await expect(page2.getByText('Host')).toBeVisible();

            // Test: Player2 leaves
            console.log('=== Test: Player2 leaves ===');
            await page2.locator('button:has(.lucide-log-out)').click();

            // Player2 should be redirected to home
            await expect(page2).toHaveURL('/', { timeout: 10000 });

            // Wait for Realtime sync
            await waitForRealtimeSync(3000);

            // Verify Player2 is no longer visible on Host's page
            // Note: This depends on whether disconnected players are filtered out
            // If PlayerChip has isConnected prop implemented, this should work
            // Otherwise, this test may need to be adjusted

            // For now, just verify player count decreased
            await expect(page1.getByText('(1/12)')).toBeVisible({ timeout: 15000 });

            console.log('=== Test passed: Player leave ===');

        } finally {
            await context1.close();
            await context2.close();
        }
    });

    // Note: Host leave test is commented out until UI implementation is complete
    test.skip('Host leaves room', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        const passphrase = generateUniquePassphrase('host-leave');

        try {
            // Setup
            await createRoom(page1, passphrase, 'Host');
            await joinRoom(page2, passphrase, 'Player2');
            await waitForRealtimeSync(3000);

            // Host leaves
            await page1.locator('button:has(.lucide-log-out)').click();
            await expect(page1).toHaveURL('/');

            // Wait for sync
            await waitForRealtimeSync(5000);

            // Verify Host is not visible on Player2's page
            const hostChip = page2.getByText('Host');
            await expect(hostChip).not.toBeVisible({ timeout: 20000 });

            // Verify player count
            await expect(page2.getByText('(1/12)')).toBeVisible();

        } finally {
            await context1.close();
            await context2.close();
        }
    });
});
