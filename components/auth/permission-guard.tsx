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
    // TODO: TEMPORARY — permission checks bypassed for debugging.
    // Re-enable after confirming API call behavior.
    return <>{children}</>;
}
