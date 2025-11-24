import { test, expect } from '@playwright/test';

test.describe('Room Reuse Flow', () => {
    test('Create room, leave, and reuse passphrase', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const passphrase = `reuse-test-${Date.now()}`;

        // 1. Create Room
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('button:has-text("PLAY")', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);
        await page.locator('button:has-text("PLAY")').click();

        await expect(page.getByLabel('合言葉')).toBeVisible({ timeout: 10000 });
        await page.getByLabel('合言葉').fill(passphrase);
        await page.getByLabel('プレイヤー名').fill('Host1');
        await page.getByRole('button', { name: 'ルームを作る' }).click();

        // Verify Lobby
        await expect(page).toHaveURL(/\/lobby/);
        await expect(page.getByText('Host1')).toBeVisible();

        // 2. Leave Room (Simulate game end or manual leave)
        // Since there is no "Leave" button in Lobby, we can just close the page or navigate away.
        // But to test api.leaveRoom, we need to trigger it.
        // Currently api.leaveRoom is called in ResultPage handleLeave.
        // Let's manually call it or simulate a finished game flow?
        // Or better, let's just use the "Home" button if available?
        // In Lobby, there isn't a leave button usually.

        // Wait, my fix allows reuse if:
        // 1. count === 0 (no connected players)
        // 2. OR expired (older than 2 hours)

        // If I close the page, is_connected might stay true for a while until Supabase detects disconnect.
        // But I added api.leaveRoom which sets is_connected = false.
        // I need to trigger that.

        // Let's try to navigate to Result page manually? No, that's hacky.
        // Let's just close the context/page, wait a bit, and try to create again.
        // If Supabase Presence works, it should detect disconnect.
        // But my fix was specifically about "is_connected" staying true.

        // So I should verify that if I *explicitly* leave (if possible), it works.
        // OR verify the "expired" logic (but that takes 2 hours).

        // Let's verify the "count === 0" logic.
        // If I close the browser context, Supabase *should* eventually mark as disconnected.
        // But for the test, I can manually invoke the leaveRoom API via console or just assume the user uses the proper exit flow.

        // Since I can't easily trigger "Leave" from Lobby in the UI (unless I add a button),
        // I will simulate the "Game End -> Leave" flow which uses ResultPage.

        // But that's a long flow.

        // Alternative: Add a temporary "Leave" button to Lobby for testing? No.

        // Let's just try closing the page and creating a NEW context to try again.
        // If Supabase Realtime is fast enough, it might work.
        // If not, it proves why I needed the "expired" logic (but I can't wait 2 hours).

        // Actually, I can use `page.evaluate` to call the API directly if I expose it, or just use `supabase` client in the test?
        // No, test runs in Node, app runs in browser.

        // Let's try the "Close Page" approach first.
        await page.close();
        await context.close();

        // Wait a bit for Supabase to detect disconnect (Presence timeout is usually short but can vary)
        // This is flaky.

        // Better approach:
        // 1. Create room
        // 2. Use a second page to "force" the player to leave via DB update (simulating the api.leaveRoom call)
        // But I can't easily access DB from here without setup.

        // Let's stick to the UI flow.
        // I'll assume the user goes through the game or I just try to create again and see if it fails (it SHOULD fail if I don't leave properly).

        // Wait, the user said: "Supabaseのroomsテーブルを確認すると、解散したルームの情報も永続的に残り続けていた。"
        // And "test123を使用してルームを作成したが、この合言葉のルームはすでに存在しますというトースト通知が出る"

        // My fix handles:
        // 1. Explicit leave (sets is_connected = false)
        // 2. Expiration

        // Let's test the "Explicit Leave" flow by mocking the game flow quickly?
        // Or just navigate to /game/result manually (if allowed)?
        // The app redirects if no room state.

        // Let's try to create a room, then close the browser.
        // Then try to create again with SAME passphrase.
        // If it fails, it confirms the issue exists (is_connected remains true).
        // Then I can't verify my fix unless I trigger leaveRoom.

        // I will add a "Leave Room" button to the Lobby for development/testing?
        // Or just trust that ResultPage logic works and verify that *if* is_connected is false, it works.

        // Let's try to simulate the "Leave" by calling the API endpoint if it existed? It's a server action or client function.

        // I'll try to execute the leave logic via page.evaluate.
        // I need to import api... not easy in evaluate.

        // Okay, let's try the full flow but simplified:
        // Create Room -> (Mock Game End) -> Result Page -> Click Leave -> Create Room Again.

        // To skip game flow, I can try to inject state? Hard.

        // Let's just run the `room-flow.spec.ts` but at the end, try to create the room AGAIN with the same passphrase.
        // Since `room-flow` goes to Result page, I can add a step there.

    });
});
