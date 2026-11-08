import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

// Initialize Supabase Client
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://mock.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'mock-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'vault-documents';

/**
 * Test connectivity to Supabase Cloud
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase credentials are not configured in .env or contains placeholder values.',
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If error is permissions/RLS or table exists, connection works
      if (error.message.includes('relation "public.profiles" does not exist')) {
        return {
          success: false,
          message: 'Connected to Supabase, but SQL migrations have not been applied yet. Run the SQL migration in supabase/migrations.',
        };
      }
    }
    return { success: true, message: 'Successfully connected to Supabase Cloud & PostgreSQL Database!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}
