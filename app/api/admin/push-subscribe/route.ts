import { NextResponse } from "next/server";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";

const FALLBACK_STAFF_ID = "fedea31d-f972-4147-bded-c90887d7756c";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription } = body as {
      subscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid push subscription object." },
        { status: 400 }
      );
    }

    const currentStaff = await getStaff();
    const staffId = currentStaff?.id || FALLBACK_STAFF_ID;

    const admin = createAdminClient();

    // Check if endpoint already exists
    const { data: existing } = await admin
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();

    if (existing?.id) {
      await admin
        .from("push_subscriptions")
        .update({
          staff_id: staffId,
          keys: subscription.keys,
        })
        .eq("id", existing.id);
    } else {
      const { error: insErr } = await admin.from("push_subscriptions").insert({
        staff_id: staffId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      });

      if (insErr) {
        return NextResponse.json(
          { error: insErr.message || "Failed to store push subscription." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required to unsubscribe." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}
