"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Cake,
  Check,
  Edit,
  FolderPlus,
  Gift,
  Loader2,
  PartyPopper,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BAKERY_EGG_OPTIONS,
  getEffectiveBasePrice,
  getProductImages,
} from "@/lib/bakery-constants";
import { compressImageToMax800 } from "@/lib/compress-image";
import { formatPrice } from "@/lib/format";
import type { Category, MenuItemWithRelations } from "@/types/database";

type QuickFilter = "all" | "featured" | "discounted" | "low_stock";

type BirthdayManagerProps = {
  initialCategories: Category[];
  initialItems: MenuItemWithRelations[];
};

export function BirthdayManager({
  initialCategories,
  initialItems,
}: BirthdayManagerProps) {
  const [categories, setCategories] =
    React.useState<Category[]>(initialCategories);
  const [items, setItems] =
    React.useState<MenuItemWithRelations[]>(initialItems);

  // Filters
  const [selectedCatId, setSelectedCatId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [quickFilter, setQuickFilter] = React.useState<QuickFilter>("all");

  // Product Add / Edit Modal State
  const [productModalOpen, setProductModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] =
    React.useState<MenuItemWithRelations | null>(null);

  // Product Form Fields
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formCategoryId, setFormCategoryId] = React.useState("");
  const [formPrice, setFormPrice] = React.useState("");
  const [formDiscountPrice, setFormDiscountPrice] = React.useState("");
  const [formStock, setFormStock] = React.useState("");
  const [formIsAvailable, setFormIsAvailable] = React.useState(true);
  const [formIsFeatured, setFormIsFeatured] = React.useState(false);
  const [formIsVeg, setFormIsVeg] = React.useState(true);
  const [formSortOrder, setFormSortOrder] = React.useState("0");
  const [formImageUrl, setFormImageUrl] = React.useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // Cake specific form options
  const [formFlavours, setFormFlavours] = React.useState<string[]>([]);
  const [formEggOptions, setFormEggOptions] = React.useState<string[]>([]);
  const [formAllowCustomMessage, setFormAllowCustomMessage] =
    React.useState(false);
  const [formAllowCustomImage, setFormAllowCustomImage] =
    React.useState(false);
  const [savingProduct, setSavingProduct] = React.useState(false);

  // Product Delete Modal State
  const [deleteTarget, setDeleteTarget] =
    React.useState<MenuItemWithRelations | null>(null);
  const [deletingProduct, setDeletingProduct] = React.useState(false);

  // Category Add / Edit Modal State
  const [catModalOpen, setCatModalOpen] = React.useState(false);
  const [editingCat, setEditingCat] = React.useState<Category | null>(null);
  const [catFormName, setCatFormName] = React.useState("");
  const [catFormSortOrder, setCatFormSortOrder] = React.useState("10");
  const [catFormIsActive, setCatFormIsActive] = React.useState(true);
  const [savingCat, setSavingCat] = React.useState(false);

  // Category Delete Modal State
  const [deleteCatTarget, setDeleteCatTarget] =
    React.useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = React.useState(false);

  // Fast category lookup map
  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  // Metrics
  const totalItemsCount = items.length;
  const inStockCount = items.filter(
    (i) =>
      i.is_available && (i.stock_quantity === null || i.stock_quantity > 0)
  ).length;
  const lowStockCount = items.filter(
    (i) =>
      i.is_available &&
      i.stock_quantity !== null &&
      i.stock_quantity !== undefined &&
      i.stock_quantity <= 5
  ).length;
  const activeCategoriesCount = categories.filter((c) => c.is_active).length;

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const matchesCategory =
        selectedCatId === "all" || item.category_id === selectedCatId;

      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      let matchesQuick = true;
      if (quickFilter === "featured") matchesQuick = item.is_featured;
      if (quickFilter === "discounted")
        matchesQuick =
          item.discount_price !== null &&
          item.discount_price !== undefined &&
          item.discount_price < item.price;
      if (quickFilter === "low_stock")
        matchesQuick =
          item.stock_quantity !== null &&
          item.stock_quantity !== undefined &&
          item.stock_quantity <= 5;

      return matchesCategory && matchesSearch && matchesQuick;
    });
  }, [items, selectedCatId, searchQuery, quickFilter]);

  // Open Product Modal (New or Edit)
  const openProductModal = (item?: MenuItemWithRelations) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormDescription(item.description ?? "");
      setFormCategoryId(item.category_id);
      setFormPrice(String(item.price));
      setFormDiscountPrice(
        item.discount_price !== null && item.discount_price !== undefined
          ? String(item.discount_price)
          : ""
      );
      setFormStock(
        item.stock_quantity !== null && item.stock_quantity !== undefined
          ? String(item.stock_quantity)
          : ""
      );
      setFormIsAvailable(item.is_available);
      setFormIsFeatured(item.is_featured);
      setFormIsVeg(item.is_veg);
      setFormSortOrder(String(item.sort_order ?? 0));
      setFormImageUrl(item.image_url ?? null);
      setFormFlavours(item.flavours ?? []);
      setFormEggOptions(item.egg_options ?? []);
      setFormAllowCustomMessage(item.allow_custom_message);
      setFormAllowCustomImage(item.allow_custom_image);
    } else {
      setEditingItem(null);
      setFormName("");
      setFormDescription("");
      setFormCategoryId(categories[0]?.id ?? "");
      setFormPrice("");
      setFormDiscountPrice("");
      setFormStock("");
      setFormIsAvailable(true);
      setFormIsFeatured(false);
      setFormIsVeg(true);
      setFormSortOrder("0");
      setFormImageUrl(null);
      setFormFlavours([]);
      setFormEggOptions([...BAKERY_EGG_OPTIONS]);
      setFormAllowCustomMessage(false);
      setFormAllowCustomImage(false);
    }
    setProductModalOpen(true);
  };

  // Upload image to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadingImage(true);
      const compressed = await compressImageToMax800(file);
      const fd = new FormData();
      fd.append("file", compressed);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Image upload failed.");
      }

      setFormImageUrl(data.url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Save product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || formName.trim().length < 2) {
      toast.error("Product name must be at least 2 characters.");
      return;
    }
    if (!formCategoryId) {
      toast.error("Please select a birthday category.");
      return;
    }
    const numPrice = Number(formPrice);
    if (Number.isNaN(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid price (₹0 or higher).");
      return;
    }

    let numDiscount: number | null = null;
    if (formDiscountPrice.trim().length > 0) {
      numDiscount = Number(formDiscountPrice);
      if (Number.isNaN(numDiscount) || numDiscount < 0) {
        toast.error("Please enter a valid offer price.");
        return;
      }
      if (numDiscount >= numPrice) {
        toast.error("Offer/discount price must be lower than normal price.");
        return;
      }
    }

    let numStock: number | null = null;
    if (formStock.trim().length > 0) {
      numStock = Number.parseInt(formStock, 10);
      if (Number.isNaN(numStock) || numStock < 0) {
        toast.error("Please enter a valid stock quantity.");
        return;
      }
    }

    try {
      setSavingProduct(true);

      const payload = {
        category_id: formCategoryId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        price: numPrice,
        discount_price: numDiscount,
        stock_quantity: numStock,
        image_url: formImageUrl,
        image_urls: formImageUrl ? [formImageUrl] : [],
        is_veg: formIsVeg,
        is_available: formIsAvailable,
        is_featured: formIsFeatured,
        sort_order: Number.parseInt(formSortOrder, 10) || 0,
        flavours: formFlavours,
        egg_options: formEggOptions,
        allow_custom_message: formAllowCustomMessage,
        allow_custom_image: formAllowCustomImage,
      };

      if (editingItem) {
        // PATCH
        const res = await fetch("/api/admin/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to update product.");
        }

        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? data.item : i))
        );
        toast.success(`Updated "${formName}" successfully!`);
      } else {
        // POST
        const res = await fetch("/api/admin/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to create product.");
        }

        setItems((prev) => [data.item, ...prev]);
        toast.success(`Created "${formName}" successfully!`);
      }

      setProductModalOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save product."
      );
    } finally {
      setSavingProduct(false);
    }
  };

  // Quick toggle availability directly from list
  const handleToggleAvailability = async (
    item: MenuItemWithRelations,
    nextVal: boolean
  ) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: nextVal } : i))
    );

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: nextVal }),
      });

      if (!res.ok) {
        throw new Error("Failed to update availability.");
      }
      toast.success(
        `"${item.name}" is now ${nextVal ? "Available" : "Hidden"}.`
      );
    } catch {
      // Rollback
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: !nextVal } : i
        )
      );
      toast.error("Could not update availability.");
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingProduct(true);
      const res = await fetch(
        `/api/admin/menu?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete product.");
      }

      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete product."
      );
    } finally {
      setDeletingProduct(false);
    }
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim() || catFormName.trim().length < 2) {
      toast.error("Category name must be at least 2 characters.");
      return;
    }

    try {
      setSavingCat(true);
      const sortOrder = Number.parseInt(catFormSortOrder, 10) || 10;

      if (editingCat) {
        const res = await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCat.id,
            name: catFormName.trim(),
            sort_order: sortOrder,
            is_active: catFormIsActive,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to update category.");
        }

        setCategories((prev) =>
          prev.map((c) => (c.id === editingCat.id ? data.category : c))
        );
        toast.success(`Category "${catFormName}" updated!`);
      } else {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: catFormName.trim(),
            sort_order: sortOrder,
            is_active: catFormIsActive,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to create category.");
        }

        setCategories((prev) => [...prev, data.category]);
        toast.success(`Category "${catFormName}" created!`);
      }

      setCatModalOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save category."
      );
    } finally {
      setSavingCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;

    try {
      setDeletingCat(true);
      const res = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(deleteCatTarget.id)}`,
        { method: "DELETE" }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete category.");
      }

      setCategories((prev) => prev.filter((c) => c.id !== deleteCatTarget.id));
      toast.success(`Category "${deleteCatTarget.name}" deleted.`);
      setDeleteCatTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete category."
      );
    } finally {
      setDeletingCat(false);
    }
  };

  const selectedCategoryName =
    categoryMap.get(formCategoryId) ?? "Birthday Item";
  const isCakeCategory =
    selectedCategoryName.toLowerCase().includes("cake") ||
    selectedCategoryName.toLowerCase().includes("pastry");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-black text-foreground sm:text-3xl">
              Birthday Management
            </h1>
            <Badge
              variant="secondary"
              className="gap-1 border-primary/20 bg-primary/10 text-xs font-bold text-primary"
            >
              <Sparkles className="size-3.5" />
              Celebration Catalog
            </Badge>
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm">
            Manage birthday cakes, balloons, candles, banners, party packages,
            and real-time inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingCat(null);
              setCatFormName("");
              setCatFormSortOrder("10");
              setCatFormIsActive(true);
              setCatModalOpen(true);
            }}
            className="h-10 rounded-xl px-4 text-xs font-bold sm:text-sm"
          >
            <FolderPlus className="mr-1.5 size-4" />
            Add Category
          </Button>

          <Button
            type="button"
            onClick={() => openProductModal()}
            className="h-10 rounded-xl px-4 text-xs font-bold shadow-md sm:text-sm"
          >
            <Plus className="mr-1.5 size-4" />
            Add Birthday Product
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="rounded-2xl border border-border/80 p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Total Products</span>
            <Gift className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-foreground sm:text-3xl">
            {totalItemsCount}
          </p>
        </Card>

        <Card className="rounded-2xl border border-border/80 p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">In Stock</span>
            <Check className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-emerald-600 sm:text-3xl">
            {inStockCount}
          </p>
        </Card>

        <Card className="rounded-2xl border border-border/80 p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Low Stock Warning</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-amber-500 sm:text-3xl">
            {lowStockCount}
          </p>
        </Card>

        <Card className="rounded-2xl border border-border/80 p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Active Categories</span>
            <PartyPopper className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-foreground sm:text-3xl">
            {activeCategoriesCount}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="h-11 rounded-xl bg-muted/60 p-1">
          <TabsTrigger
            value="products"
            className="rounded-lg text-xs font-bold sm:text-sm"
          >
            <Gift className="mr-1.5 size-4" />
            Birthday Products ({items.length})
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="rounded-lg text-xs font-bold sm:text-sm"
          >
            <FolderPlus className="mr-1.5 size-4" />
            Birthday Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PRODUCTS */}
        <TabsContent value="products" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <Card className="rounded-2xl border border-border/80 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Category dropdown & Search */}
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={selectedCatId}
                  onValueChange={setSelectedCatId}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl text-xs font-semibold sm:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search birthday items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-xl pl-9 text-xs font-semibold"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick filter buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Button
                  type="button"
                  variant={quickFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickFilter("all")}
                  className="h-8 rounded-lg text-xs font-bold"
                >
                  All ({items.length})
                </Button>
                <Button
                  type="button"
                  variant={quickFilter === "featured" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickFilter("featured")}
                  className="h-8 rounded-lg text-xs font-bold"
                >
                  Featured
                </Button>
                <Button
                  type="button"
                  variant={quickFilter === "discounted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickFilter("discounted")}
                  className="h-8 rounded-lg text-xs font-bold"
                >
                  Discounted
                </Button>
                <Button
                  type="button"
                  variant={quickFilter === "low_stock" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickFilter("low_stock")}
                  className="h-8 rounded-lg text-xs font-bold"
                >
                  Low Stock ({lowStockCount})
                </Button>
              </div>
            </div>
          </Card>

          {/* Products Table */}
          {filteredItems.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
              <Gift className="mx-auto size-12 text-muted-foreground/60" />
              <h3 className="mt-3 font-heading text-lg font-bold">
                No birthday products found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Click &ldquo;Add Birthday Product&rdquo; above to create one.
              </p>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-border/70 bg-muted/50 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Price</th>
                      <th className="px-3 py-3">Stock</th>
                      <th className="px-3 py-3 text-center">Available</th>
                      <th className="px-3 py-3 text-center">Featured</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredItems.map((item) => {
                      const images = getProductImages(item);
                      const { sellingPrice, originalPrice, hasDiscount } =
                        getEffectiveBasePrice(item);

                      const isOutOfStock =
                        !item.is_available ||
                        (item.stock_quantity !== null &&
                          item.stock_quantity !== undefined &&
                          item.stock_quantity <= 0);

                      const isLowStock =
                        !isOutOfStock &&
                        item.stock_quantity !== null &&
                        item.stock_quantity !== undefined &&
                        item.stock_quantity <= 5;

                      return (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          {/* Image & Title */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                                {images.length > 0 ? (
                                  <Image
                                    src={images[0]}
                                    alt={item.name}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-muted-foreground">
                                    <Sparkles className="size-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {item.is_veg && (
                                    <VegIndicator isVeg={true} />
                                  )}
                                  <p className="truncate font-heading text-sm font-bold text-foreground">
                                    {item.name}
                                  </p>
                                </div>
                                {item.description && (
                                  <p className="line-clamp-1 text-xs text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3">
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-bold"
                            >
                              {categoryMap.get(item.category_id) ?? "Unknown"}
                            </Badge>
                          </td>

                          {/* Price */}
                          <td className="px-3 py-3">
                            <div className="font-heading text-sm font-bold text-foreground">
                              {formatPrice(sellingPrice)}
                            </div>
                            {hasDiscount && (
                              <div className="text-[11px] text-muted-foreground line-through">
                                {formatPrice(originalPrice)}
                              </div>
                            )}
                          </td>

                          {/* Stock */}
                          <td className="px-3 py-3">
                            {item.stock_quantity === null ||
                            item.stock_quantity === undefined ? (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Unlimited
                              </span>
                            ) : isOutOfStock ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] font-black"
                              >
                                Out of Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500 bg-amber-500/10 text-[10px] font-black text-amber-700 dark:text-amber-400"
                              >
                                {item.stock_quantity} left
                              </Badge>
                            ) : (
                              <span className="font-semibold text-foreground">
                                {item.stock_quantity} in stock
                              </span>
                            )}
                          </td>

                          {/* Availability Toggle */}
                          <td className="px-3 py-3 text-center">
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={(val) =>
                                handleToggleAvailability(item, val)
                              }
                            />
                          </td>

                          {/* Featured Toggle */}
                          <td className="px-3 py-3 text-center">
                            {item.is_featured ? (
                              <Badge className="bg-amber-500 text-[10px] font-black text-white">
                                <Star className="mr-1 size-3 fill-white" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => openProductModal(item)}
                                className="size-8 text-foreground/80 hover:bg-muted"
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(item)}
                                className="size-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CATEGORIES */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const count = items.filter((i) => i.category_id === cat.id).length;

              return (
                <Card
                  key={cat.id}
                  className="rounded-2xl border border-border/80 p-4 transition-all hover:border-primary/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-heading text-base font-bold text-foreground">
                        {cat.name}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sort Order: {cat.sort_order} · {count} {count === 1 ? "product" : "products"}
                      </p>
                    </div>

                    <Badge
                      variant={cat.is_active ? "default" : "secondary"}
                      className="text-[10px] font-bold"
                    >
                      {cat.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCat(cat);
                        setCatFormName(cat.name);
                        setCatFormSortOrder(String(cat.sort_order));
                        setCatFormIsActive(cat.is_active);
                        setCatModalOpen(true);
                      }}
                      className="h-8 rounded-lg text-xs font-bold"
                    >
                      <Edit className="mr-1 size-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteCatTarget(cat)}
                      className="h-8 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* PRODUCT ADD / EDIT MODAL */}
      {/* ============================================================ */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSaveProduct}>
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="font-heading text-xl font-black text-foreground">
                {editingItem ? "Edit Birthday Product" : "Add Birthday Product"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure details, category, pricing, stock, image, and options.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product Name *
                </label>
                <Input
                  required
                  placeholder='e.g. "Royal Red Velvet Birthday Cake"'
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-10 rounded-xl text-sm font-semibold"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  placeholder="Describe ingredients, decoration, package contents..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs font-medium"
                />
              </div>

              {/* Category & Veg Switch */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Birthday Category *
                  </label>
                  <Select
                    value={formCategoryId}
                    onValueChange={setFormCategoryId}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/80 p-2.5">
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Vegetarian Indicator
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Display green veg mark
                    </p>
                  </div>
                  <Switch
                    checked={formIsVeg}
                    onCheckedChange={setFormIsVeg}
                  />
                </div>
              </div>

              {/* Pricing: Price, Discount Price, Stock */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Normal Price (₹) *
                  </label>
                  <Input
                    required
                    type="number"
                    step="1"
                    min="0"
                    placeholder="800"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="h-10 rounded-xl text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Offer Price (₹) (Optional)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="749"
                    value={formDiscountPrice}
                    onChange={(e) => setFormDiscountPrice(e.target.value)}
                    className="h-10 rounded-xl text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Stock Quantity
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Blank = Unlimited"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="h-10 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              {/* Image Upload with Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product Image
                </label>

                {formImageUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 p-2.5">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={formImageUrl}
                        alt="Product preview"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">
                        {formImageUrl}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Image attached successfully.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormImageUrl(null)}
                      className="size-8 text-destructive hover:bg-destructive/10"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-card p-4 text-center transition-colors hover:bg-muted/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    {uploadingImage ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="text-xs font-bold text-muted-foreground">
                          Uploading image to storage...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground sm:text-sm">
                          Click to upload product image
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Custom Cake Options (Displayed when category is a Cake) */}
              {isCakeCategory && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Cake className="size-4" />
                    <span>Custom Cake Settings</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg bg-card p-2.5">
                      <div>
                        <p className="text-xs font-bold">Allow Custom Message</p>
                        <p className="text-[10px] text-muted-foreground">
                          Customer can type birthday name
                        </p>
                      </div>
                      <Switch
                        checked={formAllowCustomMessage}
                        onCheckedChange={setFormAllowCustomMessage}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-card p-2.5">
                      <div>
                        <p className="text-xs font-bold">Allow Reference Photo</p>
                        <p className="text-[10px] text-muted-foreground">
                          Customer can upload design photo
                        </p>
                      </div>
                      <Switch
                        checked={formAllowCustomImage}
                        onCheckedChange={setFormAllowCustomImage}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Availability, Featured & Sort Order */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl border border-border/80 p-2.5">
                  <span className="text-xs font-bold">Available for Order</span>
                  <Switch
                    checked={formIsAvailable}
                    onCheckedChange={setFormIsAvailable}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/80 p-2.5">
                  <span className="text-xs font-bold">Featured Item</span>
                  <Switch
                    checked={formIsFeatured}
                    onCheckedChange={setFormIsFeatured}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    className="h-9 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductModalOpen(false)}
                className="h-10 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingProduct}
                className="h-10 rounded-xl font-bold shadow-md"
              >
                {savingProduct && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {editingItem ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* PRODUCT DELETE CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-black text-destructive">
              Delete Birthday Product
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              This product will be permanently removed from the birthday catalog.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="h-10 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingProduct}
              onClick={handleDeleteProduct}
              className="h-10 rounded-xl font-bold"
            >
              {deletingProduct && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* CATEGORY ADD / EDIT MODAL */}
      {/* ============================================================ */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md p-5">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="font-heading text-lg font-black text-foreground">
                {editingCat ? "Edit Birthday Category" : "Add Birthday Category"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Manage category name, display order, and active visibility.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Category Name *
                </label>
                <Input
                  required
                  placeholder='e.g. "Party Decorations"'
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  className="h-10 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={catFormSortOrder}
                    onChange={(e) => setCatFormSortOrder(e.target.value)}
                    className="h-10 rounded-xl text-sm font-bold"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/80 p-2.5">
                  <span className="text-xs font-bold">Active Status</span>
                  <Switch
                    checked={catFormIsActive}
                    onCheckedChange={setCatFormIsActive}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCatModalOpen(false)}
                className="h-10 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingCat}
                className="h-10 rounded-xl font-bold shadow-md"
              >
                {savingCat && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingCat ? "Save Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* CATEGORY DELETE CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Dialog
        open={deleteCatTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCatTarget(null);
        }}
      >
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-black text-destructive">
              Delete Birthday Category
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete category &ldquo;
              {deleteCatTarget?.name}&rdquo;? Products under this category should
              be reassigned first.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCatTarget(null)}
              className="h-10 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingCat}
              onClick={handleDeleteCategory}
              className="h-10 rounded-xl font-bold"
            >
              {deletingCat && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
