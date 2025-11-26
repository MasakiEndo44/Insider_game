import { test, expect } from '@playwright/test';
import {
    createRoom,
    joinRoom,
    waitForPhase,
    findMasterPage,
    askQuestion,
    answerQuestion,
    generateUniquePassphrase,
    waitForRealtimeSync,
    waitForAllPlayersInPhase,
} from './helpers/game-helpers';

test.describe('Question Flow', () => {
    test.setTimeout(90000); // 90 seconds

    test('Question and answer with Realtime sync', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('question-flow');

        try {
            // Setup: Create room and start game
            console.log('=== Setup: Creating room and starting game ===');
            await createRoom(page1, passphrase, 'Player1');
            await joinRoom(page2, passphrase, 'Player2');
            await joinRoom(page3, passphrase, 'Player3');

            await waitForRealtimeSync(3000);

            const startBtn = page1.getByRole('button', { name: 'ゲームを開始する' }).first();
            await expect(startBtn).toBeEnabled({ timeout: 10000 });
            await startBtn.click();

            // Wait for Question Phase
            await waitForAllPlayersInPhase([page1, page2, page3], 'ROLE_ASSIGNMENT');

            const pages = [page1, page2, page3];
            for (const page of pages) {
                const confirmBtn = page.getByRole('button', { name: /確認|OK|次へ/ });
                const isVisible = await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false);
                if (isVisible) {
                    await confirmBtn.click();
                }
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'QUESTION', 20000);

            // Test 1: Ask a question
            console.log('=== Test 1: Asking a question ===');
            const questionText = 'これは食べ物ですか？';

            // Find a non-master page to ask question
            const masterPage = await findMasterPage(pages);
            const commonPage = pages.find(p => p !== masterPage) || page1;

            await askQuestion(commonPage, questionText);

            // Verify question appears on all screens
            await expect(page1.getByText(questionText)).toBeVisible({ timeout: 10000 });
            await expect(page2.getByText(questionText)).toBeVisible({ timeout: 10000 });
            await expect(page3.getByText(questionText)).toBeVisible({ timeout: 10000 });

            // Test 2: Master answers the question
            console.log('=== Test 2: Master answering question ===');
            if (masterPage) {
                await answerQuestion(masterPage, 'yes', 0);
                await waitForRealtimeSync(2000);

                // Verify answer appears on all screens
                await expect(page1.getByText('はい')).toBeVisible({ timeout: 10000 });
                await expect(page2.getByText('はい')).toBeVisible({ timeout: 10000 });
                await expect(page3.getByText('はい')).toBeVisible({ timeout: 10000 });
            }

            // Test 3: Ask another question
            console.log('=== Test 3: Asking another question ===');
            const questionText2 = 'これは動物ですか？';
            await askQuestion(commonPage, questionText2);

            await expect(page1.getByText(questionText2)).toBeVisible({ timeout: 10000 });
            await expect(page2.getByText(questionText2)).toBeVisible({ timeout: 10000 });
            await expect(page3.getByText(questionText2)).toBeVisible({ timeout: 10000 });

            // Master answers NO
            if (masterPage) {
                await answerQuestion(masterPage, 'no', 1);
                await waitForRealtimeSync(2000);

                // Verify answer appears
                const noButtons = page1.getByText('いいえ');
                await expect(noButtons.first()).toBeVisible({ timeout: 10000 });
            }

            // Test 4: Reload and verify persistence
            console.log('=== Test 4: Verifying persistence after reload ===');
            await commonPage.reload();
            await waitForPhase(commonPage, 'QUESTION', 15000);

            // Verify both questions are still visible
            await expect(commonPage.getByText(questionText)).toBeVisible({ timeout: 10000 });
            await expect(commonPage.getByText(questionText2)).toBeVisible({ timeout: 10000 });

            console.log('=== Test completed successfully ===');

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });
});
