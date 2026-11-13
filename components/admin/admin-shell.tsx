"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookUser,
  ClipboardList,
  ExternalLink,
  LogOut,
  Settings,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { createClient } from "@/lib/supabase-browser";
import type { StaffProfile, StaffRole } from "@/types/database";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: StaffRole[];
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ClipboardList,
    roles: ["admin", "kitchen", "delivery"],
  },
  {
    href: "/admin/clients",
    label: "Clients",
    icon: BookUser,
    roles: ["admin", "kitchen"],
  },
  {
    href: "/admin/menu",
    label: "Menu",
    icon: UtensilsCrossed,
    roles: ["admin"],
  },
  {
    href: "/admin/birthday",
    label: "Birthday",
    icon: Sparkles,
    roles: ["admin"],
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: Users,
    roles: ["admin"],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AdminShell({
  staff,
  children,
}: {
  staff: StaffProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const visibleNavItems = ADMIN_NAV_ITEMS.filter((item) =>
    item.roles.includes(staff.role)
  );

  const isRouteActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Logged out");
      router.push("/admin/login");
      router.refresh();
    } catch {
      window.location.href = "/api/admin/logout";
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border/80 bg-card/60 p-4 md:flex print:hidden">
        <div className="space-y-6">
          <div className="px-1">
            <Link
              href="/admin"
              className="inline-flex min-h-10 items-center gap-2.5 font-heading text-base font-bold tracking-tight"
            >
              <BrandLogo size={32} decorative className="size-8 rounded-lg" />
              <span className="truncate">{RESTAURANT_CONFIG.name}</span>
            </Link>
          </div>

          <nav aria-label="Staff navigation">
            <ul className="space-y-1">
              {visibleNavItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isRouteActive(href) ? "page" : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{staff.name}</p>
              <Badge
                variant="secondary"
                className="mt-0.5 text-[11px] capitalize"
              >
                {staff.role}
              </Badge>
            </div>
            <ThemeToggle />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
            >
              <Link href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span>Store</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loggingOut}
              onClick={handleLogout}
              className="min-h-9 gap-1.5"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/80 bg-background/90 px-4 backdrop-blur-md md:hidden print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo size={28} decorative className="size-7 rounded-md" />
          <span className="truncate text-sm font-semibold">{staff.name}</span>
          <Badge variant="secondary" className="shrink-0 text-[11px] capitalize">
            {staff.role}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loggingOut}
            onClick={handleLogout}
            className="min-h-9 gap-1.5 px-2.5"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            <span>Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:pb-6 print:overflow-visible print:p-0 print:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile staff navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden print:hidden"
      >
        <ul className="mx-auto flex max-w-2xl items-center justify-around gap-1 overflow-x-auto px-2">
          {visibleNavItems.map(({ href, label, icon: Icon }) => (
            <li key={href} className="min-w-14 flex-1">
              <Link
                href={href}
                aria-current={isRouteActive(href) ? "page" : undefined}
                className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
