import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase-admin";
import type { AppSettings } from "@/types/database";

const DEFAULT_SETTINGS: AppSettings = {
  delivery_fee: 40,
  min_order: 150,
  shop_open: true,
};

function parseNumericSetting(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["delivery_fee", "min_order", "shop_open"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const map = new Map<string, unknown>(
      (data ?? []).map((row) => [row.key, row.value])
    );

    const settings: AppSettings = {
      delivery_fee: parseNumericSetting(
        map.get("delivery_fee"),
        DEFAULT_SETTINGS.delivery_fee
      ),
      min_order: parseNumericSetting(
        map.get("min_order"),
        DEFAULT_SETTINGS.min_order
      ),
      shop_open: parseBooleanSetting(
        map.get("shop_open"),
        DEFAULT_SETTINGS.shop_open
      ),
    };

    return NextResponse.json(settings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load shop settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

