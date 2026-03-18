"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function FinanceLayout({
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
