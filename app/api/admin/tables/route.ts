import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

const createTableSchema = z.strictObject({
  table_number: z.number().int().positive("Table number must be 1 or higher."),
  is_active: z.boolean().default(true),
});

const updateTableSchema = z.strictObject({
  id: z.string().uuid(),
  table_number: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurant_tables")
    .select("id, table_number, is_active")
    .order("table_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { tables: data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid table data." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("restaurant_tables")
    .select("id")
    .eq("table_number", parsed.data.table_number)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Table ${parsed.data.table_number} already exists.` },
      { status: 409 }
    );
  }

  const { data, error } = await admin
    .from("restaurant_tables")
    .insert(parsed.data)
    .select("id, table_number, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid table update." },
      { status: 400 }
    );
  }

  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("restaurant_tables")
    .update(fields)
    .eq("id", id)
    .select("id, table_number, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table: data });
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
      { error: "Valid table ID is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurant_tables")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

