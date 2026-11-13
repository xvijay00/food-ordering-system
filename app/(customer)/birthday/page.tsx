import type { Metadata } from "next";

import { BirthdayCelebrationView } from "@/components/customer/birthday-celebration-view";
import { fetchBirthdayCatalog } from "@/lib/bakery-queries";
import { createClient } from "@/lib/supabase-server";
import type { Category, MenuItemWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Birthday Celebration Packages | Bakers Nation",
  description:
    "Design your complete birthday party package with handcrafted cakes, balloons, candles, banners, and curated party essentials at Bakers Nation.",
};

export default async function BirthdayPage() {
  let categories: Category[] = [];
  let menuItems: MenuItemWithRelations[] = [];
  let fetchError: string | null = null;

  try {
    const supabase = await createClient();
    const catalog = await fetchBirthdayCatalog(supabase, {
      activeCategoriesOnly: true,
    });

    if (catalog.error) {
      throw new Error(catalog.error);
    }

    categories = catalog.categories;
    menuItems = catalog.items;
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load birthday celebration catalog.";
  }

  return (
    <BirthdayCelebrationView
      categories={categories}
      menuItems={menuItems}
      fetchError={fetchError}
    />
  );
}
