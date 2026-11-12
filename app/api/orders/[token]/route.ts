import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchPublicOrderByToken } from "@/lib/bakery-queries";
import { createAdminClient } from "@/lib/supabase-admin";

const tokenSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const parsedToken = tokenSchema.safeParse(token);

    if (!parsedToken.success) {
      return NextResponse.json(
        { error: "Invalid order tracking token." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { order, error } = await fetchPublicOrderByToken(
      admin,
      parsedToken.data
    );

    if (error) {
      return NextResponse.json(
        { error: "Could not load order details. Please try again." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const sortedHistory = [...(order.order_status_history ?? [])].sort(
      (a, b) =>
        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );

    return NextResponse.json(
      {
        order: {
          ...order,
          order_status_history: sortedHistory,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while loading your order." },
      { status: 500 }
    );
  }
}
