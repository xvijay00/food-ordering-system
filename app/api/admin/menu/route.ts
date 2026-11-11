import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

const variantInputSchema = z.strictObject({
  label: z.string().trim().min(1, "Variant label is required.").max(60),
  price: z.number().min(0, "Variant price must be 0 or higher."),
});

const addonInputSchema = z.strictObject({
  name: z.string().trim().min(1, "Add-on name is required.").max(80),
  price: z.number().min(0, "Add-on price must be 0 or higher."),
  is_active: z.boolean().default(true),
});

const createMenuItemSchema = z.strictObject({
  category_id: z.string().uuid("Please select a category."),
  name: z.string().trim().min(2, "Item name is required.").max(120),
  description: z.string().trim().max(400).nullable().optional(),
  price: z.number().min(0, "Price must be 0 or higher."),
  image_url: z.string().trim().url().nullable().optional(),
  is_veg: z.boolean().default(true),
  is_available: z.boolean().default(true),
  is_bestseller: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  variants: z.array(variantInputSchema).optional(),
  addons: z.array(addonInputSchema).optional(),
});

const updateMenuItemSchema = z.strictObject({
  id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  price: z.number().min(0).optional(),
  image_url: z.string().trim().url().nullable().optional(),
  is_veg: z.boolean().optional(),
  is_available: z.boolean().optional(),
  is_bestseller: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  variants: z.array(variantInputSchema).optional(),
  addons: z.array(addonInputSchema).optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  const [categoriesRes, itemsRes] = await Promise.all([
    admin
      .from("categories")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    admin
      .from("menu_items")
      .select(
        "id, category_id, name, description, price, image_url, is_veg, is_available, is_bestseller, sort_order, created_at, item_variants(id, item_id, label, price), item_addons(id, item_id, name, price, is_active)"
      )
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesRes.error || itemsRes.error) {
    return NextResponse.json(
      {
        error:
          categoriesRes.error?.message ??
          itemsRes.error?.message ??
          "Failed to load menu.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { categories: categoriesRes.data ?? [], items: itemsRes.data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMenuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid menu item data." },
      { status: 400 }
    );
  }

  const { variants, addons, ...itemFields } = parsed.data;
  const admin = createAdminClient();

  const { data: created, error: insertError } = await admin
    .from("menu_items")
    .insert({
      ...itemFields,
      description: itemFields.description || null,
      image_url: itemFields.image_url || null,
    })
    .select(
      "id, category_id, name, description, price, image_url, is_veg, is_available, is_bestseller, sort_order, created_at"
    )
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create menu item." },
      { status: 500 }
    );
  }

  if (variants && variants.length > 0) {
    await admin.from("item_variants").insert(
      variants.map((v) => ({
        item_id: created.id,
        label: v.label,
        price: v.price,
      }))
    );
  }

  if (addons && addons.length > 0) {
    await admin.from("item_addons").insert(
      addons.map((a) => ({
        item_id: created.id,
        name: a.name,
        price: a.price,
        is_active: a.is_active,
      }))
    );
  }

  return NextResponse.json({ item: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateMenuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update data." },
      { status: 400 }
    );
  }

  const { id, variants, addons, ...itemFields } = parsed.data;
  const admin = createAdminClient();

  if (Object.keys(itemFields).length > 0) {
    const { error: updateError } = await admin
      .from("menu_items")
      .update(itemFields)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (variants !== undefined) {
    await admin.from("item_variants").delete().eq("item_id", id);
    if (variants.length > 0) {
      await admin.from("item_variants").insert(
        variants.map((v) => ({
          item_id: id,
          label: v.label,
          price: v.price,
        }))
      );
    }
  }

  if (addons !== undefined) {
    await admin.from("item_addons").delete().eq("item_id", id);
    if (addons.length > 0) {
      await admin.from("item_addons").insert(
        addons.map((a) => ({
          item_id: id,
          name: a.name,
          price: a.price,
          is_active: a.is_active,
        }))
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsedId = z.string().uuid().safeParse(searchParams.get("id"));
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Valid item ID is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Check if this item is referenced in any past order_items
  const { data: pastOrderItem, error: orderCheckError } = await admin
    .from("order_items")
    .select("id")
    .eq("menu_item_id", parsedId.data)
    .limit(1)
    .maybeSingle();

  if (orderCheckError) {
    return NextResponse.json(
      { error: orderCheckError.message },
      { status: 500 }
    );
  }

  if (pastOrderItem) {
    const { error: markError } = await admin
      .from("menu_items")
      .update({ is_available: false })
      .eq("id", parsedId.data);

    if (markError) {
      return NextResponse.json({ error: markError.message }, { status: 500 });
    }

    return NextResponse.json({
      deleted: false,
      markedUnavailable: true,
      message:
        "This item appears in past orders, so it was marked unavailable instead of deleted to preserve order history.",
    });
  }

  const { error } = await admin
    .from("menu_items")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: true,
    markedUnavailable: false,
    message: "Item deleted from menu.",
  });
}
