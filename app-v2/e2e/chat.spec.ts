import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
    test('should allow players to chat and master to answer', async ({ browser }) => {
        // Create two contexts for two players
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // 1. Host creates a room
        await page1.goto('/');
        await page1.getByRole('button', { name: 'PLAY' }).click();

        // Fill Create Room form
        // Use specific passphrase for testing
        const passphrase = 'test-chat-' + Date.now();
        await page1.getByPlaceholder('例: sakura2024').fill(passphrase);
        await page1.getByPlaceholder('例: たろう').fill('HostPlayer');
        await page1.getByRole('button', { name: 'ルームを作る' }).click();

        // Wait for room to be created and get Room ID (optional, but good for verification)
        await expect(page1).toHaveURL(/\/lobby/);

        // 2. Player 2 joins the room
        await page2.goto('/');
        await page2.getByRole('button', { name: 'ルームに参加する' }).click();

        // Fill Join Room form
        await page2.getByPlaceholder('例: sakura2024').fill(passphrase);
        await page2.getByPlaceholder('例: たろう').fill('GuestPlayer');
        await page2.getByRole('button', { name: '参加する' }).click();
        await expect(page2).toHaveURL(/\/lobby/);

        // 3. Start Game
        // Wait for both players to be visible in lobby
        // Realtime should update the list. We give it a bit more time.
        await expect(page1.getByText('GuestPlayer')).toBeVisible({ timeout: 10000 });
        await expect(page2.getByText('HostPlayer')).toBeVisible({ timeout: 10000 });

        await page1.getByRole('button', { name: 'ゲームを開始' }).click();

        // 4. Role Assignment
        await expect(page1).toHaveURL(/\/game\/role-assignment/);
        await expect(page2).toHaveURL(/\/game\/role-assignment/);

        // Check roles (one should be Master)
        // We need to know who is Master to test answering.
        // Since roles are random, we check the UI.
        let masterPage = page1;
        let commonPage = page2;

        // Wait for role to appear
        // The text is "あなたは...です"
        await page1.waitForSelector('text=あなたは');
        const roleText1 = await page1.getByText(/あなたは.*です/).textContent();

        if (roleText1?.includes('マスター')) {
            masterPage = page1;
            commonPage = page2;
        } else {
            masterPage = page2;
            commonPage = page1;
        }

        // Proceed to Topic
        // Both need to click "次へ"
        await page1.getByRole('button', { name: '次へ' }).click();
        await page2.getByRole('button', { name: '次へ' }).click();

        // 5. Topic Phase
        await expect(page1).toHaveURL(/\/game\/topic/);
        await expect(page2).toHaveURL(/\/game\/topic/);

        // Wait for topic to be displayed (Master sees it, Common might see "確認中" or similar)
        // Actually, Common sees "マスターがお題を確認中..."
        // Master sees "今回のお題は"

        // Proceed to Question
        // Only Master (Host?) can proceed? Or anyone?
        // Usually Host triggers phase change.
        // Let's assume Host (page1) triggers it.
        // But if page1 is not Master, can they trigger?
        // In Topic phase, usually only Master sees the button "質問フェーズへ".
        // Let's check masterPage.
        await masterPage.getByRole('button', { name: '質問フェーズへ' }).click();

        // 6. Question Phase (Chat)
        await expect(page1).toHaveURL(/\/game\/question/);
        await expect(page2).toHaveURL(/\/game\/question/);

        // Common player asks a question
        const questionText = 'これは食べ物ですか？';
        // Ensure commonPage is ready
        await commonPage.waitForSelector('input[placeholder="質問を入力..."]');
        await commonPage.getByPlaceholder('質問を入力...').fill(questionText);
        await commonPage.getByRole('button', { name: '送信' }).click();

        // Verify question appears on both screens
        await expect(commonPage.getByText(questionText)).toBeVisible();
        await expect(masterPage.getByText(questionText)).toBeVisible();

        // Master answers "Yes"
        // Find the question item and the Yes button
        // The UI has "はい" "いいえ" buttons for the Master.
        // We need to be careful not to click other "Yes" buttons if any.
        // The chat item usually has buttons inside it for Master.
        await masterPage.getByRole('button', { name: 'はい' }).last().click();

        // Verify answer updates on both screens
        // The UI should show "はい" badge or text
        // It might be an icon or text.
        // Let's check for text "はい"
        await expect(commonPage.getByText('はい', { exact: true })).toBeVisible();
        await expect(masterPage.getByText('はい', { exact: true })).toBeVisible();

        // 7. Reload to verify persistence
        await commonPage.reload();
        await expect(commonPage.getByText(questionText)).toBeVisible();
        await expect(commonPage.getByText('はい', { exact: true })).toBeVisible();

    });
});
