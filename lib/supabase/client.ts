/**
 * Supabase Client for Browser (Singleton Pattern)
 *
 * This client is used in Client Components and browser-side code.
 * It uses the createBrowserClient from @supabase/ssr for optimal
 * cookie handling in the browser environment.
 *
 * The singleton pattern ensures only one Supabase client instance
 * per browser tab, following best practices for Realtime subscriptions.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './database.types';

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return supabaseInstance;
}

// Deprecated: use getSupabaseBrowserClient() instead
export function createClient() {
  return getSupabaseBrowserClient();
}
