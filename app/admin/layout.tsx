import type { Metadata } from "next";
import {DashboardLayout} from "@/components/layouts/dashboard-layout";

export const metadata: Metadata = {
  title: "Admin Panel | HR Management System",
  description: "Administrative functions including activity logs, system settings, and administrative operations",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}

