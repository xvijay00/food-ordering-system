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

    const admin = createAdminClient();
    const { data: staff, error: staffError } = await admin
      .from("staff_profiles")
      .select("id, name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (staffError || !staff) {
      return null;
    }

    return staff;
  } catch {
    return null;
  }
}

