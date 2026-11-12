import { Suspense } from "react";

import { FeaturedProducts } from "@/components/customer/featured-products";
import { LandingHero } from "@/components/customer/landing-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMenuCatalog } from "@/lib/bakery-queries";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { MenuItemWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

function LandingSkeleton() {
  return (
    <section className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-72 sm:w-96" />
          <Skeleton className="h-5 w-80 sm:w-[30rem]" />
        </div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

export default async function CustomerLandingPage() {
  let featuredItems: MenuItemWithRelations[] = [];
  let shopOpen = true;

  try {
    const supabase = await createClient();
    const catalog = await fetchMenuCatalog(supabase, {
      activeCategoriesOnly: true,
    });
    const activeCategoryIds = new Set(catalog.categories.map((c) => c.id));
    featuredItems = catalog.items.filter(
      (item) =>
        item.is_featured &&
        item.is_available &&
        activeCategoryIds.has(item.category_id)
    );

    try {
      const admin = createAdminClient();
      const { data: settingRow } = await admin
        .from("settings")
        .select("value")
        .eq("key", "shop_open")
        .maybeSingle();

      if (settingRow) {
        if (typeof settingRow.value === "boolean") {
          shopOpen = settingRow.value;
        } else if (settingRow.value === "false") {
          shopOpen = false;
        }
      }
    } catch {
      // Default to shopOpen=true
    }
  } catch {
    featuredItems = [];
  }

  return (
    <>
      <Suspense fallback={<LandingSkeleton />}>
        <LandingHero />
      </Suspense>
      <FeaturedProducts items={featuredItems} shopOpen={shopOpen} />
    </>
  );
}
