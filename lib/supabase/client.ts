/**
 * Supabase Client for Browser
 *
 * This client is used in Client Components and browser-side code.
 * It uses the createBrowserClient from @supabase/ssr for optimal
 * cookie handling in the browser environment.
 */

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
