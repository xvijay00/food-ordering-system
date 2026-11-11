"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Store, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RESTAURANT_CONFIG } from "@/lib/config";
import type { RestaurantAdminSettings } from "@/types/database";

const settingsFormSchema = z.object({
  shop_open: z.boolean(),
  delivery_fee: z
    .string()
    .trim()
    .refine((val) => val !== "" && !Number.isNaN(Number(val)), {
      message: "Enter a valid delivery fee.",
    })
    .refine((val) => Number(val) >= 0 && Number(val) <= 5000, {
      message: "Delivery fee must be between 0 and 5,000.",
    }),
  min_order: z
    .string()
    .trim()
    .refine((val) => val !== "" && !Number.isNaN(Number(val)), {
      message: "Enter a valid minimum order amount.",
    })
    .refine((val) => Number(val) >= 0 && Number(val) <= 50000, {
      message: "Minimum order must be between 0 and 50,000.",
    }),
  restaurant_name: z
    .string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters.")
    .max(80, "Restaurant name must be 80 characters or fewer."),
  restaurant_phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 digits.")
    .max(20, "Phone number is too long.")
    .regex(/^[+0-9\s()-]+$/, "Use only digits, spaces, +, -, or parentheses."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function SettingsManager({
  initialSettings,
}: {
  initialSettings: RestaurantAdminSettings;
}) {
  const [savedNotice, setSavedNotice] = React.useState("");

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      shop_open: initialSettings.shop_open,
      delivery_fee: String(initialSettings.delivery_fee),
      min_order: String(initialSettings.min_order),
      restaurant_name: initialSettings.restaurant_name,
      restaurant_phone: initialSettings.restaurant_phone,
    },
  });

  const shopOpen = watch("shop_open");

  const persistSettings = async (values: SettingsFormValues) => {
    setSavedNotice("");
    const payload: RestaurantAdminSettings = {
      shop_open: values.shop_open,
      delivery_fee: Number(values.delivery_fee),
      min_order: Number(values.min_order),
      restaurant_name: values.restaurant_name.trim(),
      restaurant_phone: values.restaurant_phone.trim(),
    };

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as {
      error?: string;
      settings?: RestaurantAdminSettings;
    } | null;

    if (!res.ok) {
      throw new Error(data?.error ?? "Failed to update settings.");
    }

    const updated = data?.settings ?? payload;
    reset({
      shop_open: updated.shop_open,
      delivery_fee: String(updated.delivery_fee),
      min_order: String(updated.min_order),
      restaurant_name: updated.restaurant_name,
      restaurant_phone: updated.restaurant_phone,
    });

    setSavedNotice("Settings saved.");
    toast.success("Restaurant settings updated");
  };

  const handleToggleShopOpen = async (nextOpen: boolean) => {
    const previousOpen = shopOpen;
    setValue("shop_open", nextOpen, { shouldDirty: true });

    try {
      const currentValues = watch();
      const validated = settingsFormSchema.safeParse({
        ...currentValues,
        shop_open: nextOpen,
      });

      if (validated.success) {
        await persistSettings(validated.data);
      }
    } catch (error) {
      setValue("shop_open", previousOpen);
      toast.error(
        error instanceof Error ? error.message : "Could not toggle shop status."
      );
    }
  };

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await persistSettings(values);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save settings."
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Restaurant Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Control live store availability, delivery fees, minimum order rules,
          and receipt details.
        </p>
      </div>

      {/* Prominent Shop Open / Closed Toggle */}
      <Card
        className={`rounded-2xl border-2 transition-colors ${
          shopOpen
            ? "border-emerald-500/40 bg-emerald-500/[0.04]"
            : "border-rose-500/40 bg-rose-500/[0.04]"
        }`}
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                shopOpen
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
              }`}
            >
              <Store className="size-6" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="shop-open-toggle"
                  className="text-base font-bold sm:text-lg"
                >
                  Store Availability
                </label>
                <Badge
                  variant={shopOpen ? "secondary" : "destructive"}
                  className="gap-1 text-xs"
                >
                  {shopOpen ? (
                    <>
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      <span>Open</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-3" aria-hidden="true" />
                      <span>Closed</span>
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {shopOpen
                  ? "Customers can place dine-in and delivery orders right now."
                  : "Ordering is paused. Checkout shows that the restaurant is closed."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 self-end sm:self-center">
            <span className="text-sm font-semibold">
              {shopOpen ? "Accepting orders" : "Paused"}
            </span>
            <Switch
              id="shop-open-toggle"
              aria-label="Toggle shop open or closed"
              checked={shopOpen}
              onCheckedChange={(checked) => void handleToggleShopOpen(checked)}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-6"
        aria-labelledby="store-details-heading"
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle id="store-details-heading" className="text-lg">
              Store Details &amp; Pricing Rules
            </CardTitle>
            <CardDescription>
              Delivery fee and minimum order amount apply to checkout calculations
              in real time.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="restaurant_name"
                  className="text-sm font-medium"
                >
                  Restaurant name <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="restaurant_name"
                  type="text"
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.restaurant_name)}
                  aria-describedby={
                    errors.restaurant_name
                      ? "restaurant_name-error"
                      : "restaurant_name-hint"
                  }
                  className="h-11 rounded-xl"
                  {...register("restaurant_name")}
                />
                <p
                  id="restaurant_name-hint"
                  className="text-xs text-muted-foreground"
                >
                  Printed at the top of kitchen and customer bills.
                </p>
                {errors.restaurant_name && (
                  <p
                    id="restaurant_name-error"
                    className="text-xs font-medium text-destructive"
                  >
                    {errors.restaurant_name.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="restaurant_phone"
                  className="text-sm font-medium"
                >
                  Restaurant phone <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="restaurant_phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.restaurant_phone)}
                  aria-describedby={
                    errors.restaurant_phone
                      ? "restaurant_phone-error"
                      : "restaurant_phone-hint"
                  }
                  className="h-11 rounded-xl"
                  {...register("restaurant_phone")}
                />
                <p
                  id="restaurant_phone-hint"
                  className="text-xs text-muted-foreground"
                >
                  Shown on customer receipts and support contact.
                </p>
                {errors.restaurant_phone && (
                  <p
                    id="restaurant_phone-error"
                    className="text-xs font-medium text-destructive"
                  >
                    {errors.restaurant_phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="delivery_fee" className="text-sm font-medium">
                  Delivery fee ({RESTAURANT_CONFIG.currencySymbol}){" "}
                  <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="delivery_fee"
                  type="text"
                  inputMode="decimal"
                  aria-invalid={Boolean(errors.delivery_fee)}
                  aria-describedby={
                    errors.delivery_fee
                      ? "delivery_fee-error"
                      : "delivery_fee-hint"
                  }
                  className="h-11 rounded-xl"
                  {...register("delivery_fee")}
                />
                <p
                  id="delivery_fee-hint"
                  className="text-xs text-muted-foreground"
                >
                  Added automatically to delivery orders. Set to 0 for free
                  delivery.
                </p>
                {errors.delivery_fee && (
                  <p
                    id="delivery_fee-error"
                    className="text-xs font-medium text-destructive"
                  >
                    {errors.delivery_fee.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="min_order" className="text-sm font-medium">
                  Minimum delivery order ({RESTAURANT_CONFIG.currencySymbol}){" "}
                  <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="min_order"
                  type="text"
                  inputMode="decimal"
                  aria-invalid={Boolean(errors.min_order)}
                  aria-describedby={
                    errors.min_order ? "min_order-error" : "min_order-hint"
                  }
                  className="h-11 rounded-xl"
                  {...register("min_order")}
                />
                <p
                  id="min_order-hint"
                  className="text-xs text-muted-foreground"
                >
                  Minimum item subtotal required for delivery checkout.
                </p>
                {errors.min_order && (
                  <p
                    id="min_order-error"
                    className="text-xs font-medium text-destructive"
                  >
                    {errors.min_order.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p
                role="status"
                aria-live="polite"
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                {savedNotice || (isDirty ? "Unsaved changes" : "")}
              </p>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 gap-2 rounded-xl px-6 font-semibold"
              >
                {isSubmitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                <span>{isSubmitting ? "Saving..." : "Save changes"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

