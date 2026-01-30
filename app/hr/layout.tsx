"use client";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { usePathname } from "next/navigation";
import { getRoutePermissions } from "@/lib/route-permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect } from "react";
import { printAccessibleRoutes } from "@/lib/check-user-accessible-routes";

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const requiredPermissions = getRoutePermissions(pathname);
  const { user, loading, isAdmin } = useAuth();

  // Debug: Print accessible routes when user data is loaded
  useEffect(() => {
    if (!loading && user && process.env.NODE_ENV === 'development') {
      const userPermissions = user.role?.permissions?.map((p: any) =>
        p.permission?.name || p.name || p
      ).filter(Boolean) || (user as any)?.permissions || [];

      if (userPermissions.length > 0) {
        console.log("=== USER PERMISSIONS ===", userPermissions);
        printAccessibleRoutes(userPermissions);
      }
    }
  }, [user, loading]);

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
