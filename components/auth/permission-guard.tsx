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

    // Show nothing while auth is loading (AuthProvider shows LoadingScreen globally)
    if (loading) {
        return null;
    }

    // User not yet available (e.g. between cookie-early-render and real /auth/me response,
    // or after session expiry). Don't flash AccessDenied — wait silently.
    // AuthProvider / middleware will redirect to login if truly unauthenticated.
    if (!user) {
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
