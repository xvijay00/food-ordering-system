import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

const createCategorySchema = z.strictObject({
  name: z.string().trim().min(2, "Category name is required.").max(80),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().default(true),
});

const updateCategorySchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Category name is required.").max(80).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const reorderCategoriesSchema = z.strictObject({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category data." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  let nextSortOrder = parsed.data.sort_order;
  if (nextSortOrder === undefined) {
    const { data: lastCat } = await admin
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextSortOrder = (lastCat?.sort_order ?? 0) + 1;
  }

  const { data, error } = await admin
    .from("categories")
    .insert({
      name: parsed.data.name,
      sort_order: nextSortOrder,
      is_active: parsed.data.is_active,
    })
    .select("id, name, sort_order, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category update." },
      { status: 400 }
    );
  }

  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .update(fields)
    .eq("id", id)
    .select("id, name, sort_order, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reorderCategoriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category order." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const updates = parsed.data.orderedIds.map((id, index) =>
    admin.from("categories").update({ sort_order: index + 1 }).eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((res) => res.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
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
      { error: "Valid category ID is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("categories")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return NextResponse.json(
      { error: "Cannot delete category while menu items still belong to it." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
