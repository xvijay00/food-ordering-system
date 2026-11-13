"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, Phone } from "lucide-react";

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
          className="inline-flex min-h-11 items-center gap-2.5 rounded-lg pr-2 font-heading text-lg font-black tracking-tight text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-xl"
        >
          <BrandLogo
            size={40}
            priority
            decorative
            className="size-10 rounded-lg shadow-xs"
          />
          <span className="truncate">{RESTAURANT_CONFIG.name}</span>
        </Link>

        <nav
          aria-label="Desktop navigation"
          className="hidden items-center gap-1.5 md:flex"
        >
          {CUSTOMER_NAV_ITEMS.map(({ href, label, icon: Icon, isCart }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-1.5 text-base font-bold text-foreground/75 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-primary/10 aria-[current=page]:font-black aria-[current=page]:text-primary"
            >
              <Icon className="size-4.5" aria-hidden="true" />
              <span>{label}</span>
              {isCart && itemCount > 0 && (
                <Badge className="h-5 min-w-5 justify-center px-1.5 text-xs font-black">
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${RESTAURANT_CONFIG.phone}`}
            aria-label={`Call ${RESTAURANT_CONFIG.name} at ${RESTAURANT_CONFIG.phone}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Phone className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Call:</span>
            <span>{RESTAURANT_CONFIG.phone}</span>
          </a>

          <Badge
            variant="secondary"
            className="hidden gap-1.5 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200 sm:inline-flex"
          >
            <Bike className="size-3.5" aria-hidden="true" />
            Delivery
          </Badge>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
