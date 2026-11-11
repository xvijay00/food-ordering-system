"use client";

import * as React from "react";
import Image from "next/image";
import { Minus, Plus, Sparkles, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { buildCartItemId, useCartStore } from "@/store/cart";
import type { MenuItemWithRelations } from "@/types/database";

type MenuCardProps = {
  item: MenuItemWithRelations;
  shopOpen: boolean;
  onCustomize: (item: MenuItemWithRelations) => void;
};

export function MenuCard({ item, shopOpen, onCustomize }: MenuCardProps) {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const add = useCartStore((state) => state.add);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);

  const [imageError, setImageError] = React.useState(false);

  const variants = item.item_variants ?? [];
  const activeAddons = (item.item_addons ?? []).filter(
    (addon) => addon.is_active
  );
  const hasCustomization = variants.length > 0 || activeAddons.length > 0;

  const simpleCartId = buildCartItemId(item.id, null, []);
  const simpleCartItem =
    hydrated && !hasCustomization
      ? items.find((cartItem) => cartItem.id === simpleCartId)
      : undefined;

  const customizedCount = hydrated
    ? items
        .filter((cartItem) => cartItem.menuItemId === item.id)
        .reduce((sum, cartItem) => sum + cartItem.quantity, 0)
    : 0;

  const isDisabled = !item.is_available || !shopOpen;
  const showImage = Boolean(item.image_url) && !imageError;

  const handleDirectAdd = () => {
    if (isDisabled) return;

    if (hasCustomization) {
      onCustomize(item);
      return;
    }

    add({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      isVeg: item.is_veg,
      unitPrice: Number(item.price),
      quantity: 1,
    });
    toast.success(`Added ${item.name} to cart`);
  };

  return (
    <Card
      className={`flex flex-col justify-between gap-4 rounded-2xl p-4 transition-shadow hover:shadow-md ${
        !item.is_available ? "opacity-65 grayscale" : ""
      }`}
    >
      <div className="flex gap-3.5">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <VegIndicator isVeg={item.is_veg} />
            {item.is_bestseller && (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300"
              >
                <Sparkles className="size-3" aria-hidden="true" />
                Bestseller
              </Badge>
            )}
            {!item.is_available && (
              <Badge variant="secondary">Sold out</Badge>
            )}
          </div>

          <div>
            <h3 className="font-heading text-base font-semibold leading-snug">
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
        </div>

        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border/50 sm:size-26">
          {showImage && item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 96px, 104px"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center text-muted-foreground/50"
            >
              <UtensilsCrossed className="size-7" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <div>
          <p className="text-base font-bold">{formatPrice(Number(item.price))}</p>
          {hasCustomization && (
            <p className="text-[11px] text-muted-foreground">Customizable</p>
          )}
        </div>

        {!item.is_available ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="min-h-10 rounded-xl px-4 font-semibold"
          >
            Add
          </Button>
        ) : simpleCartItem ? (
          <div className="inline-flex items-center rounded-xl border border-primary/30 bg-primary/10 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Decrease ${item.name} quantity`}
              onClick={() => decrement(simpleCartItem.id)}
              className="size-9 text-primary hover:bg-primary/15"
            >
              <Minus className="size-4" aria-hidden="true" />
            </Button>
            <span className="min-w-7 text-center text-sm font-bold text-primary tabular-nums">
              {simpleCartItem.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!shopOpen}
              aria-label={`Increase ${item.name} quantity`}
              onClick={() => increment(simpleCartItem.id)}
              className="size-9 text-primary hover:bg-primary/15"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant={hasCustomization && customizedCount > 0 ? "default" : "outline"}
            disabled={isDisabled}
            onClick={handleDirectAdd}
            className="min-h-10 rounded-xl px-4 font-semibold"
          >
            {hasCustomization && customizedCount > 0
              ? `Add (${customizedCount})`
              : "Add"}
          </Button>
        )}
      </div>
    </Card>
  );
}

