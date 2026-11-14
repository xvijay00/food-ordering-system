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
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl ${
        isOutOfStock ? "opacity-65 grayscale" : ""
      }`}
    >
      <div>
        {/* Large Product Photo Box */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/60">
          {showImage && activeImageUrl ? (
            <Image
              src={activeImageUrl}
              alt={`${item.name} photo ${imageIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 540px"
              className="object-cover transition-transform duration-500 group-hover:scale-108"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, [imageIndex]: true }))
              }
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground/40"
            >
              <UtensilsCrossed className="size-14" />
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
            {/* Veg / Non-Veg Glass Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-background/85 px-2.5 py-1 backdrop-blur-md shadow-xs">
              <VegIndicator isVeg={item.is_veg} />
              <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                {item.is_veg ? "Veg" : "Non-Veg"}
              </span>
            </div>

            {/* Discount or Bestseller Tag */}
            <div className="flex items-center gap-1.5">
              {hasDiscount && !isOutOfStock && (
                <Badge
                  variant="secondary"
                  className="gap-1 rounded-full border-0 bg-emerald-600 px-2.5 py-1 text-xs font-black text-white shadow-md"
                >
                  <Tag className="size-3" aria-hidden="true" />
                  {discountPercent}% OFF
                </Badge>
              )}
              {item.is_bestseller && (
                <Badge
                  variant="secondary"
                  className="gap-1 rounded-full border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-black text-white shadow-md"
                >
                  <Sparkles className="size-3" aria-hidden="true" />
                  Bestseller
                </Badge>
              )}
            </div>
          </div>

          {/* Out of Stock / Low Stock Pill Overlay */}
          {isOutOfStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-xs">
              <span className="rounded-full bg-destructive/90 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-destructive-foreground shadow-lg">
                Sold Out
              </span>
            </div>
          ) : (
            stockQty !== null &&
            stockQty <= 5 && (
              <div className="absolute bottom-3 left-3 pointer-events-none">
                <span className="rounded-full bg-rose-600/90 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm backdrop-blur-xs">
                  Only {stockQty} left
                </span>
              </div>
            )
          )}

          {/* Multi-image Controls */}
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
                className="absolute top-1/2 left-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs transition-colors hover:bg-black/85"
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
                className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs transition-colors hover:bg-black/85"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              <div className="absolute right-0 bottom-2.5 left-0 flex justify-center gap-1.5 pointer-events-none">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === imageIndex ? "w-5 bg-white shadow-xs" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-2.5 p-5">
          <div className="space-y-1">
            <h3 className="font-heading text-xl font-black leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
              {item.name}
            </h3>
            {item.description && (
              <p className="line-clamp-2 text-sm font-medium leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>

          {(flavours.length > 0 || eggOptions.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs font-semibold text-foreground/70">
              {flavours.length > 0 && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground/80">
                  {flavours.slice(0, 2).join(", ")}
                  {flavours.length > 2 ? ` +${flavours.length - 2}` : ""}
                </span>
              )}
              {eggOptions.length > 0 && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground/80">
                  {eggOptions.join(" / ")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Price & Add Button */}
      <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-card/50 p-4 sm:px-5">
        <div>
          {minVariantPrice !== null ? (
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Starting from
              </span>
              <p className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {formatPrice(minVariantPrice)}
              </p>
            </div>
          ) : hasDiscount ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">
                {formatPrice(sellingPrice)}
              </p>
              <p className="text-sm font-semibold text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </p>
            </div>
          ) : (
            <p className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {formatPrice(originalPrice)}
            </p>
          )}
          {hasCustomization && (
            <p className="text-[11px] font-extrabold text-primary">
              ✦ Customizable
            </p>
          )}
        </div>

        {/* Action Button matching the warm orange pill from the reference pictures */}
        {isOutOfStock ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-10 rounded-full px-5 text-xs font-black uppercase"
          >
            Sold out
          </Button>
        ) : simpleCartItem ? (
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 p-1 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Decrease ${item.name} quantity`}
              onClick={() => decrement(simpleCartItem.id)}
              className="size-8 rounded-full text-primary hover:bg-primary/20"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </Button>
            <span className="min-w-8 text-center text-sm font-black text-primary tabular-nums">
              {simpleCartItem.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!shopOpen || atStockLimit}
              aria-label={`Increase ${item.name} quantity`}
              onClick={handleIncrementSimple}
              className="size-8 rounded-full text-primary hover:bg-primary/20"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            disabled={isDisabled}
            onClick={handleDirectAdd}
            className="group/btn h-10 rounded-full bg-gradient-to-r from-amber-500 to-primary px-5 text-sm font-black text-white shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95"
          >
            <Plus className="mr-1 size-4 transition-transform group-hover/btn:rotate-90" aria-hidden="true" />
            <span>
              {hasCustomization && totalInCartForItem > 0
                ? `Add (${totalInCartForItem})`
                : "Add"}
            </span>
          </Button>
        )}
      </div>
    </article>
  );
}
