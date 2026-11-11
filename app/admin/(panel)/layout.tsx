import * as React from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getStaff } from "@/lib/get-staff";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }

  return <AdminShell staff={staff}>{children}</AdminShell>;
}

