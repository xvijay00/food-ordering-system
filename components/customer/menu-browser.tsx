"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import { ItemCustomizeSheet } from "@/components/customer/item-customize-sheet";
import { MenuCard } from "@/components/customer/menu-card";
import { VegIndicator } from "@/components/customer/veg-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  calculateCartItemCount,
  calculateCartSubtotal,
  useCartStore,
} from "@/store/cart";
import type { Category, MenuItemWithRelations } from "@/types/database";

type DietaryFilter = "all" | "veg" | "non_veg";

type MenuBrowserProps = {
  categories: Category[];
  menuItems: MenuItemWithRelations[];
  shopOpen: boolean;
  fetchError?: string | null;
};

function getCategoryEmoji(name: string): string {
  const l = name.toLowerCase();
  if (l.includes("cake")) return "🎂";
  if (l.includes("pizza")) return "🍕";
  if (l.includes("pastr")) return "🍰";
  if (l.includes("bread") || l.includes("bun")) return "🍞";
  if (l.includes("balloon")) return "🎈";
  if (l.includes("candle")) return "🕯️";
  if (l.includes("banner")) return "🎊";
  if (l.includes("cap") || l.includes("hat")) return "🎉";
  if (l.includes("gift")) return "🎁";
  if (l.includes("decor") || l.includes("party")) return "✨";
  if (l.includes("drink") || l.includes("beverage")) return "🥤";
  if (l.includes("snack") || l.includes("bite")) return "🍿";
  return "🍽️";
}

export function MenuBrowser({
  categories,
  menuItems,
  shopOpen,
  fetchError = null,
}: MenuBrowserProps) {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [dietaryFilter, setDietaryFilter] = React.useState<DietaryFilter>("all");
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(
    categories[0]?.id ?? ""
  );
  const [customizingItem, setCustomizingItem] =
    React.useState<MenuItemWithRelations | null>(null);

  const visibleSections = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories
      .map((category) => {
        const matchingItems = menuItems.filter((item) => {
          if (item.category_id !== category.id) return false;
          if (dietaryFilter === "veg" && !item.is_veg) return false;
          if (dietaryFilter === "non_veg" && item.is_veg) return false;
          if (query && !item.name.toLowerCase().includes(query)) return false;
          return true;
        });

        return { category, items: matchingItems };
      })
      .filter((section) => section.items.length > 0);
  }, [categories, dietaryFilter, menuItems, searchQuery]);

  const effectiveActiveCategoryId = visibleSections.some(
    ({ category }) => category.id === activeCategoryId
  )
    ? activeCategoryId
    : (visibleSections[0]?.category.id ?? "");

  // Track active category section in the viewport with IntersectionObserver
  React.useEffect(() => {
    if (visibleSections.length === 0) return;

    const sectionElements = visibleSections
      .map(({ category }) => document.getElementById(`category-${category.id}`))
      .filter((el): el is HTMLElement => el !== null);

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            if (id?.startsWith("category-")) {
              setActiveCategoryId(id.replace("category-", ""));
            }
            break;
          }
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    sectionElements.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleSections]);

  const itemCount = hydrated ? calculateCartItemCount(items) : 0;
  const subtotal = hydrated ? calculateCartSubtotal(items) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6">
      {/* ============================================================ */}
      {/* 1. HERO SHOWCASE CARD (Foodie / Delicious Food Delivered Fast) */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-rose-500/15 p-6 shadow-sm sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary backdrop-blur-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>Baker&apos;s Nation • Nahan, HP</span>
          </div>

          <h1 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Good Food, <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Good Mood</span> 🍰
          </h1>

          <p className="text-sm font-semibold leading-relaxed text-foreground/80 sm:text-base">
            Fresh handcrafted cakes, artisan pizzas, indulgent pastries &amp; celebration packages packed fresh and delivered right to your doorstep.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              asChild
              className="h-11 rounded-full bg-gradient-to-r from-amber-500 to-primary px-6 font-black text-white shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <a href="#menu-categories">
                <span>Explore Menu</span>
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-primary/40 bg-background/70 px-6 font-extrabold text-foreground backdrop-blur-xs transition-all hover:border-primary hover:bg-background/95"
            >
              <Link href="/birthday">
                <span>Custom Cake Studio 📸</span>
              </Link>
            </Button>
          </div>

          {/* Quick Value Props Strip */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-foreground/75">
            <div className="flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-[11px]">⚡</span>
              <span>Fast Local Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px]">🛡️</span>
              <span>100% Fresh Bakes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-[11px]">📞</span>
              <span>Call 7831099101</span>
            </div>
          </div>
        </div>

        {/* Ambient Decorative Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-48 rounded-full bg-amber-500/15 blur-2xl" />
      </div>

      {/* Kitchen Closed Alert */}
      {!shopOpen && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-base font-semibold text-amber-950 dark:text-amber-100"
        >
          <AlertCircle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p>
            The kitchen is currently closed for new orders. You can still browse our menu.
          </p>
        </div>
      )}

      {/* Fetch Error Alert */}
      {fetchError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base font-semibold text-destructive"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p>{fetchError}</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. CUSTOM PHOTO CAKE SPOTLIGHT BANNER */}
      {/* ============================================================ */}
      <div className="overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-r from-amber-500/15 via-primary/10 to-rose-500/10 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-primary text-2xl text-white shadow-sm">
              🎂
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-lg font-black text-foreground sm:text-xl">
                  Custom Design &amp; Photo Cake
                </span>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-black uppercase text-primary">
                  Photo Upload 📸
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground/75 sm:text-sm">
                Apna custom cake design ya photo upload karein — Price on call 📞
              </p>
            </div>
          </div>
          <Button
            asChild
            className="h-10 shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-primary px-5 text-sm font-black text-white shadow-sm transition-all hover:scale-105"
          >
            <Link href="/birthday">
              <span>Send Photo &amp; Order</span>
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SEARCH & VEG / NON-VEG PILL FILTERS */}
      {/* ============================================================ */}
      <div id="menu-categories" className="flex flex-col gap-3 scroll-mt-24 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foreground/60"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes or cakes..."
            aria-label="Search dishes or cakes"
            className="h-12 rounded-full border-border/80 bg-card pr-10 pl-11 text-base font-semibold text-foreground shadow-2xs placeholder:text-foreground/50 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Veg / Non-Veg Rounded Pills */}
        <div
          role="group"
          aria-label="Dietary filter"
          className="inline-flex w-fit items-center gap-1 rounded-full border border-border/80 bg-card p-1 shadow-2xs"
        >
          <Button
            type="button"
            variant={dietaryFilter === "all" ? "default" : "ghost"}
            size="sm"
            aria-pressed={dietaryFilter === "all"}
            onClick={() => setDietaryFilter("all")}
            className="min-h-9 rounded-full px-4 text-xs font-black"
          >
            All
          </Button>
          <Button
            type="button"
            variant={dietaryFilter === "veg" ? "default" : "ghost"}
            size="sm"
            aria-pressed={dietaryFilter === "veg"}
            onClick={() =>
              setDietaryFilter((prev) => (prev === "veg" ? "all" : "veg"))
            }
            className="min-h-9 gap-1.5 rounded-full px-4 text-xs font-black"
          >
            <VegIndicator isVeg />
            <span>Veg</span>
          </Button>
          <Button
            type="button"
            variant={dietaryFilter === "non_veg" ? "default" : "ghost"}
            size="sm"
            aria-pressed={dietaryFilter === "non_veg"}
            onClick={() =>
              setDietaryFilter((prev) =>
                prev === "non_veg" ? "all" : "non_veg"
              )
            }
            className="min-h-9 gap-1.5 rounded-full px-4 text-xs font-black"
          >
            <VegIndicator isVeg={false} />
            <span>Non-veg</span>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. POPULAR CATEGORIES HORIZONTAL PILL CAROUSEL */}
      {/* ============================================================ */}
      {visibleSections.length > 0 && (
        <div className="sticky top-16 z-30 -mx-4 border-y border-border/70 bg-background/95 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <nav
            aria-label="Menu categories"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
          >
            {visibleSections.map(({ category }) => {
              const isActive = effectiveActiveCategoryId === category.id;
              const emoji = getCategoryEmoji(category.name);

              return (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  onClick={() => setActiveCategoryId(category.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm scale-102 font-black"
                      : "border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-base" aria-hidden="true">{emoji}</span>
                  <span>{category.name}</span>
                </a>
              );
            })}
          </nav>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PRODUCT SECTIONS & GRID */}
      {/* ============================================================ */}
      {visibleSections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-12 text-center shadow-xs">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-3xl">
            🧁
          </span>
          <p className="mt-4 font-heading text-xl font-bold text-foreground">
            {menuItems.length === 0
              ? "Menu is being updated"
              : "No bakery items match your filter"}
          </p>
          <p className="mt-2 text-sm font-medium text-foreground/75">
            {menuItems.length === 0
              ? "Freshly baked cakes, pastries, pizzas, and breads are being added. Check back shortly!"
              : "Try clearing your search input or resetting the filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-12 pb-24">
          {visibleSections.map(({ category, items: sectionItems }) => (
            <section
              key={category.id}
              id={`category-${category.id}`}
              tabIndex={-1}
              className="scroll-mt-32 space-y-4 focus:outline-none"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryEmoji(category.name)}
                  </span>
                  <h2 className="font-heading text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    {category.name}
                  </h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground/70">
                  {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sectionItems.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    shopOpen={shopOpen}
                    onCustomize={setCustomizingItem}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. FLOATING VIEW CART BAR (as seen in QuickBite / YummyCart) */}
      {/* ============================================================ */}
      {hydrated && itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.8rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto max-w-lg px-4 md:bottom-6">
          <Link
            href="/cart"
            className="flex min-h-14 items-center justify-between gap-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-primary px-5 py-3 text-white shadow-2xl ring-2 ring-white/20 transition-all hover:scale-102 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-98"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/25 text-white">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </span>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-white/85">
                  Your Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
                <span className="text-base font-black tracking-tight text-white">
                  Total: {formatPrice(subtotal)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black uppercase text-white">
              <span>Checkout</span>
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </div>
          </Link>
        </div>
      )}

      <ItemCustomizeSheet
        item={customizingItem}
        open={customizingItem !== null}
        onOpenChange={(open) => {
          if (!open) setCustomizingItem(null);
        }}
        disabled={!shopOpen}
      />
    </div>
  );
}
