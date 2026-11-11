import type { LucideIcon } from "lucide-react";
import { ClipboardList, ShoppingBag, UtensilsCrossed } from "lucide-react";

export type CustomerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isCart?: boolean;
};

export const CUSTOMER_NAV_ITEMS: CustomerNavItem[] = [
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/cart", label: "Cart", icon: ShoppingBag, isCart: true },
  { href: "/orders", label: "Orders", icon: ClipboardList },
];

