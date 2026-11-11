import { sendNotification, setVapidDetails } from "web-push";

import { createAdminClient } from "@/lib/supabase-admin";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function configureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendStaffOrderPush(payload: PushPayload): Promise<void> {
  if (!configureVapid()) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: subscriptions, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, keys");

    if (error || !subscriptions || subscriptions.length === 0) {
      return;
    }

    const serialized = JSON.stringify(payload);
    const expiredIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const keys = sub.keys as { p256dh?: string; auth?: string } | null;
        if (!keys?.p256dh || !keys?.auth) return;

        try {
          await sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: keys.p256dh,
                auth: keys.auth,
              },
            },
            serialized
          );
        } catch (err) {
          const statusCode =
            typeof err === "object" && err !== null && "statusCode" in err
              ? Number((err as { statusCode?: unknown }).statusCode)
              : null;

          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(sub.id);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }
  } catch {
    // Push notifications should never block order placement
  }
}
