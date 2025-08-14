import { createClient } from '@supabase/supabase-js';

export interface BackendClient {
  auth: {
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<any>;
    signUp: (credentials: { email: string; password: string }) => Promise<any>;
    signOut: () => Promise<any>;
    getSession: () => Promise<any>;
    onAuthStateChange: (callback: (event: string, session: any) => void) => any;
  };
  from: (table: string) => any;
}

export const createSupabaseClient = (): BackendClient => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseKey);
};

export const supabase = createSupabaseClient();