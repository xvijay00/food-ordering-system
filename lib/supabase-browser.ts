import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

const DEFAULT_SUPABASE_URL = "https://wmkclatrhlsqktvgklyc.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_7MYuxGt9jDGR49tQmwKGig_jB0zqWPh";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
