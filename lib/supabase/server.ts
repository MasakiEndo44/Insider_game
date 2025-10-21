/**
 * Supabase Client for Server Components
 *
 * This client is used in Server Components, Route Handlers, and Server Actions.
 * It uses the createServerClient from @supabase/ssr to properly handle cookies
 * in the server environment, enabling authentication state to be maintained
 * across server-side rendering.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Creates a Supabase client with user authentication (respects RLS)
 * Use this in Server Components where you need user-specific data
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with service role privileges (bypasses RLS)
 * Use this in Server Actions where you need full database access
 *
 * ⚠️  WARNING: This client bypasses Row Level Security policies.
 * Only use in trusted server-side code (Server Actions, API Routes).
 * Never expose service role credentials to the client.
 */
export function createServiceClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
