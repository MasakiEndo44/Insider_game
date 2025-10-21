/**
 * Production Smoke Test
 *
 * Basic health checks for production deployment.
 * Tests fundamental functionality without creating full game sessions.
 */

import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/Insider Game/i);

    // Verify main UI elements exist
    await expect(page.locator('button:has-text("ルームを作成")')).toBeVisible();
    await expect(page.locator('button:has-text("ルームに参加")')).toBeVisible();
  });

  test('can navigate to room creation flow', async ({ page }) => {
    await page.goto('/');

    // Click create room button
    await page.click('button:has-text("ルームを作成")');

    // Verify room creation form is displayed
    await expect(page.locator('input[name="passphrase"]')).toBeVisible();
    await expect(page.locator('input[name="nickname"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('can create room and reach lobby', async ({ page }) => {
    const passphrase = `smoke-test-${Date.now()}`;
    const nickname = `TestUser-${Math.random().toString(36).substring(7)}`;

    await page.goto('/');

    // Create room
    await page.click('button:has-text("ルームを作成")');
    await page.fill('input[name="passphrase"]', passphrase);
    await page.fill('input[name="nickname"]', nickname);
    await page.click('button[type="submit"]');

    // Wait for lobby page
    await page.waitForURL(/\/lobby/);

    // Verify lobby elements
    await expect(page.locator('[data-testid="player-list"]')).toBeVisible({ timeout: 10000 });

    // Verify user appears in player list
    const playerItem = page.locator(`[data-testid="player-item"]:has-text("${nickname}")`);
    await expect(playerItem).toBeVisible();

    // Verify host controls are available
    await expect(page.locator('button:has-text("ゲームを開始")')).toBeVisible();
  });

  test('lobby displays player count correctly', async ({ page }) => {
    const passphrase = `count-test-${Date.now()}`;
    const nickname = `Host-${Math.random().toString(36).substring(7)}`;

    await page.goto('/');

    // Create room and enter lobby
    await page.click('button:has-text("ルームを作成")');
    await page.fill('input[name="passphrase"]', passphrase);
    await page.fill('input[name="nickname"]', nickname);
    await page.click('button[type="submit"]');

    // Wait for lobby
    await page.waitForURL(/\/lobby/);
    await page.waitForSelector('[data-testid="player-list"]', { timeout: 10000 });

    // Verify exactly 1 player (host) is displayed
    const playerCount = await page.locator('[data-testid="player-item"]').count();
    expect(playerCount).toBe(1);

    // Verify player count display
    const playerCountText = await page.locator('[data-testid="player-count"]').textContent();
    expect(playerCountText).toContain('1');
  });

  test('database connection is working', async ({ page }) => {
    const passphrase = `db-test-${Date.now()}`;
    const nickname = `DBTest-${Math.random().toString(36).substring(7)}`;

    await page.goto('/');

    // Create room (this tests database write)
    await page.click('button:has-text("ルームを作成")');
    await page.fill('input[name="passphrase"]', passphrase);
    await page.fill('input[name="nickname"]', nickname);
    await page.click('button[type="submit"]');

    // Wait for lobby (this tests database read)
    await page.waitForURL(/\/lobby/);
    await page.waitForSelector('[data-testid="player-list"]', { timeout: 10000 });

    // Verify no database errors are displayed
    await expect(page.locator('text=/error|エラー/i')).not.toBeVisible();

    // Verify player data was persisted correctly
    const displayedNickname = await page.locator('[data-testid="player-item"]').first().textContent();
    expect(displayedNickname).toContain(nickname);
  });

  test('environment variables are configured', async ({ page }) => {
    await page.goto('/');

    // Check that the app doesn't show environment variable errors
    await expect(page.locator('text=/Missing required environment variable/i')).not.toBeVisible();
    await expect(page.locator('text=/NEXT_PUBLIC_SUPABASE/i')).not.toBeVisible();
  });
});
