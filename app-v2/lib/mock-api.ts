import { Player } from '@/context/room-context';
import { Role, GamePhase } from '@/context/game-context';

const DELAY_MS = 500;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substring(2, 9);

// Mock Data
const MOCK_TOPICS: Record<string, string[]> = {
    'food': ['りんご', 'ラーメン', '寿司', 'カレーライス', 'ピザ'],
    'animal': ['犬', '猫', 'ライオン', 'パンダ', 'キリン'],
    'place': ['東京タワー', '富士山', '学校', '病院', '公園'],
    'object': ['スマートフォン', '時計', 'メガネ', '財布', '鍵'],
    'general': ['サッカー', '映画', '音楽', '勉強', '旅行']
};

export const mockAPI = {
    createRoom: async (passphrase: string, nickname: string) => {
        await delay(DELAY_MS);
        const roomId = generateId();
        const playerId = generateId();
        const hostPlayer: Player = {
            id: playerId,
            nickname,
            isHost: true,
            isReady: true,
            isConnected: true
        };
        return { roomId, player: hostPlayer };
    },

    joinRoom: async (passphrase: string, nickname: string) => {
        await delay(DELAY_MS);
        // In a real app, we would check the passphrase and fetch room info
        const roomId = 'DEMO01';
        const playerId = generateId();
        const player: Player = {
            id: playerId,
            nickname,
            isHost: false,
            isReady: true,
            isConnected: true
        };
        return { roomId, player };
    },

    startGame: async (roomId: string) => {
        await delay(1000);
        return { success: true };
    },

    assignRoles: async (players: Player[]): Promise<Record<string, Role>> => {
        await delay(DELAY_MS);
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const roles: Record<string, Role> = {};

        // Ensure at least 3 players for valid assignment, but handle fewer for dev/testing
        if (shuffled.length > 0) roles[shuffled[0].id] = 'MASTER';
        if (shuffled.length > 1) roles[shuffled[1].id] = 'INSIDER';
        for (let i = 2; i < shuffled.length; i++) {
            roles[shuffled[i].id] = 'CITIZEN';
        }

        // Fallback for single player dev mode
        if (shuffled.length === 1) {
            roles[shuffled[0].id] = 'MASTER'; // Or whatever for testing
        }

        return roles;
    },

    getTopic: async (category: string): Promise<string> => {
        await delay(DELAY_MS);
        const topics = MOCK_TOPICS[category] || MOCK_TOPICS['general'];
        return topics[Math.floor(Math.random() * topics.length)];
    },

    submitVote1: async (roomId: string, playerId: string, vote: 'yes' | 'no') => {
        await delay(DELAY_MS);
        return { success: true };
    },

    submitVote2: async (roomId: string, playerId: string, votedPlayerId: string) => {
        await delay(DELAY_MS);
        return { success: true };
    }
};
