import * as React from "react";

import { InstallPrompt } from "@/components/InstallPrompt";
import { BottomNav } from "@/components/customer/bottom-nav";
import { CustomerFooter } from "@/components/customer/customer-footer";
import { CustomerHeader } from "@/components/customer/customer-header";

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <CustomerHeader />
      <InstallPrompt />
      <main className="flex-1">{children}</main>
      <CustomerFooter />
      <BottomNav />
    </div>
  );
}
