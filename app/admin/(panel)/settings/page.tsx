import { redirect } from "next/navigation";

import { SettingsManager } from "@/components/admin/settings-manager";
import { getStaff } from "@/lib/get-staff";
import { getRestaurantAdminSettings } from "@/lib/restaurant-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }
  if (staff.role !== "admin") {
    redirect("/admin/orders");
  }

  const settings = await getRestaurantAdminSettings();

  return <SettingsManager initialSettings={settings} />;
}

