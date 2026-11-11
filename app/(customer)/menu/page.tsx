import { MenuBrowser } from "@/components/customer/menu-browser";
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

    const [categoriesRes, itemsRes] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select(
          "id, category_id, name, description, price, image_url, is_veg, is_available, is_bestseller, sort_order, created_at, item_variants(id, item_id, label, price), item_addons(id, item_id, name, price, is_active)"
        )
        .order("sort_order", { ascending: true }),
    ]);

    if (categoriesRes.error) {
      throw new Error(categoriesRes.error.message);
    }
    if (itemsRes.error) {
      throw new Error(itemsRes.error.message);
    }

    categories = categoriesRes.data ?? [];
    menuItems = ((itemsRes.data ?? []) as MenuItemWithRelations[]).map(
      (item) => ({
        ...item,
        item_variants: [...(item.item_variants ?? [])].sort(
          (a, b) => Number(a.price) - Number(b.price)
        ),
      })
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
