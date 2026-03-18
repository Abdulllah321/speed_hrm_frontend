export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { MasterTitleUpdater } from "./title-updater";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function MasterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout>
            <MasterTitleUpdater />
            {children}
        </DashboardLayout>
    );
}
