import { vi } from 'vitest';

/**
 * Mock Supabase Client for Unit Tests
 *
 * This mock provides a simplified Supabase client that returns
 * controllable responses for testing Server Actions.
 */

export const createClient = vi.fn(() => {
  const mockData = {
    room: null as any,
    player: null as any,
    count: null as number | null,
  };

  return {
    from: vi.fn((table: string) => ({
      insert: vi.fn((data: any) => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            if (table === 'rooms') {
              mockData.room = {
                id: 'test-room-id-uuid',
                passphrase_hash: 'hashed',
                passphrase_lookup_hash: 'lookup',
                phase: 'LOBBY',
                is_suspended: false,
                ...data,
              };
              return Promise.resolve({ data: mockData.room, error: null });
            }
            if (table === 'players') {
              mockData.player = {
                id: 'test-player-id-uuid',
                nickname: data.nickname,
                is_host: data.is_host,
                is_connected: true,
                confirmed: false,
                room_id: data.room_id,
                ...data,
              };
              return Promise.resolve({ data: mockData.player, error: null });
            }
            return Promise.resolve({ data: null, error: new Error('Unknown table') });
          }),
        })),
      })),
      select: vi.fn((columns?: string) => ({
        eq: vi.fn((column: string, value: any) => ({
          eq: vi.fn((column2: string, value2: any) => ({
            maybeSingle: vi.fn(() => {
              if (table === 'rooms') {
                return Promise.resolve({ data: mockData.room, error: null });
              }
              if (table === 'players') {
                return Promise.resolve({ data: mockData.player, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          })),
          maybeSingle: vi.fn(() => {
            if (table === 'rooms') {
              return Promise.resolve({ data: mockData.room, error: null });
            }
            if (table === 'players') {
              return Promise.resolve({ data: mockData.player, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        })),
        maybeSingle: vi.fn(() => {
          if (table === 'rooms') {
            return Promise.resolve({ data: mockData.room, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      })),
      update: vi.fn((data: any) => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
});
