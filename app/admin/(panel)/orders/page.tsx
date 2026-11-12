import { redirect } from "next/navigation";

import { LiveOrdersBoard } from "@/components/admin/live-orders-board";
import { fetchAdminOrdersList } from "@/lib/bakery-queries";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";
import type { OrderWithItems } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }

  let initialOrders: OrderWithItems[] = [];

  try {
    const admin = createAdminClient();
    const result = await fetchAdminOrdersList(admin, 150);
    initialOrders = result.orders;
  } catch {
    initialOrders = [];
  }

  return (
    <LiveOrdersBoard initialOrders={initialOrders} staffRole={staff.role} />
  );
}
