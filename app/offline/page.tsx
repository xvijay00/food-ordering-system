"use client";

import Link from "next/link";
import { RefreshCw, UtensilsCrossed, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RESTAURANT_CONFIG } from "@/lib/config";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <WifiOff className="size-8" aria-hidden="true" />
      </div>

      <h1 className="font-heading text-2xl font-bold tracking-tight">
        You&apos;re offline
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        {RESTAURANT_CONFIG.name} needs an internet connection to load live menu
        prices, submit orders, and fetch status updates.
      </p>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 gap-2 rounded-xl px-5"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          <span>Try again</span>
        </Button>

        <Button
          asChild
          variant="outline"
          className="min-h-11 gap-2 rounded-xl px-5"
        >
          <Link href="/menu">
            <UtensilsCrossed className="size-4" aria-hidden="true" />
            <span>Back to menu</span>
          </Link>
        </Button>
      </div>
    </main>
  );
}

