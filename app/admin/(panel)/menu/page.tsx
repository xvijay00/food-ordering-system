import { redirect } from "next/navigation";

import { MenuManager } from "@/components/admin/menu-manager";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Category, MenuItemWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }
  if (staff.role !== "admin") {
    redirect("/admin/orders");
  }

  let categories: Category[] = [];
  let items: MenuItemWithRelations[] = [];

  try {
    const admin = createAdminClient();
    const [categoriesRes, itemsRes] = await Promise.all([
      admin
        .from("categories")
        .select("id, name, sort_order, is_active")
        .order("sort_order", { ascending: true }),
      admin
        .from("menu_items")
        .select(
          "id, category_id, name, description, price, image_url, is_veg, is_available, is_bestseller, sort_order, created_at, item_variants(id, item_id, label, price), item_addons(id, item_id, name, price, is_active)"
        )
        .order("sort_order", { ascending: true }),
    ]);

    categories = categoriesRes.data ?? [];
    items = (itemsRes.data ?? []) as MenuItemWithRelations[];
  } catch {
    categories = [];
    items = [];
  }

  return (
    <MenuManager initialCategories={categories} initialItems={items} />
  );
}

