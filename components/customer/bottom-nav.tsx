"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CUSTOMER_NAV_ITEMS } from "@/components/customer/nav-items";
import { Badge } from "@/components/ui/badge";
import { useHydrated } from "@/lib/use-hydrated";
import { calculateCartItemCount, useCartStore } from "@/store/cart";

export function BottomNav() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const hydrated = useHydrated();

  const itemCount = hydrated ? calculateCartItemCount(items) : 0;

  return (
    <nav
      aria-label="Mobile customer navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-1 px-3">
        {CUSTOMER_NAV_ITEMS.map(({ href, label, icon: Icon, isCart }) => {
          const isActive = pathname === href;
          const badgeText = itemCount > 99 ? "99+" : itemCount;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  isCart && itemCount > 0
                    ? `${label} (${itemCount} items)`
                    : label
                }
                className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-xs font-bold text-foreground/75 transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-primary/10 aria-[current=page]:font-black aria-[current=page]:text-primary"
              >
                <span className="relative inline-flex">
                  <Icon className="size-5" aria-hidden="true" />
                  {isCart && itemCount > 0 && (
                    <Badge className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center px-1 text-[11px] font-black leading-none">
                      {badgeText}
                    </Badge>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
