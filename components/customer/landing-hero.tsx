"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bike, Loader2, Sparkles } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { useCartStore } from "@/store/cart";

export function LandingHero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setOrderType = useCartStore((state) => state.setOrderType);

  const isQrDelivery = searchParams.get("type") === "delivery";

  React.useEffect(() => {
    if (isQrDelivery) {
      setOrderType("delivery");
      router.replace("/menu");
    }
  }, [isQrDelivery, router, setOrderType]);

  const handleSelectDelivery = () => {
    setOrderType("delivery");
    router.push("/menu");
  };

  if (isQrDelivery) {
    return (
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
            <Bike className="size-7" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Opening delivery menu
            </h1>
            <p className="text-sm text-muted-foreground">
              Preparing your ordering session...
            </p>
          </div>
          <Loader2
            className="size-5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      {/* Ambient decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="hero-ambient-glow absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl sm:h-[28rem] sm:w-[28rem] dark:bg-amber-400/10" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10" />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center sm:gap-10">
        <div className="space-y-4">
          <BrandLogo
            size={112}
            priority
            decorative
            className="hero-fade-up mx-auto size-24 rounded-2xl shadow-lg sm:size-28"
          />
          <Badge
            variant="secondary"
            className="hero-fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold tracking-wide"
          >
            <Sparkles
              className="size-4 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span>Freshly Baked Daily</span>
          </Badge>

          <h1 className="hero-fade-up hero-delay-1 font-heading text-4xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {RESTAURANT_CONFIG.name}
          </h1>

          <p className="hero-fade-up hero-delay-2 mx-auto max-w-xl text-lg font-semibold leading-relaxed text-foreground/80 sm:text-xl">
            {RESTAURANT_CONFIG.tagline}
          </p>
        </div>

        <div className="hero-fade-up hero-delay-3 w-full max-w-md space-y-3">
          <button
            type="button"
            onClick={handleSelectDelivery}
            className="hero-card-enter hero-delay-2 group relative flex min-h-48 w-full flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-6 text-left shadow-md ring-1 ring-foreground/5 backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.985]"
          >
            <div className="flex items-start justify-between gap-4">
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 transition-transform duration-200 group-hover:scale-105 dark:bg-emerald-400/15 dark:text-emerald-400"
              >
                <Bike className="size-7" />
              </span>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-emerald-600 group-hover:text-white">
                <ArrowRight className="size-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-5 space-y-1.5">
              <h2 className="font-heading text-2xl font-black tracking-tight text-card-foreground sm:text-3xl">
                Order for Delivery
              </h2>
              <p className="text-base font-semibold leading-relaxed text-foreground/80">
                Browse the menu and get fresh favorites delivered right to your
                doorstep.
              </p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
