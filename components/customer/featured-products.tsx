"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { ItemCustomizeSheet } from "@/components/customer/item-customize-sheet";
import { MenuCard } from "@/components/customer/menu-card";
import { Button } from "@/components/ui/button";
import type { MenuItemWithRelations } from "@/types/database";

type FeaturedProductsProps = {
  items: MenuItemWithRelations[];
  shopOpen: boolean;
};

export function FeaturedProducts({ items, shopOpen }: FeaturedProductsProps) {
  const [customizeItem, setCustomizeItem] =
    React.useState<MenuItemWithRelations | null>(null);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-bakery-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
            <Star className="size-3.5 fill-current" aria-hidden="true" />
            <span>Baker&apos;s Picks</span>
          </div>
          <h2
            id="featured-bakery-heading"
            className="font-heading text-2xl font-bold tracking-tight"
          >
            Featured Cakes &amp; Bakes
          </h2>
        </div>

        <Button asChild variant="outline" className="gap-1.5 rounded-xl">
          <Link href="/menu">
            <span>View Full Menu</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            shopOpen={shopOpen}
            onCustomize={setCustomizeItem}
          />
        ))}
      </div>

      <ItemCustomizeSheet
        item={customizeItem}
        open={customizeItem !== null}
        onOpenChange={(open) => {
          if (!open) setCustomizeItem(null);
        }}
        disabled={!shopOpen}
      />
    </section>
  );
}

