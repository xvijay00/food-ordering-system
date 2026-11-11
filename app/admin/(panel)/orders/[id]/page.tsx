import { notFound, redirect } from "next/navigation";

import { OrderDetailBill } from "@/components/admin/order-detail-bill";
import { getStaff } from "@/lib/get-staff";
import { getRestaurantAdminSettings } from "@/lib/restaurant-settings";
import { createAdminClient } from "@/lib/supabase-admin";
import type { OrderWithItems } from "@/types/database";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }

  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  let order: OrderWithItems | null = null;
  let staffLookup: Record<string, { name: string; role: string }> = {};

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number, is_active), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_by, changed_at)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      notFound();
    }

    order = data as OrderWithItems;

    const changedByIds = Array.from(
      new Set(
        (order.order_status_history ?? [])
          .map((entry) => entry.changed_by)
          .filter((val): val is string => Boolean(val))
      )
    );

    if (changedByIds.length > 0) {
      const { data: staffRows } = await admin
        .from("staff_profiles")
        .select("id, name, role")
        .in("id", changedByIds);

      if (staffRows) {
        staffLookup = Object.fromEntries(
          staffRows.map((row) => [row.id, { name: row.name, role: row.role }])
        );
      }
    }
  } catch {
    notFound();
  }

  if (!order) {
    notFound();
  }

  const settings = await getRestaurantAdminSettings();

  return (
    <OrderDetailBill
      order={order}
      restaurantName={settings.restaurant_name}
      restaurantPhone={settings.restaurant_phone}
      staffLookup={staffLookup}
    />
  );
}

