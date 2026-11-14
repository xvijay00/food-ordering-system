"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, Lock, MapPin, Phone } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand & Location */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group inline-flex min-h-11 items-center gap-2.5 rounded-2xl pr-1 font-heading text-lg font-black tracking-tight text-foreground transition-all hover:opacity-90 sm:text-xl"
          >
            <div className="relative overflow-hidden rounded-xl p-0.5 ring-2 ring-primary/30 transition-transform group-hover:scale-105">
              <BrandLogo
                size={38}
                priority
                decorative
                className="size-9 rounded-lg object-cover shadow-xs"
              />
            </div>
            <span className="truncate">{RESTAURANT_CONFIG.name}</span>
          </Link>

          {/* Location Badge (as seen in modern food delivery apps) */}
          <div className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-bold text-foreground/85 md:inline-flex">
            <MapPin className="size-3.5 text-primary" aria-hidden="true" />
            <span>Nahan, HP</span>
          </div>
        </div>

        {/* Desktop Navigation Pills */}
        <nav
          aria-label="Desktop navigation"
          className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/80 p-1 shadow-2xs md:flex"
        >
          {CUSTOMER_NAV_ITEMS.map(({ href, label, icon: Icon, isCart }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{label}</span>
                {isCart && itemCount > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-black ${
                      isActive
                        ? "bg-white text-primary"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:${RESTAURANT_CONFIG.phone}`}
            aria-label={`Call ${RESTAURANT_CONFIG.name} at ${RESTAURANT_CONFIG.phone}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-xs active:scale-95"
          >
            <Phone className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Call:</span>
            <span>{RESTAURANT_CONFIG.phone}</span>
          </a>

          <Badge
            variant="secondary"
            className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 sm:inline-flex"
          >
            <Bike className="size-3.5" aria-hidden="true" />
            <span>Fast Delivery</span>
          </Badge>

          <ThemeToggle />

          <Link
            href="/admin/login"
            aria-label="Admin login"
            title="Admin"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Lock className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
