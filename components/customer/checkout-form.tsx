"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bike,
  CalendarClock,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  checkoutFormSchema,
  type CheckoutFormValues,
} from "@/lib/validations";
import {
  calculateCartSubtotal,
  calculateCartTotal,
  useCartStore,
} from "@/store/cart";
import type { AppSettings } from "@/types/database";

const MY_ORDERS_STORAGE_KEY = "my_orders";

function formatLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CheckoutForm() {
  const router = useRouter();
  const hydrated = useHydrated();

  const storedNotes = useCartStore((state) => state.notes);
  const items = useCartStore((state) => state.items);
  const setOrderType = useCartStore((state) => state.setOrderType);
  const clear = useCartStore((state) => state.clear);

  const [settings, setSettings] = React.useState<AppSettings>({
    delivery_fee: 40,
    min_order: 150,
    shop_open: true,
  });
  const [loadingSettings, setLoadingSettings] = React.useState(true);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [deliveryTiming, setDeliveryTiming] = React.useState<
    "now" | "preorder"
  >("now");
  const minPreorderLocal = React.useMemo(
    () => formatLocalDateTimeInput(new Date(Date.now() + 20 * 60 * 1000)),
    []
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onTouched",
    defaultValues: {
      orderType: "delivery",
      tableNo: null,
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      paymentMethod: "cod",
      notes: "",
      preorderAt: "",
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const idempotencyKeyRef = React.useRef<string>("");
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Enforce delivery mode and sync persisted notes on hydration
  React.useEffect(() => {
    if (!hydrated) return;

    setOrderType("delivery");
    setValue("orderType", "delivery");
    setValue("paymentMethod", "cod");
    setValue("tableNo", null);

    if (storedNotes) {
      setValue("notes", storedNotes);
    }
  }, [hydrated, setOrderType, setValue, storedNotes]);

  // Fetch public shop settings
  React.useEffect(() => {
    let active = true;

    async function loadCheckoutData() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok && active) {
          const data = (await res.json()) as AppSettings;
          setSettings(data);
        }
      } catch {
        // Fallback to default settings if unreachable
      } finally {
        if (active) setLoadingSettings(false);
      }
    }

    void loadCheckoutData();
    return () => {
      active = false;
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-9 w-44" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-2xl lg:col-span-7" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShoppingBag className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Your cart is empty
          </h1>
          <p className="text-sm text-muted-foreground">
            Add items from the menu before proceeding to checkout.
          </p>
        </div>
        <Button asChild size="lg" className="min-h-11 rounded-xl px-6">
          <Link href="/menu">Back to Menu</Link>
        </Button>
      </section>
    );
  }

  const subtotal = calculateCartSubtotal(items);
  const hasPricePending = items.some(
    (i) => i.isPricePending || i.unitPrice === 0
  );
  const appliedDeliveryFee = settings.delivery_fee;
  const total = calculateCartTotal(
    items,
    "delivery",
    settings.delivery_fee
  );
  const minOrderNotMet = !hasPricePending && subtotal < settings.min_order;
  const orderingDisabled =
    isSubmitting || !settings.shop_open || minOrderNotMet;

  const onSubmit = async (values: CheckoutFormValues) => {
    setSubmitError(null);

    if (!settings.shop_open) {
      setSubmitError("Restaurant is closed");
      return;
    }

    if (!hasPricePending && subtotal < settings.min_order) {
      setSubmitError(
        `Minimum order amount for delivery is ${formatPrice(settings.min_order)}.`
      );
      return;
    }

    if (deliveryTiming === "preorder" && !values.preorderAt?.trim()) {
      setError("preorderAt", {
        type: "manual",
        message: "Please choose your pre-order delivery date and time.",
      });
      return;
    }

    const preorderIso =
      deliveryTiming === "preorder" && values.preorderAt?.trim()
        ? new Date(values.preorderAt.trim()).toISOString()
        : null;

    try {
      const payloadBody = {
        orderType: "delivery" as const,
        tableNo: null,
        customerName: values.customerName?.trim() || "",
        customerPhone: values.customerPhone?.trim() || "",
        deliveryAddress: values.deliveryAddress?.trim() || "",
        notes: values.notes?.trim() || "",
        preorderAt: preorderIso,
        paymentMethod: "cod" as const,
        idempotencyKey: idempotencyKeyRef.current,
        items: items.map((item) => {
          const addonIds = item.addons
            .map((addon) => addon.id)
            .filter((id): id is string => Boolean(id));

          return {
            menuItemId: item.menuItemId,
            ...(item.variantId ? { variantId: item.variantId } : {}),
            ...(addonIds.length > 0 ? { addonIds } : {}),
            ...(item.selectedFlavour
              ? { selectedFlavour: item.selectedFlavour }
              : {}),
            ...(item.eggPreference
              ? { eggPreference: item.eggPreference }
              : {}),
            ...(item.cakeMessage ? { cakeMessage: item.cakeMessage } : {}),
            ...(item.customImageUrl
              ? { customImageUrl: item.customImageUrl }
              : {}),
            quantity: item.quantity,
          };
        }),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const result = (await response.json()) as {
        error?: string;
        orderToken?: string;
        orderNo?: number;
      };

      if (!response.ok || !result.orderToken || !result.orderNo) {
        throw new Error(result.error ?? "Unable to place order.");
      }

      try {
        const raw = localStorage.getItem(MY_ORDERS_STORAGE_KEY);
        const parsed = raw
          ? (JSON.parse(raw) as {
              order_token: string;
              timestamp: string;
              order_no?: number;
              total?: number;
            }[])
          : [];
        const nextHistory = [
          {
            order_token: result.orderToken,
            timestamp: new Date().toISOString(),
            order_no: result.orderNo,
            total,
          },
          ...parsed.filter(
            (entry) => entry.order_token !== result.orderToken
          ),
        ];
        localStorage.setItem(
          MY_ORDERS_STORAGE_KEY,
          JSON.stringify(nextHistory)
        );
      } catch {
        // Ignore storage write errors
      }

      clear();
      toast.success(`Order #${result.orderNo} placed!`);
      router.push(`/order/${result.orderToken}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to place order.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-1 text-base font-semibold text-foreground/80">
            Confirm your order details and review your bill.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="min-h-11 gap-2 px-5 text-sm font-bold">
          <Link href="/cart">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to Cart</span>
          </Link>
        </Button>
      </div>

      {!settings.shop_open && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base font-bold text-destructive"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p>Restaurant is closed</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <Card className="rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle id="checkout-form-title" className="text-lg font-bold">
                Order & Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form
                aria-labelledby="checkout-form-title"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
              >
                {/* Delivery Mode Badge */}
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-base font-bold text-emerald-950 dark:text-emerald-100">
                  <Bike className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Delivery to your location</span>
                </div>

                {/* Customer Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-name"
                    className="block text-base font-bold text-foreground"
                  >
                    Full Name <span aria-hidden="true" className="text-destructive">*</span>
                  </label>
                  <Input
                    id="checkout-name"
                    type="text"
                    autoComplete="name"
                    enterKeyHint="next"
                    required
                    aria-invalid={Boolean(errors.customerName)}
                    aria-describedby={
                      errors.customerName ? "checkout-name-error" : undefined
                    }
                    placeholder="Enter your name"
                    className="h-12 rounded-xl text-base font-semibold"
                    {...register("customerName")}
                  />
                  {errors.customerName && (
                    <p
                      id="checkout-name-error"
                      className="text-xs font-bold text-destructive"
                    >
                      {errors.customerName.message}
                    </p>
                  )}
                </div>

                {/* Customer Phone */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-phone"
                    className="block text-base font-bold text-foreground"
                  >
                    Mobile Number <span aria-hidden="true" className="text-destructive">*</span>
                  </label>
                  <p id="checkout-phone-hint" className="text-xs font-semibold text-foreground/75">
                    10-digit Indian mobile number (e.g. 9876543210)
                  </p>
                  <Input
                    id="checkout-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    enterKeyHint="next"
                    maxLength={10}
                    required
                    aria-invalid={Boolean(errors.customerPhone)}
                    aria-describedby={
                      errors.customerPhone
                        ? "checkout-phone-hint checkout-phone-error"
                        : "checkout-phone-hint"
                    }
                    placeholder="9876543210"
                    className="h-12 rounded-xl text-base font-semibold"
                    {...register("customerPhone")}
                  />
                  {errors.customerPhone && (
                    <p
                      id="checkout-phone-error"
                      className="text-xs font-bold text-destructive"
                    >
                      {errors.customerPhone.message}
                    </p>
                  )}
                </div>

                {/* Delivery Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-address"
                    className="block text-base font-bold text-foreground"
                  >
                    Full Delivery Address <span aria-hidden="true" className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="checkout-address"
                    autoComplete="street-address"
                    required
                    aria-invalid={Boolean(errors.deliveryAddress)}
                    aria-describedby={
                      errors.deliveryAddress
                        ? "checkout-address-error"
                        : undefined
                    }
                    placeholder="House/Flat no., building, street, landmark, pincode"
                    className="min-h-24 rounded-xl text-base font-medium"
                    {...register("deliveryAddress")}
                  />
                  {errors.deliveryAddress && (
                    <p
                      id="checkout-address-error"
                      className="text-xs font-bold text-destructive"
                    >
                      {errors.deliveryAddress.message}
                    </p>
                  )}
                </div>

                {/* Kitchen Notes */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-notes"
                    className="block text-base font-bold text-foreground"
                  >
                    Order Notes{" "}
                    <span className="text-xs font-semibold text-foreground/70">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    id="checkout-notes"
                    placeholder="Cooking preferences or delivery instructions..."
                    className="min-h-20 rounded-xl text-base font-medium"
                    {...register("notes")}
                  />
                </div>

                {/* Pre-Order Date & Time */}
                <fieldset className="space-y-2.5">
                  <legend className="text-base font-bold text-foreground">
                    Delivery Schedule
                  </legend>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryTiming("now");
                        setValue("preorderAt", "", { shouldValidate: true });
                      }}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-base font-bold transition-colors ${
                        deliveryTiming === "now"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      <Bike className="size-4.5" aria-hidden="true" />
                      <span>Deliver Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryTiming("preorder");
                      }}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-base font-bold transition-colors ${
                        deliveryTiming === "preorder"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      <CalendarClock className="size-4.5" aria-hidden="true" />
                      <span>Schedule Pre-order</span>
                    </button>
                  </div>

                  {deliveryTiming === "preorder" && (
                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3.5">
                      <label
                        htmlFor="checkout-preorder"
                        className="block text-sm font-bold text-foreground"
                      >
                        Choose Pre-order Date &amp; Time{" "}
                        <span aria-hidden="true" className="text-destructive">*</span>
                      </label>
                      <Input
                        id="checkout-preorder"
                        type="datetime-local"
                        min={minPreorderLocal}
                        aria-invalid={Boolean(errors.preorderAt)}
                        className="h-12 rounded-xl bg-background text-base font-semibold"
                        {...register("preorderAt")}
                      />
                      {errors.preorderAt && (
                        <p className="text-xs font-bold text-destructive">
                          {errors.preorderAt.message}
                        </p>
                      )}
                    </div>
                  )}
                </fieldset>

                {/* Payment Method */}
                <fieldset className="space-y-2">
                  <legend className="text-base font-bold text-foreground">Payment Method</legend>
                  <div className="flex min-h-12 items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-base font-bold text-foreground">
                    <input
                      type="hidden"
                      {...register("paymentMethod")}
                    />
                    <Banknote
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                    <span>Cash on Delivery</span>
                  </div>
                </fieldset>

                {submitError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm font-bold text-destructive"
                  >
                    <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                    <span>{submitError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={orderingDisabled}
                  className="min-h-13 w-full rounded-full bg-gradient-to-r from-amber-500 to-primary text-base font-black text-white shadow-md transition-all hover:scale-[1.02] active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      <span>Placing order...</span>
                    </>
                  ) : !settings.shop_open ? (
                    <span>Restaurant is closed</span>
                  ) : hasPricePending ? (
                    <span>Place Order &amp; Confirm Price on Call 📞</span>
                  ) : (
                    <span>Place Order · {formatPrice(total)}</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Bill Summary Column */}
        <div className="lg:col-span-5">
          <Card className="sticky top-20 rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-lg font-bold">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <ul className="space-y-3 text-base">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-foreground">
                        {item.quantity}x {item.name}
                        {item.variantLabel ? ` (${item.variantLabel})` : ""}
                      </span>
                      {(item.selectedFlavour ||
                        item.eggPreference ||
                        item.cakeMessage ||
                        item.customImageUrl) && (
                        <p className="text-xs font-semibold text-foreground/80">
                          {[
                            item.selectedFlavour,
                            item.eggPreference,
                            item.cakeMessage
                              ? `Msg: "${item.cakeMessage}"`
                              : null,
                            item.customImageUrl ? "Custom design photo" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-extrabold tabular-nums text-foreground">
                      {item.isPricePending || item.unitPrice === 0
                        ? "Price on Call 📞"
                        : formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 border-t border-border/60 pt-3 text-base">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground/80">Subtotal</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {hasPricePending
                      ? subtotal > 0
                        ? `${formatPrice(subtotal)} + Cake (Price on Call)`
                        : "Price on Call 📞"
                      : formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground/80">Delivery fee</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {loadingSettings
                      ? "..."
                      : formatPrice(appliedDeliveryFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xl font-black text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {hasPricePending
                      ? total > 0
                        ? `${formatPrice(total)} + Cake Price on Call`
                        : "Price on Call 📞"
                      : formatPrice(total)}
                  </span>
                </div>

                {hasPricePending && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-950 dark:text-amber-100">
                    📞 <strong>Custom Cake Note:</strong> Baker&apos;s Nation master chef will call you shortly to discuss cake decoration and finalize the price before baking.
                  </div>
                )}
              </div>

              {minOrderNotMet && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm font-bold text-amber-950 dark:text-amber-100"
                >
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Minimum order for delivery is{" "}
                    {formatPrice(settings.min_order)}. Add{" "}
                    {formatPrice(settings.min_order - subtotal)} more to place
                    your order.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
