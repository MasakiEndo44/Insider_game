import { test, expect, type Page } from '@playwright/test';

test.describe('Insider Game Flow', () => {
    // Extend timeout for full game flow test
    test.setTimeout(60000); // 60 seconds
    test('Complete game flow with 3 players', async ({ browser }) => {
        // Create 3 contexts for 3 players
        const hostContext = await browser.newContext();
        const player2Context = await browser.newContext();
        const player3Context = await browser.newContext();

        const hostPage = await hostContext.newPage();
        const player2Page = await player2Context.newPage();
        const player3Page = await player3Context.newPage();

        // 1. Host creates room
        await hostPage.goto('/', { waitUntil: 'domcontentloaded' });

        // Wait for the page to be interactive
        await hostPage.waitForSelector('button:has-text("PLAY")', { state: 'visible', timeout: 10000 });
        await hostPage.waitForTimeout(2000); // Extra wait for dev overlay

        // Click PLAY button
        const playButton = hostPage.locator('button:has-text("PLAY")');
        await playButton.click();

        // Wait for modal to appear
        const passphraseInput = hostPage.getByLabel('合言葉');
        await expect(passphraseInput).toBeVisible({ timeout: 10000 });

        const uniquePassphrase = `testroom-${Date.now()}`;
        await passphraseInput.fill(uniquePassphrase);
        await hostPage.getByLabel('プレイヤー名').fill('Host');
        await hostPage.getByRole('button', { name: 'ルームを作る' }).click();

        // Wait for lobby
        await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
        await expect(hostPage.getByText('Host')).toBeVisible({ timeout: 10000 });

        // 2. Player 2 joins
        await player2Page.goto('/');
        await player2Page.getByRole('button', { name: 'ルームに参加する' }).click();
        await player2Page.getByLabel('合言葉').fill(uniquePassphrase);
        await player2Page.getByLabel('プレイヤー名').fill('Player2');
        await player2Page.getByRole('button', { name: '参加する' }).click();

        // Verify Player 2 in lobby
        await expect(player2Page).toHaveURL(/\/lobby/, { timeout: 15000 });
        // Wait for Realtime synchronization
        await expect(hostPage.getByText('Player2')).toBeVisible({ timeout: 10000 });
        await expect(player2Page.getByText('Host')).toBeVisible({ timeout: 10000 });

        // 3. Player 3 joins
        await player3Page.goto('/');
        await player3Page.getByRole('button', { name: 'ルームに参加する' }).click();
        await player3Page.getByLabel('合言葉').fill(uniquePassphrase);
        await player3Page.getByLabel('プレイヤー名').fill('Player3');
        await player3Page.getByRole('button', { name: '参加する' }).click();

        // Verify Player 3 in lobby
        await expect(player3Page).toHaveURL(/\/lobby/, { timeout: 15000 });
        // Wait for Realtime synchronization
        await expect(hostPage.getByText('Player3')).toBeVisible({ timeout: 10000 });

        // 4. Host starts game
        // Reload to ensure state is fresh
        await hostPage.reload();
        // Verify host elements are visible (confirming isHost is true)
        await expect(hostPage.getByText('制限時間')).toBeVisible();
        await expect(hostPage.getByText('お題のカテゴリ')).toBeVisible();

        // Wait for all players to be ready and button to be enabled
        await expect(hostPage.getByText('準備完了: 3/3')).toBeVisible();
        const startBtn = hostPage.getByRole('button', { name: 'ゲームを開始する' }).first();
        await expect(startBtn).toBeEnabled({ timeout: 15000 });
        await startBtn.click();

        // 5. Verify Role Assignment Phase
        await expect(hostPage).toHaveURL(/\/game\/role-assignment/);
        await expect(player2Page).toHaveURL(/\/game\/role-assignment/);
        await expect(player3Page).toHaveURL(/\/game\/role-assignment/);

        // Wait for roles to be visible (might take a moment for Realtime)
        await expect(hostPage.getByText(/あなたは/)).toBeVisible({ timeout: 15000 });

        // 6. Proceed to Topic Phase (Auto or Manual?)
        // Assuming manual "確認しました" button or similar if implemented, 
        // or just wait if it's auto. 
        // Based on previous implementation, there might be a "確認しました" button.
        // Let's check if there is a button to proceed.
        // If not, we might need to wait for timer or check implementation.
        // For now, let's assume there is a button to confirm role.

        // Actually, looking at the code, role page usually has a confirm button.
        // Let's try to click it if it exists.
        const confirmRole = async (page: Page) => {
            const btn = page.getByRole('button', { name: /確認|OK|次へ/ });
            if (await btn.isVisible()) {
                await btn.click();
            }
        };

        await confirmRole(hostPage);
        await confirmRole(player2Page);
        await confirmRole(player3Page);

        // 7. Topic Phase
        // Topic is automatically selected.
        // Wait for topic to be visible (for Master/Insider) or "You are Citizen" (for Citizen)

        // Player 2 confirms
        if (await player2Page.getByText('あなたはインサイダーです').isVisible()) {
            await player2Page.waitForTimeout(11000);
        }
        await player2Page.getByRole('button', { name: '確認しました' }).click();

        // Player 3 confirms
        if (await player3Page.getByText('あなたはインサイダーです').isVisible()) {
            await player3Page.waitForTimeout(11000);
        }
        await player3Page.getByRole('button', { name: '確認しました' }).click();

        // Host confirms (Last to trigger phase change)
        if (await hostPage.getByText('あなたはインサイダーです').isVisible()) {
            // Wait for timer
            await hostPage.waitForTimeout(11000);
        }
        await hostPage.getByRole('button', { name: '確認しました' }).click();

        // 8. Question Phase
        await expect(hostPage).toHaveURL(/\/game\/question/);
        await expect(player2Page).toHaveURL(/\/game\/question/);
        await expect(player3Page).toHaveURL(/\/game\/question/);

        // Find the Master (who has the "正解が出ました" button)
        const pages = [hostPage, player2Page, player3Page];
        let masterPage = null;

        for (const page of pages) {
            const correctBtn = page.getByRole('button', { name: '正解が出ました' });
            if (await correctBtn.isVisible().catch(() => false)) {
                masterPage = page;
                break;
            }
        }

        // Master clicks "Correct answer" button to proceed to Debate
        if (masterPage) {
            await masterPage.getByRole('button', { name: '正解が出ました' }).click();
        }

        // 9. Debate Phase (after timer or manual finish)
        // Wait for phase transition
        await expect(hostPage).toHaveURL(/\/game\/debate/, { timeout: 10000 });

        // 10. Vote 1 Phase
        await expect(hostPage).toHaveURL(/\/game\/vote1/, { timeout: 10000 });
        await expect(player2Page).toHaveURL(/\/game\/vote1/, { timeout: 10000 });
        await expect(player3Page).toHaveURL(/\/game\/vote1/, { timeout: 10000 });

        // Wait for vote buttons to be visible
        await expect(hostPage.getByRole('button', { name: 'はい' })).toBeVisible({ timeout: 10000 });

        // All vote YES
        await hostPage.getByRole('button', { name: 'はい' }).click();
        await player2Page.getByRole('button', { name: 'はい' }).click();
        await player3Page.getByRole('button', { name: 'はい' }).click();

        // 11. Result Phase (Since all voted YES, and assuming logic works)
        // Or Vote 2 if NO.
        // Since we voted YES, it should go to Result (if Answerer was Insider) or Result (if Answerer was NOT Insider).
        // Basically it goes to Result if YES > NO.

        await expect(hostPage).toHaveURL(/\/game\/result/);
        await expect(player2Page).toHaveURL(/\/game\/result/);
        await expect(player3Page).toHaveURL(/\/game\/result/);

    });
});
