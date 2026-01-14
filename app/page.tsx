"use client";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
