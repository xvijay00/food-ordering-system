"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Search,
  ShoppingBag,
  Store,
  UtensilsCrossed,
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
  const orderType = useCartStore((state) => state.orderType);
  const tableNo = useCartStore((state) => state.tableNo);
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
      {/* Order Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm">
          {hydrated && orderType === "dine_in" ? (
            <>
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <UtensilsCrossed className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">
                  Dine-in{tableNo !== null ? ` · Table ${tableNo}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Served straight to your table
                </p>
              </div>
            </>
          ) : hydrated && orderType === "delivery" ? (
            <>
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Bike className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">Delivery</p>
                <p className="text-xs text-muted-foreground">
                  Packed fresh and delivered to your address
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Store className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">Menu</p>
                <p className="text-xs text-muted-foreground">
                  Choose Dine-in or Delivery on the home screen
                </p>
              </div>
            </>
          )}
        </div>

        <Button asChild variant="outline" size="sm" className="min-h-9">
          <Link href="/">
            {hydrated && orderType ? "Change mode" : "Choose mode"}
          </Link>
        </Button>
      </div>

      {!shopOpen && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
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
          className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p>{fetchError}</p>
        </div>
      )}

      {/* Search + Veg / Non-Veg Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes by name..."
            aria-label="Search dishes by name"
            className="h-11 rounded-xl pr-9 pl-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Dietary filter"
          className="inline-flex w-fit items-center gap-1 rounded-xl border border-border/80 bg-card p-1"
        >
          <Button
            type="button"
            variant={dietaryFilter === "all" ? "default" : "ghost"}
            size="sm"
            aria-pressed={dietaryFilter === "all"}
            onClick={() => setDietaryFilter("all")}
            className="min-h-9 rounded-lg px-3 text-xs font-medium"
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
            className="min-h-9 gap-1.5 rounded-lg px-3 text-xs font-medium"
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
            className="min-h-9 gap-1.5 rounded-lg px-3 text-xs font-medium"
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
            className="flex gap-2 overflow-x-auto"
          >
            {visibleSections.map(({ category }) => {
              const isActive = effectiveActiveCategoryId === category.id;
              return (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  onClick={() => setActiveCategoryId(category.id)}
                  aria-current={isActive ? "true" : undefined}
                  className="category-scrollspy-link inline-flex min-h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
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
          <p className="font-medium text-foreground">No dishes match your filter</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {menuItems.length === 0
              ? "No menu items were returned from the database yet."
              : "Try clearing the search input or resetting the dietary toggle."}
          </p>
        </div>
      ) : (
        <div className="space-y-8 pb-20">
          {visibleSections.map(({ category, items: sectionItems }) => (
            <section
              key={category.id}
              id={`category-${category.id}`}
              tabIndex={-1}
              className="scroll-mt-32 space-y-4 focus:outline-none"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                  {category.name}
                </h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {sectionItems.length}{" "}
                  {sectionItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            className="flex min-h-13 items-center justify-between gap-4 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg ring-1 ring-primary/20 transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
                <ShoppingBag className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">
                View Cart ({itemCount} {itemCount === 1 ? "item" : "items"},{" "}
                {formatPrice(subtotal)})
              </span>
            </div>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
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
