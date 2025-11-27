
import { test, expect } from '@playwright/test';
import {
    createRoom,
    joinRoom,
    startGame, // Added startGame
    waitForPhase,
    findMasterPage,
    reportCorrectAnswer,
    submitVote1,
    submitVote2,
    generateUniquePassphrase,
    waitForRealtimeSync,
    waitForAllPlayersInPhase,
    getPlayerRole, // Added getPlayerRole
} from './helpers/game-helpers';

test.describe('Basic Game Flow', () => {
    test.setTimeout(120000); // 2 minutes

    test('Complete game flow with 3 players', async ({ browser }) => {
        // Create 3 browser contexts for 3 players
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        const passphrase = generateUniquePassphrase('basic-flow');

        try {
            // Step 1: Create room and join
            console.log('=== Step 1: Creating room and joining ===');
            await createRoom(page1, passphrase, 'Player1');
            await joinRoom(page2, passphrase, 'Player2');
            await joinRoom(page3, passphrase, 'Player3');

            // Wait for Realtime sync
            await waitForRealtimeSync(5000);

            // Verify all players are in lobby
            await expect(page1.getByText('Player2')).toBeVisible({ timeout: 15000 });
            await expect(page1.getByText('Player3')).toBeVisible({ timeout: 15000 });
            await expect(page1.getByText('準備完了: 3/3')).toBeVisible({ timeout: 15000 });

            // Step 2: Start game
            console.log('=== Step 2: Starting game ===');
            await startGame(page1);

            // Step 3: Role Assignment Phase
            console.log('=== Step 3: Role Assignment ===');
            await waitForAllPlayersInPhase([page1, page2, page3], 'ROLE_ASSIGNMENT');

            // Wait for roles to be assigned
            await expect(page1.getByText(/あなたは/)).toBeVisible({ timeout: 15000 });
            await expect(page2.getByText(/あなたは/)).toBeVisible({ timeout: 15000 });
            await expect(page3.getByText(/あなたは/)).toBeVisible({ timeout: 15000 });

            // Check roles
            const p1Role = await getPlayerRole(page1);
            const p2Role = await getPlayerRole(page2);
            const p3Role = await getPlayerRole(page3);

            // Confirm roles (if button exists)
            const pages = [page1, page2, page3];
            for (const page of pages) {
                const confirmBtn = page.getByRole('button', { name: /確認|OK|次へ/ });
                const isVisible = await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false);
                if (isVisible) {
                    await confirmBtn.click();
                }
            }

            // Wait for navigation after role confirmation
            await page1.waitForTimeout(2000); // Give time for navigation to start

            // Step 4: Topic Phase
            console.log('=== Step 4: Topic Phase ===');
            const currentUrl = page1.url();
            if (currentUrl.includes('/game/topic')) {
                await waitForAllPlayersInPhase([page1, page2, page3], 'TOPIC', 20000);

                // Wait for host's confirm button to be enabled (handles Insider's 10-second timer)
                const hostConfirmBtn = page1.getByRole('button', { name: '確認しました' });
                await expect(hostConfirmBtn).toBeEnabled({ timeout: 15000 });
                await hostConfirmBtn.click();
            }

            // Step 5: Question Phase
            console.log('=== Step 5: Question Phase ===');
            await waitForAllPlayersInPhase([page1, page2, page3], 'QUESTION', 20000);

            // Verify timer is visible
            await expect(page1.locator('text=/\\d+:\\d+/')).toBeVisible({ timeout: 10000 });

            // Find master page
            const masterPage = await findMasterPage(pages);
            expect(masterPage).not.toBeNull();

            if (masterPage) {
                // Master reports correct answer
                console.log('=== Master reporting correct answer ===');
                await reportCorrectAnswer(masterPage);
            }

            // Step 6: Debate Phase
            console.log('=== Step 6: Debate Phase ===');
            await waitForAllPlayersInPhase([page1, page2, page3], 'DEBATE', 20000);

            // Wait for debate phase to auto-transition to VOTE1
            // (or master can skip if button exists)
            const skipBtn = page1.getByRole('button', { name: '討論を終了する' });
            const canSkip = await skipBtn.isVisible({ timeout: 5000 }).catch(() => false);
            if (canSkip) {
                await skipBtn.click();
            } else {
                // Wait for auto-transition (timeout or very short timer)
                await waitForPhase(page1, 'VOTE1', 15000);
            }

            // Step 7: Vote 1 Phase
            console.log('=== Step 7: Vote 1 Phase ===');
            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE1', 20000);

            // All players vote YES
            await expect(page1.getByRole('button', { name: 'はい' })).toBeVisible({ timeout: 10000 });
            await submitVote1(page1, 'yes');
            await submitVote1(page2, 'yes');
            await submitVote1(page3, 'yes');

            // Wait for vote processing
            await waitForRealtimeSync(3000);

            // Step 8: Vote 2 Phase (since majority voted YES)
            console.log('=== Step 8: Vote 2 Phase ===');
            await waitForAllPlayersInPhase([page1, page2, page3], 'VOTE2', 20000);

            // Determine a target to vote for (anyone who is not Master)
            let voteTarget = 'Player1';
            if (p1Role === 'MASTER') voteTarget = 'Player2';

            // Each player votes for voteTarget
            await expect(page1.getByRole('button', { name: voteTarget })).toBeVisible({ timeout: 10000 });
            await submitVote2(page1, voteTarget);
            await submitVote2(page2, voteTarget);
            await submitVote2(page3, voteTarget);

            // Wait for vote processing
            await waitForRealtimeSync(3000);

            // Step 9: Result Phase
            console.log('=== Step 9: Result Phase ===');
            await waitForAllPlayersInPhase([page1, page2, page3], 'RESULT', 30000);

            // Verify result screen elements
            await expect(page1.getByText(/勝利|敗北/)).toBeVisible({ timeout: 10000 });
            await expect(page2.getByText(/勝利|敗北/)).toBeVisible({ timeout: 10000 });
            await expect(page3.getByText(/勝利|敗北/)).toBeVisible({ timeout: 10000 });

            console.log('=== Test completed successfully ===');

        } finally {
            // Cleanup
            await context1.close();
            await context2.close();
            await context3.close();
        }
    });
});
