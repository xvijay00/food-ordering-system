import { redirect } from "next/navigation";

import type { StaffMemberRow } from "@/app/api/admin/staff/route";
import { StaffManager } from "@/components/admin/staff-manager";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }
  if (staff.role !== "admin") {
    redirect("/admin/orders");
  }

  let initialStaff: StaffMemberRow[] = [];

  try {
    const admin = createAdminClient();
    const [profilesRes, usersRes] = await Promise.all([
      admin.from("staff_profiles").select("id, name, role").order("name"),
      admin.auth.admin.listUsers({ perPage: 200 }),
    ]);

    const emailById = new Map<string, string>(
      (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""])
    );

    initialStaff = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      email: emailById.get(p.id) || null,
    }));
  } catch {
    initialStaff = [];
  }

  return (
    <StaffManager initialStaff={initialStaff} currentUserId={staff.id} />
  );
}

