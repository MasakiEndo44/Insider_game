/**
 * Environment Variables Validation
 *
 * This module validates required environment variables at startup
 * and provides type-safe exports to eliminate non-null assertions.
 *
 * Note: Client-side validation only checks NEXT_PUBLIC_ variables.
 * Server-only variables are validated only on the server.
 */

// Check if running on client side
const isClient = typeof window !== 'undefined';

// Helper function to validate environment variable (exported for runtime use)
export function getEnvVar(key: string, value?: string, isServerOnly = false): string {
  // Skip server-only variables on client side
  if (isClient && isServerOnly) {
    return ''; // Return empty string for server-only vars on client
  }

  const envValue = value !== undefined ? value : process.env[key];

  if (!envValue) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n\n` +
        `Please check your .env.local file or Vercel environment settings.\n` +
        `For local development, copy .env.example to .env.local and fill in the values.\n` +
        `For Vercel deployment, add the variable in Project Settings → Environment Variables.`
    );
  }
  return envValue;
}

// Type-safe exports (validated at module load time)
export const env = {
  /** Supabase Project URL (public) */
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),

  /** Supabase Anonymous/Public Key (public) */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),

  /** Supabase Service Role Key (server-only, bypasses RLS) */
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    true // Server-only flag
  ),

  /** HMAC Secret for passphrase hashing (server-only) */
  PASSPHRASE_HMAC_SECRET: getEnvVar(
    'PASSPHRASE_HMAC_SECRET',
    process.env.PASSPHRASE_HMAC_SECRET,
    true // Server-only flag
  ),
} as const;

// Optional: Add development-only logging
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Environment variables validated successfully');
}
