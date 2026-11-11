import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { getRestaurantAdminSettings } from "@/lib/restaurant-settings";
import { createAdminClient } from "@/lib/supabase-admin";

const updateSettingsSchema = z.strictObject({
  delivery_fee: z.number().finite().min(0).max(5000),
  min_order: z.number().finite().min(0).max(50000),
  shop_open: z.boolean(),
  restaurant_name: z
    .string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters.")
    .max(80, "Restaurant name is too long."),
  restaurant_phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(20, "Phone number is too long.")
    .regex(/^[+0-9\s()-]+$/, "Phone number contains invalid characters."),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getRestaurantAdminSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = updateSettingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid settings payload." },
        { status: 400 }
      );
    }

    const values = parsed.data;
    const admin = createAdminClient();

    const rows = [
      { key: "delivery_fee", value: values.delivery_fee },
      { key: "min_order", value: values.min_order },
      { key: "shop_open", value: values.shop_open },
      { key: "restaurant_name", value: values.restaurant_name },
      { key: "restaurant_phone", value: values.restaurant_phone },
    ];

    const { error } = await admin
      .from("settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: values });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

