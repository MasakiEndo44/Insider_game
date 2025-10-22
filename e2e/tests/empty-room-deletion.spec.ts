/**
 * E2E Test: Empty Room Auto-Deletion
 *
 * Verifies that rooms are automatically deleted when the last player leaves,
 * enabling passphrase reuse and preventing database pollution.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Empty Room Auto-Deletion', () => {
  const testPassphrase = `test-${Date.now()}`;
  const host1Name = 'HostPlayer1';
  const player2Name = 'Player2';
  const player3Name = 'Player3';

  // Automatic database cleanup before each test
  test.beforeEach(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Clean up test data in reverse dependency order
    // Delete all players first (foreign key to rooms)
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (playersError) {
      console.warn('[beforeEach] Failed to clean players:', playersError);
    }

    // Delete all rooms
    const { error: roomsError } = await supabase
      .from('rooms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (roomsError) {
      console.warn('[beforeEach] Failed to clean rooms:', roomsError);
    }
  });

  test('should delete room when last player leaves', async ({ page, context }) => {
    // Step 1: Host creates room
    await page.goto('/');
    await page.click('button:has-text("PLAY")');

    await page.fill('input[id="passphrase"]', testPassphrase);
    await page.fill('input[id="playerName"]', host1Name);
    await page.click('button:has-text("ルームを作る")');

    // Wait for lobby page
    await expect(page.locator('[data-testid="phase-LOBBY"]')).toBeVisible();
    await expect(page.locator('text=ロビー')).toBeVisible();

    // Verify host is in the player list
    await expect(page.locator(`text=${host1Name}`)).toBeVisible();

    // Extract roomId from URL
    const url = new URL(page.url());
    const roomId = url.searchParams.get('roomId');
    expect(roomId).toBeTruthy();

    console.log('[E2E] Room created:', { roomId, testPassphrase });

    // Step 2: Two more players join in separate tabs
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.click('button:has-text("ルームに参加する")');
    await page2.fill('input[id="join-passphrase"]', testPassphrase);
    await page2.fill('input[id="join-playerName"]', player2Name);
    await page2.click('button:has-text("参加する")', { force: true });

    await expect(page2.locator('[data-testid="phase-LOBBY"]')).toBeVisible();
    await expect(page2.locator(`text=${player2Name}`)).toBeVisible();

    const page3 = await context.newPage();
    await page3.goto('/');
    await page3.click('button:has-text("ルームに参加する")');
    await page3.fill('input[id="join-passphrase"]', testPassphrase);
    await page3.fill('input[id="join-playerName"]', player3Name);
    await page3.click('button:has-text("参加する")', { force: true });

    await expect(page3.locator('[data-testid="phase-LOBBY"]')).toBeVisible();
    await expect(page3.locator(`text=${player3Name}`)).toBeVisible();

    // Verify all 3 players are in the lobby
    await expect(page.locator('[data-testid="player-list"]')).toContainText(host1Name);
    await expect(page.locator('[data-testid="player-list"]')).toContainText(player2Name);
    await expect(page.locator('[data-testid="player-list"]')).toContainText(player3Name);

    console.log('[E2E] All players joined successfully');

    // Step 3: Players leave one by one
    await page3.click('button:has([class*="LogOut"])');
    await expect(page3).toHaveURL('/');
    await page.waitForTimeout(500); // Wait for database update

    // Verify player3 is gone from lobby
    await expect(page.locator('[data-testid="player-list"]')).not.toContainText(player3Name);
    await expect(page.locator('[data-testid="player-list"]')).toContainText(host1Name);
    await expect(page.locator('[data-testid="player-list"]')).toContainText(player2Name);

    console.log('[E2E] Player 3 left, room still exists (2 players remaining)');

    await page2.click('button:has([class*="LogOut"])');
    await expect(page2).toHaveURL('/');
    await page.waitForTimeout(500);

    // Verify player2 is gone
    await expect(page.locator('[data-testid="player-list"]')).not.toContainText(player2Name);
    await expect(page.locator('[data-testid="player-list"]')).toContainText(host1Name);

    console.log('[E2E] Player 2 left, room still exists (1 player remaining)');

    // Step 4: Last player (host) leaves - room should be deleted
    await page.click('button:has([class*="LogOut"])');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(1000); // Wait for trigger to execute

    console.log('[E2E] Last player left, room should be deleted');

    // Step 5: Verify passphrase can be reused (room was deleted)
    await page.goto('/');
    await page.click('button:has-text("PLAY")');

    await page.fill('input[id="passphrase"]', testPassphrase);
    await page.fill('input[id="playerName"]', 'NewHost');
    await page.click('button:has-text("ルームを作る")');

    // Should successfully create a new room with the same passphrase
    await expect(page.locator('[data-testid="phase-LOBBY"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=ロビー')).toBeVisible();
    await expect(page.locator('text=NewHost')).toBeVisible();

    console.log('[E2E] ✅ SUCCESS: Passphrase reused successfully (room was deleted)');

    // Cleanup: Leave the new room
    await page.click('button:has([class*="LogOut"])');
    await expect(page).toHaveURL('/');
  });

  test('should handle browser close gracefully', async ({ page }) => {
    // Create room
    await page.goto('/');
    await page.click('button:has-text("PLAY")');

    const testPass = `test-browser-close-${Date.now()}`;
    await page.fill('input[id="passphrase"]', testPass);
    await page.fill('input[id="playerName"]', 'BrowserCloseTest');
    await page.click('button:has-text("ルームを作る")');

    await expect(page.locator('[data-testid="phase-LOBBY"]')).toBeVisible();

    // Extract roomId
    const url = new URL(page.url());
    const roomId = url.searchParams.get('roomId');

    console.log('[E2E] Room created for browser close test:', { roomId, testPass });

    // Simulate browser close by closing the page
    await page.close();

    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create new page to verify passphrase can be reused
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    await newPage.click('button:has-text("PLAY")');

    await newPage.fill('input[id="passphrase"]', testPass);
    await newPage.fill('input[id="playerName"]', 'AfterBrowserClose');
    await newPage.click('button:has-text("ルームを作る")');

    await expect(newPage.locator('[data-testid="phase-LOBBY"]')).toBeVisible({
      timeout: 10000,
    });

    console.log('[E2E] ✅ SUCCESS: Passphrase reused after browser close');

    // Cleanup
    await newPage.click('button:has([class*="LogOut"])');
  });

  test('should not delete room when only some players leave', async ({ page, context }) => {
    // Create room with multiple players
    await page.goto('/');
    await page.click('button:has-text("PLAY")');

    const testPass = `test-partial-leave-${Date.now()}`;
    await page.fill('input[id="passphrase"]', testPass);
    await page.fill('input[id="playerName"]', 'Host');
    await page.click('button:has-text("ルームを作る")');

    await expect(page.locator('[data-testid="phase-LOBBY"]')).toBeVisible();

    // Player 2 joins
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.click('button:has-text("ルームに参加する")');
    await page2.fill('input[id="join-passphrase"]', testPass);
    await page2.fill('input[id="join-playerName"]', 'Player2');
    await page2.click('button:has-text("参加する")', { force: true });

    await expect(page2.locator('[data-testid="phase-LOBBY"]')).toBeVisible();

    // Verify both players visible
    await expect(page.locator('[data-testid="player-list"]')).toContainText('Host');
    await expect(page.locator('[data-testid="player-list"]')).toContainText('Player2');

    // Player 2 leaves
    await page2.click('button:has([class*="LogOut"])');
    await page.waitForTimeout(500);

    // Verify host still in lobby (room not deleted)
    await expect(page.locator('[data-testid="phase-LOBBY"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-list"]')).toContainText('Host');
    await expect(page.locator('[data-testid="player-list"]')).not.toContainText('Player2');

    console.log('[E2E] ✅ SUCCESS: Room persists when some players leave');

    // Cleanup
    await page.click('button:has([class*="LogOut"])');
  });
});
