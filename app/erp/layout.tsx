import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
