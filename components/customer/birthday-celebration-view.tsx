"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Cake,
  Check,
  Gift,
  Minus,
  Package,
  PartyPopper,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  BirthdayCakeCustomizationResult,
  BirthdayCustomCakeDialog,
} from "@/components/customer/birthday-custom-cake-dialog";
import { VegIndicator } from "@/components/customer/veg-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getEffectiveBasePrice,
  getProductImages,
  isBirthdayCategory,
} from "@/lib/bakery-constants";
import { formatPrice } from "@/lib/format";
import {
  calculateBirthdayPackageItemCount,
  calculateBirthdayPackageSubtotal,
  useCartStore,
} from "@/store/cart";
import type { Category, MenuItemWithRelations } from "@/types/database";

export type PackageBuilderItem = {
  packageItemId: string; // unique key in package builder
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  categoryName: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  isVeg?: boolean;
  variantLabel?: string | null;
  selectedFlavour?: string | null;
  eggPreference?: string | null;
  cakeMessage?: string | null;
  customImageUrl?: string | null;
  preorderAt?: string | null;
  isCustomCake: boolean;
};

type BirthdayCelebrationViewProps = {
  categories: Category[];
  menuItems: MenuItemWithRelations[];
  fetchError: string | null;
};

export function BirthdayCelebrationView({
  categories,
  menuItems,
  fetchError,
}: BirthdayCelebrationViewProps) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.add);

  // Filters state
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Package builder state
  const [packageItems, setPackageItems] = React.useState<PackageBuilderItem[]>([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(false);

  // Custom cake dialog state
  const [customizingCake, setCustomizingCake] =
    React.useState<MenuItemWithRelations | null>(null);

  // Fast category lookup map
  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  // Filtered products
  const filteredProducts = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategoryId === "all" || item.category_id === selectedCategoryId;

      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  // Package calculations
  const totalPackageItemsCount = React.useMemo(() => {
    return calculateBirthdayPackageItemCount(packageItems);
  }, [packageItems]);

  const packageSubtotal = React.useMemo(() => {
    return calculateBirthdayPackageSubtotal(packageItems);
  }, [packageItems]);

  const originalPackageTotal = React.useMemo(() => {
    return packageItems.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0
    );
  }, [packageItems]);

  const totalSavings = Math.max(0, originalPackageTotal - packageSubtotal);

  // Check if an item is already in package (for standard non-custom cake items)
  const getStandardItemQty = (menuItemId: string): number => {
    const found = packageItems.find(
      (p) => p.menuItemId === menuItemId && !p.isCustomCake
    );
    return found ? found.quantity : 0;
  };

  // Add standard product to package
  const handleAddStandardItem = (item: MenuItemWithRelations, qty = 1) => {
    const { sellingPrice, originalPrice } = getEffectiveBasePrice(item);
    const catName = categoryMap.get(item.category_id) ?? "Birthday Item";
    const images = getProductImages(item);

    setPackageItems((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.menuItemId === item.id && !p.isCustomCake
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + qty,
        };
        return next;
      }

      const newItem: PackageBuilderItem = {
        packageItemId: `pkg-${item.id}`,
        menuItemId: item.id,
        name: item.name,
        imageUrl: images[0] ?? null,
        categoryName: catName,
        unitPrice: sellingPrice,
        originalPrice,
        quantity: Math.max(1, qty),
        isVeg: item.is_veg,
        isCustomCake: false,
      };

      return [...prev, newItem];
    });

    toast.success(`Added "${item.name}" to your Birthday Package!`);
  };

  // Stepper increment for package items
  const handleUpdateItemQty = (packageItemId: string, delta: number) => {
    setPackageItems((prev) =>
      prev
        .map((p) => {
          if (p.packageItemId === packageItemId) {
            const nextQty = p.quantity + delta;
            return nextQty > 0 ? { ...p, quantity: nextQty } : null;
          }
          return p;
        })
        .filter((p): p is PackageBuilderItem => p !== null)
    );
  };

  // Remove package item
  const handleRemovePackageItem = (packageItemId: string) => {
    setPackageItems((prev) => prev.filter((p) => p.packageItemId !== packageItemId));
    toast.info("Item removed from Birthday Package.");
  };

  // Add customized cake to package
  const handleAddCustomCakeToPackage = (
    customization: BirthdayCakeCustomizationResult
  ) => {
    const { item } = customization;
    const catName = categoryMap.get(item.category_id) ?? "Birthday Cakes";
    const images = getProductImages(item);
    const { originalPrice } = getEffectiveBasePrice(item);

    const packageItemId = `cake-${item.id}-${Date.now()}`;

    const newPackageCake: PackageBuilderItem = {
      packageItemId,
      menuItemId: item.id,
      name: item.name,
      imageUrl: customization.customImageUrl || images[0] || null,
      categoryName: catName,
      unitPrice: customization.unitPrice,
      originalPrice: Math.max(customization.unitPrice, originalPrice),
      quantity: customization.quantity,
      isVeg: item.is_veg,
      variantLabel: customization.variantLabel,
      selectedFlavour: customization.selectedFlavour,
      eggPreference: customization.eggPreference,
      cakeMessage: customization.cakeMessage || null,
      customImageUrl: customization.customImageUrl,
      preorderAt: customization.preorderAt || null,
      isCustomCake: true,
    };

    setPackageItems((prev) => [...prev, newPackageCake]);
  };

  // Add Entire Birthday Package to Cart
  const handleAddPackageToCart = (goToCheckout = false) => {
    if (packageItems.length === 0) {
      toast.error("Please add at least one item to your Birthday Package.");
      return;
    }

    // Add each package item to the global cart
    for (const p of packageItems) {
      addToCart({
        menuItemId: p.menuItemId,
        name: p.name,
        imageUrl: p.imageUrl,
        isVeg: p.isVeg,
        variantLabel: p.variantLabel ?? null,
        selectedFlavour: p.selectedFlavour ?? null,
        eggPreference: p.eggPreference ?? null,
        cakeMessage: p.cakeMessage ?? null,
        customImageUrl: p.customImageUrl ?? null,
        unitPrice: p.unitPrice,
        quantity: p.quantity,
        isBirthdayPackage: true,
        birthdayCategory: p.categoryName,
      });
    }

    if (goToCheckout) {
      toast.success("Birthday package added to cart! Proceeding to checkout...");
      router.push("/checkout");
    } else {
      toast.success(
        `Added ${totalPackageItemsCount} birthday celebration items to your cart!`,
        {
          action: {
            label: "View Cart",
            onClick: () => router.push("/cart"),
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen pb-28 md:pb-16">
      {/* ============================================================ */}
      {/* 1. BIRTHDAY HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-amber-500/10 via-primary/5 to-background pt-8 pb-12 sm:pt-12 sm:pb-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent opacity-70 blur-2xl dark:from-amber-500/10" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-black tracking-wide text-primary shadow-xs sm:text-sm">
              <PartyPopper className="size-4 animate-bounce" />
              <span>Bakers Nation Celebration Studio</span>
              <Sparkles className="size-4" />
            </div>

            {/* Main Heading */}
            <h1 className="mt-4 font-heading text-3xl font-black tracking-tight text-foreground sm:text-5xl sm:leading-tight">
              Create Your Dream <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-600 via-primary to-rose-600 bg-clip-text text-transparent dark:from-amber-400 dark:via-primary dark:to-rose-400">
                Birthday Celebration Package
              </span>
            </h1>

            {/* Description */}
            <p className="mt-3 text-sm font-semibold text-foreground/80 sm:text-base sm:leading-relaxed">
              Craft the perfect birthday bundle: handcrafted designer cakes,
              colorful party balloons, sparkling candles, celebratory banners &
              party accessories. Pick individual products, adjust quantities, and
              see your custom package calculate in real time.
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl px-6 font-bold shadow-md"
              >
                <a href="#birthday-products">
                  <Sparkles className="mr-2 size-4.5" />
                  Browse Birthday Products
                </a>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileDrawerOpen(true);
                  } else {
                    const el = document.getElementById("birthday-package-builder");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="h-12 rounded-xl px-6 font-bold"
              >
                <Package className="mr-2 size-4.5 text-primary" />
                Build Package ({totalPackageItemsCount} items)
              </Button>
            </div>

            {/* Value Badges */}
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/70 p-2.5 text-xs font-bold text-foreground/85 shadow-2xs backdrop-blur-xs">
                <Cake className="size-4 text-amber-500" />
                <span>Freshly Baked</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/70 p-2.5 text-xs font-bold text-foreground/85 shadow-2xs backdrop-blur-xs">
                <PartyPopper className="size-4 text-primary" />
                <span>Party Accessories</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/70 p-2.5 text-xs font-bold text-foreground/85 shadow-2xs backdrop-blur-xs">
                <Sparkles className="size-4 text-rose-500" />
                <span>Custom Messages</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/70 p-2.5 text-xs font-bold text-foreground/85 shadow-2xs backdrop-blur-xs">
                <Check className="size-4 text-emerald-600" />
                <span>Live Bundle Total</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. CATEGORY TABS & SEARCH */}
      {/* ============================================================ */}
      <section
        id="birthday-products"
        className="sticky top-14 z-30 border-b border-border/80 bg-background/95 py-3 backdrop-blur-md"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Category Pills Slider */}
            <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
              <Button
                type="button"
                size="sm"
                variant={selectedCategoryId === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategoryId("all")}
                className="h-9 shrink-0 rounded-full px-4 text-xs font-bold"
              >
                All Products ({menuItems.length})
              </Button>

              {categories.map((cat) => {
                const count = menuItems.filter(
                  (i) => i.category_id === cat.id
                ).length;
                const isSelected = selectedCategoryId === cat.id;

                return (
                  <Button
                    key={cat.id}
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="h-9 shrink-0 rounded-full px-3.5 text-xs font-bold"
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-foreground/70"
                      }`}
                    >
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search birthday items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-full pl-9 text-xs font-semibold"
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
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. MAIN CONTENT: PRODUCTS GRID + PACKAGE BUILDER */}
      {/* ============================================================ */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {fetchError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm font-semibold">{fetchError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: PRODUCTS CATALOG (8 cols on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl font-black text-foreground sm:text-2xl">
                  {selectedCategoryId === "all"
                    ? "Birthday Catalog"
                    : categoryMap.get(selectedCategoryId) ?? "Category Items"}
                </h2>
                <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                  Showing {filteredProducts.length} celebration products
                </p>
              </div>

              {totalPackageItemsCount > 0 && (
                <div className="hidden items-center gap-2 lg:flex">
                  <span className="text-xs font-bold text-muted-foreground">
                    Package Subtotal:
                  </span>
                  <span className="font-heading text-lg font-black text-primary">
                    {formatPrice(packageSubtotal)}
                  </span>
                </div>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center">
                <Gift className="size-12 text-muted-foreground/60" />
                <h3 className="mt-3 font-heading text-lg font-bold text-foreground">
                  No birthday products found
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery
                    ? `No products matched "${searchQuery}". Try a different keyword.`
                    : "No products currently available in this category."}
                </p>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-4 rounded-xl font-bold"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredProducts.map((product) => {
                  const images = getProductImages(product);
                  const { sellingPrice, originalPrice, hasDiscount, discountPercent } =
                    getEffectiveBasePrice(product);

                  const isCake =
                    isBirthdayCategory(categoryMap.get(product.category_id)) &&
                    (product.flavours?.length > 0 ||
                      product.allow_custom_message ||
                      categoryMap.get(product.category_id)?.toLowerCase().includes("cake"));

                  const isOutOfStock =
                    !product.is_available ||
                    (product.stock_quantity !== null &&
                      product.stock_quantity !== undefined &&
                      product.stock_quantity <= 0);

                  const isLowStock =
                    !isOutOfStock &&
                    product.stock_quantity !== null &&
                    product.stock_quantity !== undefined &&
                    product.stock_quantity <= 5;

                  const existingQty = getStandardItemQty(product.id);

                  return (
                    <Card
                      key={product.id}
                      className={`flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-md ${
                        isOutOfStock ? "opacity-75" : ""
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                        {images.length > 0 ? (
                          <Image
                            src={images[0]}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                            className="object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 via-primary/5 to-muted text-muted-foreground">
                            {isCake ? (
                              <Cake className="size-10 text-primary/40" />
                            ) : (
                              <PartyPopper className="size-10 text-primary/40" />
                            )}
                            <span className="mt-1 text-xs font-bold">
                              Bakers Nation
                            </span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
                          {product.is_veg && <VegIndicator isVeg={true} />}
                          <Badge
                            variant="secondary"
                            className="bg-background/90 text-[11px] font-bold text-foreground backdrop-blur-xs"
                          >
                            {categoryMap.get(product.category_id) ?? "Birthday"}
                          </Badge>
                        </div>

                        {/* Discount Badge */}
                        {hasDiscount && (
                          <div className="absolute right-2.5 top-2.5">
                            <Badge className="bg-rose-600 text-[11px] font-black text-white shadow-xs">
                              {discountPercent}% OFF
                            </Badge>
                          </div>
                        )}

                        {/* Stock Badge */}
                        <div className="absolute bottom-2.5 left-2.5">
                          {isOutOfStock ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px] font-black uppercase"
                            >
                              Out of Stock
                            </Badge>
                          ) : isLowStock ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500 bg-amber-500/90 text-[10px] font-black text-white shadow-xs"
                            >
                              Only {product.stock_quantity} left
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {/* Card Content */}
                      <CardContent className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* Pricing and Actions */}
                        <div className="mt-4 border-t border-border/60 pt-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="font-heading text-xl font-black text-foreground">
                                {formatPrice(sellingPrice)}
                              </span>
                              {hasDiscount && (
                                <span className="text-xs font-bold text-muted-foreground line-through">
                                  {formatPrice(originalPrice)}
                                </span>
                              )}
                            </div>

                            {/* Action Button */}
                            {isOutOfStock ? (
                              <Button
                                disabled
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl font-bold"
                              >
                                Sold Out
                              </Button>
                            ) : isCake ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setCustomizingCake(product)}
                                className="h-9 rounded-xl px-3 text-xs font-bold shadow-xs"
                              >
                                <Sparkles className="mr-1 size-3.5" />
                                Customize Cake
                              </Button>
                            ) : existingQty > 0 ? (
                              /* Stepper right on card */
                              <div className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 p-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdateItemQty(`pkg-${product.id}`, -1)
                                  }
                                  className="size-7 rounded-lg text-primary hover:bg-primary/20"
                                >
                                  <Minus className="size-3.5" />
                                </Button>
                                <span className="w-5 text-center text-xs font-black text-primary">
                                  {existingQty}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdateItemQty(`pkg-${product.id}`, 1)
                                  }
                                  className="size-7 rounded-lg text-primary hover:bg-primary/20"
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddStandardItem(product, 1)}
                                className="h-9 rounded-xl px-3 text-xs font-bold hover:border-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                <Plus className="mr-1 size-3.5" />
                                Add to Package
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: INTERACTIVE PACKAGE BUILDER (Desktop sidebar, 5-4 cols) */}
          <aside
            id="birthday-package-builder"
            className="hidden lg:col-span-5 lg:block xl:col-span-4"
          >
            <div className="sticky top-28 space-y-4">
              <Card className="rounded-2xl border-2 border-primary/30 shadow-lg">
                <CardHeader className="border-b border-border/70 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Package className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-lg font-black text-foreground">
                          Your Birthday Package
                        </CardTitle>
                        <p className="text-[11px] font-bold text-muted-foreground">
                          {totalPackageItemsCount} {totalPackageItemsCount === 1 ? "item" : "items"} selected
                        </p>
                      </div>
                    </div>

                    {packageItems.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPackageItems([]);
                          toast.info("Birthday package cleared.");
                        }}
                        className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {packageItems.length === 0 ? (
                    /* Empty state guide */
                    <div className="py-6 text-center">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Gift className="size-7" />
                      </div>
                      <h4 className="mt-3 font-heading text-base font-bold text-foreground">
                        Your Package is Empty
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick items from the catalog to build your custom celebration bundle.
                      </p>

                      {/* Checklist */}
                      <div className="mt-4 space-y-2 text-left text-xs font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                          <span className="text-base">🎂</span>
                          <span>1. Add a Designer Birthday Cake</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                          <span className="text-base">🎈</span>
                          <span>2. Choose Balloons & Magic Candles</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
                          <span className="text-base">🎉</span>
                          <span>3. Add Party Caps & Banners</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Selected Package Items List */
                    <div className="space-y-4">
                      <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
                        {packageItems.map((item) => (
                          <div
                            key={item.packageItemId}
                            className="flex items-start justify-between gap-2.5 rounded-xl border border-border/80 bg-muted/30 p-2.5"
                          >
                            {/* Image Thumbnail */}
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
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

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <h5 className="truncate font-heading text-xs font-bold text-foreground">
                                {item.name}
                              </h5>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                {item.categoryName}
                              </p>

                              {/* Custom Cake details */}
                              {item.isCustomCake && (
                                <div className="mt-1 space-y-0.5 text-[10px] text-primary">
                                  {item.variantLabel && (
                                    <p className="font-bold">
                                      Size: {item.variantLabel}
                                    </p>
                                  )}
                                  {item.selectedFlavour && (
                                    <p>
                                      {item.selectedFlavour} · {item.eggPreference}
                                    </p>
                                  )}
                                  {item.cakeMessage && (
                                    <p className="italic">
                                      &ldquo;{item.cakeMessage}&rdquo;
                                    </p>
                                  )}
                                </div>
                              )}

                              <p className="mt-1 text-xs font-bold text-foreground/80">
                                {formatPrice(item.unitPrice)} each
                              </p>
                            </div>

                            {/* Stepper & Line Total */}
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="font-heading text-xs font-black text-foreground">
                                {formatPrice(item.unitPrice * item.quantity)}
                              </span>

                              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdateItemQty(item.packageItemId, -1)
                                  }
                                  className="size-6 text-foreground/80 hover:bg-muted"
                                >
                                  <Minus className="size-3" />
                                </Button>
                                <span className="w-4 text-center text-[11px] font-black">
                                  {item.quantity}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdateItemQty(item.packageItemId, 1)
                                  }
                                  className="size-6 text-foreground/80 hover:bg-muted"
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemovePackageItem(item.packageItemId)
                                }
                                className="text-[10px] font-bold text-destructive hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Package Total Summary */}
                      <div className="border-t border-border/80 pt-3">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Total Items</span>
                            <span className="font-bold text-foreground">
                              {totalPackageItemsCount}
                            </span>
                          </div>

                          {totalSavings > 0 && (
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                              <span>Package Savings</span>
                              <span className="font-black">
                                - {formatPrice(totalSavings)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between pt-1 text-base font-black text-foreground">
                            <span>Package Total:</span>
                            <span className="font-heading text-xl text-primary">
                              {formatPrice(packageSubtotal)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 space-y-2">
                          <Button
                            type="button"
                            onClick={() => handleAddPackageToCart(false)}
                            className="h-11 w-full rounded-xl font-bold shadow-md"
                          >
                            <ShoppingBag className="mr-2 size-4.5" />
                            Add Package to Cart
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleAddPackageToCart(true)}
                            className="h-10 w-full rounded-xl font-bold"
                          >
                            <span>Proceed to Checkout</span>
                            <ArrowRight className="ml-1.5 size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 4. MOBILE FLOATING PACKAGE BAR & SLIDE-UP DRAWER */}
      {/* ============================================================ */}
      {totalPackageItemsCount > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:hidden">
          <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-background/95 p-3 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Package className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">
                  Birthday Package ({totalPackageItemsCount} items)
                </p>
                <p className="font-heading text-lg font-black text-primary">
                  {formatPrice(packageSubtotal)}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileDrawerOpen(true)}
                className="h-9 rounded-xl px-3 text-xs font-bold"
              >
                Review
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleAddPackageToCart(true)}
                className="h-9 rounded-xl px-4 text-xs font-bold shadow-xs"
              >
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl px-4 pb-6 pt-4">
          <SheetHeader className="border-b border-border/70 pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-heading text-lg font-black text-foreground">
                Your Birthday Package
              </SheetTitle>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary">
                {totalPackageItemsCount} items
              </span>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Review and adjust quantities before adding to cart.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {packageItems.map((item) => (
              <div
                key={item.packageItemId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="truncate font-heading text-xs font-bold text-foreground">
                    {item.name}
                  </h5>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {formatPrice(item.unitPrice)} each
                  </p>
                  {item.isCustomCake && item.variantLabel && (
                    <p className="text-[10px] font-bold text-primary">
                      {item.variantLabel} · {item.selectedFlavour}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUpdateItemQty(item.packageItemId, -1)}
                      className="size-7 text-foreground/80"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-5 text-center text-xs font-black">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUpdateItemQty(item.packageItemId, 1)}
                      className="size-7 text-foreground/80"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  <span className="w-16 text-right font-heading text-xs font-black">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border/80 pt-3">
            <div className="flex justify-between text-base font-black">
              <span>Total:</span>
              <span className="font-heading text-xl text-primary">
                {formatPrice(packageSubtotal)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleAddPackageToCart(false);
                  setMobileDrawerOpen(false);
                }}
                className="h-11 rounded-xl font-bold"
              >
                Add to Cart
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handleAddPackageToCart(true);
                  setMobileDrawerOpen(false);
                }}
                className="h-11 rounded-xl font-bold shadow-md"
              >
                Go to Checkout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* 5. CUSTOM CAKE MODAL */}
      {/* ============================================================ */}
      <BirthdayCustomCakeDialog
        item={customizingCake}
        open={customizingCake !== null}
        onOpenChange={(open) => {
          if (!open) setCustomizingCake(null);
        }}
        onAddCakeToPackage={handleAddCustomCakeToPackage}
      />
    </div>
  );
}
