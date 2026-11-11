import { RESTAURANT_CONFIG } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase-admin";
import type { RestaurantAdminSettings } from "@/types/database";

export const DEFAULT_RESTAURANT_ADMIN_SETTINGS: RestaurantAdminSettings = {
  delivery_fee: 40,
  min_order: 150,
  shop_open: true,
  restaurant_name: RESTAURANT_CONFIG.name,
  restaurant_phone: RESTAURANT_CONFIG.phone,
};

function parseSettingNumber(val: unknown, fallback: number): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseSettingBoolean(val: unknown, fallback: boolean): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return fallback;
}

function parseSettingString(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.trim().length > 0) {
    return val.trim();
  }
  return fallback;
}

export async function getRestaurantAdminSettings(): Promise<RestaurantAdminSettings> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select("key, value")
      .in("key", [
        "delivery_fee",
        "min_order",
        "shop_open",
        "restaurant_name",
        "restaurant_phone",
      ]);

    if (error || !data) {
      return DEFAULT_RESTAURANT_ADMIN_SETTINGS;
    }

    const map = new Map<string, unknown>(
      data.map((row) => [row.key, row.value])
    );

    return {
      delivery_fee: parseSettingNumber(
        map.get("delivery_fee"),
        DEFAULT_RESTAURANT_ADMIN_SETTINGS.delivery_fee
      ),
      min_order: parseSettingNumber(
        map.get("min_order"),
        DEFAULT_RESTAURANT_ADMIN_SETTINGS.min_order
      ),
      shop_open: parseSettingBoolean(
        map.get("shop_open"),
        DEFAULT_RESTAURANT_ADMIN_SETTINGS.shop_open
      ),
      restaurant_name: parseSettingString(
        map.get("restaurant_name"),
        DEFAULT_RESTAURANT_ADMIN_SETTINGS.restaurant_name
      ),
      restaurant_phone: parseSettingString(
        map.get("restaurant_phone"),
        DEFAULT_RESTAURANT_ADMIN_SETTINGS.restaurant_phone
      ),
    };
  } catch {
    return DEFAULT_RESTAURANT_ADMIN_SETTINGS;
  }
}

