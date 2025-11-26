import { test, expect } from '@playwright/test';

test.describe('Host Leave Behavior', () => {
    test.setTimeout(60000);
    test('Host leaves the room and Player 2 observes', async ({ browser }) => {
        // Create contexts for Host and Player 2
        const hostContext = await browser.newContext();
        const player2Context = await browser.newContext();

        const hostPage = await hostContext.newPage();
        const player2Page = await player2Context.newPage();

        // 1. Host creates room
        await hostPage.goto('/', { waitUntil: 'domcontentloaded' });
        await hostPage.waitForSelector('button:has-text("PLAY")', { state: 'visible', timeout: 10000 });
        await hostPage.waitForTimeout(1000);

        await hostPage.locator('button:has-text("PLAY")').click();

        const passphraseInput = hostPage.getByLabel('合言葉');
        await expect(passphraseInput).toBeVisible({ timeout: 10000 });

        const uniquePassphrase = `leave-test-${Date.now()}`;
        await passphraseInput.fill(uniquePassphrase);
        await hostPage.getByLabel('プレイヤー名').fill('Host');
        await hostPage.getByRole('button', { name: 'ルームを作る' }).click();

        await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
        await expect(hostPage.getByText('Host')).toBeVisible();

        // 2. Player 2 joins
        await player2Page.goto('/');
        await player2Page.getByRole('button', { name: 'ルームに参加する' }).click();
        await player2Page.getByLabel('合言葉').fill(uniquePassphrase);
        await player2Page.getByLabel('プレイヤー名').fill('Player2');
        await player2Page.getByRole('button', { name: '参加する' }).click();

        await expect(player2Page).toHaveURL(/\/lobby/, { timeout: 15000 });

        // Wait for sync
        await expect(hostPage.getByText('Player2')).toBeVisible({ timeout: 15000 });
        await expect(player2Page.getByText('Host')).toBeVisible({ timeout: 15000 });

        // 3. Host leaves
        // There is a leave button (LogOut icon) in the header
        await hostPage.locator('button:has(.lucide-log-out)').click();

        // Host should be redirected to home
        await expect(hostPage).toHaveURL('/');

        // 4. Verify Player 2's view
        // Wait for realtime update - host should disappear from the list
        const hostChip = player2Page.getByText('Host');
        await expect(hostChip).not.toBeVisible({ timeout: 20000 });

        // Verify player count decreased to 1
        await expect(player2Page.getByText('(1/12)')).toBeVisible();

        // Take a screenshot to visually verify
        await player2Page.screenshot({ path: 'test-results/host-left-view.png' });
    });
});
