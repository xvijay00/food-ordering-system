import { redirect } from "next/navigation";

import { TablesManager } from "@/components/admin/tables-manager";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";
import type { RestaurantTable } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminTablesPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }
  if (staff.role !== "admin") {
    redirect("/admin/orders");
  }

  let tables: RestaurantTable[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("restaurant_tables")
      .select("id, table_number, is_active")
      .order("table_number", { ascending: true });

    tables = data ?? [];
  } catch {
    tables = [];
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <TablesManager
      initialTables={tables}
      configuredSiteUrl={configuredSiteUrl}
    />
  );
}

