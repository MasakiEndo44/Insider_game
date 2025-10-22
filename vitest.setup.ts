import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.PASSPHRASE_HMAC_SECRET = 'test-hmac-secret-for-unit-tests-only';
