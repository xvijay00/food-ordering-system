import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import {
  fetchMenuCatalog,
  isMissingColumnError,
  normalizeMenuItem,
} from "@/lib/bakery-queries";
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

const createMenuItemSchema = z
  .strictObject({
    category_id: z.string().uuid("Please select a category."),
    name: z.string().trim().min(2, "Item name is required.").max(120),
    description: z.string().trim().max(400).nullable().optional(),
    price: z.number().min(0, "Price must be 0 or higher."),
    discount_price: z.number().min(0).nullable().optional(),
    stock_quantity: z.number().int().min(0).nullable().optional(),
    image_url: z.string().trim().url().nullable().optional(),
    image_urls: z.array(z.string().trim().url()).max(10).optional(),
    is_veg: z.boolean().default(true),
    is_available: z.boolean().default(true),
    is_bestseller: z.boolean().default(false),
    is_featured: z.boolean().default(false),
    flavours: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    egg_options: z.array(z.string().trim().min(1).max(30)).max(5).optional(),
    allow_custom_message: z.boolean().default(false),
    allow_custom_image: z.boolean().default(false),
    sort_order: z.number().int().min(0).default(0),
    variants: z.array(variantInputSchema).optional(),
    addons: z.array(addonInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discount_price !== null &&
      data.discount_price !== undefined &&
      data.discount_price >= data.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discount_price"],
        message: "Offer/discount price must be lower than the base price.",
      });
    }
  });

const updateMenuItemSchema = z
  .strictObject({
    id: z.string().uuid(),
    category_id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(400).nullable().optional(),
    price: z.number().min(0).optional(),
    discount_price: z.number().min(0).nullable().optional(),
    stock_quantity: z.number().int().min(0).nullable().optional(),
    image_url: z.string().trim().url().nullable().optional(),
    image_urls: z.array(z.string().trim().url()).max(10).optional(),
    is_veg: z.boolean().optional(),
    is_available: z.boolean().optional(),
    is_bestseller: z.boolean().optional(),
    is_featured: z.boolean().optional(),
    flavours: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    egg_options: z.array(z.string().trim().min(1).max(30)).max(5).optional(),
    allow_custom_message: z.boolean().optional(),
    allow_custom_image: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
    variants: z.array(variantInputSchema).optional(),
    addons: z.array(addonInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.price !== undefined &&
      data.discount_price !== null &&
      data.discount_price !== undefined &&
      data.discount_price >= data.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discount_price"],
        message: "Offer/discount price must be lower than the base price.",
      });
    }
  });

function resolveImageFields(
  imageUrls?: string[],
  imageUrl?: string | null
): { image_url?: string | null; image_urls?: string[] } {
  if (imageUrls !== undefined) {
    const clean = imageUrls.filter(Boolean);
    return {
      image_urls: clean,
      image_url: clean[0] ?? null,
    };
  }
  if (imageUrl !== undefined) {
    return {
      image_url: imageUrl || null,
      image_urls: imageUrl ? [imageUrl] : [],
    };
  }
  return {};
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  const catalog = await fetchMenuCatalog(admin);

  if (catalog.error) {
    return NextResponse.json({ error: catalog.error }, { status: 500 });
  }

  return NextResponse.json(
    {
      categories: catalog.categories,
      items: catalog.items,
      bakerySchemaReady: catalog.bakerySchemaReady,
    },
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

  const { variants, addons, image_urls, image_url, ...itemFields } = parsed.data;
  const resolvedImages = resolveImageFields(image_urls, image_url);
  const admin = createAdminClient();

  const insertPayload = {
    ...itemFields,
    description: itemFields.description || null,
    discount_price: itemFields.discount_price ?? null,
    stock_quantity: itemFields.stock_quantity ?? null,
    flavours: itemFields.flavours ?? [],
    egg_options: itemFields.egg_options ?? [],
    ...resolvedImages,
  };

  const { data: created, error: insertError } = await admin
    .from("menu_items")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !created) {
    if (isMissingColumnError(insertError)) {
      return NextResponse.json(
        {
          error:
            "Please run supabase/bakery_upgrade.sql in your Supabase SQL Editor first to enable stock, discount, featured, multi-image, and bakery options.",
        },
        { status: 400 }
      );
    }
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

  return NextResponse.json(
    { item: normalizeMenuItem(created as unknown as Record<string, unknown>) },
    { status: 201 }
  );
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

  const { id, variants, addons, image_urls, image_url, ...restFields } =
    parsed.data;
  const resolvedImages = resolveImageFields(image_urls, image_url);
  const itemFields = { ...restFields, ...resolvedImages };

  const admin = createAdminClient();

  if (Object.keys(itemFields).length > 0) {
    const { error: updateError } = await admin
      .from("menu_items")
      .update(itemFields)
      .eq("id", id);

    if (updateError) {
      if (isMissingColumnError(updateError)) {
        return NextResponse.json(
          {
            error:
              "Please run supabase/bakery_upgrade.sql in your Supabase SQL Editor first to save bakery columns.",
          },
          { status: 400 }
        );
      }
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

  // Safely unhook foreign key in past order_items so order history remains intact
  await admin
    .from("order_items")
    .update({ menu_item_id: null })
    .eq("menu_item_id", parsedId.data);

  await admin.from("item_variants").delete().eq("item_id", parsedId.data);
  await admin.from("item_addons").delete().eq("item_id", parsedId.data);

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
    message: "Product deleted successfully.",
  });
}
