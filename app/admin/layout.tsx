"use client";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout companyOptional={true}>
      {children}
    </DashboardLayout>
  );
}
