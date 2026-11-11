import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaff } from "@/lib/get-staff";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const staff = await getStaff();
  if (staff) {
    redirect("/admin");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-4">
          <Skeleton className="h-96 w-full max-w-md rounded-2xl" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
