import { test, expect } from '@playwright/test';

test.describe('Simple Join Test', () => {
    test('Host creates room and Player 2 joins', async ({ browser }) => {
        // Create 2 contexts
        const hostContext = await browser.newContext();
        const player2Context = await browser.newContext();

        const hostPage = await hostContext.newPage();
        const player2Page = await player2Context.newPage();

        // 1. Host creates room
        console.log('=== HOST: Creating room ===');
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: 'PLAY' }).click();

        const uniquePassphrase = `testroom-${Date.now()}`;
        console.log(`=== Using passphrase: ${uniquePassphrase} ===`);

        await hostPage.getByLabel('合言葉').fill(uniquePassphrase);
        await hostPage.getByLabel('プレイヤー名').fill('Host');
        await hostPage.getByRole('button', { name: 'ルームを作る' }).click();

        // Wait for lobby
        console.log('=== HOST: Waiting for lobby ===');
        await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
        await expect(hostPage.getByText('Host')).toBeVisible();
        console.log('=== HOST: Successfully in lobby ===');

        // 2. Player 2 joins
        console.log('=== PLAYER 2: Joining room ===');
        await player2Page.goto('/');
        await player2Page.getByRole('button', { name: 'ルームに参加する' }).click();
        await player2Page.getByLabel('合言葉').fill(uniquePassphrase);
        await player2Page.getByLabel('プレイヤー名').fill('Player2');

        console.log('=== PLAYER 2: Clicking join button ===');
        await player2Page.getByRole('button', { name: '参加する' }).click();

        // Check for error toast
        await player2Page.waitForTimeout(2000);
        const toast = player2Page.locator('[data-sonner-toast]');
        if (await toast.isVisible()) {
            const text = await toast.innerText();
            console.log(`=== PLAYER 2: Error toast visible: ${text} ===`);
        } else {
            console.log('=== PLAYER 2: No error toast ===');
        }

        // Check current URL
        const currentUrl = player2Page.url();
        console.log(`=== PLAYER 2: Current URL: ${currentUrl} ===`);

        // Verify Player 2 in lobby
        console.log('=== PLAYER 2: Waiting for lobby ===');
        await expect(player2Page).toHaveURL(/\/lobby/, { timeout: 15000 });

        // Wait for Realtime synchronization - Player2 should appear on Host's page
        console.log('=== HOST: Waiting for Player2 to appear via Realtime ===');
        await expect(hostPage.getByText('Player2')).toBeVisible({ timeout: 10000 });

        // Wait for Host to appear on Player2's page
        console.log('=== PLAYER 2: Waiting for Host to appear ===');
        await expect(player2Page.getByText('Host')).toBeVisible({ timeout: 10000 });

        console.log('=== PLAYER 2: Successfully in lobby ===');

        console.log('=== TEST PASSED ===');
    });
});
