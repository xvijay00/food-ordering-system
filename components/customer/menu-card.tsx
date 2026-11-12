"use client";

import * as React from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getEffectiveBasePrice,
  getProductImages,
} from "@/lib/bakery-constants";
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

  const images = React.useMemo(() => getProductImages(item), [item]);
  const [imageIndex, setImageIndex] = React.useState(0);
  const [failedImages, setFailedImages] = React.useState<Record<number, boolean>>(
    {}
  );

  const variants = item.item_variants ?? [];
  const activeAddons = (item.item_addons ?? []).filter(
    (addon) => addon.is_active
  );
  const flavours = item.flavours ?? [];
  const eggOptions = item.egg_options ?? [];

  const hasCustomization =
    variants.length > 0 ||
    activeAddons.length > 0 ||
    flavours.length > 0 ||
    eggOptions.length > 0 ||
    Boolean(item.allow_custom_message) ||
    Boolean(item.allow_custom_image);

  const simpleCartId = buildCartItemId(item.id, null, []);
  const simpleCartItem =
    hydrated && !hasCustomization
      ? items.find((cartItem) => cartItem.id === simpleCartId)
      : undefined;

  const totalInCartForItem = hydrated
    ? items
        .filter((cartItem) => cartItem.menuItemId === item.id)
        .reduce((sum, cartItem) => sum + cartItem.quantity, 0)
    : 0;

  const stockQty =
    item.stock_quantity !== null && item.stock_quantity !== undefined
      ? Number(item.stock_quantity)
      : null;
  const isOutOfStock = !item.is_available || (stockQty !== null && stockQty <= 0);
  const isDisabled = isOutOfStock || !shopOpen;
  const atStockLimit = stockQty !== null && totalInCartForItem >= stockQty;

  const { sellingPrice, originalPrice, hasDiscount, discountPercent } =
    getEffectiveBasePrice(item);
  const minVariantPrice =
    variants.length > 0
      ? Math.min(...variants.map((v) => Number(v.price)))
      : null;

  const activeImageUrl = images[imageIndex] ?? null;
  const showImage = Boolean(activeImageUrl) && !failedImages[imageIndex];

  const handleDirectAdd = () => {
    if (isDisabled) return;

    if (atStockLimit) {
      toast.error(`Only ${stockQty} left in stock for "${item.name}".`);
      return;
    }

    if (hasCustomization) {
      onCustomize(item);
      return;
    }

    add({
      menuItemId: item.id,
      name: item.name,
      imageUrl: images[0] ?? item.image_url,
      isVeg: item.is_veg,
      unitPrice: sellingPrice,
      quantity: 1,
    });
    toast.success(`Added ${item.name} to cart`);
  };

  const handleIncrementSimple = () => {
    if (!simpleCartItem) return;
    if (atStockLimit) {
      toast.error(`Only ${stockQty} left in stock for "${item.name}".`);
      return;
    }
    increment(simpleCartItem.id);
  };

  return (
    <Card
      className={`flex flex-col justify-between gap-4 rounded-2xl p-4 transition-shadow hover:shadow-md ${
        isOutOfStock ? "opacity-65 grayscale" : ""
      }`}
    >
      <div className="flex gap-3.5">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <VegIndicator isVeg={item.is_veg} />
            {item.is_bestseller && (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-500/15 text-[11px] text-amber-700 dark:text-amber-300"
              >
                <Sparkles className="size-3" aria-hidden="true" />
                Bestseller
              </Badge>
            )}
            {hasDiscount && !isOutOfStock && (
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-500/15 text-[11px] text-emerald-700 dark:text-emerald-300"
              >
                <Tag className="size-2.5" aria-hidden="true" />
                {discountPercent}% OFF
              </Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="secondary" className="text-[11px]">
                Sold out
              </Badge>
            ) : (
              stockQty !== null &&
              stockQty <= 5 && (
                <Badge
                  variant="secondary"
                  className="bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-300"
                >
                  Only {stockQty} left
                </Badge>
              )
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
            {(flavours.length > 0 || eggOptions.length > 0) && (
              <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">
                {[
                  flavours.length > 0 ? flavours.slice(0, 3).join(", ") : null,
                  eggOptions.length > 0 ? eggOptions.join(" / ") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border/50 sm:size-26">
          {showImage && activeImageUrl ? (
            <Image
              src={activeImageUrl}
              alt={`${item.name} photo ${imageIndex + 1}`}
              fill
              sizes="(max-width: 640px) 96px, 104px"
              className="object-cover"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, [imageIndex]: true }))
              }
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center text-muted-foreground/50"
            >
              <UtensilsCrossed className="size-7" />
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous product image"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex(
                    (prev) => (prev - 1 + images.length) % images.length
                  );
                }}
                className="absolute top-1/2 left-1 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                <ChevronLeft className="size-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next product image"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((prev) => (prev + 1) % images.length);
                }}
                className="absolute top-1/2 right-1 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                <ChevronRight className="size-3" aria-hidden="true" />
              </button>
              <div className="absolute right-0 bottom-1 left-0 flex justify-center gap-1">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`size-1.5 rounded-full ${
                      idx === imageIndex ? "bg-white" : "bg-white/45"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <div>
          {minVariantPrice !== null ? (
            <p className="text-base font-bold">
              From {formatPrice(minVariantPrice)}
            </p>
          ) : hasDiscount ? (
            <div className="flex flex-wrap items-baseline gap-1.5">
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {formatPrice(sellingPrice)}
              </p>
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </p>
            </div>
          ) : (
            <p className="text-base font-bold">{formatPrice(originalPrice)}</p>
          )}
          {hasCustomization && (
            <p className="text-[11px] text-muted-foreground">Customizable</p>
          )}
        </div>

        {isOutOfStock ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="min-h-10 rounded-xl px-4 font-semibold"
          >
            Sold out
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
              disabled={!shopOpen || atStockLimit}
              aria-label={`Increase ${item.name} quantity`}
              onClick={handleIncrementSimple}
              className="size-9 text-primary hover:bg-primary/15"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant={
              hasCustomization && totalInCartForItem > 0 ? "default" : "outline"
            }
            disabled={isDisabled}
            onClick={handleDirectAdd}
            className="min-h-10 rounded-xl px-4 font-semibold"
          >
            {hasCustomization && totalInCartForItem > 0
              ? `Add (${totalInCartForItem})`
              : "Add"}
          </Button>
        )}
      </div>
    </Card>
  );
}
