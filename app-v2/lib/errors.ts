export class APIError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export const ERROR_MESSAGES = {
    ROOM_NOT_FOUND: 'ルームが見つかりませんでした',
    INVALID_PASSPHRASE: '合言葉が正しくありません',
    DUPLICATE_NICKNAME: 'この名前は既に使用されています',
    DUPLICATE_ROOM: 'この合言葉のルームは既に存在します',
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    SESSION_EXPIRED: 'セッションが期限切れです',
    UNKNOWN_ERROR: '予期しないエラーが発生しました',
} as const;
