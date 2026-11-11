"use client";

import * as React from "react";
import {
  BellRing,
  Play,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { OrderCard } from "@/components/admin/order-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase-browser";
import type { OrderWithItems, StaffRole } from "@/types/database";

type ColumnConfig = {
  id: string;
  title: string;
  matches: (order: OrderWithItems) => boolean;
};

function isSameLocalDay(isoDate: string, referenceMs: number): boolean {
  const d = new Date(isoDate);
  const ref = new Date(referenceMs);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "placed",
    title: "New",
    matches: (order) => order.status === "placed",
  },
  {
    id: "confirmed",
    title: "Confirmed",
    matches: (order) =>
      order.status === "confirmed" || order.status === "accepted",
  },
  {
    id: "preparing",
    title: "Preparing",
    matches: (order) => order.status === "preparing",
  },
  {
    id: "ready",
    title: "Ready",
    matches: (order) => order.status === "ready",
  },
  {
    id: "out_for_delivery",
    title: "Out for delivery",
    matches: (order) => order.status === "out_for_delivery",
  },
  {
    id: "completed",
    title: "Completed today",
    matches: (order) =>
      (order.status === "completed" ||
        order.status === "served" ||
        order.status === "delivered") &&
      isSameLocalDay(order.created_at, Date.now()),
  },
];

export function LiveOrdersBoard({
  initialOrders,
  staffRole,
}: {
  initialOrders: OrderWithItems[];
  staffRole: StaffRole;
}) {
  const [orders, setOrders] = React.useState<OrderWithItems[]>(initialOrders);
  const [shiftStarted, setShiftStarted] = React.useState(false);
  const [connectionState, setConnectionState] = React.useState<
    "live" | "reconnecting"
  >("reconnecting");
  const [refreshing, setRefreshing] = React.useState(false);
  const [updatingOrderId, setUpdatingOrderId] = React.useState<string | null>(
    null
  );
  const [highlightedIds, setHighlightedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());

  const [rejectTarget, setRejectTarget] = React.useState<OrderWithItems | null>(
    null
  );
  const [rejectReason, setRejectReason] = React.useState("");

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Tick relative timestamps every 30 seconds
  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const playOrderBell = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore if /public/bell.mp3 has not been added yet
    });
  }, []);

  const fetchSingleOrder = React.useCallback(
    async (orderId: string): Promise<OrderWithItems | null> => {
      try {
        const res = await fetch(
          `/api/admin/orders/${encodeURIComponent(orderId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { order?: OrderWithItems };
        return data.order ?? null;
      } catch {
        return null;
      }
    },
    []
  );

  const fetchAllOrders = React.useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { orders?: OrderWithItems[] };
      if (data.orders) {
        setOrders(data.orders);
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const markHighlighted = React.useCallback((orderId: string) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
    window.setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 4500);
  }, []);

  const handleStartShift = () => {
    try {
      const audio = new Audio("/bell.mp3");
      audio.preload = "auto";
      audio.muted = true;
      audioRef.current = audio;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    } catch {
      // Ignore audio constructor issues in constrained environments
    }

    setShiftStarted(true);
  };

  // Subscribe to Supabase Realtime only after "Start shift" unlocks audio
  React.useEffect(() => {
    if (!shiftStarted) return;

    const supabase = createClient();
    const channel = supabase
      .channel("live-orders-kanban")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const insertedId = (payload.new as { id?: string } | undefined)?.id;
          if (!insertedId) return;

          const fullOrder = await fetchSingleOrder(insertedId);
          if (!fullOrder) return;

          setOrders((prev) => {
            const exists = prev.some((o) => o.id === fullOrder.id);
            if (exists) {
              return prev.map((o) => (o.id === fullOrder.id ? fullOrder : o));
            }
            return [fullOrder, ...prev];
          });

          markHighlighted(fullOrder.id);
          toast.info(`New order #${fullOrder.order_no} received!`);
          playOrderBell();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const updatedId = (payload.new as { id?: string } | undefined)?.id;
          if (!updatedId) return;

          const fullOrder = await fetchSingleOrder(updatedId);
          if (!fullOrder) return;

          setOrders((prev) => {
            const exists = prev.some((o) => o.id === fullOrder.id);
            if (!exists) return [fullOrder, ...prev];
            return prev.map((o) => (o.id === fullOrder.id ? fullOrder : o));
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("live");
        } else {
          setConnectionState("reconnecting");
        }
      });

    return () => {
      setConnectionState("reconnecting");
      void supabase.removeChannel(channel);
    };
  }, [fetchSingleOrder, markHighlighted, playOrderBell, shiftStarted]);

  const handleStatusUpdate = async (
    order: OrderWithItems,
    targetStatus: string,
    cancelReason?: string
  ) => {
    setUpdatingOrderId(order.id);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            ...(cancelReason ? { cancel_reason: cancelReason } : {}),
          }),
        }
      );

      const data = (await res.json()) as {
        error?: string;
        order?: OrderWithItems;
      };

      if (!res.ok || !data.order) {
        throw new Error(data.error ?? "Failed to update order status.");
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === data.order!.id ? data.order! : item))
      );
      toast.success(`Order #${order.order_no} updated`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 2) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    const target = rejectTarget;
    const reason = rejectReason.trim();
    setRejectTarget(null);
    setRejectReason("");
    await handleStatusUpdate(target, "cancelled", reason);
  };

  const groupedColumns = React.useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        orders: orders.filter(col.matches),
      })),
    [orders]
  );

  if (!shiftStarted) {
    return (
      <section className="mx-auto flex min-h-[70dvh] max-w-lg items-center justify-center px-4">
        <Card className="w-full rounded-2xl text-center shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400">
              <BellRing className="size-7" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Live Orders Board
              </h1>
              <p className="text-sm text-muted-foreground">
                Start your shift to enable real-time order sync and unlock sound
                notifications for incoming orders.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={handleStartShift}
              className="min-h-12 w-full max-w-xs gap-2 rounded-xl text-base font-semibold"
            >
              <Play className="size-4" aria-hidden="true" />
              <span>Start shift</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Live Orders
          </h1>

          {connectionState === "live" ? (
            <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
              <Wifi className="size-3" aria-hidden="true" />
              <span>Live</span>
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1.5">
              <WifiOff className="size-3" aria-hidden="true" />
              <span>Reconnecting</span>
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void fetchAllOrders(false)}
          className="min-h-10 gap-2 rounded-xl"
        >
          <RefreshCw
            className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden gap-4 overflow-x-auto pb-4 lg:flex">
        {groupedColumns.map((col) => (
          <section
            key={col.id}
            aria-label={col.title}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-3"
          >
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="font-heading text-sm font-bold tracking-tight">
                {col.title}
              </h2>
              <Badge variant="secondary" className="tabular-nums">
                {col.orders.length}
              </Badge>
            </div>

            {col.orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                No orders
              </div>
            ) : (
              <div className="space-y-3">
                {col.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    staffRole={staffRole}
                    nowMs={nowMs}
                    highlighted={highlightedIds.has(order.id)}
                    updating={updatingOrderId === order.id}
                    onStatusAction={(target, status) =>
                      void handleStatusUpdate(target, status)
                    }
                    onRequestReject={(target) => {
                      setRejectTarget(target);
                      setRejectReason("");
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Mobile Tabs Layout */}
      <div className="lg:hidden">
        <Tabs defaultValue="placed" className="space-y-4">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1">
            {groupedColumns.map((col) => (
              <TabsTrigger
                key={col.id}
                value={col.id}
                className="min-h-9 shrink-0 gap-1.5 px-3 text-xs"
              >
                <span>{col.title}</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {col.orders.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {groupedColumns.map((col) => (
            <TabsContent key={col.id} value={col.id} className="space-y-3">
              {col.orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No orders in {col.title}.
                </div>
              ) : (
                col.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    staffRole={staffRole}
                    nowMs={nowMs}
                    highlighted={highlightedIds.has(order.id)}
                    updating={updatingOrderId === order.id}
                    onStatusAction={(target, status) =>
                      void handleStatusUpdate(target, status)
                    }
                    onRequestReject={(target) => {
                      setRejectTarget(target);
                      setRejectReason("");
                    }}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Reject Order Reason Dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Order #{rejectTarget?.order_no}</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this order. The customer will see
              this on their tracking screen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reject-reason-input"
                className="block text-sm font-medium"
              >
                Rejection Reason <span aria-hidden="true">*</span>
              </label>
              <Textarea
                id="reject-reason-input"
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Item unavailable, kitchen at capacity"
                className="min-h-20 rounded-xl"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  updatingOrderId !== null || rejectReason.trim().length < 2
                }
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

