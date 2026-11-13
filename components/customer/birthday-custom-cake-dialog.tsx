"use client";

import * as React from "react";
import Image from "next/image";
import {
  Calendar,
  Check,
  Egg,
  ImagePlus,
  Loader2,
  Minus,
  PartyPopper,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BAKERY_EGG_OPTIONS,
  BAKERY_FLAVOUR_PRESETS,
  CAKE_SIZE_PRESETS,
  getEffectiveBasePrice,
  getProductImages,
} from "@/lib/bakery-constants";
import { compressImageToMax800 } from "@/lib/compress-image";
import { formatPrice } from "@/lib/format";
import type { MenuItemWithRelations } from "@/types/database";

export type BirthdayCakeCustomizationResult = {
  item: MenuItemWithRelations;
  variantLabel: string;
  unitPrice: number;
  selectedFlavour: string;
  eggPreference: string;
  cakeMessage: string;
  customImageUrl: string | null;
  preorderAt?: string;
  quantity: number;
};

type BirthdayCustomCakeDialogProps = {
  item: MenuItemWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCakeToPackage: (customization: BirthdayCakeCustomizationResult) => void;
};

export function BirthdayCustomCakeDialog({
  item,
  open,
  onOpenChange,
  onAddCakeToPackage,
}: BirthdayCustomCakeDialogProps) {
  const images = React.useMemo(() => (item ? getProductImages(item) : []), [item]);
  const hasVariants = Boolean(item && item.item_variants && item.item_variants.length > 0);

  const availableFlavours = React.useMemo(() => {
    if (item && item.flavours && item.flavours.length > 0) {
      return item.flavours;
    }
    return [...BAKERY_FLAVOUR_PRESETS];
  }, [item]);

  const availableEggOptions = React.useMemo(() => {
    if (item && item.egg_options && item.egg_options.length > 0) {
      return item.egg_options;
    }
    return [...BAKERY_EGG_OPTIONS];
  }, [item]);

  // Size selections
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>("");
  const [selectedPresetSize, setSelectedPresetSize] = React.useState<string>("0.5kg");

  // Customization fields
  const [selectedFlavour, setSelectedFlavour] = React.useState<string>("");
  const [eggPreference, setEggPreference] = React.useState<string>("");
  const [cakeMessage, setCakeMessage] = React.useState<string>("");
  const [customImageUrl, setCustomImageUrl] = React.useState<string | null>(null);
  const [preorderAt, setPreorderAt] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [uploadingPhoto, setUploadingPhoto] = React.useState<boolean>(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (!item || !open) return;
    if (item.item_variants && item.item_variants.length > 0) {
      setSelectedVariantId(item.item_variants[0].id);
      setSelectedPresetSize(item.item_variants[0].label);
    } else {
      setSelectedVariantId("");
      setSelectedPresetSize("0.5kg");
    }
    setSelectedFlavour(availableFlavours[0] ?? "Chocolate");
    setEggPreference(availableEggOptions[0] ?? "Eggless");
    setCakeMessage("");
    setCustomImageUrl(null);
    setPreorderAt("");
    setQuantity(1);
    setUploadingPhoto(false);
  }, [item, open, availableFlavours, availableEggOptions]);

  if (!item) return null;

  const { sellingPrice } = getEffectiveBasePrice(item);

  // Compute calculated unit price based on variant or size preset
  let calculatedUnitPrice = sellingPrice;
  let activeSizeLabel = selectedPresetSize;

  if (hasVariants && item.item_variants) {
    const matched = item.item_variants.find((v) => v.id === selectedVariantId);
    if (matched) {
      calculatedUnitPrice = Number(matched.price);
      activeSizeLabel = matched.label;
    }
  } else {
    const preset = CAKE_SIZE_PRESETS.find((p) => p.label === selectedPresetSize);
    const multiplier = preset ? preset.multiplier : 1;
    calculatedUnitPrice = Math.round(sellingPrice * multiplier);
  }

  const lineSubtotal = calculatedUnitPrice * quantity;

  // Handle Photo Reference Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, or WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image file must be under 8MB.");
      return;
    }

    try {
      setUploadingPhoto(true);
      const compressed = await compressImageToMax800(file);
      const fd = new FormData();
      fd.append("file", compressed);

      const res = await fetch("/api/upload-cake-reference", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Failed to upload cake reference image.");
      }

      setCustomImageUrl(data.url);
      toast.success("Cake design reference attached!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload cake photo."
      );
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleConfirm = () => {
    onAddCakeToPackage({
      item,
      variantLabel: activeSizeLabel,
      unitPrice: calculatedUnitPrice,
      selectedFlavour,
      eggPreference,
      cakeMessage: cakeMessage.trim(),
      customImageUrl,
      preorderAt: preorderAt.trim() || undefined,
      quantity,
    });
    onOpenChange(false);
    toast.success(`Added customized "${item.name}" to your Birthday Package!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1 border-primary/20 bg-primary/10 text-xs font-bold text-primary"
            >
              <Sparkles className="size-3.5" />
              Birthday Custom Cake
            </Badge>
            {item.is_veg && <VegIndicator isVeg={true} />}
          </div>
          <DialogTitle className="font-heading text-xl font-black text-foreground sm:text-2xl">
            {item.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
            Customize cake size, flavour, celebration message, and delivery timing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Main Visual Preview */}
          {images.length > 0 && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/70 bg-muted">
              <Image
                src={images[0]}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 100vw, 550px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                <span className="font-heading text-lg font-black drop-shadow-sm">
                  {formatPrice(calculatedUnitPrice)}
                </span>
                <span className="text-xs font-semibold drop-shadow-sm">
                  Size: {activeSizeLabel}
                </span>
              </div>
            </div>
          )}

          {/* 1. Cake Size / Weight Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Choose Cake Size / Weight *
            </label>
            {hasVariants && item.item_variants ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.item_variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  return (
                    <button
                      type="button"
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setSelectedPresetSize(variant.label);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 font-bold text-primary shadow-xs ring-2 ring-primary/20"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm font-bold">{variant.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(Number(variant.price))}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {CAKE_SIZE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetSize === preset.label;
                  const priceForSize = Math.round(sellingPrice * preset.multiplier);
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setSelectedPresetSize(preset.label)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 font-bold text-primary shadow-xs ring-2 ring-primary/20"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm font-bold">{preset.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(priceForSize)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Flavour Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Select Cake Flavour *
            </label>
            <div className="flex flex-wrap gap-2">
              {availableFlavours.map((flavour) => {
                const isSelected = selectedFlavour === flavour;
                return (
                  <button
                    type="button"
                    key={flavour}
                    onClick={() => setSelectedFlavour(flavour)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all sm:text-sm ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {isSelected && <Check className="size-3.5" />}
                    <span>{flavour}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Egg Preference */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              3. Egg Preference *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableEggOptions.map((opt) => {
                const isSelected = eggPreference === opt;
                const isEggless = opt.toLowerCase().includes("eggless");
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setEggPreference(opt)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-bold transition-all ${
                      isSelected
                        ? isEggless
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-800 ring-2 ring-emerald-500/20 dark:text-emerald-200"
                          : "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {isEggless ? (
                      <span className="inline-block size-3 rounded-full bg-emerald-600" />
                    ) : (
                      <Egg className="size-4" />
                    )}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Birthday Message On Cake */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="birthday-cake-message"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                4. Message On Cake (Optional)
              </label>
              <span className="text-[11px] text-muted-foreground">
                {cakeMessage.length}/45 chars
              </span>
            </div>
            <Input
              id="birthday-cake-message"
              placeholder='e.g. "Happy 25th Birthday Rhea! 💖"'
              value={cakeMessage}
              maxLength={45}
              onChange={(e) => setCakeMessage(e.target.value)}
              className="h-11 rounded-xl text-sm font-semibold"
            />
          </div>

          {/* 5. Preorder / Delivery Date & Time */}
          <div className="space-y-2">
            <label
              htmlFor="birthday-cake-preorder"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              <Calendar className="size-3.5" />
              5. Preferred Celebration Date & Time (Optional)
            </label>
            <Input
              id="birthday-cake-preorder"
              type="datetime-local"
              value={preorderAt}
              onChange={(e) => setPreorderAt(e.target.value)}
              className="h-11 rounded-xl text-sm font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave blank for standard fastest bakery preparation and delivery.
            </p>
          </div>

          {/* 6. Upload Inspiration / Reference Photo */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              6. Inspiration / Custom Design Photo (Optional)
            </label>
            {customImageUrl ? (
              <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 p-2.5">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border">
                  <Image
                    src={customImageUrl}
                    alt="Cake reference design"
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    Custom cake design photo attached
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Our chef will match this decorative style.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCustomImageUrl(null)}
                  className="size-8 text-destructive hover:bg-destructive/10"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-card p-3.5 text-center transition-colors hover:bg-muted/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="size-4.5 animate-spin text-primary" />
                    <span className="text-xs font-bold text-muted-foreground">
                      Compressing & uploading reference image...
                    </span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-4.5 text-primary" />
                    <span className="text-xs font-bold text-foreground sm:text-sm">
                      Upload Custom Cake Inspiration Photo
                    </span>
                  </>
                )}
              </label>
            )}
          </div>

          {/* 7. Quantity Stepper */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantity
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="size-9 rounded-lg"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center font-heading text-base font-black">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={quantity >= 10}
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="size-9 rounded-lg"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-muted-foreground">
              Total Cake Price ({quantity} {quantity === 1 ? "cake" : "cakes"})
            </span>
            <span className="font-heading text-2xl font-black text-primary">
              {formatPrice(lineSubtotal)}
            </span>
          </div>
          <Button
            type="button"
            onClick={handleConfirm}
            className="h-11 rounded-xl px-6 font-bold shadow-md"
          >
            <PartyPopper className="mr-2 size-4.5" />
            Add Cake to Birthday Package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
