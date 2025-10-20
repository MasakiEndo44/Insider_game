/**
 * Environment Variables Validation
 *
 * This module validates required environment variables at startup
 * and provides type-safe exports to eliminate non-null assertions.
 */

// Helper function to validate environment variable (exported for runtime use)
export function getEnvVar(key: string, value?: string): string {
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

  /** HMAC Secret for passphrase hashing (server-only) */
  PASSPHRASE_HMAC_SECRET: getEnvVar(
    'PASSPHRASE_HMAC_SECRET',
    process.env.PASSPHRASE_HMAC_SECRET
  ),
} as const;

// Optional: Add development-only logging
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Environment variables validated successfully');
}
