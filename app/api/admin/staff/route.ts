import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import type { StaffRole } from "@/types/database";

const createStaffSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  role: z.enum(["admin", "kitchen", "delivery"]),
});

const updateStaffSchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100).optional(),
  role: z.enum(["admin", "kitchen", "delivery"]).optional(),
});

export type StaffMemberRow = {
  id: string;
  name: string;
  role: StaffRole;
  email: string | null;
};

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  const [profilesRes, usersRes] = await Promise.all([
    admin.from("staff_profiles").select("id, name, role").order("name"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const emailById = new Map<string, string>(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const staffList: StaffMemberRow[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    email: emailById.get(p.id) || null,
  }));

  return NextResponse.json(
    { staff: staffList },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid staff data." },
      { status: 400 }
    );
  }

  const { name, email, password, role } = parsed.data;
  const admin = createAdminClient();

  const { data: createdAuth, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !createdAuth.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create auth user." },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("staff_profiles").insert({
    id: createdAuth.user.id,
    name,
    role,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(createdAuth.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      staffMember: {
        id: createdAuth.user.id,
        name,
        role,
        email: createdAuth.user.email ?? email,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid staff update." },
      { status: 400 }
    );
  }

  const { id, ...fields } = parsed.data;

  if (id === session.userId && fields.role && fields.role !== "admin") {
    return NextResponse.json(
      { error: "You cannot change your own admin role." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("staff_profiles")
    .update(fields)
    .eq("id", id)
    .select("id, name, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staffMember: data });
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
      { error: "Valid staff ID is required." },
      { status: 400 }
    );
  }

  if (parsedId.data === session.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account while signed in." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(parsedId.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

