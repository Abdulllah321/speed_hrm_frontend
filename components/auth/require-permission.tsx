"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldX } from "lucide-react";

interface RequirePermissionProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export function RequirePermission({
  permission,
  children,
  fallback,
  requireAll = false,
}: RequirePermissionProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Helper function to check permissions
  const hasPermission = (permissionName: string): boolean => {
    if (!user?.role?.permissions) return false;
    return user.role.permissions.some(p => p.permission.name === permissionName);
  };

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(p))
    : permissions.some(p => hasPermission(p));

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <Alert variant="destructive" className="max-w-md mx-auto mt-8">
        <ShieldX className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to access this resource.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

