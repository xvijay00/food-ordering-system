import Link from "next/link";

import { RESTAURANT_CONFIG } from "@/lib/config";

export function CustomerFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/60 px-4 py-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] text-xs text-muted-foreground sm:px-6 md:pb-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>{RESTAURANT_CONFIG.name}</span>
        <Link
          href="/admin/login"
          className="inline-flex min-h-8 items-center underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Staff login
        </Link>
      </div>
    </footer>
  );
}

