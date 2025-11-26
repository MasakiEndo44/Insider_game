import { test, expect } from '@playwright/test';
import {
    createRoom,
    joinRoom,
    waitForPhase,
    reportCorrectAnswer,
    findMasterPage,
    submitVote1,
    submitVote2,
    generateUniquePassphrase,
    waitForRealtimeSync,
    waitForAllPlayersInPhase,
} from './helpers/game-helpers';

test.describe('Voting Flow', () => {
    test.setTimeout(120000); // 2 minutes

    test('Vote 1: YES majority leads to Vote 2', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('vote-yes');

        try {
            // Setup: Get to Vote1 phase
            console.log('=== Setup: Getting to Vote1 phase ===');
            await createRoom(page1, passphrase, 'Player1');
            await joinRoom(page2, passphrase, 'Player2');
            await joinRoom(page3, passphrase, 'Player3');
            await waitForRealtimeSync(3000);

            const startBtn = page1.getByRole('button', { name: 'ゲームを開始する' }).first();
            await expect(startBtn).toBeEnabled({ timeout: 10000 });
            await startBtn.click();

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

            const masterPage = await findMasterPage(pages);
            if (masterPage) {
                await reportCorrectAnswer(masterPage);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'DEBATE', 20000);

            // Skip debate or wait for auto-transition
            const skipBtn = page1.getByRole('button', { name: '討論を終了する' });
            const canSkip = await skipBtn.isVisible({ timeout: 5000 }).catch(() => false);
            if (canSkip) {
                await skipBtn.click();
            } else {
                await waitForPhase(page1, 'VOTE1', 15000);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE1', 20000);

            // Test: All vote YES
            console.log('=== Test: All vote YES ===');
            await submitVote1(page1, 'yes');
            await submitVote1(page2, 'yes');
            await submitVote1(page3, 'yes');

            await waitForRealtimeSync(3000);

            // Should transition to VOTE2
            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE2', 20000);

            console.log('=== Test passed: YES majority leads to VOTE2 ===');

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });

    test('Vote 1: NO majority leads to Result', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('vote-no');

        try {
            // Setup: Get to Vote1 phase (same as above)
            console.log('=== Setup: Getting to Vote1 phase ===');
            await createRoom(page1, passphrase, 'Player1');
            await joinRoom(page2, passphrase, 'Player2');
            await joinRoom(page3, passphrase, 'Player3');
            await waitForRealtimeSync(3000);

            const startBtn = page1.getByRole('button', { name: 'ゲームを開始する' }).first();
            await expect(startBtn).toBeEnabled({ timeout: 10000 });
            await startBtn.click();

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

            const masterPage = await findMasterPage(pages);
            if (masterPage) {
                await reportCorrectAnswer(masterPage);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'DEBATE', 20000);

            const skipBtn = page1.getByRole('button', { name: '討論を終了する' });
            const canSkip = await skipBtn.isVisible({ timeout: 5000 }).catch(() => false);
            if (canSkip) {
                await skipBtn.click();
            } else {
                await waitForPhase(page1, 'VOTE1', 15000);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE1', 20000);

            // Test: All vote NO
            console.log('=== Test: All vote NO ===');
            await submitVote1(page1, 'no');
            await submitVote1(page2, 'no');
            await submitVote1(page3, 'no');

            await waitForRealtimeSync(3000);

            // Should transition to RESULT (Insider wins)
            await waitForAllPlayersInPhase([page1, page2, page3], 'RESULT', 30000);

            // Verify result shows Insider victory
            await expect(page1.getByText(/インサイダー.*勝利/)).toBeVisible({ timeout: 10000 });

            console.log('=== Test passed: NO majority leads to RESULT ===');

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });

    test('Vote 2: Voting for a player and result determination', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('vote2');

        try {
            // Setup: Get to Vote2 phase
            console.log('=== Setup: Getting to Vote2 phase ===');
            await createRoom(page1, passphrase, 'Player1');
            await joinRoom(page2, passphrase, 'Player2');
            await joinRoom(page3, passphrase, 'Player3');
            await waitForRealtimeSync(3000);

            const startBtn = page1.getByRole('button', { name: 'ゲームを開始する' }).first();
            await expect(startBtn).toBeEnabled({ timeout: 10000 });
            await startBtn.click();

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

            const masterPage = await findMasterPage(pages);
            if (masterPage) {
                await reportCorrectAnswer(masterPage);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'DEBATE', 20000);

            const skipBtn = page1.getByRole('button', { name: '討論を終了する' });
            const canSkip = await skipBtn.isVisible({ timeout: 5000 }).catch(() => false);
            if (canSkip) {
                await skipBtn.click();
            } else {
                await waitForPhase(page1, 'VOTE1', 15000);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE1', 20000);

            // Vote YES to get to VOTE2
            await submitVote1(page1, 'yes');
            await submitVote1(page2, 'yes');
            await submitVote1(page3, 'yes');

            await waitForRealtimeSync(3000);
            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE2', 20000);

            // Test: All vote for Player1
            console.log('=== Test: All vote for Player1 ===');
            await submitVote2(page1, 'Player1');
            await submitVote2(page2, 'Player1');
            await submitVote2(page3, 'Player1');

            await waitForRealtimeSync(3000);

            // Should transition to RESULT
            await waitForAllPlayersInPhase([page1, page2, page3], 'RESULT', 30000);

            // Verify result screen
            await expect(page1.getByText(/勝利|敗北/)).toBeVisible({ timeout: 10000 });

            console.log('=== Test passed: Vote2 leads to Result ===');

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });
});
