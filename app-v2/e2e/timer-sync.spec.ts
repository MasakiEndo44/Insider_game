import { test, expect } from '@playwright/test';
import {
    createRoom,
    joinRoom,
    waitForPhase,
    reportCorrectAnswer,
    findMasterPage,
    generateUniquePassphrase,
    waitForRealtimeSync,
    waitForAllPlayersInPhase,
} from './helpers/game-helpers';

test.describe('Timer Synchronization', () => {
    test.setTimeout(90000); // 90 seconds

    test('Timer synchronization across multiple clients', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('timer-sync');

        try {
            // Setup: Get to Question phase
            console.log('=== Setup: Getting to Question phase ===');
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

            // Test 1: Check timer synchronization in Question phase
            console.log('=== Test 1: Timer sync in Question phase ===');

            // Wait a moment for timers to stabilize
            await page1.waitForTimeout(2000);

            // Get timer values from all pages
            const getTimerValue = async (page: any) => {
                const timerText = await page.locator('text=/\d+:\d+/').textContent();
                if (!timerText) return null;

                const [minutes, seconds] = timerText.split(':').map(Number);
                return minutes * 60 + seconds;
            };

            const timer1 = await getTimerValue(page1);
            const timer2 = await getTimerValue(page2);
            const timer3 = await getTimerValue(page3);

            console.log(`Timer values: ${timer1}, ${timer2}, ${timer3}`);

            // Verify timers are synchronized (within 2 seconds)
            if (timer1 !== null && timer2 !== null && timer3 !== null) {
                expect(Math.abs(timer1 - timer2)).toBeLessThanOrEqual(2);
                expect(Math.abs(timer2 - timer3)).toBeLessThanOrEqual(2);
                expect(Math.abs(timer1 - timer3)).toBeLessThanOrEqual(2);
            }

            // Test 2: Time inheritance to Debate phase
            console.log('=== Test 2: Time inheritance to Debate phase ===');

            // Wait a bit to consume some time
            await page1.waitForTimeout(5000);

            // Get remaining time before transition
            const questionTimeRemaining = await getTimerValue(page1);
            console.log(`Question time remaining: ${questionTimeRemaining}`);

            // Master reports correct answer
            const masterPage = await findMasterPage(pages);
            if (masterPage) {
                await reportCorrectAnswer(masterPage);
            }

            await waitForAllPlayersInPhase([page1, page2, page3], 'DEBATE', 20000);

            // Wait for timer to stabilize
            await page1.waitForTimeout(2000);

            // Get debate timer
            const debateTimer1 = await getTimerValue(page1);
            const debateTimer2 = await getTimerValue(page2);
            const debateTimer3 = await getTimerValue(page3);

            console.log(`Debate timer values: ${debateTimer1}, ${debateTimer2}, ${debateTimer3}`);

            // Verify debate timers are synchronized
            if (debateTimer1 !== null && debateTimer2 !== null && debateTimer3 !== null) {
                expect(Math.abs(debateTimer1 - debateTimer2)).toBeLessThanOrEqual(2);
                expect(Math.abs(debateTimer2 - debateTimer3)).toBeLessThanOrEqual(2);
                expect(Math.abs(debateTimer1 - debateTimer3)).toBeLessThanOrEqual(2);

                // Verify time was inherited (debate timer should be close to question remaining time)
                // Allow some margin for transition time
                if (questionTimeRemaining !== null) {
                    expect(Math.abs(debateTimer1 - questionTimeRemaining)).toBeLessThanOrEqual(10);
                }
            }

            console.log('=== Test passed: Timer synchronization verified ===');

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });
});
