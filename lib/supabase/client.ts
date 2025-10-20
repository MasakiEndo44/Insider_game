/**
 * Supabase Client for Browser
 *
 * This client is used in Client Components and browser-side code.
 * It uses the createBrowserClient from @supabase/ssr for optimal
 * cookie handling in the browser environment.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
