"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  permissions: string[];
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some((p) => user.permissions.includes(p));
  }, [user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every((p) => user.permissions.includes(p));
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user?.role === "admin" || user?.role === "super_admin";
  }, [user]);

  const logout = useCallback(async () => {
    // Call server action
    const { logout: serverLogout } = await import("@/lib/auth");
    await serverLogout();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    logout,
  };
}

