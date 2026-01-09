import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
