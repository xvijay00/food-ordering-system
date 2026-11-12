"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bike,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  Clock,
  Copy,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/store/cart";
import type {
  OrderItem,
  OrderItemAddon,
  OrderStatusHistory,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";

export type PublicOrderSummary = {
  id: string;
  order_token: string;
  order_no: number;
  order_type: OrderType;
  table_id: string | null;
  status: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  preorder_at?: string | null;
  cancel_reason: string | null;
  created_at: string;
  restaurant_tables?: { id: string; table_number: number } | null;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
};

type StepDefinition = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DINE_IN_STEPS: StepDefinition[] = [
  {
    key: "placed",
    label: "Placed",
    description: "We received your order.",
    icon: Clock,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    description: "Kitchen has accepted your order.",
    icon: CheckCircle2,
  },
  {
    key: "preparing",
    label: "Preparing",
    description: "Your dishes are being freshly cooked.",
    icon: ChefHat,
  },
  {
    key: "ready",
    label: "Ready",
    description: "Plated and ready to be served.",
    icon: PackageCheck,
  },
  {
    key: "completed",
    label: "Served",
    description: "Served at your table. Enjoy your meal!",
    icon: UtensilsCrossed,
  },
];

const DELIVERY_STEPS: StepDefinition[] = [
  {
    key: "placed",
    label: "Placed",
    description: "We received your order.",
    icon: Clock,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    description: "Your order has been confirmed.",
    icon: CheckCircle2,
  },
  {
    key: "completed",
    label: "Delivered",
    description: "Order delivered. Enjoy your meal!",
    icon: Bike,
  },
];

const POLL_INTERVAL_MS = 8000;

function normalizeStatus(status: string): string {
  if (
    status === "accepted" ||
    status === "preparing" ||
    status === "ready" ||
    status === "out_for_delivery"
  ) {
    return "confirmed";
  }
  if (status === "delivered" || status === "served") return "completed";
  return status;
}

function isFinalStatus(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "completed" || normalized === "cancelled";
}

function formatStatusLabel(status: string, orderType?: OrderType): string {
  const normalized = normalizeStatus(status);
  if (normalized === "completed" && orderType === "dine_in") return "Served";
  if (normalized === "completed" && orderType === "delivery") return "Delivered";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function OrderTracker({ token }: { token: string }) {
  const router = useRouter();
  const setOrderType = useCartStore((state) => state.setOrderType);

  const [order, setOrder] = React.useState<PublicOrderSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOrder = React.useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          error?: string;
          order?: PublicOrderSummary;
        };

        if (!res.ok || !data.order) {
          throw new Error(data.error ?? "Order not found.");
        }

        setOrder(data.order);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load order status."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  React.useEffect(() => {
    void fetchOrder(false);
  }, [fetchOrder]);

  // Poll every 8 seconds while active, pausing when tab is hidden
  React.useEffect(() => {
    if (!order || isFinalStatus(order.status)) {
      return;
    }

    let intervalId: number | null = null;

    const startPolling = () => {
      if (intervalId !== null || document.visibilityState === "hidden") return;
      intervalId = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void fetchOrder(true);
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        void fetchOrder(true);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchOrder, order]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Tracking link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const handleOrderAgain = () => {
    setOrderType("delivery");
    router.push("/menu");
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <section className="mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Order not found
          </h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "We couldn't locate an order for this tracking token."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchOrder(false)}
          >
            Retry
          </Button>
          <Button asChild>
            <Link href="/menu">Back to Menu</Link>
          </Button>
        </div>
      </section>
    );
  }

  const normalizedStatus = normalizeStatus(order.status);
  const isCancelled = normalizedStatus === "cancelled";
  const steps = order.order_type === "dine_in" ? DINE_IN_STEPS : DELIVERY_STEPS;
  const activeStepIdx = Math.max(
    0,
    steps.findIndex((step) => step.key === normalizedStatus)
  );

  const historyMap = new Map<string, string>();
  for (const entry of order.order_status_history ?? []) {
    historyMap.set(normalizeStatus(entry.status), entry.changed_at);
  }

  const orderItems = order.order_items ?? [];
  const tableNumber = order.restaurant_tables?.table_number;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <p aria-live="polite" className="sr-only">
        Order #{order.order_no} status is{" "}
        {formatStatusLabel(order.status, order.order_type)}.
      </p>

      {/* Order Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Order #{order.order_no}
            </h1>
            <Badge
              variant={isCancelled ? "destructive" : "secondary"}
              className="text-xs font-semibold"
            >
              {formatStatusLabel(order.status, order.order_type)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {order.order_type === "dine_in"
              ? `Dine-in${tableNumber ? ` · Table ${tableNumber}` : ""}`
              : "Delivery"}{" "}
            · Placed{" "}
            {new Date(order.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          {order.preorder_at && (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              <span>
                Pre-order scheduled for{" "}
                {new Date(order.preorder_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="min-h-10 gap-1.5 rounded-xl"
          >
            <Copy className="size-3.5" aria-hidden="true" />
            <span>Share</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh order status"
            disabled={refreshing}
            onClick={() => void fetchOrder(true)}
            className="size-10 rounded-xl"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {/* Vertical Animated Status Stepper or Cancelled State */}
      {isCancelled ? (
        <Card className="rounded-2xl border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-start gap-3.5 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <XCircle className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 className="font-heading text-base font-bold text-destructive">
                Order Cancelled
              </h2>
              <p className="text-sm text-destructive/90">
                {order.cancel_reason
                  ? `Reason: ${order.cancel_reason}`
                  : "This order was cancelled."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader className="space-y-3 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Live Order Progress</CardTitle>
              <span className="text-xs font-medium text-muted-foreground">
                Step {activeStepIdx + 1} of {steps.length}
              </span>
            </div>
            <progress
              aria-label="Order progress"
              value={activeStepIdx + 1}
              max={steps.length}
              className="h-2 w-full overflow-hidden rounded-full bg-muted accent-primary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-all"
            />
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <ol className="relative space-y-0">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < activeStepIdx;
                const isCurrent = index === activeStepIdx;
                const isLast = index === steps.length - 1;
                const timestamp = historyMap.get(step.key);
                const isActivePending = isCurrent && step.key !== "completed";

                return (
                  <li
                    key={step.key}
                    aria-current={isCurrent ? "step" : undefined}
                    className="relative flex items-start gap-4 pb-6 last:pb-0"
                  >
                    {/* Vertical connector line */}
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute top-9 bottom-0 left-[17px] w-0.5 transition-colors duration-300 ${
                          isCompleted ? "bg-emerald-500/60" : "bg-border"
                        }`}
                      />
                    )}

                    {/* Step icon + animated active ping */}
                    <span className="relative z-10 mt-0.5 flex size-9 shrink-0 items-center justify-center">
                      {isActivePending && (
                        <span
                          aria-hidden="true"
                          className="step-active-ping absolute inset-0 rounded-full bg-primary/40"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className={`relative flex size-9 items-center justify-center rounded-full border transition-all duration-300 ${
                          isCurrent
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : isCompleted
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "border-border bg-muted/70 text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                    </span>

                    <div
                      className={`min-w-0 flex-1 rounded-xl px-3 py-1.5 transition-colors ${
                        isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={`text-sm ${
                            isCurrent
                              ? "font-bold text-primary"
                              : isCompleted
                                ? "font-semibold text-foreground"
                                : "font-medium text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        {timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(timestamp).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Items & Bill */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Items & Bill</CardTitle>
            <Badge variant="outline" className="text-xs">
              {order.payment_method === "counter"
                ? "Pay at counter"
                : "Cash on Delivery"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <ul className="divide-y divide-border/60 text-sm">
            {orderItems.map((item) => {
              const addons = Array.isArray(item.addons)
                ? (item.addons as OrderItemAddon[])
                : [];
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {item.quantity}x {item.item_name}
                      {item.variant_label ? ` (${item.variant_label})` : ""}
                    </p>
                    {(item.selected_flavour || item.egg_preference) && (
                      <p className="text-xs text-muted-foreground">
                        {[item.selected_flavour, item.egg_preference]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {addons.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Add-ons: {addons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    {item.cake_message && (
                      <p className="text-xs text-muted-foreground">
                        Cake message: &ldquo;{item.cake_message}&rdquo;
                      </p>
                    )}
                    {item.custom_image_url && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="relative size-10 overflow-hidden rounded-lg ring-1 ring-border">
                          <Image
                            src={item.custom_image_url}
                            alt="Custom cake design"
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Custom cake design uploaded
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">
                    {formatPrice(Number(item.line_total))}
                  </p>
                </li>
              );
            })}
          </ul>

          {order.notes && (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Note: {order.notes}
            </p>
          )}

          <div className="space-y-2 border-t border-border/60 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatPrice(Number(order.subtotal))}
              </span>
            </div>
            {Number(order.delivery_fee) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="tabular-nums">
                  {formatPrice(Number(order.delivery_fee))}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatPrice(Number(order.total))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions: Call restaurant & Order again */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button asChild variant="outline" className="min-h-11 gap-2 rounded-xl">
          <a href={`tel:${RESTAURANT_CONFIG.phone}`}>
            <Phone className="size-4" aria-hidden="true" />
            <span>Call restaurant</span>
          </a>
        </Button>

        <Button
          type="button"
          onClick={handleOrderAgain}
          className="min-h-11 gap-2 rounded-xl font-semibold"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          <span>Order again</span>
        </Button>
      </div>
    </div>
  );
}
