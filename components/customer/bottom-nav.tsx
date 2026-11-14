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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/92 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
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
                className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-xs transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground font-black shadow-sm scale-102"
                    : "text-foreground/75 font-bold hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <span className="relative inline-flex">
                  <Icon className="size-5" aria-hidden="true" />
                  {isCart && itemCount > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black leading-none ${
                        isActive
                          ? "bg-white text-primary"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {badgeText}
                    </span>
                  )}
                </span>
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
