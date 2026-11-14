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
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
      {/* Delivery Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Bike className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-bold text-foreground">Delivery</p>
            <p className="text-sm font-medium text-foreground/80">
              Packed fresh and delivered to your address
            </p>
          </div>
        </div>

        {itemCount > 0 && (
          <Button asChild variant="outline" size="sm" className="min-h-10 gap-2 px-4 text-sm font-bold">
            <Link href="/cart">
              <ShoppingBag className="size-4" aria-hidden="true" />
              <span>View Cart ({itemCount})</span>
            </Link>
          </Button>
        )}
      </div>

      {!shopOpen && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-base font-semibold text-amber-950 dark:text-amber-100"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p>
            The kitchen is currently closed for new orders. You can still browse
            our menu.
          </p>
        </div>
      )}

      {fetchError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base font-semibold text-destructive"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p>{fetchError}</p>
        </div>
      )}

      {/* Birthday & Custom Cake Spotlight Banner */}
      <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-amber-500/15 via-primary/10 to-rose-500/10 p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-2xl shadow-2xs">
              🎂
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-base font-black text-foreground sm:text-lg">
                  Custom Design & Photo Cake
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-black uppercase text-primary">
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
            className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-amber-600 to-primary px-4 text-sm font-black text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Link href="/birthday">
              <span>Send Photo & Order</span>
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + Veg / Non-Veg Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-foreground/60"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes by name..."
            aria-label="Search dishes by name"
            className="h-12 rounded-xl pr-10 pl-11 text-base font-semibold text-foreground placeholder:text-foreground/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground/70 hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Dietary filter"
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-border/80 bg-card p-1.5"
        >
          <Button
            type="button"
            variant={dietaryFilter === "all" ? "default" : "ghost"}
            size="sm"
            aria-pressed={dietaryFilter === "all"}
            onClick={() => setDietaryFilter("all")}
            className="min-h-10 rounded-lg px-4 text-sm font-bold"
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
            className="min-h-10 gap-2 rounded-lg px-4 text-sm font-bold"
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
            className="min-h-10 gap-2 rounded-lg px-4 text-sm font-bold"
          >
            <VegIndicator isVeg={false} />
            <span>Non-veg</span>
          </Button>
        </div>
      </div>

      {/* Sticky Horizontal Category Tabs */}
      {visibleSections.length > 0 && (
        <div className="sticky top-14 z-30 -mx-4 border-y border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
          <nav
            aria-label="Menu categories"
            className="flex gap-2.5 overflow-x-auto"
          >
            {visibleSections.map(({ category }) => {
              const isActive = effectiveActiveCategoryId === category.id;
              return (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  onClick={() => setActiveCategoryId(category.id)}
                  aria-current={isActive ? "true" : undefined}
                  className="category-scrollspy-link inline-flex min-h-11 shrink-0 items-center rounded-full border border-border px-5 text-base font-bold text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {category.name}
                </a>
              );
            })}
          </nav>
        </div>
      )}

      {/* Category Sections */}
      {visibleSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-lg font-bold text-foreground">
            {menuItems.length === 0
              ? "Menu is being updated"
              : "No bakery items match your filter"}
          </p>
          <p className="mt-2 text-base font-medium text-foreground/80">
            {menuItems.length === 0
              ? "Freshly baked cakes, pastries, pizzas, and breads are being added. Check back shortly!"
              : "Try clearing your search input or resetting the filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-10 pb-24">
          {visibleSections.map(({ category, items: sectionItems }) => (
            <section
              key={category.id}
              id={`category-${category.id}`}
              tabIndex={-1}
              className="scroll-mt-32 space-y-4 focus:outline-none"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-2">
                <h2 className="font-heading text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {category.name}
                </h2>
                <span className="text-sm font-bold text-foreground/70">
                  {sectionItems.length}{" "}
                  {sectionItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

      {/* Floating View Cart Bar */}
      {hydrated && itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto max-w-xl px-4 md:bottom-6">
          <Link
            href="/cart"
            className="flex min-h-14 items-center justify-between gap-4 rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl ring-1 ring-primary/20 transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/20">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </span>
              <span className="text-base font-extrabold tracking-tight">
                View Cart ({itemCount} {itemCount === 1 ? "item" : "items"},{" "}
                {formatPrice(subtotal)})
              </span>
            </div>
            <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
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
