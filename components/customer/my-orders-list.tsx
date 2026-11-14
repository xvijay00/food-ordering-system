"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import type { PublicOrderSummary } from "@/components/customer/order-tracker";

const MY_ORDERS_STORAGE_KEY = "my_orders";

type StoredOrderSummary = {
  order_token: string;
  timestamp: string;
  order_no?: number;
  total?: number;
};

type HydratedOrderEntry = StoredOrderSummary & {
  liveOrder?: PublicOrderSummary;
};

function formatStatus(status: string, orderType?: string): string {
  if (status === "completed" && orderType === "dine_in") return "Served";
  if (status === "completed" && orderType === "delivery") return "Delivered";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function MyOrdersList() {
  const hydrated = useHydrated();
  const [entries, setEntries] = React.useState<HydratedOrderEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!hydrated) return;

    let active = true;

    async function loadOrders() {
      setLoading(true);
      try {
        const raw = localStorage.getItem(MY_ORDERS_STORAGE_KEY);
        const parsedRaw = raw ? (JSON.parse(raw) as unknown[]) : [];
        const stored: StoredOrderSummary[] = Array.isArray(parsedRaw)
          ? parsedRaw
              .map((entry): StoredOrderSummary | null => {
                if (typeof entry === "string") {
                  return {
                    order_token: entry,
                    timestamp: new Date(0).toISOString(),
                  };
                }
                if (
                  typeof entry === "object" &&
                  entry !== null &&
                  "order_token" in entry &&
                  typeof (entry as { order_token?: unknown }).order_token ===
                    "string"
                ) {
                  const record = entry as StoredOrderSummary;
                  return {
                    order_token: record.order_token,
                    timestamp: record.timestamp ?? new Date(0).toISOString(),
                    order_no: record.order_no,
                    total: record.total,
                  };
                }
                return null;
              })
              .filter((entry): entry is StoredOrderSummary => entry !== null)
          : [];

        if (stored.length === 0) {
          if (active) setEntries([]);
          return;
        }

        const sortedStored = [...stored].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const results = await Promise.all(
          sortedStored.map(async (item): Promise<HydratedOrderEntry> => {
            try {
              const res = await fetch(
                `/api/orders/${encodeURIComponent(item.order_token)}`,
                { cache: "no-store" }
              );
              if (!res.ok) return item;
              const data = (await res.json()) as { order?: PublicOrderSummary };
              return { ...item, liveOrder: data.order };
            } catch {
              return item;
            }
          })
        );

        results.sort((a, b) => {
          const timeA = new Date(a.liveOrder?.created_at ?? a.timestamp).getTime();
          const timeB = new Date(b.liveOrder?.created_at ?? b.timestamp).getTime();
          return timeB - timeA;
        });

        if (active) setEntries(results);
      } catch {
        if (active) setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      active = false;
    };
  }, [hydrated]);

  const handleClearHistory = () => {
    localStorage.removeItem(MY_ORDERS_STORAGE_KEY);
    setEntries([]);
  };

  if (!hydrated || loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ClipboardList className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            No orders yet
          </h1>
          <p className="text-sm text-muted-foreground">
            Your recent orders placed from this device will appear here for quick
            tracking.
          </p>
        </div>
        <Button asChild size="lg" className="min-h-11 rounded-xl px-6">
          <Link href="/menu">Explore Menu</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            My Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your recent orders placed on this device.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="min-h-10 gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span>Clear history</span>
        </Button>
      </div>

      <ul className="space-y-3">
        {entries.map((entry) => {
          const order = entry.liveOrder;
          const orderNo = order?.order_no ?? entry.order_no;
          const total = order ? Number(order.total) : entry.total;
          const createdAt = order?.created_at ?? entry.timestamp;

          return (
            <li key={entry.order_token}>
              <Link
                href={`/order/${entry.order_token}`}
                className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Card className="rounded-2xl transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-base font-semibold">
                          {orderNo ? `Order #${orderNo}` : "Order"}
                        </h2>
                        {order?.status && (
                          <Badge
                            variant={
                              order.status === "cancelled"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {formatStatus(order.status, order.order_type)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {order?.order_type === "dine_in" &&
                        order.restaurant_tables?.table_number
                          ? ` · Dine-in Table ${order.restaurant_tables.table_number}`
                          : order?.order_type === "delivery"
                            ? " · Delivery"
                            : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {typeof total === "number" && (
                        <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                          {total === 0 && order?.status === "placed"
                            ? "Price on Call 📞"
                            : formatPrice(total)}
                        </span>
                      )}
                      <ArrowRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
