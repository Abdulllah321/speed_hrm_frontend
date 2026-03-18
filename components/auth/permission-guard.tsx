"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ReactNode } from "react";

import { AccessDenied } from "./access-denied";

interface PermissionGuardProps {
    children: ReactNode;
    permissions: string | string[];
    requireAll?: boolean;
    fallback?: ReactNode;
}

export function PermissionGuard({
    children,
    permissions,
    requireAll = false,
    fallback,
}: PermissionGuardProps) {
    const { hasPermission, hasAllPermissions, hasAnyPermission, loading, isAdmin, user } = useAuth();

    // If fallback is not provided, default to AccessDenied
    const fallbackUI = fallback !== undefined ? fallback : <AccessDenied />;

    if (loading) {
        return null; // Or a loading spinner if preferred
    }

    // If user is null (session expired), redirect to login
    if (!user) {
        if (typeof window !== 'undefined') {
            window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        }
        return null;
    }

    if (isAdmin()) {
        return <>{children}</>;
    }

    const perms = Array.isArray(permissions) ? permissions : [permissions];

    if (perms.length === 0) {
        return <>{children}</>;
    }

    const isAuthorized = requireAll
        ? hasAllPermissions(perms)
        : hasAnyPermission(perms);

    if (!isAuthorized) {
        return <>{fallbackUI}</>;
    }

    return <>{children}</>;
}
