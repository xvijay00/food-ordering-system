import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchAdminOrderById } from "@/lib/bakery-queries";
import { getStaff } from "@/lib/get-staff";
import { logger } from "@/lib/logger";
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
    customCakePrice: z.coerce
      .number()
      .min(1, "Cake price must be at least ₹1")
      .optional(),
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

    // Handle Custom Design Cake price finalization on confirmation
    if (targetStatus === "confirmed") {
      const { data: orderItems } = await admin
        .from("order_items")
        .select("id, item_name, unit_price, quantity, custom_image_url")
        .eq("order_id", existingOrder.id);

      const customCakeItem = orderItems?.find(
        (it) =>
          it.custom_image_url ||
          Number(it.unit_price) === 0 ||
          it.item_name.toLowerCase().includes("custom")
      );

      if (customCakeItem && Number(customCakeItem.unit_price) === 0) {
        if (!parsedBody.data.customCakePrice) {
          return NextResponse.json(
            {
              error:
                "Please enter the agreed cake price after calling customer before confirming this custom cake order.",
            },
            { status: 400 }
          );
        }
      }

      if (customCakeItem && parsedBody.data.customCakePrice) {
        const price = Number(parsedBody.data.customCakePrice);
        const lineTotal = Number((price * customCakeItem.quantity).toFixed(2));

        await admin
          .from("order_items")
          .update({
            unit_price: price,
            line_total: lineTotal,
          })
          .eq("id", customCakeItem.id);

        const otherItemsTotal = (orderItems || [])
          .filter((it) => it.id !== customCakeItem.id)
          .reduce((sum, it) => sum + Number(it.unit_price) * it.quantity, 0);
        const newSubtotal = Number((otherItemsTotal + lineTotal).toFixed(2));

        const { data: currentFullOrder } = await admin
          .from("orders")
          .select("delivery_fee")
          .eq("id", existingOrder.id)
          .single();
        const deliveryFee = Number(currentFullOrder?.delivery_fee ?? 0);
        const newTotal = Number((newSubtotal + deliveryFee).toFixed(2));

        updatePayload.subtotal = newSubtotal;
        updatePayload.total = newTotal;
      }
    }

    const { error: updateError } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", existingOrder.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message ?? "Failed to update order status." },
        { status: 500 }
      );
    }

    // Automatically restore inventory when an active order is cancelled
    if (targetStatus === "cancelled" && existingOrder.status !== "cancelled") {
      try {
        const { data: cancelledItems } = await admin
          .from("order_items")
          .select("menu_item_id, quantity")
          .eq("order_id", existingOrder.id);

        if (cancelledItems && cancelledItems.length > 0) {
          for (const ci of cancelledItems) {
            if (!ci.menu_item_id) continue;
            const { data: currentItem } = await admin
              .from("menu_items")
              .select("id, stock_quantity")
              .eq("id", ci.menu_item_id)
              .maybeSingle();

            if (
              currentItem &&
              currentItem.stock_quantity !== null &&
              currentItem.stock_quantity !== undefined
            ) {
              const restoredStock =
                Number(currentItem.stock_quantity) + ci.quantity;
              await admin
                .from("menu_items")
                .update({
                  stock_quantity: restoredStock,
                  is_available: true,
                })
                .eq("id", ci.menu_item_id);

              logger.info("Restocked cancelled order item", {
                orderId: existingOrder.id,
                menuItemId: ci.menu_item_id,
                restoredQuantity: ci.quantity,
                newStock: restoredStock,
              });
            }
          }
        }
      } catch (restockErr) {
        logger.error(
          "Failed to restock items for cancelled order",
          restockErr,
          { orderId: existingOrder.id }
        );
      }
    }

    const { error: historyError } = await admin
      .from("order_status_history")
      .insert({
        order_id: existingOrder.id,
        status: targetStatus,
        changed_by: staff.id,
      });

    if (historyError) {
      return NextResponse.json(
        { error: "Order updated, but failed to write status history." },
        { status: 500 }
      );
    }

    const { order: updatedOrder, error: reloadError } = await fetchAdminOrderById(
      admin,
      existingOrder.id
    );

    if (reloadError || !updatedOrder) {
      return NextResponse.json(
        { error: reloadError ?? "Order updated, but failed to reload details." },
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

