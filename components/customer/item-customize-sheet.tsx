"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getEffectiveBasePrice,
  getProductImages,
} from "@/lib/bakery-constants";
import { compressImageToMax800 } from "@/lib/compress-image";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/store/cart";
import type {
  ItemAddon,
  ItemVariant,
  MenuItemWithRelations,
} from "@/types/database";

type ItemCustomizeSheetProps = {
  item: MenuItemWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
};

export function ItemCustomizeSheet({
  item,
  open,
  onOpenChange,
  disabled = false,
}: ItemCustomizeSheetProps) {
  const cartItems = useCartStore((state) => state.items);
  const add = useCartStore((state) => state.add);

  const variants = React.useMemo<ItemVariant[]>(
    () => item?.item_variants ?? [],
    [item]
  );
  const activeAddons = React.useMemo<ItemAddon[]>(
    () => (item?.item_addons ?? []).filter((addon) => addon.is_active),
    [item]
  );
  const flavours = React.useMemo<string[]>(
    () => item?.flavours ?? [],
    [item]
  );
  const eggOptions = React.useMemo<string[]>(
    () => item?.egg_options ?? [],
    [item]
  );
  const images = React.useMemo(
    () => (item ? getProductImages(item) : []),
    [item]
  );

  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = React.useState<string[]>([]);
  const [selectedFlavour, setSelectedFlavour] = React.useState<string>("");
  const [eggPreference, setEggPreference] = React.useState<string>("");
  const [cakeMessage, setCakeMessage] = React.useState<string>("");
  const [customImageUrl, setCustomImageUrl] = React.useState<string | null>(
    null
  );
  const [uploadingCakePhoto, setUploadingCakePhoto] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1);

  React.useEffect(() => {
    if (!item || !open) return;
    setActivePhotoIndex(0);
    setSelectedVariantId(variants[0]?.id ?? "");
    setSelectedAddonIds([]);
    setSelectedFlavour(flavours[0] ?? "");
    setEggPreference(eggOptions[0] ?? "");
    setCakeMessage("");
    setCustomImageUrl(null);
    setQuantity(1);
  }, [item, open, variants, flavours, eggOptions]);

  if (!item) return null;

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const { sellingPrice } = getEffectiveBasePrice(item);
  const basePrice = selectedVariant
    ? Number(selectedVariant.price)
    : sellingPrice;
  const chosenAddons = activeAddons.filter((addon) =>
    selectedAddonIds.includes(addon.id)
  );
  const addonsTotal = chosenAddons.reduce(
    (sum, addon) => sum + Number(addon.price),
    0
  );
  const unitPrice = basePrice + addonsTotal;
  const lineTotal = unitPrice * quantity;

  const alreadyInCartQty = cartItems
    .filter((cartItem) => cartItem.menuItemId === item.id)
    .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
  const stockQty =
    item.stock_quantity !== null && item.stock_quantity !== undefined
      ? Number(item.stock_quantity)
      : null;
  const remainingStock =
    stockQty !== null ? Math.max(0, stockQty - alreadyInCartQty) : null;
  const outOfStock =
    !item.is_available || (remainingStock !== null && remainingStock <= 0);

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleCakeImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCakePhoto(true);
    try {
      const compressed = await compressImageToMax800(file);
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch("/api/upload-cake-reference", {
        method: "POST",
        body: formData,
      });
      const result = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !result.url) {
        throw new Error(result.error ?? "Upload failed.");
      }
      setCustomImageUrl(result.url);
      toast.success("Custom cake photo uploaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not upload photo."
      );
    } finally {
      setUploadingCakePhoto(false);
      e.target.value = "";
    }
  };

  const handleAddToCart = () => {
    if (remainingStock !== null && quantity > remainingStock) {
      toast.error(`Only ${remainingStock} more available in stock.`);
      return;
    }

    add({
      menuItemId: item.id,
      name: item.name,
      imageUrl: images[0] ?? item.image_url,
      isVeg: item.is_veg,
      variantId: selectedVariant?.id ?? null,
      variantLabel: selectedVariant?.label ?? null,
      addons: chosenAddons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: Number(addon.price),
      })),
      selectedFlavour: selectedFlavour || null,
      eggPreference: eggPreference || null,
      cakeMessage: cakeMessage.trim() || null,
      customImageUrl,
      unitPrice,
      quantity,
    });

    toast.success(`Added ${item.name} to cart`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88dvh] max-w-xl rounded-t-3xl sm:rounded-t-2xl"
      >
        <SheetHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <VegIndicator isVeg={item.is_veg} />
            <SheetTitle className="font-heading text-lg">
              {item.name}
            </SheetTitle>
            {stockQty !== null && stockQty > 0 && stockQty <= 5 && (
              <Badge
                variant="secondary"
                className="bg-rose-500/10 text-[10px] text-rose-700"
              >
                {stockQty} left
              </Badge>
            )}
          </div>
          {item.description && (
            <SheetDescription>{item.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-3">
          {/* Product Photo Gallery */}
          {images.length > 0 && (
            <div className="space-y-2">
              <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={images[activePhotoIndex] ?? images[0]}
                  alt={`${item.name} preview`}
                  fill
                  sizes="(max-width: 640px) 100vw, 520px"
                  className="object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative size-14 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${
                        idx === activePhotoIndex
                          ? "ring-primary"
                          : "ring-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cake Size / Weight Variants */}
          {variants.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Choose Size / Weight
              </legend>
              <div className="grid gap-2">
                {variants.map((variant) => {
                  const checked = variant.id === selectedVariantId;
                  return (
                    <label
                      key={variant.id}
                      className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <span className="flex items-center gap-2.5 font-medium">
                        <input
                          type="radio"
                          name={`variant-${item.id}`}
                          value={variant.id}
                          checked={checked}
                          onChange={() => setSelectedVariantId(variant.id)}
                          className="size-4 accent-primary"
                        />
                        <span>{variant.label}</span>
                      </span>
                      <span className="font-semibold">
                        {formatPrice(Number(variant.price))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Flavour Picker */}
          {flavours.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Choose Flavour
              </legend>
              <div className="flex flex-wrap gap-2">
                {flavours.map((flavour) => {
                  const active = selectedFlavour === flavour;
                  return (
                    <button
                      key={flavour}
                      type="button"
                      onClick={() => setSelectedFlavour(flavour)}
                      className={`min-h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {flavour}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Eggless / With Egg Picker */}
          {eggOptions.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Egg Preference
              </legend>
              <div className="flex flex-wrap gap-2">
                {eggOptions.map((option) => {
                  const active = eggPreference === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEggPreference(option)}
                      className={`min-h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Extra Toppings, Candles & Add-ons */}
          {activeAddons.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Extra Toppings &amp; Candles
              </legend>
              <div className="grid gap-2">
                {activeAddons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <span className="flex items-center gap-2.5 font-medium">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(addon.id)}
                          className="size-4 rounded accent-primary"
                        />
                        <span>{addon.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        +{formatPrice(Number(addon.price))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Custom Message on Cake */}
          {item.allow_custom_message && (
            <div className="space-y-1.5">
              <label
                htmlFor="cake-message"
                className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Message on Cake (Optional)
              </label>
              <Input
                id="cake-message"
                maxLength={80}
                value={cakeMessage}
                onChange={(e) => setCakeMessage(e.target.value)}
                placeholder="e.g., Happy Birthday Aarav!"
                className="h-10 rounded-xl"
              />
            </div>
          )}

          {/* Custom Cake Photo Upload */}
          {item.allow_custom_image && (
            <div className="space-y-2">
              <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Upload Custom Cake Design / Photo (Optional)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {customImageUrl && (
                  <div className="relative size-18 overflow-hidden rounded-xl ring-1 ring-border">
                    <Image
                      src={customImageUrl}
                      alt="Uploaded custom cake reference"
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove uploaded cake photo"
                      onClick={() => setCustomImageUrl(null)}
                      className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <label
                  htmlFor="cake-reference-upload"
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {uploadingCakePhoto ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-4" aria-hidden="true" />
                  )}
                  <span>
                    {uploadingCakePhoto
                      ? "Uploading photo..."
                      : customImageUrl
                        ? "Change Photo"
                        : "Upload Reference Image"}
                  </span>
                  <input
                    id="cake-reference-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploadingCakePhoto}
                    onChange={handleCakeImageUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="inline-flex items-center rounded-xl border border-border bg-background p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="size-9"
            >
              <Minus className="size-4" aria-hidden="true" />
            </Button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
              {quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Increase quantity"
              disabled={remainingStock !== null && quantity >= remainingStock}
              onClick={() => setQuantity((q) => q + 1)}
              className="size-9"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <Button
            type="button"
            disabled={disabled || outOfStock || uploadingCakePhoto}
            onClick={handleAddToCart}
            className="min-h-11 flex-1 font-semibold"
          >
            {outOfStock
              ? "Out of Stock"
              : `Add to Cart · ${formatPrice(lineTotal)}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
