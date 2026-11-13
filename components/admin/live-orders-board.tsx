"use client";

import * as React from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  Sun,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { OrderCard } from "@/components/admin/order-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { playOrderAlertBell, unlockAudioSystem } from "@/lib/order-audio";
import { createClient } from "@/lib/supabase-browser";
import type { OrderWithItems, StaffRole } from "@/types/database";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
      order.status === "confirmed" ||
      order.status === "accepted" ||
      order.status === "preparing" ||
      order.status === "ready" ||
      order.status === "out_for_delivery",
  },
  {
    id: "completed",
    title: "Delivered today",
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

  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [isPlayingTest, setIsPlayingTest] = React.useState(false);

  // Push notification state (lock-screen alerts)
  const [pushSupported, setPushSupported] = React.useState(false);
  const [pushSubscribed, setPushSubscribed] = React.useState(false);
  const [pushLoading, setPushLoading] = React.useState(false);
  const [testingPush, setTestingPush] = React.useState(false);

  // Counter Screen Wake Lock state (Bakery Counter mode)
  const [screenAwake, setScreenAwake] = React.useState(false);
  const wakeLockRef = React.useRef<{ release: () => Promise<void> } | null>(null);

  // Tick relative timestamps every 30 seconds
  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Check Web Push support and active subscription + listen for SW notification click
  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPushSupported(false);
    } else {
      setPushSupported(true);
      navigator.serviceWorker.ready
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setPushSubscribed(Boolean(sub));
        })
        .catch(() => setPushSubscribed(false));
    }

    // If page was opened from tapping a lock-screen push notification (has ?alert=1)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("alert") === "1") {
        unlockAudioSystem();
        playOrderAlertBell();
        toast.success("🔔 Order notification opened! 3-second doorbell ringing.", {
          duration: 4000,
        });
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    // Listen for messages from SW when window is already open in background
    const handleSwMsg = (event: MessageEvent) => {
      if (event.data?.type === "PLAY_ORDER_BELL") {
        unlockAudioSystem();
        playOrderAlertBell();
        toast.info("🔔 New order lock-screen alert received!");
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMsg);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMsg);
      }
      if (wakeLockRef.current) {
        void wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const handleTogglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Web Push notifications are not supported by this browser.");
      return;
    }

    setPushLoading(true);
    unlockAudioSystem();

    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();

      if (existingSub) {
        await existingSub.unsubscribe();
        await fetch("/api/admin/push-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existingSub.endpoint }),
        });
        setPushSubscribed(false);
        toast.info("Push notifications disabled on this device.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(
          "Notification permission not granted. Please allow notifications in site settings."
        );
        return;
      }

      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BLEyPJIe_IAvGy7mj19FsVJjUcREqPYSstTiGBeh3UB4t0oV0PQ7Kb3FKfv-aCwq7v6h7bLBVNyrrFl_b9qR7X0";

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/admin/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });

      if (!res.ok) {
        throw new Error("Failed to register push subscription on server.");
      }

      setPushSubscribed(true);
      toast.success(
        "🔔 Lock-screen Push Notifications Enabled! You will receive alerts with sound & 3-second vibration even when screen is locked."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle push notifications."
      );
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      toast.info("Sending test push alert... Lock your phone screen now!");
      const res = await fetch("/api/admin/push-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: 1,
          customerName: "Vijay Kumar",
          amount: 459,
        }),
      });

      if (res.ok) {
        toast.success("🔔 Test push sent! Check your phone lockscreen & notifications.");
      } else {
        toast.error("Failed to send test push.");
      }
    } catch {
      toast.error("Network error sending test push.");
    } finally {
      setTestingPush(false);
    }
  };

  const handleToggleScreenAwake = async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      toast.info("Screen Wake Lock API not supported on this browser.");
      return;
    }

    if (screenAwake) {
      if (wakeLockRef.current) {
        void wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      setScreenAwake(false);
      toast.info("Counter screen awake mode disabled.");
    } else {
      try {
        const sentinel = await (
          navigator as unknown as {
            wakeLock: {
              request: (
                type: string
              ) => Promise<{
                release: () => Promise<void>;
                addEventListener: (t: string, cb: () => void) => void;
              }>;
            };
          }
        ).wakeLock.request("screen");
        wakeLockRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          setScreenAwake(false);
        });
        setScreenAwake(true);
        toast.success(
          "📱 Counter Mode ON: Screen will stay awake on your bakery counter!"
        );
      } catch {
        toast.error("Could not activate Screen Wake Lock.");
      }
    }
  };

  const playOrderBell = React.useCallback(() => {
    if (!soundEnabled) return;
    playOrderAlertBell();
  }, [soundEnabled]);

  const handleTestBell = () => {
    unlockAudioSystem();
    setIsPlayingTest(true);
    playOrderAlertBell();
    toast.success("🔔 Custom order alert bell ringing...", {
      duration: 3500,
    });
    window.setTimeout(() => setIsPlayingTest(false), 3000);
  };

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

  // 15-second background polling fallback so bakery counter never misses an order
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchAllOrders(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [fetchAllOrders]);

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

  // Unlock audio system on first user click or keypress
  React.useEffect(() => {
    const unlock = () => {
      unlockAudioSystem();
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Subscribe to Supabase Realtime immediately when Live Orders loads
  React.useEffect(() => {
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
          toast.info(`🔔 New order #${fullOrder.order_no} received!`, {
            description: `${fullOrder.customer_name || "Guest"} • ₹${fullOrder.total}`,
            duration: 6000,
          });
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
  }, [fetchSingleOrder, markHighlighted, playOrderBell]);

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

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. 3-Second Sound Alert Controls */}
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/80 p-1 shadow-sm backdrop-blur-xs">
            <Button
              type="button"
              variant={soundEnabled ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                unlockAudioSystem();
                setSoundEnabled((prev) => {
                  const next = !prev;
                  if (next) {
                    toast.success("Order alert bell enabled (3s)");
                  } else {
                    toast.info("Sound alerts muted");
                  }
                  return next;
                });
              }}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
              title={soundEnabled ? "Mute order sound" : "Enable order sound"}
            >
              {soundEnabled ? (
                <>
                  <Bell className={`size-3.5 ${isPlayingTest ? "animate-bounce text-amber-300" : ""}`} />
                  <span>Bell 3s ON</span>
                </>
              ) : (
                <>
                  <BellOff className="size-3.5 text-muted-foreground" />
                  <span>Muted</span>
                </>
              )}
            </Button>

            {soundEnabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPlayingTest}
                onClick={handleTestBell}
                className="h-8 gap-1 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted"
                title="Test 3-second order alert ring"
              >
                <Volume2 className={`size-3.5 ${isPlayingTest ? "animate-pulse text-amber-500" : ""}`} />
                <span>{isPlayingTest ? "Ringing..." : "Test Bell"}</span>
              </Button>
            )}
          </div>

          {/* 2. Web Push Notification Lockscreen Controls */}
          {pushSupported && (
            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/80 p-1 shadow-sm backdrop-blur-xs">
              <Button
                type="button"
                variant={pushSubscribed ? "default" : "secondary"}
                size="sm"
                disabled={pushLoading}
                onClick={handleTogglePush}
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
                title="Receive lock-screen push notifications when phone is locked"
              >
                {pushLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : pushSubscribed ? (
                  <CheckCircle2 className="size-3.5 text-emerald-300" />
                ) : (
                  <Smartphone className="size-3.5 text-muted-foreground" />
                )}
                <span>{pushSubscribed ? "Lockscreen Push ON" : "Enable Lockscreen Push"}</span>
              </Button>

              {pushSubscribed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={testingPush}
                  onClick={handleTestPush}
                  className="h-8 gap-1 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted"
                  title="Send test push alert to lockscreen"
                >
                  <Send className={`size-3.5 ${testingPush ? "animate-pulse" : ""}`} />
                  <span>{testingPush ? "Sending..." : "Test Push"}</span>
                </Button>
              )}
            </div>
          )}

          {/* 3. Counter Screen Awake Mode */}
          <Button
            type="button"
            variant={screenAwake ? "default" : "outline"}
            size="sm"
            onClick={handleToggleScreenAwake}
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold"
            title="Keep tablet or phone screen on without sleeping on bakery counter"
          >
            <Sun className={`size-3.5 ${screenAwake ? "animate-spin text-amber-400" : ""}`} />
            <span>{screenAwake ? "Screen Awake ON" : "Counter Screen Awake"}</span>
          </Button>

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
      </div>

      {/* Bakery Counter & Lockscreen Push Explainer Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-3.5 text-xs sm:p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-foreground sm:text-sm">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Bell className="size-3.5" />
            </span>
            <span>2 Ways to Never Miss an Order at Bakers Nation Counter</span>
          </div>
          <div className="grid gap-2 pt-1 text-[11px] text-muted-foreground sm:grid-cols-2 sm:text-xs">
            <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
              <strong className="text-foreground">1. Lockscreen Push Notification 🔔:</strong>
              <p className="mt-0.5 leading-relaxed">
                Turn on <em>&quot;Lockscreen Push ON&quot;</em> above. Even when phone is locked or app is closed, lock screen lights up, vibrates for 3 seconds and plays your phone ringtone. Tapping it opens the order and rings the 3-second doorbell!
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
              <strong className="text-foreground">2. Bakery Counter Mode (Tab Open) 📱:</strong>
              <p className="mt-0.5 leading-relaxed">
                Turn on <em>&quot;Counter Screen Awake&quot;</em> and leave this page open on your counter tablet or phone. Supabase Realtime stays live and the sharp 3-second doorbell rings automatically on every incoming order!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden grid-cols-3 gap-4 pb-4 lg:grid">
        {groupedColumns.map((col) => (
          <section
            key={col.id}
            aria-label={col.title}
            className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-3"
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

