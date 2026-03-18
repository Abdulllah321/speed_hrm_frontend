"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { usePathname, useRouter } from "next/navigation";
import { getRoutePermissions } from "@/lib/route-permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { PosSwitchUser } from "@/components/pos/pos-switch-user";
import { LocationGuard } from "@/components/pos/location-guard";

export default function PosRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const requiredPermissions = getRoutePermissions(pathname);
    const { isAdmin, posNeedsUserAuth } = useAuth();

    // Global keyboard shortcut: Ctrl + N → New Sale
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "n") {
                e.preventDefault();
                router.push("/pos/new-sale");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);

    // If POS needs user authentication, show the switch-user overlay
    if (posNeedsUserAuth) {
        return <PosSwitchUser />;
    }

    // Super admin bypasses all permission checks
    if (isAdmin()) {
        return (
            <DashboardLayout>
                <LocationGuard>
                    {children}
                </LocationGuard>
            </DashboardLayout>
        );
    }

    // If route requires permissions, wrap with PermissionGuard
    if (requiredPermissions.length > 0) {
        return (
            <DashboardLayout>
                <PermissionGuard permissions={requiredPermissions}>
                    <LocationGuard>
                        {children}
                    </LocationGuard>
                </PermissionGuard>
            </DashboardLayout>
        );
    }

    // Public routes (no permissions required)
    return (
        <DashboardLayout>
            <LocationGuard>
                {children}
            </LocationGuard>
        </DashboardLayout>
    );
}
