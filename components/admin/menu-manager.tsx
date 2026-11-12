"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CakeSlice,
  Check,
  Edit,
  Eye,
  EyeOff,
  FolderCog,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  BAKERY_ADDON_PRESETS,
  BAKERY_CATEGORY_PRESETS,
  BAKERY_EGG_OPTIONS,
  BAKERY_FLAVOUR_PRESETS,
  CAKE_SIZE_PRESETS,
  getEffectiveBasePrice,
  getProductImages,
} from "@/lib/bakery-constants";
import { compressImageToMax800 } from "@/lib/compress-image";
import { formatPrice } from "@/lib/format";
import type { Category, MenuItemWithRelations } from "@/types/database";

type EditableVariant = {
  label: string;
  price: string;
};

type EditableAddon = {
  name: string;
  price: string;
  is_active: boolean;
};

type QuickFilter = "all" | "featured" | "discounted" | "low_stock";

type MenuManagerProps = {
  initialCategories: Category[];
  initialItems: MenuItemWithRelations[];
  bakerySchemaReady?: boolean;
};

export function MenuManager({
  initialCategories,
  initialItems,
  bakerySchemaReady = true,
}: MenuManagerProps) {
  const [categories, setCategories] =
    React.useState<Category[]>(initialCategories);
  const [items, setItems] =
    React.useState<MenuItemWithRelations[]>(initialItems);
  const [schemaReady, setSchemaReady] = React.useState(bakerySchemaReady);
  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [quickFilter, setQuickFilter] = React.useState<QuickFilter>("all");
  const [addingBakeryCats, setAddingBakeryCats] = React.useState(false);

  // Category Manager modal state
  const [catManagerOpen, setCatManagerOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const [editingCatId, setEditingCatId] = React.useState<string | null>(null);
  const [editingCatName, setEditingCatName] = React.useState("");
  const [catBusy, setCatBusy] = React.useState(false);

  // Add/Edit Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] =
    React.useState<MenuItemWithRelations | null>(null);
  const [itemCategoryId, setItemCategoryId] = React.useState("");
  const [itemName, setItemName] = React.useState("");
  const [itemDescription, setItemDescription] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState("");
  const [itemDiscountPrice, setItemDiscountPrice] = React.useState("");
  const [itemStockQuantity, setItemStockQuantity] = React.useState("");
  const [itemImages, setItemImages] = React.useState<string[]>([]);
  const [itemIsVeg, setItemIsVeg] = React.useState(true);
  const [itemIsAvailable, setItemIsAvailable] = React.useState(true);
  const [itemIsFeatured, setItemIsFeatured] = React.useState(false);
  const [itemIsBestseller, setItemIsBestseller] = React.useState(false);
  const [itemFlavours, setItemFlavours] = React.useState<string[]>([]);
  const [customFlavourInput, setCustomFlavourInput] = React.useState("");
  const [itemEggOptions, setItemEggOptions] = React.useState<string[]>([]);
  const [itemAllowCustomMessage, setItemAllowCustomMessage] =
    React.useState(false);
  const [itemAllowCustomImage, setItemAllowCustomImage] = React.useState(false);
  const [variants, setVariants] = React.useState<EditableVariant[]>([]);
  const [addons, setAddons] = React.useState<EditableAddon[]>([]);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [savingItem, setSavingItem] = React.useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] =
    React.useState<MenuItemWithRelations | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refreshMenu = React.useCallback(async () => {
    const res = await fetch("/api/admin/menu", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      categories?: Category[];
      items?: MenuItemWithRelations[];
      bakerySchemaReady?: boolean;
    };
    if (data.categories) setCategories(data.categories);
    if (data.items) setItems(data.items);
    if (typeof data.bakerySchemaReady === "boolean") {
      setSchemaReady(data.bakerySchemaReady);
    }
  }, []);

  const missingBakeryCategories = React.useMemo(() => {
    const existingNames = new Set(
      categories.map((cat) => cat.name.trim().toLowerCase())
    );
    return BAKERY_CATEGORY_PRESETS.filter(
      (preset) => !existingNames.has(preset.toLowerCase())
    );
  }, [categories]);

  const kpis = React.useMemo(() => {
    let available = 0;
    let featured = 0;
    let lowStock = 0;
    let discounted = 0;

    for (const item of items) {
      if (item.is_available) available += 1;
      if (item.is_featured) featured += 1;
      if (
        item.stock_quantity !== null &&
        item.stock_quantity !== undefined &&
        item.stock_quantity <= 5
      ) {
        lowStock += 1;
      }
      if (getEffectiveBasePrice(item).hasDiscount) discounted += 1;
    }

    return {
      total: items.length,
      available,
      featured,
      lowStock,
      discounted,
    };
  }, [items]);

  const groupedSections = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories
      .filter(
        (cat) => selectedCategoryId === "all" || cat.id === selectedCategoryId
      )
      .map((category) => {
        const categoryItems = items.filter((item) => {
          if (item.category_id !== category.id) return false;
          if (query) {
            const matchesName = item.name.toLowerCase().includes(query);
            const matchesFlavour = (item.flavours ?? []).some((f) =>
              f.toLowerCase().includes(query)
            );
            if (!matchesName && !matchesFlavour) return false;
          }

          if (quickFilter === "featured" && !item.is_featured) return false;
          if (
            quickFilter === "discounted" &&
            !getEffectiveBasePrice(item).hasDiscount
          ) {
            return false;
          }
          if (
            quickFilter === "low_stock" &&
            (item.stock_quantity === null ||
              item.stock_quantity === undefined ||
              item.stock_quantity > 5)
          ) {
            return false;
          }

          return true;
        });

        return { category, items: categoryItems };
      })
      .filter((section) => {
        if (selectedCategoryId !== "all") return true;
        if (searchQuery.trim().length > 0 || quickFilter !== "all") {
          return section.items.length > 0;
        }
        return true;
      });
  }, [categories, items, searchQuery, selectedCategoryId, quickFilter]);

  const handleSeedBakeryCategories = async () => {
    if (missingBakeryCategories.length === 0) return;
    setAddingBakeryCats(true);
    try {
      for (const name of missingBakeryCategories) {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, is_active: true }),
        });
        const result = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(result.error ?? `Failed adding ${name}`);
        }
      }
      toast.success(
        `Added ${missingBakeryCategories.join(", ")} to categories`
      );
      await refreshMenu();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not add bakery categories."
      );
    } finally {
      setAddingBakeryCats(false);
    }
  };

  // Category Manager Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim().length < 2) {
      toast.error("Category name must be at least 2 characters.");
      return;
    }

    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          is_active: true,
        }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to add category.");
      setNewCatName("");
      toast.success("Category added");
      await refreshMenu();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not add category."
      );
    } finally {
      setCatBusy(false);
    }
  };

  const handleSaveCategoryRename = async (categoryId: string) => {
    if (editingCatName.trim().length < 2) {
      toast.error("Category name must be at least 2 characters.");
      return;
    }

    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId, name: editingCatName.trim() }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Rename failed.");
      setEditingCatId(null);
      toast.success("Category renamed");
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed.");
    } finally {
      setCatBusy(false);
    }
  };

  const handleToggleCategoryHidden = async (cat: Category) => {
    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Update failed.");
      toast.success(
        cat.is_active ? `${cat.name} hidden` : `${cat.name} visible`
      );
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setCatBusy(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setCategories(reordered);

    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error("Failed to reorder categories.");
      toast.success("Category order updated");
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed.");
      await refreshMenu();
    } finally {
      setCatBusy(false);
    }
  };

  // Item Dialog Handlers
  const openNewItem = () => {
    setEditingItem(null);
    setItemCategoryId(
      selectedCategoryId !== "all"
        ? selectedCategoryId
        : (categories[0]?.id ?? "")
    );
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemDiscountPrice("");
    setItemStockQuantity("");
    setItemImages([]);
    setItemIsVeg(true);
    setItemIsAvailable(true);
    setItemIsFeatured(false);
    setItemIsBestseller(false);
    setItemFlavours([]);
    setCustomFlavourInput("");
    setItemEggOptions([]);
    setItemAllowCustomMessage(false);
    setItemAllowCustomImage(false);
    setVariants([]);
    setAddons([]);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: MenuItemWithRelations) => {
    setEditingItem(item);
    setItemCategoryId(item.category_id);
    setItemName(item.name);
    setItemDescription(item.description ?? "");
    setItemPrice(String(item.price));
    setItemDiscountPrice(
      item.discount_price !== null && item.discount_price !== undefined
        ? String(item.discount_price)
        : ""
    );
    setItemStockQuantity(
      item.stock_quantity !== null && item.stock_quantity !== undefined
        ? String(item.stock_quantity)
        : ""
    );
    setItemImages(getProductImages(item));
    setItemIsVeg(item.is_veg);
    setItemIsAvailable(item.is_available);
    setItemIsFeatured(Boolean(item.is_featured));
    setItemIsBestseller(item.is_bestseller);
    setItemFlavours(item.flavours ?? []);
    setCustomFlavourInput("");
    setItemEggOptions(item.egg_options ?? []);
    setItemAllowCustomMessage(Boolean(item.allow_custom_message));
    setItemAllowCustomImage(Boolean(item.allow_custom_image));
    setVariants(
      (item.item_variants ?? []).map((v) => ({
        label: v.label,
        price: String(v.price),
      }))
    );
    setAddons(
      (item.item_addons ?? []).map((a) => ({
        name: a.name,
        price: String(a.price),
        is_active: a.is_active,
      }))
    );
    setItemDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 10 - itemImages.length);
    if (remainingSlots === 0) {
      toast.error("Maximum 10 images allowed per product.");
      e.target.value = "";
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const compressed = await compressImageToMax800(file);
        const formData = new FormData();
        formData.append("file", compressed);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const result = (await res.json()) as { url?: string; error?: string };

        if (!res.ok || !result.url) {
          throw new Error(result.error ?? "Upload failed.");
        }
        uploadedUrls.push(result.url);
      }

      setItemImages((prev) => [...prev, ...uploadedUrls].slice(0, 10));
      toast.success(
        uploadedUrls.length === 1
          ? "Image compressed & uploaded"
          : `${uploadedUrls.length} images uploaded`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const makePrimaryImage = (index: number) => {
    setItemImages((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
  };

  const removeImageAt = (index: number) => {
    setItemImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleFlavour = (flavour: string) => {
    setItemFlavours((prev) =>
      prev.includes(flavour)
        ? prev.filter((item) => item !== flavour)
        : [...prev, flavour]
    );
  };

  const addCustomFlavour = () => {
    const cleaned = customFlavourInput.trim();
    if (!cleaned) return;
    if (!itemFlavours.some((f) => f.toLowerCase() === cleaned.toLowerCase())) {
      setItemFlavours((prev) => [...prev, cleaned]);
    }
    setCustomFlavourInput("");
  };

  const toggleEggOption = (option: string) => {
    setItemEggOptions((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const applyCakeSizePreset = () => {
    const base = Number(itemPrice);
    const baseAmount = Number.isFinite(base) && base > 0 ? base : 500;
    if (!itemPrice) {
      setItemPrice(String(baseAmount));
    }

    setVariants((prev) => {
      const existingLabels = new Set(
        prev.map((v) => v.label.trim().toLowerCase())
      );
      const next = [...prev];
      for (const preset of CAKE_SIZE_PRESETS) {
        if (!existingLabels.has(preset.label.toLowerCase())) {
          next.push({
            label: preset.label,
            price: String(Math.round(baseAmount * preset.multiplier)),
          });
        }
      }
      return next;
    });
    toast.success("Added cake size variants (0.5kg, 1kg, 2kg)");
  };

  const applyBakeryAddonsPreset = () => {
    setAddons((prev) => {
      const existingNames = new Set(
        prev.map((a) => a.name.trim().toLowerCase())
      );
      const next = [...prev];
      for (const preset of BAKERY_ADDON_PRESETS) {
        if (!existingNames.has(preset.name.toLowerCase())) {
          next.push({
            name: preset.name,
            price: String(preset.price),
            is_active: true,
          });
        }
      }
      return next;
    });
    toast.success("Added bakery toppings & candles presets");
  };

  const discountPreviewPercent = React.useMemo(() => {
    const base = Number(itemPrice);
    const offer = Number(itemDiscountPrice);
    if (
      !itemDiscountPrice.trim() ||
      !Number.isFinite(base) ||
      !Number.isFinite(offer) ||
      base <= 0 ||
      offer >= base ||
      offer < 0
    ) {
      return null;
    }
    return Math.round(((base - offer) / base) * 100);
  }, [itemPrice, itemDiscountPrice]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(itemPrice);
    const trimmedDiscount = itemDiscountPrice.trim();
    const parsedDiscount =
      trimmedDiscount.length > 0 ? Number(trimmedDiscount) : null;
    const trimmedStock = itemStockQuantity.trim();
    const parsedStock =
      trimmedStock.length > 0 ? Math.trunc(Number(trimmedStock)) : null;

    if (!itemCategoryId) {
      toast.error("Please choose a category.");
      return;
    }
    if (itemName.trim().length < 2) {
      toast.error("Product name must be at least 2 characters.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      toast.error("Please enter a valid base price.");
      return;
    }
    if (
      parsedDiscount !== null &&
      (!Number.isFinite(parsedDiscount) ||
        parsedDiscount < 0 ||
        parsedDiscount >= numericPrice)
    ) {
      toast.error("Offer/discount price must be lower than the base price.");
      return;
    }
    if (
      parsedStock !== null &&
      (!Number.isFinite(parsedStock) || parsedStock < 0)
    ) {
      toast.error("Stock quantity must be 0 or higher.");
      return;
    }

    const cleanedVariants = variants
      .filter((v) => v.label.trim().length > 0)
      .map((v) => ({
        label: v.label.trim(),
        price: Math.max(0, Number(v.price) || 0),
      }));

    const cleanedAddons = addons
      .filter((a) => a.name.trim().length > 0)
      .map((a) => ({
        name: a.name.trim(),
        price: Math.max(0, Number(a.price) || 0),
        is_active: a.is_active,
      }));

    setSavingItem(true);
    try {
      const payload = {
        ...(editingItem ? { id: editingItem.id } : {}),
        category_id: itemCategoryId,
        name: itemName.trim(),
        description: itemDescription.trim() || null,
        price: numericPrice,
        discount_price: parsedDiscount,
        stock_quantity: parsedStock,
        image_url: itemImages[0] ?? null,
        image_urls: itemImages,
        is_veg: itemIsVeg,
        is_available: itemIsAvailable,
        is_featured: itemIsFeatured,
        is_bestseller: itemIsBestseller,
        flavours: itemFlavours,
        egg_options: itemEggOptions,
        allow_custom_message: itemAllowCustomMessage,
        allow_custom_image: itemAllowCustomImage,
        variants: cleanedVariants,
        addons: cleanedAddons,
      };

      const res = await fetch("/api/admin/menu", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to save product.");

      toast.success(editingItem ? "Product updated" : "Product added");
      setItemDialogOpen(false);
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleAvailability = async (
    item: MenuItemWithRelations,
    nextAvailable: boolean
  ) => {
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, is_available: nextAvailable } : row
      )
    );

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: nextAvailable }),
      });
      if (!res.ok) throw new Error("Update failed.");
      toast.success(
        `${item.name} is now ${nextAvailable ? "available" : "unavailable"}`
      );
    } catch {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, is_available: !nextAvailable }
            : row
        )
      );
      toast.error("Could not update availability");
    }
  };

  const handleToggleFeatured = async (
    item: MenuItemWithRelations,
    nextFeatured: boolean
  ) => {
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, is_featured: nextFeatured } : row
      )
    );

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_featured: nextFeatured }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      toast.success(
        nextFeatured
          ? `${item.name} featured on homepage`
          : `${item.name} removed from homepage featured`
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, is_featured: !nextFeatured }
            : row
        )
      );
      toast.error(
        err instanceof Error ? err.message : "Could not update featured status"
      );
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/menu?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const result = (await res.json()) as {
        error?: string;
        markedUnavailable?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(result.error ?? "Failed to delete product.");

      if (result.markedUnavailable) {
        toast.info(result.message);
      } else {
        toast.success(result.message ?? `Deleted ${deleteTarget.name}`);
      }

      setDeleteTarget(null);
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Product Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage bakery products, weights &amp; variants, stock, offers, and
            homepage highlights.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {missingBakeryCategories.length > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={addingBakeryCats}
              onClick={() => void handleSeedBakeryCategories()}
              className="min-h-10 gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            >
              {addingBakeryCats ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CakeSlice className="size-4" aria-hidden="true" />
              )}
              <span>Add Bakery Categories</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setCatManagerOpen(true)}
            className="min-h-10 gap-2 rounded-xl"
          >
            <FolderCog className="size-4" aria-hidden="true" />
            <span>Categories</span>
          </Button>
          <Button
            type="button"
            onClick={openNewItem}
            disabled={categories.length === 0}
            className="min-h-10 gap-2 rounded-xl"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Migration Notice when bakery SQL columns are missing */}
      {!schemaReady && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Database bakery upgrade SQL not yet applied
              </p>
              <p className="text-xs opacity-90">
                Run <code>supabase/bakery_upgrade.sql</code> in Supabase
                Dashboard &rarr; SQL Editor to enable multi-images, stock
                counts, discount offers, featured toggle, flavours, egg
                options, and custom cake uploads.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bakery KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Products
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {kpis.total}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CakeSlice className="size-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Available Now
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                {kpis.available}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Check className="size-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Featured on Home
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-400">
                {kpis.featured}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Star className="size-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Low / Out of Stock
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-700 tabular-nums dark:text-rose-400">
                {kpis.lowStock}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <Package className="size-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Search, Category Filter & Quick Filter Chips */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or flavours..."
              aria-label="Search products"
              className="h-10 rounded-xl pl-9"
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger
                aria-label="Filter by category"
                className="w-full rounded-xl data-[size=default]:h-10"
              >
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                    {!cat.is_active ? " (Hidden)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: `All (${kpis.total})` },
              { id: "featured", label: `Featured (${kpis.featured})` },
              { id: "discounted", label: `On Offer (${kpis.discounted})` },
              { id: "low_stock", label: `Low Stock (${kpis.lowStock})` },
            ] as const
          ).map((chip) => {
            const active = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(chip.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/70 bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Items by Category */}
      {groupedSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No bakery products match your search or filter.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSections.map(({ category, items: sectionItems }) => (
            <Card key={category.id} className="rounded-2xl">
              <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 py-3.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">
                    {category.name}
                  </CardTitle>
                  {!category.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Hidden
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {sectionItems.length}{" "}
                  {sectionItems.length === 1 ? "product" : "products"}
                </Badge>
              </CardHeader>

              <CardContent className="p-3 sm:p-0">
                {sectionItems.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No products in this category yet.
                  </p>
                ) : (
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`${category.name} products`}
                    className="admin-table-wrapper"
                  >
                    <table className="admin-responsive-table w-full text-left text-sm">
                      <caption className="sr-only">
                        {category.name} bakery products
                      </caption>
                      <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Product
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Price / Offer
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Stock
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Featured
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Available
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-right font-semibold"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sectionItems.map((item) => {
                          const images = getProductImages(item);
                          const coverImage = images[0] ?? null;
                          const variantsCount = item.item_variants?.length ?? 0;
                          const addonsCount = item.item_addons?.length ?? 0;
                          const {
                            sellingPrice,
                            originalPrice,
                            hasDiscount,
                            discountPercent,
                          } = getEffectiveBasePrice(item);

                          const stockQty = item.stock_quantity;

                          return (
                            <tr
                              key={item.id}
                              className="transition-colors hover:bg-muted/30"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border/50">
                                    {coverImage ? (
                                      <Image
                                        src={coverImage}
                                        alt={item.name}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div
                                        aria-hidden="true"
                                        className="flex size-full items-center justify-center text-muted-foreground/50"
                                      >
                                        <UtensilsCrossed className="size-5" />
                                      </div>
                                    )}
                                    {images.length > 1 && (
                                      <span className="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 text-[9px] font-semibold text-white">
                                        +{images.length - 1}
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <VegIndicator isVeg={item.is_veg} />
                                      <span className="font-semibold text-foreground">
                                        {item.name}
                                      </span>
                                      {item.is_bestseller && (
                                        <Badge
                                          variant="secondary"
                                          className="gap-1 bg-amber-500/15 text-[10px] text-amber-700 dark:text-amber-300"
                                        >
                                          <Sparkles
                                            className="size-2.5"
                                            aria-hidden="true"
                                          />
                                          Bestseller
                                        </Badge>
                                      )}
                                      {hasDiscount && (
                                        <Badge
                                          variant="secondary"
                                          className="gap-1 bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-300"
                                        >
                                          <Tag
                                            className="size-2.5"
                                            aria-hidden="true"
                                          />
                                          {discountPercent}% OFF
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {[
                                        variantsCount > 0
                                          ? `${variantsCount} weights/sizes`
                                          : null,
                                        addonsCount > 0
                                          ? `${addonsCount} add-ons`
                                          : null,
                                        (item.flavours?.length ?? 0) > 0
                                          ? `${item.flavours?.length} flavours`
                                          : null,
                                        item.allow_custom_message
                                          ? "Cake message"
                                          : null,
                                        item.allow_custom_image
                                          ? "Custom photo"
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ") || "Standard item"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td
                                data-label="Price"
                                className="px-4 py-3 font-semibold tabular-nums"
                              >
                                {variantsCount > 0 ? (
                                  <div className="space-y-0.5">
                                    <div>
                                      From{" "}
                                      {formatPrice(
                                        Math.min(
                                          ...(item.item_variants ?? []).map((v) =>
                                            Number(v.price)
                                          )
                                        )
                                      )}
                                    </div>
                                    <div className="text-[11px] font-normal text-muted-foreground">
                                      Base {formatPrice(sellingPrice)}
                                    </div>
                                  </div>
                                ) : hasDiscount ? (
                                  <div className="flex flex-wrap items-baseline gap-1.5">
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                      {formatPrice(sellingPrice)}
                                    </span>
                                    <span className="text-xs font-normal text-muted-foreground line-through">
                                      {formatPrice(originalPrice)}
                                    </span>
                                  </div>
                                ) : (
                                  formatPrice(originalPrice)
                                )}
                              </td>

                              <td data-label="Stock" className="px-4 py-3">
                                {stockQty === null || stockQty === undefined ? (
                                  <span className="text-xs text-muted-foreground">
                                    Unlimited
                                  </span>
                                ) : stockQty === 0 ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[11px] tabular-nums"
                                  >
                                    Out of stock
                                  </Badge>
                                ) : stockQty <= 5 ? (
                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-500/15 text-[11px] text-amber-800 tabular-nums dark:text-amber-300"
                                  >
                                    Low: {stockQty}
                                  </Badge>
                                ) : (
                                  <span className="text-xs font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                                    {stockQty} left
                                  </span>
                                )}
                              </td>

                              <td data-label="Featured" className="px-4 py-3">
                                <button
                                  type="button"
                                  aria-label={
                                    item.is_featured
                                      ? `Remove ${item.name} from featured`
                                      : `Feature ${item.name} on homepage`
                                  }
                                  onClick={() =>
                                    void handleToggleFeatured(
                                      item,
                                      !item.is_featured
                                    )
                                  }
                                  className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors ${
                                    item.is_featured
                                      ? "border-amber-400/60 bg-amber-500/15 text-amber-600"
                                      : "border-border/60 text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  <Star
                                    className={`size-4 ${
                                      item.is_featured ? "fill-current" : ""
                                    }`}
                                    aria-hidden="true"
                                  />
                                </button>
                              </td>

                              <td data-label="Available" className="px-4 py-3">
                                <Switch
                                  aria-label={`Toggle availability for ${item.name}`}
                                  checked={item.is_available}
                                  onCheckedChange={(checked) =>
                                    void handleToggleAvailability(item, checked)
                                  }
                                />
                              </td>

                              <td
                                data-label="Actions"
                                className="px-4 py-3 text-right"
                              >
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditItem(item)}
                                    className="min-h-8 gap-1 rounded-lg px-2.5 text-xs"
                                  >
                                    <Edit
                                      className="size-3.5"
                                      aria-hidden="true"
                                    />
                                    <span>Edit</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${item.name}`}
                                    onClick={() => setDeleteTarget(item)}
                                    className="size-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Manager Dialog */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Category Manager</DialogTitle>
            <DialogDescription>
              Add, rename, reorder, or hide bakery categories (e.g., Cakes,
              Pastries, Pizza, Bread).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name (e.g., Cakes)..."
              aria-label="New category name"
              className="h-10 rounded-xl"
            />
            <Button
              type="submit"
              disabled={catBusy}
              className="min-h-10 shrink-0 rounded-xl"
            >
              Add
            </Button>
          </form>

          <ul className="divide-y divide-border/60 rounded-xl border">
            {categories.map((cat, index) => (
              <li
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                {editingCatId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      aria-label="Edit category name"
                      className="h-9 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      aria-label="Save category name"
                      disabled={catBusy}
                      onClick={() => void handleSaveCategoryRename(cat.id)}
                      className="size-9 shrink-0"
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Cancel rename"
                      onClick={() => setEditingCatId(null)}
                      className="size-9 shrink-0"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          !cat.is_active
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {cat.name}
                      </span>
                      {!cat.is_active && (
                        <Badge variant="outline" className="text-[10px]">
                          Hidden
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${cat.name} up`}
                        disabled={catBusy || index === 0}
                        onClick={() => void handleMoveCategory(index, -1)}
                        className="size-8"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${cat.name} down`}
                        disabled={catBusy || index === categories.length - 1}
                        onClick={() => void handleMoveCategory(index, 1)}
                        className="size-8"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Rename ${cat.name}`}
                        disabled={catBusy}
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        className="size-8"
                      >
                        <Edit className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={
                          cat.is_active
                            ? `Hide ${cat.name}`
                            : `Show ${cat.name}`
                        }
                        disabled={catBusy}
                        onClick={() => void handleToggleCategoryHidden(cat)}
                        className="size-8"
                      >
                        {cat.is_active ? (
                          <Eye className="size-4" aria-hidden="true" />
                        ) : (
                          <EyeOff
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              Configure bakery product details, upload multiple images, set offer
              price &amp; stock, and customize cake sizes, flavours &amp; add-ons.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-5">
            {/* Core Product Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="dish-name" className="block text-sm font-medium">
                  Product Name <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="dish-name"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Belgian Chocolate Truffle Cake"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="dish-category"
                  className="block text-sm font-medium"
                >
                  Category <span aria-hidden="true">*</span>
                </label>
                <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                  <SelectTrigger
                    id="dish-category"
                    className="w-full rounded-xl data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dish-stock" className="block text-sm font-medium">
                  Available Stock Quantity
                </label>
                <Input
                  id="dish-stock"
                  type="number"
                  min={0}
                  step="1"
                  value={itemStockQuantity}
                  onChange={(e) => setItemStockQuantity(e.target.value)}
                  placeholder="Leave blank for Unlimited"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dish-price" className="block text-sm font-medium">
                  Base Price (₹) <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="dish-price"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="500"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="dish-discount-price"
                    className="block text-sm font-medium"
                  >
                    Offer / Discount Price (₹)
                  </label>
                  {discountPreviewPercent !== null && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-300"
                    >
                      {discountPreviewPercent}% OFF
                    </Badge>
                  )}
                </div>
                <Input
                  id="dish-discount-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={itemDiscountPrice}
                  onChange={(e) => setItemDiscountPrice(e.target.value)}
                  placeholder="Optional lower offer price"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dish-desc" className="block text-sm font-medium">
                Description
              </label>
              <Textarea
                id="dish-desc"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Rich dark chocolate sponge layered with silky truffle ganache..."
                className="min-h-18 rounded-xl"
              />
            </div>

            {/* Multiple Image Upload Gallery */}
            <div className="space-y-2.5 rounded-xl border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label
                    htmlFor="dish-image"
                    className="block text-sm font-medium"
                  >
                    Product Images ({itemImages.length}/10)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Upload multiple photos. First photo acts as the cover.
                  </p>
                </div>

                <label
                  htmlFor="dish-image"
                  className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {uploadingImage ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-4" aria-hidden="true" />
                  )}
                  <span>
                    {uploadingImage ? "Uploading..." : "Add Photos"}
                  </span>
                  <input
                    id="dish-image"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploadingImage || itemImages.length >= 10}
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              {itemImages.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {itemImages.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="group relative size-20 overflow-hidden rounded-xl ring-1 ring-border"
                    >
                      <Image
                        src={url}
                        alt={`Product photo ${idx + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                      {idx === 0 ? (
                        <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                          Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makePrimaryImage(idx)}
                          className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-black"
                        >
                          Set Cover
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove photo ${idx + 1}`}
                        onClick={() => removeImageAt(idx)}
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Flags */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label
                htmlFor="dish-available"
                className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
              >
                <span>Available for Order</span>
                <Switch
                  id="dish-available"
                  checked={itemIsAvailable}
                  onCheckedChange={setItemIsAvailable}
                />
              </label>
              <label
                htmlFor="dish-featured"
                className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
              >
                <span>Featured on Homepage</span>
                <Switch
                  id="dish-featured"
                  checked={itemIsFeatured}
                  onCheckedChange={setItemIsFeatured}
                />
              </label>
              <label
                htmlFor="dish-veg"
                className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
              >
                <span>Vegetarian / Eggless Base</span>
                <Switch
                  id="dish-veg"
                  checked={itemIsVeg}
                  onCheckedChange={setItemIsVeg}
                />
              </label>
              <label
                htmlFor="dish-bestseller"
                className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
              >
                <span>Bestseller Badge</span>
                <Switch
                  id="dish-bestseller"
                  checked={itemIsBestseller}
                  onCheckedChange={setItemIsBestseller}
                />
              </label>
            </div>

            {/* Cake Sizes / Weight Variants */}
            <div className="space-y-2.5 rounded-xl border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Cake Sizes &amp; Variants (Different Prices)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Example: 0.5kg ₹500, 1kg ₹900, 2kg ₹1700
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={applyCakeSizePreset}
                    className="h-7 text-xs"
                  >
                    + 0.5kg / 1kg / 2kg
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setVariants((prev) => [...prev, { label: "", price: "" }])
                    }
                    className="h-7 gap-1 text-xs"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    <span>Add row</span>
                  </Button>
                </div>
              </div>
              {variants.map((variant, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={variant.label}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v, i) =>
                          i === idx ? { ...v, label: e.target.value } : v
                        )
                      )
                    }
                    placeholder="Size / Weight (e.g., 1kg)"
                    aria-label={`Variant ${idx + 1} label`}
                    className="h-9 rounded-lg"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={variant.price}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v, i) =>
                          i === idx ? { ...v, price: e.target.value } : v
                        )
                      )
                    }
                    placeholder="Price (₹)"
                    aria-label={`Variant ${idx + 1} price`}
                    className="h-9 w-28 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove variant ${idx + 1}`}
                    onClick={() =>
                      setVariants((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="size-9 shrink-0"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Bakery Customization: Flavours, Eggless/With Egg, Custom Message & Photo */}
            <div className="space-y-4 rounded-xl border p-3.5">
              <div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Bakery Options (Flavours, Egg Preference &amp; Cake Customizations)
                </span>
              </div>

              {/* Flavours */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Available Flavours</p>
                <div className="flex flex-wrap gap-1.5">
                  {BAKERY_FLAVOUR_PRESETS.map((flavour) => {
                    const selected = itemFlavours.includes(flavour);
                    return (
                      <button
                        key={flavour}
                        type="button"
                        onClick={() => toggleFlavour(flavour)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {flavour}
                      </button>
                    );
                  })}
                  {itemFlavours
                    .filter(
                      (f) =>
                        !(BAKERY_FLAVOUR_PRESETS as readonly string[]).includes(
                          f
                        )
                    )
                    .map((customFlavour) => (
                      <button
                        key={customFlavour}
                        type="button"
                        onClick={() => toggleFlavour(customFlavour)}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        ✓ {customFlavour} ×
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customFlavourInput}
                    onChange={(e) => setCustomFlavourInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomFlavour();
                      }
                    }}
                    placeholder="Add custom flavour (e.g., Blueberry)"
                    aria-label="Custom flavour"
                    className="h-9 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomFlavour}
                    className="h-9 shrink-0 rounded-lg"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Eggless / With Egg */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Eggless / With Egg Choices</p>
                <div className="flex flex-wrap gap-2">
                  {BAKERY_EGG_OPTIONS.map((option) => {
                    const selected = itemEggOptions.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleEggOption(option)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? "bg-emerald-600 text-white"
                            : "border border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Message & Custom Photo switches */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label
                  htmlFor="dish-custom-message"
                  className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
                >
                  <span>Allow custom message on cake</span>
                  <Switch
                    id="dish-custom-message"
                    checked={itemAllowCustomMessage}
                    onCheckedChange={setItemAllowCustomMessage}
                  />
                </label>
                <label
                  htmlFor="dish-custom-image"
                  className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
                >
                  <span>Allow custom cake image upload</span>
                  <Switch
                    id="dish-custom-image"
                    checked={itemAllowCustomImage}
                    onCheckedChange={setItemAllowCustomImage}
                  />
                </label>
              </div>
            </div>

            {/* Extra Toppings & Candles (Add-ons) */}
            <div className="space-y-2.5 rounded-xl border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Extra Toppings &amp; Candles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={applyBakeryAddonsPreset}
                    className="h-7 text-xs"
                  >
                    + Toppings &amp; Candles
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setAddons((prev) => [
                        ...prev,
                        { name: "", price: "0", is_active: true },
                      ])
                    }
                    className="h-7 gap-1 text-xs"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    <span>Add row</span>
                  </Button>
                </div>
              </div>
              {addons.map((addon, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={addon.name}
                    onChange={(e) =>
                      setAddons((prev) =>
                        prev.map((a, i) =>
                          i === idx ? { ...a, name: e.target.value } : a
                        )
                      )
                    }
                    placeholder="Topping / Candle (e.g., Birthday Candles)"
                    aria-label={`Add-on ${idx + 1} name`}
                    className="h-9 rounded-lg"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={addon.price}
                    onChange={(e) =>
                      setAddons((prev) =>
                        prev.map((a, i) =>
                          i === idx ? { ...a, price: e.target.value } : a
                        )
                      )
                    }
                    placeholder="Price"
                    aria-label={`Add-on ${idx + 1} price`}
                    className="h-9 w-28 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove add-on ${idx + 1}`}
                    onClick={() =>
                      setAddons((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="size-9 shrink-0"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingItem || uploadingImage}>
                {savingItem
                  ? "Saving..."
                  : editingItem
                    ? "Save changes"
                    : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              If this product has past orders, it will be marked unavailable
              instead of deleted to keep historical order records intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteItem()}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
