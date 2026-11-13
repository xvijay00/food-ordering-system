"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  calculateCartItemCount,
  calculateCartSubtotal,
  useCartStore,
} from "@/store/cart";

export function CartView() {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const notes = useCartStore((state) => state.notes);
  const setNotes = useCartStore((state) => state.setNotes);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const remove = useCartStore((state) => state.remove);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
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
            Browse our menu and add dishes to your cart before checking out.
          </p>
        </div>
        <Button asChild size="lg" className="min-h-11 rounded-xl px-6">
          <Link href="/menu">Back to Menu</Link>
        </Button>
      </section>
    );
  }

  const itemCount = calculateCartItemCount(items);
  const subtotal = calculateCartSubtotal(items);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Your Cart
          </h1>
          <p className="mt-1 text-base font-semibold text-foreground/80">
            {itemCount} {itemCount === 1 ? "item" : "items"} selected
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="min-h-11 px-5 text-sm font-bold">
          <Link href="/menu">Add more items</Link>
        </Button>
      </div>

      {/* Cart Items */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-lg font-bold">Items</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  {typeof item.isVeg === "boolean" && (
                    <VegIndicator isVeg={item.isVeg} />
                  )}
                  <h2 className="truncate font-heading text-base font-bold text-foreground sm:text-lg">
                    {item.name}
                  </h2>
                </div>

                {item.isBirthdayPackage && (
                  <div className="pt-0.5">
                    <Badge
                      variant="secondary"
                      className="gap-1 border-primary/20 bg-primary/10 text-xs font-bold text-primary"
                    >
                      🎉 Birthday Package Item
                    </Badge>
                  </div>
                )}

                {item.variantLabel && (
                  <p className="text-sm font-semibold text-foreground/85">
                    Size / Weight: {item.variantLabel}
                  </p>
                )}

                {(item.selectedFlavour || item.eggPreference) && (
                  <p className="text-sm font-semibold text-foreground/80">
                    {[item.selectedFlavour, item.eggPreference]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                {item.addons.length > 0 && (
                  <p className="text-sm font-semibold text-foreground/80">
                    Add-ons: {item.addons.map((a) => a.name).join(", ")}
                  </p>
                )}

                {item.cakeMessage && (
                  <p className="text-sm font-bold text-primary">
                    Cake message: &ldquo;{item.cakeMessage}&rdquo;
                  </p>
                )}

                {item.customImageUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative size-11 overflow-hidden rounded-xl ring-2 ring-border">
                      <Image
                        src={item.customImageUrl}
                        alt="Custom cake design"
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground/80">
                      Custom cake image attached
                    </span>
                  </div>
                )}

                <p className="text-sm font-bold text-foreground/70">
                  {formatPrice(item.unitPrice)} each
                </p>
              </div>

              <div className="flex flex-col items-end gap-2.5">
                <p className="text-lg font-black tabular-nums text-foreground">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-xl border border-border bg-background p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => decrement(item.id)}
                      className="size-9"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </Button>
                    <span className="min-w-8 text-center text-sm font-black tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() => increment(item.id)}
                      className="size-9"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => remove(item.id)}
                    className="size-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Kitchen / Order Notes */}
      <Card className="rounded-2xl">
        <CardContent className="space-y-2 p-5">
          <label htmlFor="cart-notes" className="block text-base font-bold text-foreground">
            Cooking &amp; Order Notes (optional)
          </label>
          <Textarea
            id="cart-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            placeholder="Less spicy, eggless, extra candles..."
            className="min-h-24 rounded-xl text-base font-medium"
          />
        </CardContent>
      </Card>

      {/* Subtotal & Checkout CTA */}
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-foreground/75 uppercase">
              Subtotal
            </p>
            <p className="text-3xl font-black tabular-nums text-foreground">
              {formatPrice(subtotal)}
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="min-h-13 gap-2 rounded-xl px-7 text-base font-black shadow-md"
          >
            <Link href="/checkout">
              <span>Proceed to Checkout</span>
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

