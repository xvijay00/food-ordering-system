"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bike,
  CalendarClock,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
  Sparkles,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { getAvailableOrderActions } from "@/lib/order-transitions";
import type { OrderItemAddon, OrderWithItems, StaffRole } from "@/types/database";

type OrderCardProps = {
  order: OrderWithItems;
  staffRole: StaffRole;
  nowMs: number;
  highlighted?: boolean;
  updating?: boolean;
  onStatusAction: (
    order: OrderWithItems,
    targetStatus: string,
    customCakePrice?: number
  ) => void;
  onRequestReject: (order: OrderWithItems) => void;
};

function formatTimeSince(createdAt: string, nowMs: number): string {
  const diffSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(createdAt).getTime()) / 1000)
  );
  if (diffSeconds < 60) return "Just now";
  const mins = Math.floor(diffSeconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
}

export function OrderCard({
  order,
  staffRole,
  nowMs,
  highlighted = false,
  updating = false,
  onStatusAction,
  onRequestReject,
}: OrderCardProps) {
  const tableNumber = order.restaurant_tables?.table_number;
  const orderItems = order.order_items ?? [];
  const actions = getAvailableOrderActions(
    staffRole,
    order.order_type,
    order.status
  );

  const hasCustomCake = orderItems.some(
    (item) =>
      item.custom_image_url ||
      Number(item.unit_price) === 0 ||
      item.item_name.toLowerCase().includes("custom")
  );
  const isCustomCakePendingPrice =
    hasCustomCake &&
    order.status === "placed" &&
    orderItems.some((item) => Number(item.unit_price) === 0);

  const [enteredCakePrice, setEnteredCakePrice] = React.useState<string>("");

  return (
    <Card
      className={`rounded-2xl transition-shadow ${
        highlighted ? "order-highlight-flash ring-2 ring-amber-500" : ""
      }`}
    >
      <CardHeader className="space-y-2 border-b border-border/60 p-3.5 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/admin/orders/${order.id}`}
                className="inline-flex items-center gap-1 rounded-md hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <CardTitle className="text-base font-bold">
                  #{order.order_no}
                </CardTitle>
              </Link>
              <Badge variant="outline" className="gap-1 text-[11px]">
                {order.order_type === "dine_in" ? (
                  <>
                    <UtensilsCrossed className="size-3" aria-hidden="true" />
                    <span>
                      {tableNumber ? `Dine-in · Table ${tableNumber}` : "Dine-in"}
                    </span>
                  </>
                ) : (
                  <>
                    <Bike className="size-3" aria-hidden="true" />
                    <span>Delivery</span>
                  </>
                )}
              </Badge>
            </div>

            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              <span>{formatTimeSince(order.created_at, nowMs)}</span>
            </p>
            {order.preorder_at && (
              <p className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                <CalendarClock className="size-3" aria-hidden="true" />
                <span>
                  Pre-order:{" "}
                  {new Date(order.preorder_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-sm font-bold tabular-nums">
              {formatPrice(Number(order.total))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {order.payment_method === "counter"
                ? "Pay at counter"
                : "Cash on Delivery"}
            </p>
            <Link
              href={`/admin/orders/${order.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <ReceiptText className="size-3" aria-hidden="true" />
              <span>Details / Bill</span>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3.5">
        {/* Delivery customer contact */}
        {order.order_type === "delivery" && (
          <div className="space-y-1 rounded-xl bg-muted/50 p-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                {order.customer_name}
              </span>
              {order.customer_phone && order.customer_phone !== "N/A" && (
                <a
                  href={`tel:${order.customer_phone}`}
                  className="inline-flex min-h-7 items-center gap-1 rounded-lg bg-background px-2 py-0.5 font-semibold text-primary ring-1 ring-border transition-colors hover:bg-primary/10"
                >
                  <Phone className="size-3" aria-hidden="true" />
                  <span>{order.customer_phone}</span>
                </a>
              )}
            </div>
            {order.delivery_address && (
              <p className="flex items-start gap-1 text-muted-foreground">
                <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span>{order.delivery_address}</span>
              </p>
            )}
          </div>
        )}

        {/* Item List */}
        <ul className="space-y-1.5 text-xs">
          {orderItems.map((item) => {
            const addons = Array.isArray(item.addons)
              ? (item.addons as OrderItemAddon[])
              : [];

            return (
              <li key={item.id} className="space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">
                    <span className="font-bold">{item.quantity}x</span>{" "}
                    {item.item_name}
                    {item.variant_label ? ` (${item.variant_label})` : ""}
                  </span>
                </div>
                {(item.selected_flavour || item.egg_preference) && (
                  <p className="pl-4 text-[11px] text-muted-foreground">
                    {[item.selected_flavour, item.egg_preference]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {addons.length > 0 && (
                  <p className="pl-4 text-[11px] text-muted-foreground">
                    + {addons.map((a) => a.name).join(", ")}
                  </p>
                )}
                {item.cake_message && (
                  <p className="pl-4 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    Cake msg: &ldquo;{item.cake_message}&rdquo;
                  </p>
                )}
                {item.custom_image_url && (
                  <a
                    href={item.custom_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 pl-4 text-[11px] font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                    <span>View custom cake design</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {order.notes && (
          <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-900 dark:text-amber-200">
            Note: {order.notes}
          </p>
        )}

        {/* Custom Design Cake Price Setting Box */}
        {isCustomCakePendingPrice && (
          <div className="space-y-2 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                <Sparkles className="size-3.5 text-amber-600" />
                Custom Cake Price Not Set
              </span>
              <Badge className="bg-amber-600 text-[10px] font-black text-white">
                Call &amp; Set Price
              </Badge>
            </div>

            <p className="text-[11px] leading-relaxed text-amber-950/80 dark:text-amber-200/80">
              Customer ko phone karke design confirm karein aur price enter karke &ldquo;Confirm &amp; Set Price&rdquo; dabayein:
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter Agreed Price (₹)"
                  value={enteredCakePrice}
                  onChange={(e) => setEnteredCakePrice(e.target.value)}
                  className="h-9 w-full rounded-lg border border-amber-500/40 bg-background pl-6 pr-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={updating || !enteredCakePrice}
                onClick={() => {
                  const price = parseFloat(enteredCakePrice);
                  if (!price || price <= 0) {
                    toast.error("Please enter a valid price for the custom cake.");
                    return;
                  }
                  onStatusAction(order, "confirmed", price);
                }}
                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {updating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
                <span>Confirm &amp; Set Price</span>
              </Button>
            </div>

            {order.customer_phone && order.customer_phone !== "N/A" && (
              <div className="flex items-center gap-2 pt-0.5">
                <a
                  href={`tel:${order.customer_phone}`}
                  className="inline-flex min-h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-bold text-primary hover:bg-muted"
                >
                  <Phone className="size-3" />
                  <span>Call {order.customer_phone}</span>
                </a>
                <a
                  href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hello ${order.customer_name}, Bakers Nation Nahan se aapke Custom Cake order #${order.order_no} ke regarding call kar rahe hain.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <span>💬 WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Role-Filtered Actions */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-2.5">
            {actions.map((action) => {
              const isReject = action.targetStatus === "cancelled";
              const isConfirm = action.targetStatus === "confirmed";

              // If custom cake price is pending, staff must use the dedicated price box above to confirm
              if (isConfirm && isCustomCakePendingPrice) {
                return null;
              }

              return (
                <Button
                  key={action.targetStatus}
                  type="button"
                  size="sm"
                  variant={action.variant ?? "default"}
                  disabled={updating}
                  onClick={() => {
                    if (isReject) {
                      onRequestReject(order);
                    } else {
                      onStatusAction(order, action.targetStatus);
                    }
                  }}
                  className="min-h-9 flex-1 gap-1.5 rounded-xl text-xs font-semibold"
                >
                  {updating ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : isReject ? (
                    <XCircle className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                  <span>{action.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

