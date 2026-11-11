"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bike,
  Check,
  Clock,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";

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
  onStatusAction: (order: OrderWithItems, targetStatus: string) => void;
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
                {addons.length > 0 && (
                  <p className="pl-4 text-[11px] text-muted-foreground">
                    + {addons.map((a) => a.name).join(", ")}
                  </p>
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

        {/* Role-Filtered Actions */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-2.5">
            {actions.map((action) => {
              const isReject = action.targetStatus === "cancelled";

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

