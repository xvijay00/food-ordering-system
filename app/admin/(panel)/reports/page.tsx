import { redirect } from "next/navigation";

import { ReportsDashboard } from "@/components/admin/reports-dashboard";
import { getStaff } from "@/lib/get-staff";
import { fetchSalesReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const staff = await getStaff();
  if (!staff) {
    redirect("/api/admin/logout?error=unauthorized");
  }
  if (staff.role !== "admin") {
    redirect("/admin/orders");
  }

  const { report, rpcError } = await fetchSalesReport("today");

  return (
    <ReportsDashboard initialReport={report} initialError={rpcError} />
  );
}

