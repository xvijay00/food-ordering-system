import { getStaff } from "@/lib/get-staff";
import type { StaffProfile } from "@/types/database";

export type StaffSession = {
  userId: string;
  staff: StaffProfile;
};

export async function getStaffSession(): Promise<StaffSession | null> {
  const staff = await getStaff();
  if (!staff) return null;
  return { userId: staff.id, staff };
}

export async function getAdminSession(): Promise<StaffSession | null> {
  const session = await getStaffSession();
  if (!session || session.staff.role !== "admin") {
    return null;
  }
  return session;
}
