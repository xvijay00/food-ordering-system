import { NextResponse } from "next/server";

import { getEffectiveBasePrice } from "@/lib/bakery-constants";
import { isMissingColumnError } from "@/lib/bakery-queries";
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

// TODO: Replace in-memory Map rate limiter with Upstash Redis (@upstash/ratelimit)
// before deploying across multiple serverless/edge instances.
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
  try {
    // 1. Parse and strictly validate request body with Zod
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Please send valid JSON." },
        { status: 400 }
      );
    }

    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) {
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

    // 2. Read shop settings: reject with 403 if shop_open is false
    const { data: settingsRows, error: settingsError } = await admin
      .from("settings")
      .select("key, value")
      .in("key", ["delivery_fee", "min_order", "shop_open"]);

    if (settingsError) {
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

    // 3. Fetch all referenced menu_items, item_variants, and item_addons
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
      return NextResponse.json(
        { error: "Could not load menu items. Please try again." },
        { status: 500 }
      );
    }

    const menuMap = new Map<string, MenuRowWithOptions>(
      ((menuRows ?? []) as MenuRowWithOptions[]).map((row) => [row.id, row])
    );

    // Check total requested quantity per menuItemId against stock_quantity
    const requestedQtyByMenuId = new Map<string, number>();
    for (const reqItem of input.items) {
      requestedQtyByMenuId.set(
        reqItem.menuItemId,
        (requestedQtyByMenuId.get(reqItem.menuItemId) ?? 0) + reqItem.quantity
      );
    }

    // 4. Verify availability, stock, and recalculate all prices on the server
    let subtotal = 0;
    const orderItemSnapshots: Omit<TablesInsert<"order_items">, "order_id">[] =
      [];

    for (const [menuId, totalQty] of requestedQtyByMenuId.entries()) {
      const menuItem = menuMap.get(menuId);
      if (
        menuItem &&
        menuItem.stock_quantity !== null &&
        menuItem.stock_quantity !== undefined &&
        totalQty > Number(menuItem.stock_quantity)
      ) {
        const left = Math.max(0, Number(menuItem.stock_quantity));
        return NextResponse.json(
          {
            error:
              left === 0
                ? `"${menuItem.name}" is out of stock.`
                : `Only ${left} left in stock for "${menuItem.name}".`,
          },
          { status: 400 }
        );
      }
    }

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

    // 5. Rate limit: max 5 orders per IP per 10 minutes
    const clientIp = getClientIp(request);
    if (!checkAndRecordRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            "Too many orders placed from your network. Please wait a few minutes and try again.",
        },
        { status: 429 }
      );
    }

    const resolvedName = input.customerName?.trim() || "Guest";
    const resolvedPhone = input.customerPhone?.trim() || "N/A";
    const resolvedPreorderAt =
      input.preorderAt && input.preorderAt.trim().length > 0
        ? new Date(input.preorderAt.trim()).toISOString()
        : null;

    // 6. Insert into orders, order_items, and order_status_history (rollback on error)
    const orderPayload: TablesInsert<"orders"> = {
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
      notes: input.notes?.trim() || null,
      ...(bakeryColumnsAvailable && resolvedPreorderAt
        ? { preorder_at: resolvedPreorderAt }
        : {}),
    };

    let { data: createdOrder, error: orderInsertError } = await admin
      .from("orders")
      .insert(orderPayload)
      .select("id, order_token, order_no")
      .single();

    if (orderInsertError && isMissingColumnError(orderInsertError)) {
      const { preorder_at: _ignored, ...baseOrderPayload } = orderPayload;
      void _ignored;
      const retry = await admin
        .from("orders")
        .insert(baseOrderPayload)
        .select("id, order_token, order_no")
        .single();
      createdOrder = retry.data;
      orderInsertError = retry.error;
    }

    if (orderInsertError || !createdOrder) {
      return NextResponse.json(
        { error: "Failed to place your order. Please try again." },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        { error: "Failed to save your order items. Please try again." },
        { status: 500 }
      );
    }

    const { error: historyInsertError } = await admin
      .from("order_status_history")
      .insert({
        order_id: createdOrder.id,
        status: "placed",
        changed_by: null,
      });

    if (historyInsertError) {
      await admin.from("orders").delete().eq("id", createdOrder.id);
      return NextResponse.json(
        { error: "Failed to initialize order tracking. Please try again." },
        { status: 500 }
      );
    }

    // Best-effort stock decrement
    if (bakeryColumnsAvailable) {
      for (const [menuId, orderedQty] of requestedQtyByMenuId.entries()) {
        const menuItem = menuMap.get(menuId);
        if (
          menuItem &&
          menuItem.stock_quantity !== null &&
          menuItem.stock_quantity !== undefined
        ) {
          const nextStock = Math.max(0, Number(menuItem.stock_quantity) - orderedQty);
          await admin
            .from("menu_items")
            .update({
              stock_quantity: nextStock,
              is_available: nextStock > 0 ? menuItem.is_available : false,
            })
            .eq("id", menuId);
        }
      }
    }

    // Best-effort staff Web Push notification
    void sendStaffOrderPush({
      title: `New Order #${createdOrder.order_no}`,
      body: `Delivery order · ₹${total}`,
      url: "/admin/orders",
    });

    // 8. Return { orderToken, orderNo }
    return NextResponse.json(
      {
        orderToken: createdOrder.order_token,
        orderNo: createdOrder.order_no,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while placing your order." },
      { status: 500 }
    );
  }
}
