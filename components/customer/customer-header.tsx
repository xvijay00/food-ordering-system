"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { CUSTOMER_NAV_ITEMS } from "@/components/customer/nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { useHydrated } from "@/lib/use-hydrated";
import { calculateCartItemCount, useCartStore } from "@/store/cart";

export function CustomerHeader() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const hydrated = useHydrated();

  const itemCount = hydrated ? calculateCartItemCount(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-lg pr-2 font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <BrandLogo
            size={36}
            priority
            decorative
            className="size-9 rounded-lg"
          />
          <span className="truncate">{RESTAURANT_CONFIG.name}</span>
        </Link>

        <nav
          aria-label="Desktop navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {CUSTOMER_NAV_ITEMS.map(({ href, label, icon: Icon, isCart }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              {isCart && itemCount > 0 && (
                <Badge className="h-5 min-w-5 justify-center px-1.5 text-[11px]">
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="hidden gap-1.5 px-2.5 py-1 text-xs sm:inline-flex"
          >
            <Bike className="size-3" aria-hidden="true" />
            Delivery
          </Badge>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
