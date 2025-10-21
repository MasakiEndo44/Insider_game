/**
 * Supabase Admin Client for Edge Functions
 *
 * Uses SERVICE_ROLE_KEY for server-side operations
 * Bypasses RLS policies for administrative tasks
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Database } from './database.types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Admin client with service role privileges
 *
 * WARNING: This client bypasses RLS. Use with caution.
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
    },
  }
)
