import { redirect } from "next/navigation";

import { BirthdayManager } from "@/components/admin/birthday-manager";
import { fetchBirthdayCatalog } from "@/lib/bakery-queries";
import { getStaff } from "@/lib/get-staff";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Category, MenuItemWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminBirthdayPage() {
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
    const catalog = await fetchBirthdayCatalog(admin, {
      activeCategoriesOnly: false,
    });
    categories = catalog.categories;
    items = catalog.items;
  } catch {
    categories = [];
    items = [];
  }

  return (
    <BirthdayManager
      initialCategories={categories}
      initialItems={items}
    />
  );
}

