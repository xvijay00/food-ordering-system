import { redirect } from "next/navigation";

import { MenuManager } from "@/components/admin/menu-manager";
import { fetchMenuCatalog } from "@/lib/bakery-queries";
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
  let bakerySchemaReady = true;

  try {
    const admin = createAdminClient();
    const catalog = await fetchMenuCatalog(admin);
    categories = catalog.categories;
    items = catalog.items;
    bakerySchemaReady = catalog.bakerySchemaReady;
  } catch {
    categories = [];
    items = [];
  }

  return (
    <MenuManager
      initialCategories={categories}
      initialItems={items}
      bakerySchemaReady={bakerySchemaReady}
    />
  );
}
