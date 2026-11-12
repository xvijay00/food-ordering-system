import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Category,
  Database,
  MenuItemWithRelations,
  OrderItem,
  OrderWithItems,
} from "@/types/database";

export const MENU_ITEM_EXTENDED_SELECT =
  "id, category_id, name, description, price, discount_price, stock_quantity, image_url, image_urls, is_veg, is_available, is_bestseller, is_featured, flavours, egg_options, allow_custom_message, allow_custom_image, sort_order, created_at, item_variants(id, item_id, label, price), item_addons(id, item_id, name, price, is_active)";

export const MENU_ITEM_BASE_SELECT =
  "id, category_id, name, description, price, image_url, is_veg, is_available, is_bestseller, sort_order, created_at, item_variants(id, item_id, label, price), item_addons(id, item_id, name, price, is_active)";

export const ORDER_EXTENDED_SELECT =
  "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, preorder_at, cancel_reason, created_at, restaurant_tables(id, table_number, is_active), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, selected_flavour, egg_preference, cake_message, custom_image_url, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_by, changed_at)";

export const ORDER_BASE_SELECT =
  "id, order_token, order_no, order_type, table_id, customer_name, customer_phone, delivery_address, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number, is_active), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_by, changed_at)";

export const PUBLIC_ORDER_EXTENDED_SELECT =
  "id, order_token, order_no, order_type, table_id, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, preorder_at, cancel_reason, created_at, restaurant_tables(id, table_number), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, selected_flavour, egg_preference, cake_message, custom_image_url, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_at)";

export const PUBLIC_ORDER_BASE_SELECT =
  "id, order_token, order_no, order_type, table_id, status, payment_method, payment_status, subtotal, delivery_fee, total, notes, cancel_reason, created_at, restaurant_tables(id, table_number), order_items(id, order_id, menu_item_id, item_name, variant_label, addons, unit_price, quantity, line_total), order_status_history(id, order_id, status, changed_at)";

export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const msg = error.message ?? "";
  return (
    /column .* does not exist/i.test(msg) ||
    /Could not find the .* column/i.test(msg)
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function normalizeMenuItem(
  raw: Record<string, unknown>
): MenuItemWithRelations {
  const imageUrl =
    typeof raw.image_url === "string" && raw.image_url.length > 0
      ? raw.image_url
      : null;
  const rawImageUrls = asStringArray(raw.image_urls);
  const imageUrls =
    rawImageUrls.length > 0 ? rawImageUrls : imageUrl ? [imageUrl] : [];

  const variants = Array.isArray(raw.item_variants)
    ? [
        ...(raw.item_variants as NonNullable<
          MenuItemWithRelations["item_variants"]
        >),
      ].sort((a, b) => Number(a.price) - Number(b.price))
    : [];

  return {
    id: String(raw.id),
    category_id: String(raw.category_id),
    name: String(raw.name),
    description: typeof raw.description === "string" ? raw.description : null,
    price: Number(raw.price),
    discount_price:
      raw.discount_price !== null && raw.discount_price !== undefined
        ? Number(raw.discount_price)
        : null,
    stock_quantity:
      raw.stock_quantity !== null && raw.stock_quantity !== undefined
        ? Number(raw.stock_quantity)
        : null,
    image_url: imageUrls[0] ?? imageUrl,
    image_urls: imageUrls,
    is_veg: Boolean(raw.is_veg ?? true),
    is_available: Boolean(raw.is_available ?? true),
    is_bestseller: Boolean(raw.is_bestseller ?? false),
    is_featured: Boolean(raw.is_featured ?? false),
    flavours: asStringArray(raw.flavours),
    egg_options: asStringArray(raw.egg_options),
    allow_custom_message: Boolean(raw.allow_custom_message ?? false),
    allow_custom_image: Boolean(raw.allow_custom_image ?? false),
    sort_order: Number(raw.sort_order ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    item_variants: variants,
    item_addons: Array.isArray(raw.item_addons)
      ? (raw.item_addons as MenuItemWithRelations["item_addons"])
      : [],
  };
}

export function normalizeOrderItem(raw: Record<string, unknown>): OrderItem {
  return {
    id: String(raw.id),
    order_id: String(raw.order_id),
    menu_item_id: typeof raw.menu_item_id === "string" ? raw.menu_item_id : null,
    item_name: String(raw.item_name),
    variant_label: typeof raw.variant_label === "string" ? raw.variant_label : null,
    addons: (raw.addons as OrderItem["addons"]) ?? [],
    selected_flavour:
      typeof raw.selected_flavour === "string" ? raw.selected_flavour : null,
    egg_preference:
      typeof raw.egg_preference === "string" ? raw.egg_preference : null,
    cake_message:
      typeof raw.cake_message === "string" ? raw.cake_message : null,
    custom_image_url:
      typeof raw.custom_image_url === "string" ? raw.custom_image_url : null,
    unit_price: Number(raw.unit_price),
    quantity: Number(raw.quantity),
    line_total: Number(raw.line_total),
  };
}

export function normalizeOrder(raw: Record<string, unknown>): OrderWithItems {
  const rawItems = Array.isArray(raw.order_items)
    ? (raw.order_items as Record<string, unknown>[]).map(normalizeOrderItem)
    : [];

  return {
    ...(raw as unknown as OrderWithItems),
    preorder_at: typeof raw.preorder_at === "string" ? raw.preorder_at : null,
    order_items: rawItems,
  };
}

export async function fetchMenuCatalog(
  client: SupabaseClient<Database>,
  options: { activeCategoriesOnly?: boolean } = {}
): Promise<{
  categories: Category[];
  items: MenuItemWithRelations[];
  bakerySchemaReady: boolean;
  error: string | null;
}> {
  let categoriesQuery = client
    .from("categories")
    .select("id, name, sort_order, is_active")
    .order("sort_order", { ascending: true });

  if (options.activeCategoriesOnly) {
    categoriesQuery = categoriesQuery.eq("is_active", true);
  }

  const [categoriesRes, extendedItemsRes] = await Promise.all([
    categoriesQuery,
    client
      .from("menu_items")
      .select(MENU_ITEM_EXTENDED_SELECT)
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesRes.error) {
    return {
      categories: [],
      items: [],
      bakerySchemaReady: true,
      error: categoriesRes.error.message,
    };
  }

  if (!extendedItemsRes.error) {
    return {
      categories: categoriesRes.data ?? [],
      items: ((extendedItemsRes.data ?? []) as unknown as Record<string, unknown>[]).map(
        normalizeMenuItem
      ),
      bakerySchemaReady: true,
      error: null,
    };
  }

  if (!isMissingColumnError(extendedItemsRes.error)) {
    return {
      categories: categoriesRes.data ?? [],
      items: [],
      bakerySchemaReady: true,
      error: extendedItemsRes.error.message,
    };
  }

  const baseItemsRes = await client
    .from("menu_items")
    .select(MENU_ITEM_BASE_SELECT)
    .order("sort_order", { ascending: true });

  if (baseItemsRes.error) {
    return {
      categories: categoriesRes.data ?? [],
      items: [],
      bakerySchemaReady: false,
      error: baseItemsRes.error.message,
    };
  }

  return {
    categories: categoriesRes.data ?? [],
    items: ((baseItemsRes.data ?? []) as unknown as Record<string, unknown>[]).map(
      normalizeMenuItem
    ),
    bakerySchemaReady: false,
    error: null,
  };
}

export async function fetchAdminOrdersList(
  client: SupabaseClient<Database>,
  limit = 150
): Promise<{ orders: OrderWithItems[]; error: string | null }> {
  const extendedRes = await client
    .from("orders")
    .select(ORDER_EXTENDED_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!extendedRes.error) {
    return {
      orders: ((extendedRes.data ?? []) as unknown as Record<string, unknown>[]).map(
        normalizeOrder
      ),
      error: null,
    };
  }

  if (!isMissingColumnError(extendedRes.error)) {
    return { orders: [], error: extendedRes.error.message };
  }

  const baseRes = await client
    .from("orders")
    .select(ORDER_BASE_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (baseRes.error) {
    return { orders: [], error: baseRes.error.message };
  }

  return {
    orders: ((baseRes.data ?? []) as unknown as Record<string, unknown>[]).map(
      normalizeOrder
    ),
    error: null,
  };
}

export async function fetchAdminOrderById(
  client: SupabaseClient<Database>,
  orderId: string
): Promise<{ order: OrderWithItems | null; error: string | null }> {
  const extendedRes = await client
    .from("orders")
    .select(ORDER_EXTENDED_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (!extendedRes.error) {
    return {
      order: extendedRes.data
        ? normalizeOrder(extendedRes.data as unknown as Record<string, unknown>)
        : null,
      error: null,
    };
  }

  if (!isMissingColumnError(extendedRes.error)) {
    return { order: null, error: extendedRes.error.message };
  }

  const baseRes = await client
    .from("orders")
    .select(ORDER_BASE_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (baseRes.error) {
    return { order: null, error: baseRes.error.message };
  }

  return {
    order: baseRes.data
      ? normalizeOrder(baseRes.data as unknown as Record<string, unknown>)
      : null,
    error: null,
  };
}

export async function fetchPublicOrderByToken(
  client: SupabaseClient<Database>,
  token: string
): Promise<{ order: OrderWithItems | null; error: string | null }> {
  const extendedRes = await client
    .from("orders")
    .select(PUBLIC_ORDER_EXTENDED_SELECT)
    .eq("order_token", token)
    .maybeSingle();

  if (!extendedRes.error) {
    return {
      order: extendedRes.data
        ? normalizeOrder(extendedRes.data as unknown as Record<string, unknown>)
        : null,
      error: null,
    };
  }

  if (!isMissingColumnError(extendedRes.error)) {
    return { order: null, error: extendedRes.error.message };
  }

  const baseRes = await client
    .from("orders")
    .select(PUBLIC_ORDER_BASE_SELECT)
    .eq("order_token", token)
    .maybeSingle();

  if (baseRes.error) {
    return { order: null, error: baseRes.error.message };
  }

  return {
    order: baseRes.data
      ? normalizeOrder(baseRes.data as unknown as Record<string, unknown>)
      : null,
    error: null,
  };
}

