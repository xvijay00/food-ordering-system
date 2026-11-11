"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const add = useCartStore((state) => state.add);

  const variants = React.useMemo<ItemVariant[]>(
    () => item?.item_variants ?? [],
    [item]
  );
  const activeAddons = React.useMemo<ItemAddon[]>(
    () => (item?.item_addons ?? []).filter((addon) => addon.is_active),
    [item]
  );

  const [selectedVariantId, setSelectedVariantId] = React.useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);

  React.useEffect(() => {
    if (!item || !open) return;
    setSelectedVariantId(variants[0]?.id ?? "");
    setSelectedAddonIds([]);
    setQuantity(1);
  }, [item, open, variants]);

  if (!item) return null;

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const basePrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(item.price);
  const chosenAddons = activeAddons.filter((addon) =>
    selectedAddonIds.includes(addon.id)
  );
  const addonsTotal = chosenAddons.reduce(
    (sum, addon) => sum + Number(addon.price),
    0
  );
  const unitPrice = basePrice + addonsTotal;
  const lineTotal = unitPrice * quantity;

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleAddToCart = () => {
    add({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      isVeg: item.is_veg,
      variantId: selectedVariant?.id ?? null,
      variantLabel: selectedVariant?.label ?? null,
      addons: chosenAddons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: Number(addon.price),
      })),
      unitPrice,
      quantity,
    });

    const variantText = selectedVariant ? ` (${selectedVariant.label})` : "";
    toast.success(`Added ${quantity}x ${item.name}${variantText} to cart`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] max-w-xl rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      >
        <SheetHeader className="border-b border-border/60 pb-3 text-left">
          <div className="flex items-center gap-2 pr-8">
            <VegIndicator isVeg={item.is_veg} />
            <SheetTitle>{item.name}</SheetTitle>
          </div>
          {item.description && (
            <SheetDescription>{item.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto px-4 py-2">
          {variants.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Choose Variant
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

          {activeAddons.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Optional Add-ons
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
              onClick={() => setQuantity((q) => q + 1)}
              className="size-9"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <Button
            type="button"
            disabled={disabled || !item.is_available}
            onClick={handleAddToCart}
            className="min-h-11 flex-1 font-semibold"
          >
            Add to Cart · {formatPrice(lineTotal)}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

