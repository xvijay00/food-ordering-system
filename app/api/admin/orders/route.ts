import { NextResponse } from "next/server";

import { getStaffSession } from "@/lib/admin-auth";
import { fetchAdminOrdersList } from "@/lib/bakery-queries";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const admin = createAdminClient();
    const { orders, error } = await fetchAdminOrdersList(admin, 100);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(
      { orders },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load orders." },
      { status: 500 }
    );
  }
}
