"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  CalendarClock,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_META } from "@/lib/order-transitions";
import type { OrderItemAddon, OrderWithItems } from "@/types/database";

type StaffLookup = Record<string, { name: string; role: string }>;

function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function formatPaymentMethod(method: string): string {
  if (method === "counter") return "Pay at counter";
  if (method === "cod") return "Cash on Delivery";
  return method;
}

export function OrderDetailBill({
  order,
  restaurantName,
  restaurantPhone,
  staffLookup,
}: {
  order: OrderWithItems;
  restaurantName: string;
  restaurantPhone: string;
  staffLookup: StaffLookup;
}) {
  const statusMeta =
    ORDER_STATUS_META[order.status] ?? {
      label: order.status,
      tone: "bg-muted text-foreground border-border",
    };

  const router = useRouter();
  const tableNumber = order.restaurant_tables?.table_number;
  const items = order.order_items ?? [];
  const history = React.useMemo(() => {
    const entries = [...(order.order_status_history ?? [])];
    entries.sort(
      (a, b) =>
        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    return entries;
  }, [order.order_status_history]);

  const hasCustomCake = items.some(
    (item) =>
      item.custom_image_url ||
      Number(item.unit_price) === 0 ||
      item.item_name.toLowerCase().includes("custom")
  );
  const isCustomCakePendingPrice =
    hasCustomCake &&
    order.status === "placed" &&
    items.some((item) => Number(item.unit_price) === 0);

  const [cakePriceInput, setCakePriceInput] = React.useState<string>("");
  const [submittingPrice, setSubmittingPrice] = React.useState(false);

  const handleConfirmWithPrice = async () => {
    const price = parseFloat(cakePriceInput);
    if (!price || price <= 0) {
      toast.error("Please enter a valid cake price.");
      return;
    }

    setSubmittingPrice(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "confirmed",
          customCakePrice: price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm custom cake order.");
      }
      toast.success(
        "Cake price confirmed & order accepted! Recorded in sales reports."
      );
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error confirming order."
      );
    } finally {
      setSubmittingPrice(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Screen Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-10 gap-1.5 rounded-xl"
          >
            <Link href="/admin/orders">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Orders</span>
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Order #{order.order_no}
              </h1>
              <Badge variant="outline" className={statusMeta.tone}>
                {statusMeta.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Placed on {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => window.print()}
          className="min-h-10 gap-2 rounded-xl px-5 font-semibold"
        >
          <Printer className="size-4" aria-hidden="true" />
          <span>Print bill</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Full Order Details & Status Timeline (hidden when printing thermal receipt) */}
        <div className="space-y-6 lg:col-span-3 print:hidden">
          {/* Custom Cake Pricing Action Banner */}
          {isCustomCakePendingPrice && (
            <Card className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-black text-amber-950 dark:text-amber-100">
                    <Sparkles className="size-5 text-amber-600" />
                    <span>Action Required: Set Custom Cake Price</span>
                  </CardTitle>
                  <Badge className="bg-amber-600 text-xs font-black text-white">
                    Price on Call 📞
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                  Customer ko phone karke cake photo &amp; details confirm karein. Yahan agreed price enter karein aur &ldquo;Confirm &amp; Set Price&rdquo; click karein taaki order confirm hokar sales reports me jud sake:
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[180px] flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter Agreed Price (₹)"
                      value={cakePriceInput}
                      onChange={(e) => setCakePriceInput(e.target.value)}
                      className="h-10 w-full rounded-xl border border-amber-500/40 bg-background pl-7 pr-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={submittingPrice || !cakePriceInput}
                    onClick={handleConfirmWithPrice}
                    className="h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    {submittingPrice ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 size-4" />
                    )}
                    <span>Confirm &amp; Set Price</span>
                  </Button>
                </div>

                {order.customer_phone && order.customer_phone !== "N/A" && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted"
                    >
                      <Phone className="size-3.5" />
                      <span>Call Customer ({order.customer_phone})</span>
                    </a>
                    <a
                      href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${order.customer_name}, Bakers Nation Nahan se aapke Custom Cake order #${order.order_no} ke regarding call kar rahe hain.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      <span>💬 WhatsApp Customer</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                {order.order_type === "dine_in" ? (
                  <>
                    <UtensilsCrossed className="size-4" aria-hidden="true" />
                    <span>
                      Dine-in
                      {tableNumber ? ` · Table ${tableNumber}` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <Bike className="size-4" aria-hidden="true" />
                    <span>Delivery Order</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/40 p-3.5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold">
                    {order.customer_name && order.customer_name !== "Guest"
                      ? order.customer_name
                      : "Walk-in / Guest"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  {order.customer_phone && order.customer_phone !== "N/A" ? (
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      <span>{order.customer_phone}</span>
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not provided</p>
                  )}
                </div>

                {order.order_type === "delivery" && order.delivery_address && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Delivery Address
                    </p>
                    <p className="mt-0.5 flex items-start gap-1.5 font-medium">
                      <MapPin
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>{order.delivery_address}</span>
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="font-semibold">
                    {formatPaymentMethod(order.payment_method)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Order Token</p>
                  <p className="font-mono text-xs">{order.order_token}</p>
                </div>

                {order.preorder_at && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Scheduled Pre-order Time
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-primary">
                      <CalendarClock className="size-3.5" aria-hidden="true" />
                      <span>{formatDateTime(order.preorder_at)}</span>
                    </p>
                  </div>
                )}
              </div>

              {items.some(
                (item) =>
                  item.selected_flavour ||
                  item.egg_preference ||
                  item.cake_message ||
                  item.custom_image_url
              ) && (
                <div className="space-y-2.5 rounded-xl border border-border/70 p-3.5">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Bakery Customizations
                  </p>
                  <ul className="space-y-2.5 text-xs">
                    {items
                      .filter(
                        (item) =>
                          item.selected_flavour ||
                          item.egg_preference ||
                          item.cake_message ||
                          item.custom_image_url
                      )
                      .map((item) => (
                        <li
                          key={item.id}
                          className="space-y-1 border-b border-border/50 pb-2 last:border-b-0 last:pb-0"
                        >
                          <p className="font-semibold">
                            {item.quantity}x {item.item_name}
                            {item.variant_label ? ` (${item.variant_label})` : ""}
                          </p>
                          {(item.selected_flavour || item.egg_preference) && (
                            <p className="text-muted-foreground">
                              {[item.selected_flavour, item.egg_preference]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {item.cake_message && (
                            <p className="font-medium text-amber-800 dark:text-amber-300">
                              Cake message: &ldquo;{item.cake_message}&rdquo;
                            </p>
                          )}
                          {item.custom_image_url && (
                            <div className="flex items-center gap-2.5 pt-1">
                              <div className="relative size-14 overflow-hidden rounded-lg ring-1 ring-border">
                                <Image
                                  src={item.custom_image_url}
                                  alt="Custom cake design reference"
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              </div>
                              <a
                                href={item.custom_image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                              >
                                <ExternalLink
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                <span>Open full cake design</span>
                              </a>
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {order.notes && (
                <div className="rounded-xl bg-amber-500/10 p-3 text-xs font-medium text-amber-950 dark:text-amber-200">
                  Special instructions: {order.notes}
                </div>
              )}

              {order.status === "cancelled" && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <XCircle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">Order Cancelled</p>
                    {order.cancel_reason && (
                      <p className="mt-0.5">{order.cancel_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History Timeline */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Clock className="size-4" aria-hidden="true" />
                <span>Status History Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No status transitions logged yet.
                </p>
              ) : (
                <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
                  {history.map((entry, idx) => {
                    const meta =
                      ORDER_STATUS_META[entry.status] ?? {
                        label: entry.status,
                      };
                    const actor = entry.changed_by
                      ? staffLookup[entry.changed_by]
                      : null;
                    const isLatest = idx === history.length - 1;

                    return (
                      <li key={entry.id} className="relative">
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-background ${
                            entry.status === "cancelled"
                              ? "bg-rose-500"
                              : isLatest
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                          }`}
                        />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold">{meta.label}</p>
                          <time
                            dateTime={entry.changed_at}
                            className="text-xs text-muted-foreground"
                          >
                            {formatDateTime(entry.changed_at)}
                          </time>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {actor
                            ? `Updated by ${actor.name} (${actor.role})`
                            : "Customer / System"}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right (and Print Output): 80mm Thermal Receipt */}
        <div className="lg:col-span-2 print:col-span-full">
          <div className="print:hidden mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground">
              80mm Thermal Bill Preview
            </h2>
          </div>

          <section
            aria-label="Printable 80mm thermal bill receipt"
            className="thermal-receipt mx-auto w-full max-w-[320px] rounded-2xl border bg-white p-5 font-mono text-xs text-zinc-900 shadow-sm"
          >
            <div className="border-b border-dashed border-zinc-400 pb-3 text-center">
              <p className="text-base font-bold uppercase tracking-wide">
                {restaurantName}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-700">
                Tel: {restaurantPhone}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider">
                Order Receipt
              </p>
            </div>

            <div className="space-y-1 border-b border-dashed border-zinc-400 py-2.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <span>Order No:</span>
                <span className="font-bold">#{order.order_no}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Date:</span>
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Type:</span>
                <span className="font-semibold">
                  {order.order_type === "dine_in"
                    ? `Dine-in${tableNumber ? ` (Table ${tableNumber})` : ""}`
                    : "Delivery"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Payment:</span>
                <span>{formatPaymentMethod(order.payment_method)}</span>
              </div>
              {order.preorder_at && (
                <div className="flex justify-between gap-2 font-semibold">
                  <span>Pre-order:</span>
                  <span>{formatDateTime(order.preorder_at)}</span>
                </div>
              )}
            </div>

            {(order.order_type === "delivery" ||
              (order.customer_name && order.customer_name !== "Guest")) && (
              <div className="space-y-0.5 border-b border-dashed border-zinc-400 py-2 text-[11px]">
                <p>
                  <span className="font-semibold">Customer:</span>{" "}
                  {order.customer_name}
                </p>
                {order.customer_phone && order.customer_phone !== "N/A" && (
                  <p>
                    <span className="font-semibold">Phone:</span>{" "}
                    {order.customer_phone}
                  </p>
                )}
                {order.order_type === "delivery" && order.delivery_address && (
                  <p>
                    <span className="font-semibold">Address:</span>{" "}
                    {order.delivery_address}
                  </p>
                )}
              </div>
            )}

            {/* Items Table */}
            <table className="w-full border-b border-dashed border-zinc-400 py-2 text-[11px]">
              <thead>
                <tr className="border-b border-dashed border-zinc-400 text-left">
                  <th scope="col" className="py-1.5 font-bold">
                    Item
                  </th>
                  <th scope="col" className="py-1.5 text-center font-bold">
                    Qty
                  </th>
                  <th scope="col" className="py-1.5 text-right font-bold">
                    Amt
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const addons = Array.isArray(item.addons)
                    ? (item.addons as OrderItemAddon[])
                    : [];

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="py-1.5 pr-2">
                        <p className="font-semibold">
                          {item.item_name}
                          {item.variant_label ? ` (${item.variant_label})` : ""}
                        </p>
                        {(item.selected_flavour || item.egg_preference) && (
                          <p className="text-[10px] text-zinc-700">
                            {[item.selected_flavour, item.egg_preference]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        )}
                        {addons.length > 0 && (
                          <p className="text-[10px] text-zinc-700">
                            + {addons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                        {item.cake_message && (
                          <p className="text-[10px] text-zinc-800">
                            Msg: &ldquo;{item.cake_message}&rdquo;
                          </p>
                        )}
                      </td>
                      <td className="py-1.5 text-center tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {Number(item.line_total) === 0 && order.status === "placed"
                          ? "Price on Call"
                          : formatPrice(Number(item.line_total))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-zinc-400 py-2.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {Number(order.subtotal) === 0 && order.status === "placed"
                    ? "Pending Quote"
                    : formatPrice(Number(order.subtotal))}
                </span>
              </div>
              {order.order_type === "delivery" && (
                <div className="flex justify-between gap-2">
                  <span>Delivery fee</span>
                  <span className="tabular-nums">
                    {formatPrice(Number(order.delivery_fee))}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-dashed border-zinc-400 pt-1.5 text-sm font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">
                  {Number(order.total) === 0 && order.status === "placed"
                    ? "Price on Call 📞"
                    : formatPrice(Number(order.total))}
                </span>
              </div>
            </div>

            <div className="pt-3 text-center text-[11px]">
              <p className="font-semibold">
                {formatPaymentMethod(order.payment_method)}
              </p>
              <p className="mt-1.5 text-zinc-700">
                Thank you for ordering with {restaurantName}! Visit again.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

