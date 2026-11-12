import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaff } from "@/lib/get-staff";
import { fetchAdminOrderById } from "@/lib/bakery-queries";
import { createAdminClient } from "@/lib/supabase-admin";
import type { TablesUpdate } from "@/types/database";

const orderIdSchema = z.string().uuid("Invalid order ID.");

const updateOrderSchema = z
  .strictObject({
    status: z
      .enum([
        "placed",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "served",
        "delivered",
        "completed",
        "cancelled",
      ])
      .optional(),
    payment_status: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
    cancel_reason: z.string().trim().max(300).optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.payment_status !== undefined ||
      data.cancel_reason !== undefined,
    { message: "No update fields were provided." }
  );

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const parsedId = orderIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { order, error } = await fetchAdminOrderById(admin, parsedId.data);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(
    { order },
    { headers: { "Cache-Control": "no-store" } }
  );
}

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
    const parsedBody = updateOrderSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            parsedBody.error.issues[0]?.message ?? "Invalid order update payload.",
        },
        { status: 400 }
      );
    }

    const input = parsedBody.data;
    const admin = createAdminClient();

    const updatePayload: TablesUpdate<"orders"> = {};
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.payment_status !== undefined) {
      updatePayload.payment_status = input.payment_status;
    }
    if (input.cancel_reason !== undefined) {
      updatePayload.cancel_reason = input.cancel_reason;
    }

    const { data: updatedOrder, error: updateError } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", parsedId.data)
      .select(
        "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at"
      )
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (input.status !== undefined) {
      await admin.from("order_status_history").insert({
        order_id: updatedOrder.id,
        status: input.status,
        changed_by: staff.id,
      });
    }

    return NextResponse.json({ order: updatedOrder });
  } catch {
    return NextResponse.json(
      { error: "Failed to update order." },
      { status: 500 }
    );
  }
}
