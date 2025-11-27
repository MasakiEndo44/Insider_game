import { Page, expect } from '@playwright/test';

/**
 * E2Eテスト用の共通ヘルパー関数
 */

// ==================== ルーム作成・参加 ====================

/**
 * ルームを作成してロビーに入る
 */
export async function createRoom(
    page: Page,
    passphrase: string,
    nickname: string
): Promise<void> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // PLAYボタンをクリック
    await page.waitForSelector('button:has-text("PLAY")', { state: 'visible', timeout: 10000 });
    await page.locator('button:has-text("PLAY")').click();

    // モーダルが表示されるまで待機
    const passphraseInput = page.getByLabel('合言葉');
    await expect(passphraseInput).toBeVisible({ timeout: 10000 });

    // フォーム入力
    await passphraseInput.fill(passphrase);
    await page.getByLabel('プレイヤー名').fill(nickname);
    await page.getByRole('button', { name: 'ルームを作る' }).click();

    // ロビーに遷移するまで待機
    await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
    await expect(page.getByText(nickname)).toBeVisible({ timeout: 10000 });
}

/**
 * 既存のルームに参加してロビーに入る
 */
export async function joinRoom(
    page: Page,
    passphrase: string,
    nickname: string
): Promise<void> {
    await page.goto('/');

    // 参加ボタンをクリック
    await page.getByRole('button', { name: 'ルームに参加する' }).click();

    // フォーム入力
    await page.getByLabel('合言葉').fill(passphrase);
    await page.getByLabel('プレイヤー名').fill(nickname);
    await page.getByRole('button', { name: '参加する' }).click();

    // ロビーに遷移するまで待機
    await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
    await expect(page.getByText(nickname)).toBeVisible({ timeout: 10000 });

    // Realtime同期を待機
    await waitForRealtimeSync(3000);
}

/**
 * ゲームを開始する（ホストのみ）
 */
export async function startGame(page: Page): Promise<void> {
    const startBtn = page.getByRole('button', { name: 'ゲームを開始する' }).first();
    await expect(startBtn).toBeEnabled({ timeout: 10000 });
    await startBtn.click();
}

// ==================== フェーズ遷移待機 ====================

/**
 * 指定したフェーズに遷移するまで待機
 */
export async function waitForPhase(
    page: Page,
    phase: string,
    timeout: number = 30000
): Promise<void> {
    const phaseRoutes: Record<string, RegExp> = {
        'LOBBY': /\/lobby/,
        'ROLE_ASSIGNMENT': /\/game\/role-assignment/,
        'TOPIC': /\/game\/topic/,
        'QUESTION': /\/game\/question/,
        'DEBATE': /\/game\/debate/,
        'VOTE1': /\/game\/vote1/,
        'VOTE2': /\/game\/vote2/,
        'RESULT': /\/game\/result/,
    };

    const route = phaseRoutes[phase];
    if (!route) {
        throw new Error(`Unknown phase: ${phase}`);
    }

    await expect(page).toHaveURL(route, { timeout });
}

// ==================== 役職判定 ====================

/**
 * プレイヤーの役職を取得
 */
export async function getPlayerRole(page: Page): Promise<'MASTER' | 'INSIDER' | 'CITIZEN'> {
    // 役職配布フェーズで役職テキストを取得
    await page.waitForSelector('h1', { timeout: 15000 });
    const roleText = await page.locator('h1').textContent();

    if (!roleText) {
        throw new Error('Role text not found');
    }

    if (roleText.includes('マスター')) {
        return 'MASTER';
    } else if (roleText.includes('インサイダー')) {
        return 'INSIDER';
    } else if (roleText.includes('庶民')) {
        return 'CITIZEN';
    }

    throw new Error(`Unknown role: ${roleText}`);
}

/**
 * 複数のページからマスターのページを見つける
 */
export async function findMasterPage(pages: Page[]): Promise<Page | null> {
    for (const page of pages) {
        try {
            // 質問フェーズでマスターのみ「正解が出ました」ボタンが表示される
            const correctBtn = page.getByRole('button', { name: '正解が出ました' });
            const isVisible = await correctBtn.isVisible({ timeout: 2000 }).catch(() => false);

            if (isVisible) {
                return page;
            }
        } catch {
            continue;
        }
    }

    return null;
}

/**
 * 複数のページからインサイダーのページを見つける
 */
export async function findInsiderPage(pages: Page[]): Promise<Page | null> {
    for (const page of pages) {
        try {
            const role = await getPlayerRole(page);
            if (role === 'INSIDER') {
                return page;
            }
        } catch {
            continue;
        }
    }

    return null;
}

// ==================== 投票 ====================

/**
 * 第一投票（Yes/No）を送信
 */
export async function submitVote1(
    page: Page,
    vote: 'yes' | 'no'
): Promise<void> {
    const buttonName = vote === 'yes' ? 'はい' : 'いいえ';
    await page.getByRole('button', { name: buttonName }).click();

    // 投票完了を待機（「投票しました」と表示される）
    await expect(page.getByText('投票しました')).toBeVisible({ timeout: 5000 });
}

/**
 * 第二投票（プレイヤー選択）を送信
 */
export async function submitVote2(
    page: Page,
    playerName: string
): Promise<void> {
    // プレイヤー名のボタンをクリック
    await page.getByRole('button', { name: playerName }).click();

    // 投票完了を待機
    await page.waitForTimeout(1000);
}

// ==================== 質問 ====================

/**
 * 質問を送信
 */
export async function askQuestion(
    page: Page,
    text: string
): Promise<void> {
    const input = page.getByPlaceholder('質問を入力');
    await input.fill(text);
    await page.getByRole('button', { name: '送信' }).click();

    // 質問が表示されるまで待機
    await expect(page.getByText(text)).toBeVisible({ timeout: 10000 });
}

/**
 * 質問に回答（マスターのみ）
 */
export async function answerQuestion(
    page: Page,
    answer: 'yes' | 'no',
    questionIndex: number = 0
): Promise<void> {
    const buttonName = answer === 'yes' ? 'はい' : 'いいえ';

    // 複数の質問がある場合、指定したインデックスの質問の回答ボタンをクリック
    const buttons = page.getByRole('button', { name: buttonName });
    const count = await buttons.count();

    if (count === 0) {
        throw new Error(`No answer button found: ${buttonName}`);
    }

    if (questionIndex >= count) {
        throw new Error(`Question index ${questionIndex} out of range (total: ${count})`);
    }

    await buttons.nth(questionIndex).click();

    // 回答が反映されるまで待機
    await page.waitForTimeout(1000);
}

// ==================== ゲーム進行 ====================

/**
 * 役職確認後、次のフェーズに進む
 */
export async function confirmRole(page: Page): Promise<void> {
    // 役職配布フェーズで「確認しました」ボタンがあればクリック
    const confirmBtn = page.getByRole('button', { name: /確認|OK|次へ/ });
    const isVisible = await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
        await confirmBtn.click();
    }
}

/**
 * マスターが正解報告をして討論フェーズに移行
 */
export async function reportCorrectAnswer(page: Page): Promise<void> {
    await page.getByRole('button', { name: '正解が出ました' }).click();

    // 正解者選択モーダルが表示されるのを待つ
    await page.waitForSelector('text=正解者を選択');

    // 最初の候補者を選択（自分以外）
    // モーダル内のボタンを取得（キャンセルと決定以外）
    const playerButtons = page.locator('div.grid > button');
    await playerButtons.first().click();

    // 決定ボタンをクリック
    await page.getByRole('button', { name: '決定' }).click();

    // 討論フェーズに遷移するまで待機
    await waitForPhase(page, 'DEBATE', 15000);
}

/**
 * タイマーが0になるまで待機（最大待機時間を指定）
 */
export async function waitForTimerExpiry(
    page: Page,
    maxWaitMs: number = 10000
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        // タイマー表示を取得
        const timerText = await page.locator('text=/\d+:\d+/').textContent().catch(() => null);

        if (timerText === '0:00') {
            return;
        }

        await page.waitForTimeout(1000);
    }

    throw new Error(`Timer did not expire within ${maxWaitMs}ms`);
}

// ==================== ユーティリティ ====================

/**
 * ユニークな合言葉を生成
 */
export function generateUniquePassphrase(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}`;
}

/**
 * Realtime同期を待機
 */
export async function waitForRealtimeSync(ms: number = 2000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 全プレイヤーが指定したフェーズに到達するまで待機
 */
export async function waitForAllPlayersInPhase(
    pages: Page[],
    phase: string,
    timeout: number = 30000
): Promise<void> {
    await Promise.all(pages.map(page => waitForPhase(page, phase, timeout)));
}
