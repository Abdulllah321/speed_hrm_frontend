import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | HR Management System",
  description: "Administrative functions including activity logs, system settings, and administrative operations",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

