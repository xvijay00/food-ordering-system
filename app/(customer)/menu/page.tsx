import { MenuBrowser } from "@/components/customer/menu-browser";
import { fetchMenuCatalog } from "@/lib/bakery-queries";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { Category, MenuItemWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  let categories: Category[] = [];
  let menuItems: MenuItemWithRelations[] = [];
  let shopOpen = true;
  let fetchError: string | null = null;

  try {
    const supabase = await createClient();
    const catalog = await fetchMenuCatalog(supabase, {
      activeCategoriesOnly: true,
    });

    if (catalog.error) {
      throw new Error(catalog.error);
    }

    categories = catalog.categories;
    menuItems = catalog.items;

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
      // Keep default shopOpen=true if service role env var is not configured
    }
  } catch (error) {
    fetchError =
      error instanceof Error
        ? error.message
        : "Unable to load menu items from Supabase.";
  }

  return (
    <MenuBrowser
      categories={categories}
      menuItems={menuItems}
      shopOpen={shopOpen}
      fetchError={fetchError}
    />
  );
}
