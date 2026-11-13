import { NextResponse } from "next/server";

import { getEffectiveBasePrice } from "@/lib/bakery-constants";
import { isMissingColumnError } from "@/lib/bakery-queries";
import { logger } from "@/lib/logger";
import { sendStaffOrderPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase-admin";
import { placeOrderSchema } from "@/lib/validations";
import type { OrderItemAddon, TablesInsert } from "@/types/database";

type MenuRowWithOptions = {
  id: string;
  name: string;
  price: number;
  discount_price?: number | null;
  stock_quantity?: number | null;
  is_available: boolean;
  flavours?: string[] | null;
  egg_options?: string[] | null;
  allow_custom_message?: boolean | null;
  allow_custom_image?: boolean | null;
  item_variants: { id: string; label: string; price: number }[];
  item_addons: { id: string; name: string; price: number; is_active: boolean }[];
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ORDERS = 5;
const orderRateLimitStore = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function checkAndRecordRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentTimestamps = (orderRateLimitStore.get(ip) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_ORDERS) {
    orderRateLimitStore.set(ip, recentTimestamps);
    return false;
  }

  recentTimestamps.push(now);
  orderRateLimitStore.set(ip, recentTimestamps);
  return true;
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId =
    request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    // 1. Parse and strictly validate request body with Zod
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn("Order request failed: invalid JSON body", { requestId });
      return NextResponse.json(
        { error: "Invalid request body. Please send valid JSON." },
        { status: 400 }
      );
    }

    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("Order validation failed", {
        requestId,
        issues: parsed.error.issues,
      });
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid order details.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const admin = createAdminClient();
    const resolvedPhone = input.customerPhone?.trim() || "N/A";
    const resolvedName = input.customerName?.trim() || "Guest";
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      request.headers.get("x-idempotency-key")?.trim() ||
      null;

    // 2. IDEMPOTENCY CHECK: Prevent duplicate orders from double-clicks or retries
    if (idempotencyKey) {
      try {
        const { data: existingByKey } = await admin
          .from("orders")
          .select("id, order_token, order_no")
          .eq("idempotency_key" as "id", idempotencyKey as string)
          .maybeSingle();

        if (existingByKey) {
          logger.info("Duplicate order prevented via idempotency_key", {
            requestId,
            idempotencyKey,
            orderNo: existingByKey.order_no,
            durationMs: Date.now() - startTime,
          });
          return NextResponse.json({
            orderToken: existingByKey.order_token,
            orderNo: existingByKey.order_no,
          });
        }
      } catch {
        // Fallback gracefully if idempotency_key column has not been added to DB yet
      }

      // Secondary check: look for recent order with matching idempotency marker in notes
      if (resolvedPhone !== "N/A") {
        const recentWindow = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentOrders } = await admin
          .from("orders")
          .select("id, order_token, order_no, notes")
          .eq("customer_phone", resolvedPhone)
          .gte("created_at", recentWindow)
          .limit(5);

        const matched = recentOrders?.find((o) =>
          o.notes?.includes(`[idem:${idempotencyKey}]`)
        );
        if (matched) {
          logger.info("Duplicate order prevented via recent window check", {
            requestId,
            idempotencyKey,
            orderNo: matched.order_no,
            durationMs: Date.now() - startTime,
          });
          return NextResponse.json({
            orderToken: matched.order_token,
            orderNo: matched.order_no,
          });
        }
      }
    }

    // 3. PERSISTENT RATE LIMIT CHECK (Phone-level & IP-level)
    if (resolvedPhone !== "N/A") {
      const tenMinutesAgo = new Date(
        Date.now() - RATE_LIMIT_WINDOW_MS
      ).toISOString();
      const { count: phoneOrderCount } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_phone", resolvedPhone)
        .gte("created_at", tenMinutesAgo);

      if (phoneOrderCount !== null && phoneOrderCount >= RATE_LIMIT_MAX_ORDERS) {
        logger.warn("Order rate limit exceeded for customer phone", {
          requestId,
          phone: resolvedPhone,
          phoneOrderCount,
        });
        return NextResponse.json(
          {
            error:
              "Too many orders placed from this mobile number recently. Please wait a few minutes and try again.",
          },
          { status: 429 }
        );
      }
    }

    const clientIp = getClientIp(request);
    if (!checkAndRecordRateLimit(clientIp)) {
      logger.warn("Order rate limit exceeded for IP", { requestId, clientIp });
      return NextResponse.json(
        {
          error:
            "Too many orders placed from your network. Please wait a few minutes and try again.",
        },
        { status: 429 }
      );
    }

    // 4. Read shop settings: reject with 403 if shop_open is false
    const { data: settingsRows, error: settingsError } = await admin
      .from("settings")
      .select("key, value")
      .in("key", ["delivery_fee", "min_order", "shop_open"]);

    if (settingsError) {
      logger.error("Could not read restaurant settings", settingsError, {
        requestId,
      });
      return NextResponse.json(
        { error: "Could not read restaurant settings. Please try again." },
        { status: 500 }
      );
    }

    const settingsMap = new Map<string, unknown>(
      (settingsRows ?? []).map((row) => [row.key, row.value])
    );
    const shopOpen = parseBool(settingsMap.get("shop_open"), true);
    const deliveryFeeSetting = parseNumber(settingsMap.get("delivery_fee"), 40);
    const minOrder = parseNumber(settingsMap.get("min_order"), 150);

    if (!shopOpen) {
      return NextResponse.json(
        { error: "Restaurant is closed and not accepting orders right now." },
        { status: 403 }
      );
    }

    // 5. Fetch all referenced menu_items, item_variants, and item_addons
    const uniqueMenuIds = [
      ...new Set(input.items.map((item) => item.menuItemId)),
    ];
    let { data: menuRows, error: menuError } = await admin
      .from("menu_items")
      .select(
        "id, name, price, discount_price, stock_quantity, is_available, flavours, egg_options, allow_custom_message, allow_custom_image, item_variants(id, label, price), item_addons(id, name, price, is_active)"
      )
      .in("id", uniqueMenuIds);

    let bakeryColumnsAvailable = true;
    if (menuError && isMissingColumnError(menuError)) {
      bakeryColumnsAvailable = false;
      const fallback = await admin
        .from("menu_items")
        .select(
          "id, name, price, is_available, item_variants(id, label, price), item_addons(id, name, price, is_active)"
        )
        .in("id", uniqueMenuIds);
      menuRows = fallback.data as typeof menuRows;
      menuError = fallback.error;
    }

    if (menuError) {
      logger.error("Could not load menu items", menuError, { requestId });
      return NextResponse.json(
        { error: "Could not load menu items. Please try again." },
        { status: 500 }
      );
    }

    const menuMap = new Map<string, MenuRowWithOptions>(
      ((menuRows ?? []) as MenuRowWithOptions[]).map((row) => [row.id, row])
    );

    // Group total requested quantity per menuItemId
    const requestedQtyByMenuId = new Map<string, number>();
    for (const reqItem of input.items) {
      requestedQtyByMenuId.set(
        reqItem.menuItemId,
        (requestedQtyByMenuId.get(reqItem.menuItemId) ?? 0) + reqItem.quantity
      );
    }

    // 6. Recalculate all prices strictly on server
    let subtotal = 0;
    const orderItemSnapshots: Omit<TablesInsert<"order_items">, "order_id">[] =
      [];

    for (const reqItem of input.items) {
      const menuItem = menuMap.get(reqItem.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          {
            error: `Menu item (${reqItem.menuItemId}) does not exist.`,
          },
          { status: 400 }
        );
      }

      if (!menuItem.is_available) {
        return NextResponse.json(
          { error: `"${menuItem.name}" is currently sold out.` },
          { status: 400 }
        );
      }

      let basePrice = getEffectiveBasePrice(menuItem).sellingPrice;
      let resolvedVariantLabel: string | null = null;

      if (reqItem.variantId) {
        const matchedVariant = menuItem.item_variants.find(
          (variant) => variant.id === reqItem.variantId
        );
        if (!matchedVariant) {
          return NextResponse.json(
            {
              error: `The selected option for "${menuItem.name}" is no longer available.`,
            },
            { status: 400 }
          );
        }
        basePrice = Number(matchedVariant.price);
        resolvedVariantLabel = matchedVariant.label;
      } else if (menuItem.item_variants.length > 0) {
        return NextResponse.json(
          { error: `Please choose a portion option for "${menuItem.name}".` },
          { status: 400 }
        );
      }

      const activeAddonsMap = new Map(
        menuItem.item_addons
          .filter((addon) => addon.is_active)
          .map((addon) => [addon.id, addon])
      );

      const resolvedAddons: OrderItemAddon[] = [];
      let addonsTotal = 0;

      for (const addonId of reqItem.addonIds ?? []) {
        const addon = activeAddonsMap.get(addonId);
        if (!addon) {
          return NextResponse.json(
            {
              error: `One of the selected add-ons for "${menuItem.name}" is unavailable.`,
            },
            { status: 400 }
          );
        }
        const price = Number(addon.price);
        addonsTotal += price;
        resolvedAddons.push({
          id: addon.id,
          name: addon.name,
          price,
        });
      }

      const unitPrice = Number((basePrice + addonsTotal).toFixed(2));
      const lineTotal = Number((unitPrice * reqItem.quantity).toFixed(2));
      subtotal = Number((subtotal + lineTotal).toFixed(2));

      orderItemSnapshots.push({
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        variant_label: resolvedVariantLabel,
        addons: resolvedAddons,
        selected_flavour: reqItem.selectedFlavour?.trim() || null,
        egg_preference: reqItem.eggPreference?.trim() || null,
        cake_message: reqItem.cakeMessage?.trim() || null,
        custom_image_url: reqItem.customImageUrl?.trim() || null,
        unit_price: unitPrice,
        quantity: reqItem.quantity,
        line_total: lineTotal,
      });
    }

    if (input.orderType === "delivery" && subtotal < minOrder) {
      return NextResponse.json(
        {
          error: `Delivery orders require a minimum subtotal of ₹${minOrder}.`,
        },
        { status: 400 }
      );
    }

    const deliveryFee = deliveryFeeSetting;
    const total = Number((subtotal + deliveryFee).toFixed(2));

    const resolvedPreorderAt =
      input.preorderAt && input.preorderAt.trim().length > 0
        ? new Date(input.preorderAt.trim()).toISOString()
        : null;

    // 7. ATOMIC CONDITIONAL INVENTORY RESERVATION (Race-condition safe via OCC)
    const reservedItems: { id: string; qty: number; initialStock: number }[] = [];
    if (bakeryColumnsAvailable) {
      for (const [menuId, orderedQty] of requestedQtyByMenuId.entries()) {
        const menuItem = menuMap.get(menuId);
        if (
          menuItem &&
          menuItem.stock_quantity !== null &&
          menuItem.stock_quantity !== undefined
        ) {
          let reserved = false;
          const MAX_OCC_RETRIES = 4;

          for (let attempt = 0; attempt < MAX_OCC_RETRIES; attempt++) {
            const { data: freshItem, error: fetchErr } = await admin
              .from("menu_items")
              .select("id, name, stock_quantity, is_available")
              .eq("id", menuId)
              .single();

            if (fetchErr || !freshItem) {
              break;
            }

            const currentStock = Number(freshItem.stock_quantity ?? 0);
            if (currentStock < orderedQty) {
              break;
            }

            const nextStock = Math.max(0, currentStock - orderedQty);
            // Optimistic concurrency guard: update only if stock_quantity is STILL currentStock
            const { data: updatedItem, error: updateErr } = await admin
              .from("menu_items")
              .update({
                stock_quantity: nextStock,
                is_available: nextStock > 0 ? freshItem.is_available : false,
              })
              .eq("id", menuId)
              .eq("stock_quantity", currentStock)
              .select("id, stock_quantity");

            if (!updateErr && updatedItem && updatedItem.length > 0) {
              reserved = true;
              reservedItems.push({
                id: menuId,
                qty: orderedQty,
                initialStock: currentStock,
              });
              break;
            }

            // Stale snapshot caused by concurrent checkout; retry with small jitter
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 25 + 10)
            );
          }

          if (!reserved) {
            logger.warn(
              "Inventory reservation failed: item depleted concurrently",
              {
                requestId,
                menuItemId: menuId,
                requestedQty: orderedQty,
              }
            );

            // Roll back any previously reserved items in this order
            for (const r of reservedItems) {
              await admin
                .from("menu_items")
                .update({ stock_quantity: r.initialStock, is_available: true })
                .eq("id", r.id);
            }

            return NextResponse.json(
              {
                error: `"${menuItem.name}" was just reserved by another customer. Please refresh and check availability.`,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // Helper to rollback reserved inventory if order insertion fails
    const rollbackInventory = async () => {
      for (const r of reservedItems) {
        try {
          await admin
            .from("menu_items")
            .update({ stock_quantity: r.initialStock, is_available: true })
            .eq("id", r.id);
        } catch (rbErr) {
          logger.error("Failed to rollback stock after order failure", rbErr, {
            requestId,
            menuItemId: r.id,
          });
        }
      }
    };

    // 8. Insert order record (with idempotency marker embedded if column missing)
    const notesWithMarker = idempotencyKey
      ? [input.notes?.trim(), `[idem:${idempotencyKey}]`].filter(Boolean).join(" ")
      : input.notes?.trim() || null;

    const orderPayload: TablesInsert<"orders"> & { idempotency_key?: string | null } = {
      order_type: "delivery",
      table_id: null,
      customer_name: resolvedName,
      customer_phone: resolvedPhone,
      delivery_address: input.deliveryAddress?.trim() || null,
      status: "placed",
      payment_method: input.paymentMethod,
      payment_status: "pending",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      notes: notesWithMarker,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      ...(bakeryColumnsAvailable && resolvedPreorderAt
        ? { preorder_at: resolvedPreorderAt }
        : {}),
    };

    let { data: createdOrder, error: orderInsertError } = await admin
      .from("orders")
      .insert(orderPayload as TablesInsert<"orders">)
      .select("id, order_token, order_no")
      .single();

    if (orderInsertError && isMissingColumnError(orderInsertError)) {
      // Retry without optional columns if schema migration is pending
      const { preorder_at: _ignored, idempotency_key: _ik, ...baseOrderPayload } =
        orderPayload;
      void _ignored;
      void _ik;

      const retry = await admin
        .from("orders")
        .insert(baseOrderPayload as TablesInsert<"orders">)
        .select("id, order_token, order_no")
        .single();
      createdOrder = retry.data;
      orderInsertError = retry.error;
    }

    if (orderInsertError || !createdOrder) {
      await rollbackInventory();
      logger.error("Failed to insert order", orderInsertError, { requestId });
      return NextResponse.json(
        { error: "Failed to place your order. Please try again." },
        { status: 500 }
      );
    }

    // 9. Insert order items
    const orderItemsToInsert = orderItemSnapshots.map((item) => ({
      ...item,
      order_id: createdOrder.id,
    }));

    let { error: itemsInsertError } = await admin
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsInsertError && isMissingColumnError(itemsInsertError)) {
      const strippedItems = orderItemsToInsert.map(
        ({
          selected_flavour: _sf,
          egg_preference: _ep,
          cake_message: _cm,
          custom_image_url: _ci,
          ...rest
        }) => {
          void _sf;
          void _ep;
          void _cm;
          void _ci;
          return rest;
        }
      );
      const retryItems = await admin.from("order_items").insert(strippedItems);
      itemsInsertError = retryItems.error;
    }

    if (itemsInsertError) {
      await admin.from("orders").delete().eq("id", createdOrder.id);
      await rollbackInventory();
      logger.error("Failed to save order items", itemsInsertError, { requestId });
      return NextResponse.json(
        { error: "Failed to save your order items. Please try again." },
        { status: 500 }
      );
    }

    // 10. Insert initial order status history
    const { error: historyInsertError } = await admin
      .from("order_status_history")
      .insert({
        order_id: createdOrder.id,
        status: "placed",
        changed_by: null,
      });

    if (historyInsertError) {
      await admin.from("orders").delete().eq("id", createdOrder.id);
      await rollbackInventory();
      logger.error("Failed to initialize order tracking", historyInsertError, {
        requestId,
      });
      return NextResponse.json(
        { error: "Failed to initialize order tracking. Please try again." },
        { status: 500 }
      );
    }

    // Best-effort staff Web Push notification
    void sendStaffOrderPush({
      title: `New Order #${createdOrder.order_no}`,
      body: `Delivery order · ₹${total}`,
      url: "/admin/orders",
    });

    logger.info("Order placed successfully", {
      requestId,
      orderNo: createdOrder.order_no,
      orderId: createdOrder.id,
      total,
      durationMs: Date.now() - startTime,
    });

    // 11. Return { orderToken, orderNo }
    return NextResponse.json(
      {
        orderToken: createdOrder.order_token,
        orderNo: createdOrder.order_no,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("Unhandled exception in order placement", err, { requestId });
    return NextResponse.json(
      { error: "Something went wrong while placing your order." },
      { status: 500 }
    );
  }
}
