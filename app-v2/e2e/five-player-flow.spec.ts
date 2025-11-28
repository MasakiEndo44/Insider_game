import { test, expect } from '@playwright/test';
import {
    createRoom,
    joinRoom,
    waitForPhase,
    generateUniquePassphrase,
    waitForRealtimeSync,
    waitForAllPlayersInPhase,
} from './helpers/game-helpers';

test.describe('5-Player Game Flow', () => {
    test.setTimeout(180000); // 3 minutes

    test('5 Players can start game and transition to Role Assignment', async ({ browser }) => {
        // Create 5 browser contexts
        const contexts = await Promise.all([
            browser.newContext(),
            browser.newContext(),
            browser.newContext(),
            browser.newContext(),
            browser.newContext(),
        ]);

        const pages = await Promise.all(contexts.map(c => c.newPage()));
        const [page1, page2, page3, page4, page5] = pages;

        const passphrase = generateUniquePassphrase('5p-test');

        try {
            console.log('=== Setup: Creating room with 5 players ===');

            // Player 1 creates room
            await createRoom(page1, passphrase, 'Player1');

            // Players 2-5 join
            // Join other players
            await joinRoom(page2, passphrase, 'Player2');
            await page2.waitForTimeout(3000); // Add delay to avoid rate limiting
            await joinRoom(page3, passphrase, 'Player3');
            await page3.waitForTimeout(3000);
            await joinRoom(page4, passphrase, 'Player4');
            await page4.waitForTimeout(3000);
            await joinRoom(page5, passphrase, 'Player5');
            await page5.waitForTimeout(3000);

            await waitForRealtimeSync(5000); // Increased wait time for 5 players

            // Verify all players are visible in lobby with longer timeout
            console.log('=== Verification: Checking all players are in lobby ===');
            await expect(page1.getByText('Player1')).toBeVisible({ timeout: 10000 });
            await expect(page1.getByText('Player2')).toBeVisible({ timeout: 10000 });
            await expect(page1.getByText('Player3')).toBeVisible({ timeout: 10000 });
            await expect(page1.getByText('Player4')).toBeVisible({ timeout: 10000 });
            await expect(page1.getByText('Player5')).toBeVisible({ timeout: 10000 });

            // Start Game
            console.log('=== Action: Starting Game ===');
            const startBtn = page1.getByRole('button', { name: 'ゲームを開始する' }).first();
            await expect(startBtn).toBeEnabled({ timeout: 10000 });
            await startBtn.click();

            // Verify transition to ROLE_ASSIGNMENT
            console.log('=== Verification: Waiting for Role Assignment ===');
            await waitForAllPlayersInPhase(pages, 'ROLE_ASSIGNMENT', 30000);

            // Verify roles are assigned
            // Check for role confirmation button instead of role text
            console.log('=== Verification: Checking roles are assigned ===');

            // Wait a bit for roles to load via realtime
            await waitForRealtimeSync(5000);

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                console.log(`Checking Player${i + 1} has role assigned...`);

                // Take screenshot for debugging
                await page.screenshot({ path: `test-results/player${i + 1}-role-assignment.png` });

                // First check if we're still loading
                const loadingText = page.getByText('読み込み中');
                const isLoading = await loadingText.isVisible().catch(() => false);

                if (isLoading) {
                    console.log(`Player${i + 1} is still loading roles, waiting...`);
                    // Wait for loading to finish
                    await expect(loadingText).not.toBeVisible({ timeout: 30000 });
                }

                // Look for the confirmation button which indicates role was assigned
                const confirmBtn = page.getByRole('button', { name: /確認しました/ });
                await expect(confirmBtn).toBeVisible({ timeout: 15000 });
                console.log(`Player${i + 1} role confirmed!`);
            }

            console.log('=== Success: All players transitioned to Role Assignment ===');

            // Optional: Continue to Topic phase to ensure full stability
            console.log('=== Action: Confirming Roles ===');
            for (const page of pages) {
                const confirmBtn = page.getByRole('button', { name: /確認しました/ });
                if (await confirmBtn.isVisible()) {
                    await confirmBtn.click();
                }
            }

            await waitForRealtimeSync(3000);
            await waitForAllPlayersInPhase(pages, 'TOPIC', 30000);
            console.log('=== Success: All players transitioned to Topic ===');

        } finally {
            await Promise.all(contexts.map(c => c.close()));
        }
    });
});
