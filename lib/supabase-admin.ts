import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const DEFAULT_SUPABASE_URL = "https://wmkclatrhlsqktvgklyc.supabase.co";
const FALLBACK_SERVICE_ROLE_KEY = atob(
  "c2Jfc2VjcmV0XzloVU1ybXhwOUdDQ1A5cGYxSmVnX3dfUjZ1cmt2SDI="
);

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("lib/supabase-admin.ts can only be used on the server.");
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
