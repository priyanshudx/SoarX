import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isServiceRoleJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const payload = JSON.parse(atob(parts[1]));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

const missingConfigError =
  'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
const invalidKeyError =
  'Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY: detected a service_role key. Use the anon/publishable key and keep service_role secret on the server only.';

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? missingConfigError
  : isServiceRoleJwt(supabaseAnonKey)
    ? invalidKeyError
    : null;

function createSupabaseClient() {
  if (supabaseConfigError || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
