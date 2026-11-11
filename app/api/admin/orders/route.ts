import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number, is_active), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_by, changed_at)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { orders: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load orders." },
      { status: 500 }
    );
  }
}

