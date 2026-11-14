import Link from "next/link";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { RESTAURANT_CONFIG } from "@/lib/config";

export function CustomerFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/60 px-4 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] text-xs text-muted-foreground sm:px-6 md:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Main Footer Grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-12">
          {/* Column 1: Brand Info (5 cols) */}
          <div className="space-y-3 md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-heading text-lg font-black tracking-tight text-foreground"
            >
              <BrandLogo size={36} decorative className="size-9 rounded-lg shadow-xs" />
              <span>{RESTAURANT_CONFIG.name}</span>
            </Link>
            <p className="max-w-sm text-xs font-medium leading-relaxed text-muted-foreground">
              {RESTAURANT_CONFIG.tagline}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`tel:${RESTAURANT_CONFIG.phone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white"
              >
                <Phone className="size-3.5" />
                <span>Call {RESTAURANT_CONFIG.phone}</span>
              </a>
              <a
                href={`https://wa.me/91${RESTAURANT_CONFIG.phone}?text=Hi%20Baker's%20Nation,%20I%20would%20like%20to%20order`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
              >
                <MessageCircle className="size-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Column 2: Address & Timings (4 cols) */}
          <div className="space-y-2.5 md:col-span-4">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Bakery Location & Hours
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <address className="not-italic leading-relaxed text-foreground/90 font-medium">
                  <strong>Baker&apos;s Nation</strong>
                  <br />
                  Nahan, District Sirmaur,
                  <br />
                  Himachal Pradesh - 173001
                </address>
              </div>
              <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                <Clock className="size-3.5 shrink-0 text-amber-500" />
                <span className="font-medium">10:00 AM – 10:00 PM (Everyday)</span>
              </div>
            </div>
          </div>

          {/* Column 3: Quick Navigation (3 cols) */}
          <div className="space-y-2.5 md:col-span-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Quick Links
            </h4>
            <ul className="space-y-1.5 text-xs font-medium">
              <li>
                <Link
                  href="/menu"
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  Bakery Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/birthday"
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  Birthday & Custom Cake Studio
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  Track Recent Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/login"
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  Staff Portal Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {RESTAURANT_CONFIG.name}, Nahan. Freshly Baked with ❤️
          </span>
          <div className="flex items-center gap-3">
            <span>Free Delivery in Nahan Town</span>
            <span>•</span>
            <Link
              href="/admin/login"
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

