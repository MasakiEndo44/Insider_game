'use client';

/**
 * Application Providers
 *
 * This component wraps the entire application and provides global contexts:
 * - Supabase client context for Realtime subscriptions
 * - Theme provider for dark mode support
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { ThemeProvider } from '@/components/theme-provider';

// Supabase Context
const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function useSupabase(): SupabaseClient<Database> {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const supabase = getSupabaseBrowserClient();

  return (
    <SupabaseContext.Provider value={supabase}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
      </ThemeProvider>
    </SupabaseContext.Provider>
  );
}
