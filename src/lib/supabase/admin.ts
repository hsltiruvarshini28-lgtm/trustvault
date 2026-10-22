import { createClient } from '@supabase/supabase-js';

// Defense-in-depth: Guarantee service role client is NEVER bundled into the browser
if (typeof window !== 'undefined') {
  throw new Error('FATAL SECURITY VIOLATION: Supabase Admin Client must never execute in the browser.');
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
