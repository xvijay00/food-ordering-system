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
      className={`group flex flex-col justify-between overflow-hidden rounded-3xl p-0 transition-all hover:shadow-lg ${
        isOutOfStock ? "opacity-65 grayscale" : ""
      }`}
    >
      <div>
        {/* Large Product Photo Box */}
        <div className="relative h-56 w-full overflow-hidden bg-muted/60 sm:h-64">
          {showImage && activeImageUrl ? (
            <Image
              src={activeImageUrl}
              alt={`${item.name} photo ${imageIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 540px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, [imageIndex]: true }))
              }
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center text-muted-foreground/40"
            >
              <UtensilsCrossed className="size-14" />
            </div>
          )}

          {hasDiscount && !isOutOfStock && (
            <Badge
              variant="secondary"
              className="absolute top-3 right-3 gap-1 bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
            >
              <Tag className="size-3" aria-hidden="true" />
              {discountPercent}% OFF
            </Badge>
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
                className="absolute top-1/2 left-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next product image"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((prev) => (prev + 1) % images.length);
                }}
                className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`size-2 rounded-full transition-all ${
                      idx === imageIndex ? "w-5 bg-white" : "bg-white/55"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-2.5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <VegIndicator isVeg={item.is_veg} />
            {item.is_bestseller && (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-500/15 text-xs text-amber-700 dark:text-amber-300"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                Bestseller
              </Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="secondary" className="text-xs">
                Sold out
              </Badge>
            ) : (
              stockQty !== null &&
              stockQty <= 5 && (
                <Badge
                  variant="secondary"
                  className="bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300"
                >
                  Only {stockQty} left
                </Badge>
              )
            )}
          </div>

          <div>
            <h3 className="font-heading text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            )}
            {(flavours.length > 0 || eggOptions.length > 0) && (
              <p className="mt-2 line-clamp-1 text-xs font-medium text-muted-foreground">
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
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-4 sm:px-6">
        <div>
          {minVariantPrice !== null ? (
            <p className="text-xl font-bold tracking-tight">
              From {formatPrice(minVariantPrice)}
            </p>
          ) : hasDiscount ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                {formatPrice(sellingPrice)}
              </p>
              <p className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold tracking-tight">
              {formatPrice(originalPrice)}
            </p>
          )}
          {hasCustomization && (
            <p className="text-xs text-muted-foreground">Customizable</p>
          )}
        </div>

        {isOutOfStock ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="min-h-11 rounded-xl px-5 text-sm font-semibold"
          >
            Sold out
          </Button>
        ) : simpleCartItem ? (
          <div className="inline-flex items-center rounded-xl border border-primary/30 bg-primary/10 p-1">
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
            <span className="min-w-8 text-center text-sm font-bold text-primary tabular-nums">
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
            className="min-h-11 rounded-xl px-6 text-sm font-semibold"
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
