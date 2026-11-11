"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Loader2,
  QrCode,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { createClient } from "@/lib/supabase-browser";
import { useCartStore } from "@/store/cart";
import type { RestaurantTable } from "@/types/database";

export function LandingHero() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setOrderType = useCartStore((state) => state.setOrderType);
  const setDineInTable = useCartStore((state) => state.setDineInTable);
  const selectedTableNo = useCartStore((state) => state.tableNo);
  const currentOrderType = useCartStore((state) => state.orderType);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [tables, setTables] = React.useState<RestaurantTable[]>([]);
  const [loadingTables, setLoadingTables] = React.useState(false);
  const [tablesError, setTablesError] = React.useState<string | null>(null);

  // Detect QR entry query params: ?type=dine&table=5 (or ?type=delivery)
  const typeParam = searchParams.get("type");
  const tableParam = searchParams.get("table");
  const parsedTableNo = tableParam ? Number.parseInt(tableParam, 10) : NaN;

  const isQrDineIn =
    (typeParam === "dine" || typeParam === "dine_in") &&
    Number.isInteger(parsedTableNo) &&
    parsedTableNo > 0 &&
    String(parsedTableNo) === tableParam?.trim();

  const isQrDelivery = typeParam === "delivery";

  React.useEffect(() => {
    if (isQrDineIn) {
      setDineInTable(parsedTableNo);
      router.replace("/menu");
      return;
    }

    if (isQrDelivery) {
      setOrderType("delivery");
      router.replace("/menu");
    }
  }, [isQrDineIn, isQrDelivery, parsedTableNo, router, setDineInTable, setOrderType]);

  const fetchActiveTables = React.useCallback(async () => {
    setLoadingTables(true);
    setTablesError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, table_number, is_active")
        .eq("is_active", true)
        .order("table_number", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setTables(data ?? []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load active tables right now.";
      setTablesError(message);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const handleOpenDineIn = () => {
    setSheetOpen(true);
    void fetchActiveTables();
  };

  const handleSelectTable = (tableNumber: number) => {
    setDineInTable(tableNumber);
    setSheetOpen(false);
    router.push("/menu");
  };

  const handleSelectDelivery = () => {
    setOrderType("delivery");
    router.push("/menu");
  };

  if (isQrDineIn || isQrDelivery) {
    return (
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400">
            <QrCode className="size-7" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {isQrDineIn
                ? `Opening menu for Table ${parsedTableNo}`
                : "Opening delivery menu"}
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
    <>
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        {/* Ambient decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="hero-ambient-glow absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl sm:h-[28rem] sm:w-[28rem] dark:bg-amber-400/10" />
          <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10" />
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center sm:gap-10">
          <div className="space-y-4">
            <Badge
              variant="secondary"
              className="hero-fade-up inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium tracking-wide"
            >
              <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Freshly Prepared to Order</span>
            </Badge>

            <h1 className="hero-fade-up hero-delay-1 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {RESTAURANT_CONFIG.name}
            </h1>

            <p className="hero-fade-up hero-delay-2 mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {RESTAURANT_CONFIG.tagline}
            </p>
          </div>

          <div className="hero-fade-up hero-delay-3 w-full space-y-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              How would you like to order?
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {/* Dine-in (Table) Card */}
              <button
                type="button"
                onClick={handleOpenDineIn}
                className="hero-card-enter hero-delay-2 group relative flex min-h-44 flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-6 text-left shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.985]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-13 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/25 transition-transform duration-200 group-hover:scale-105 dark:bg-amber-400/15 dark:text-amber-400"
                  >
                    <UtensilsCrossed className="size-6" />
                  </span>
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-amber-500 group-hover:text-white">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
                    Dine-in (Table)
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Pick your table number and get dishes served straight to your seat.
                  </p>
                </div>
              </button>

              {/* Delivery Card */}
              <button
                type="button"
                onClick={handleSelectDelivery}
                className="hero-card-enter hero-delay-3 group relative flex min-h-44 flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-6 text-left shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.985]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-13 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 transition-transform duration-200 group-hover:scale-105 dark:bg-emerald-400/15 dark:text-emerald-400"
                  >
                    <Bike className="size-6" />
                  </span>
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-emerald-600 group-hover:text-white">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
                    Delivery
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Order hot favorites packed fresh and delivered right to your door.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dine-in Table Picker Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[82dvh] max-w-2xl rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
        >
          <SheetHeader className="border-b border-border/60 pb-3 text-left">
            <SheetTitle>Select your table</SheetTitle>
            <SheetDescription>
              Tap your table number below to start ordering for dine-in.
            </SheetDescription>
          </SheetHeader>

          <div className="overflow-y-auto px-4 pt-2 pb-4">
            {loadingTables ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : tablesError ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
                <AlertCircle
                  className="size-6 text-destructive"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Could not load active tables
                  </p>
                  <p className="text-xs text-muted-foreground">{tablesError}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchActiveTables()}
                >
                  Try again
                </Button>
              </div>
            ) : tables.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No active tables are currently available. Please ask staff for assistance.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {tables.map((table) => {
                  const isSelected =
                    currentOrderType === "dine_in" &&
                    selectedTableNo === table.table_number;

                  return (
                    <Button
                      key={table.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleSelectTable(table.table_number)}
                      className="min-h-14 flex-col gap-0.5 rounded-xl text-sm font-semibold transition-transform active:scale-95"
                    >
                      <span className="text-[11px] font-normal opacity-75">
                        Table
                      </span>
                      <span className="text-base leading-none">
                        {table.table_number}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

