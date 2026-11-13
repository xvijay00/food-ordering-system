import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { StaffProfile } from "@/types/database";

export async function getStaff(): Promise<StaffProfile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // 1. Try querying staff_profiles using the authenticated user session (RLS allows staff to read own profile)
    try {
      const { data: staff, error: staffError } = await supabase
        .from("staff_profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!staffError && staff) {
        return staff;
      }
    } catch {
      // Fall through to admin client fallback
    }

    // 2. Fallback to admin client
    try {
      const admin = createAdminClient();
      const { data: adminStaff, error: adminStaffError } = await admin
        .from("staff_profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!adminStaffError && adminStaff) {
        return adminStaff;
      }
    } catch {
      // Fallback failed
    }

    return null;
  } catch {
    return null;
  }
}

