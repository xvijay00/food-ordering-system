import { redirect } from "next/navigation";

import { LiveOrdersBoard } from "@/components/admin/live-orders-board";
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
    const { data } = await admin
      .from("orders")
      .select(
        "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number, is_active), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_by, changed_at)"
      )
      .order("created_at", { ascending: false })
      .limit(150);

    initialOrders = (data ?? []) as OrderWithItems[];
  } catch {
    initialOrders = [];
  }

  return (
    <LiveOrdersBoard initialOrders={initialOrders} staffRole={staff.role} />
  );
}

