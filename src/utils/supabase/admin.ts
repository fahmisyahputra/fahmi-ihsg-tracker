import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client — bypasses RLS using the Service Role Key.
 * ONLY use this in secure server-side environments (like Cron jobs).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase Admin environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
