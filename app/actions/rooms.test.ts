/**
 * Server Actions Unit Tests
 *
 * Tests for createRoom and joinRoom Server Actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoom, joinRoom } from './rooms';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => {
    const mockRoomData = {
      id: '91d0ee93-67fa-4853-9268-2465cb6aab08',
      passphrase_hash: '$argon2id$v=19$m=19456,t=2,p=1$...',
      passphrase_lookup_hash: 'abc123',
      phase: 'LOBBY',
      host_id: null,
      is_suspended: false,
    };

    const mockPlayerData = {
      id: 'f7a8b9c0-1234-5678-9abc-def012345678',
      room_id: mockRoomData.id,
      nickname: 'TestPlayer',
      is_host: true,
      is_connected: true,
      confirmed: false,
    };

    return {
      from: (table: string) => {
        if (table === 'rooms') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockRoomData, error: null })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: mockRoomData, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === 'players') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPlayerData, error: null })),
              })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
                head: vi.fn(() => Promise.resolve({ count: 5, error: null })),
              })),
              head: vi.fn(() => Promise.resolve({ count: 5, error: null })),
            })),
          };
        }
        return {};
      },
    };
  }),
}));

// Mock passphrase utilities
vi.mock('@/lib/game/passphrase', () => ({
  hashPassphrase: vi.fn((passphrase: string) =>
    Promise.resolve('$argon2id$v=19$m=19456,t=2,p=1$...')
  ),
  generateLookupHash: vi.fn((passphrase: string) => 'abc123'),
  verifyPassphrase: vi.fn((passphrase: string, hash: string) => Promise.resolve(true)),
}));

describe('createRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a room with valid passphrase and player name', async () => {
    const result = await createRoom('test123', 'TestPlayer');

    expect(result).toHaveProperty('roomId');
    expect(result).toHaveProperty('playerId');
    expect(result.roomId).toBe('91d0ee93-67fa-4853-9268-2465cb6aab08');
    expect(result.playerId).toBe('f7a8b9c0-1234-5678-9abc-def012345678');
  });

  it('should reject passphrase shorter than 3 characters', async () => {
    await expect(createRoom('ab', 'TestPlayer')).rejects.toThrow(
      '合言葉は3〜10文字で入力してください'
    );
  });

  it('should reject passphrase longer than 10 characters', async () => {
    await expect(createRoom('12345678901', 'TestPlayer')).rejects.toThrow(
      '合言葉は3〜10文字で入力してください'
    );
  });

  it('should reject empty player name', async () => {
    await expect(createRoom('test123', '')).rejects.toThrow(
      'プレイヤー名は1〜20文字で入力してください'
    );
  });

  it('should reject player name longer than 20 characters', async () => {
    await expect(createRoom('test123', '123456789012345678901')).rejects.toThrow(
      'プレイヤー名は1〜20文字で入力してください'
    );
  });

  it('should trim whitespace from inputs', async () => {
    const result = await createRoom('  test123  ', '  TestPlayer  ');

    expect(result).toHaveProperty('roomId');
    expect(result).toHaveProperty('playerId');
  });
});

describe('joinRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should join a room with valid passphrase and player name', async () => {
    const result = await joinRoom('test123', 'NewPlayer');

    expect(result).toHaveProperty('roomId');
    expect(result).toHaveProperty('playerId');
    expect(result).toHaveProperty('nickname');
    expect(result.roomId).toBe('91d0ee93-67fa-4853-9268-2465cb6aab08');
  });

  it('should reject passphrase shorter than 3 characters', async () => {
    await expect(joinRoom('ab', 'NewPlayer')).rejects.toThrow(
      '合言葉は3〜10文字で入力してください'
    );
  });

  it('should reject passphrase longer than 10 characters', async () => {
    await expect(joinRoom('12345678901', 'NewPlayer')).rejects.toThrow(
      '合言葉は3〜10文字で入力してください'
    );
  });

  it('should reject empty player name', async () => {
    await expect(joinRoom('test123', '')).rejects.toThrow(
      'プレイヤー名は1〜20文字で入力してください'
    );
  });

  it('should trim whitespace from inputs', async () => {
    const result = await joinRoom('  test123  ', '  NewPlayer  ');

    expect(result).toHaveProperty('roomId');
    expect(result).toHaveProperty('playerId');
  });
});
