import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase-admin";

const tokenSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const parsedToken = tokenSchema.safeParse(token);

    if (!parsedToken.success) {
      return NextResponse.json(
        { error: "Invalid order tracking token." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id, order_token, order_no, order_type, table_id, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_at)"
      )
      .eq("order_token", parsedToken.data)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Could not load order details. Please try again." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const sortedHistory = [...(order.order_status_history ?? [])].sort(
      (a, b) =>
        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );

    return NextResponse.json(
      {
        order: {
          ...order,
          order_status_history: sortedHistory,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while loading your order." },
      { status: 500 }
    );
  }
}
