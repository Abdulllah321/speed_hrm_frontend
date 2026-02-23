"use client";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { usePathname } from "next/navigation";
import { getRoutePermissions } from "@/lib/route-permissions";
import { useAuth } from "@/components/providers/auth-provider";

export default function PosRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const requiredPermissions = getRoutePermissions(pathname);
    const { isAdmin } = useAuth();

    // Super admin bypasses all permission checks
    if (isAdmin()) {
        return (
            <DashboardLayout>
                {children}
            </DashboardLayout>
        );
    }

    // If route requires permissions, wrap with PermissionGuard
    if (requiredPermissions.length > 0) {
        return (
            <DashboardLayout>
                <PermissionGuard permissions={requiredPermissions}>
                    {children}
                </PermissionGuard>
            </DashboardLayout>
        );
    }

    // Public routes (no permissions required)
    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    );
}
