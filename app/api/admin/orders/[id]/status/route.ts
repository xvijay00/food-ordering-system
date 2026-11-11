import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaff } from "@/lib/get-staff";
import { canRoleTransitionOrder } from "@/lib/order-transitions";
import { createAdminClient } from "@/lib/supabase-admin";
import type { TablesUpdate } from "@/types/database";

const orderIdSchema = z.string().uuid("Invalid order ID.");

const statusUpdateSchema = z
  .strictObject({
    status: z.enum([
      "confirmed",
      "preparing",
      "ready",
      "out_for_delivery",
      "served",
      "delivered",
      "completed",
      "cancelled",
    ]),
    cancel_reason: z.string().trim().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "cancelled" &&
      (!data.cancel_reason || data.cancel_reason.trim().length < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["cancel_reason"],
        message: "Please provide a reason for rejecting or cancelling this order.",
      });
    }
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const parsedId = orderIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = statusUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            parsedBody.error.issues[0]?.message ?? "Invalid status payload.",
        },
        { status: 400 }
      );
    }

    const { status: targetStatus, cancel_reason } = parsedBody.data;
    const admin = createAdminClient();

    const { data: existingOrder, error: fetchError } = await admin
      .from("orders")
      .select("id, status, order_type")
      .eq("id", parsedId.data)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const transition = canRoleTransitionOrder(
      staff.role,
      existingOrder.order_type,
      existingOrder.status,
      targetStatus
    );

    if (!transition.allowed) {
      const isRoleViolation =
        transition.reason?.includes("staff") ||
        transition.reason?.includes("Unauthorized");
      return NextResponse.json(
        { error: transition.reason ?? "Transition not allowed." },
        { status: isRoleViolation ? 403 : 400 }
      );
    }

    const updatePayload: TablesUpdate<"orders"> = {
      status: targetStatus,
    };
    if (targetStatus === "cancelled") {
      updatePayload.cancel_reason = cancel_reason?.trim() || null;
    }

    const { data: updatedOrder, error: updateError } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", existingOrder.id)
      .select(
        "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number, is_active), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_by, changed_at)"
      )
      .single();

    if (updateError || !updatedOrder) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update order status." },
        { status: 500 }
      );
    }

    const { error: historyError } = await admin
      .from("order_status_history")
      .insert({
        order_id: updatedOrder.id,
        status: targetStatus,
        changed_by: staff.id,
      });

    if (historyError) {
      return NextResponse.json(
        { error: "Order updated, but failed to write status history." },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: updatedOrder });
  } catch {
    return NextResponse.json(
      { error: "Failed to update order status." },
      { status: 500 }
    );
  }
}

