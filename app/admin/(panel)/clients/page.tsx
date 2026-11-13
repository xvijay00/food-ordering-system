import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ClientOrderRecord,
  ClientRecordsView,
} from "@/components/admin/client-records-view";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Records & Order History | Baker's Nation Admin",
  description:
    "Comprehensive client order logs, purchase history, contact records, and customer insights for Baker's Nation bakery.",
};

export default async function AdminClientsPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }

  let orders: ClientOrderRecord[] = [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        `
        id,
        order_no,
        order_token,
        order_type,
        customer_name,
        customer_phone,
        delivery_address,
        status,
        payment_method,
        payment_status,
        subtotal,
        delivery_fee,
        total,
        notes,
        created_at,
        cancel_reason,
        order_items (
          id,
          item_name,
          variant_label,
          addons,
          selected_flavour,
          egg_preference,
          cake_message,
          custom_image_url,
          unit_price,
          quantity,
          line_total
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!error && data) {
      orders = (data as unknown) as ClientOrderRecord[];
    }
  } catch {
    orders = [];
  }

  return <ClientRecordsView orders={orders} />;
}

