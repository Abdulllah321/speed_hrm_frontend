"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  employeeId?: string | null;
  status?: string;
  roleId?: string | null;
  isFirstPassword?: boolean;
  employee?: {
    id: string;
    employeeId: string;
    designation: { name: string };
    department: { name: string };
  } | null;
  role?: {
    id: string;
    name: string;
    permissions?: Array<{
      permission: {
        name: string;
      };
    }>;
  } | null;
  preferences?: Array<{
    id: string;
    key: string;
    value: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  preferences: Record<string, any>;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  updatePreference: (key: string, value: any) => Promise<void>;
  getPreference: (key: string) => any;
  logout: () => Promise<void>;
  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
  // Token management
  refreshToken: () => Promise<boolean>;
  checkAndRefreshSession: () => Promise<boolean>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");

  // Convert preferences array to object for easier access
  const preferencesToObject = useCallback((prefs: Array<{ key: string; value: string }> | undefined) => {
    if (!prefs) return {};
    const obj: Record<string, any> = {};
    for (const pref of prefs) {
      try {
        obj[pref.key] = JSON.parse(pref.value);
      } catch {
        obj[pref.key] = pref.value;
      }
    }
    return obj;
  }, []);

  // Token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const { refreshTokenClient } = await import("@/lib/client-auth");
      const success = await refreshTokenClient();

      if (!success) {
        // Refresh failed, user needs to login again
        setUser(null);
        setPreferences({});
        // router.push("/auth/login");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
      setUser(null);
      setPreferences({});
      router.push("/auth/login");
      return false;
    }
  }, [router]);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let response = await fetch(url, {
        ...options,
        credentials: "include", // ✅ sends ALL cookies automatically
        cache: "no-store",
      });

      // If unauthorized, try refresh once
      if (response.status === 401) {
        const refreshSuccess = await refreshToken();

        if (refreshSuccess) {
          response = await fetch(url, {
            ...options,
            credentials: "include",
            cache: "no-store",
          });
        }
      }

      return response;
    },
    [refreshToken]
  );


  // Fetch user data including preferences from backend /api/auth/me
  const fetchUser = useCallback(async () => {
    try {
      setLoadingMessage("Connecting to server...");
      setLoadingProgress(10);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetchWithAuth(`${API_BASE}/auth/me`);

      setLoadingProgress(50);

      if (!res.ok) {
        if (res.status === 401) {
          setUser(null);
          setPreferences({});
          setLoadingProgress(100);
          return;
        }
        throw new Error("Failed to fetch user");
      }

      setLoadingMessage("Loading user data...");
      setLoadingProgress(70);

      const data = await res.json();

      setLoadingProgress(85);

      if (data.status && data.data) {
        setUser(data.data);
        setPreferences(preferencesToObject(data.data.preferences));
      }

      setLoadingMessage("Almost done...");
      setLoadingProgress(100);

      // Small delay to show 100% before hiding
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
      setPreferences({});
      setLoadingProgress(100);
    } finally {
      setLoading(false);
    }
  }, [preferencesToObject, fetchWithAuth]);

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial load - only fetch after component is mounted (client-side)
  useEffect(() => {
    if (mounted) {
      fetchUser();
    }
  }, [mounted, fetchUser]);

  // Set up automatic token refresh interval
  useEffect(() => {
    if (!user) return;

    // Refresh token every 90 minutes (before 2h expiry)
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 90 * 60 * 1000); // 90 minutes

    // Also refresh on window focus (user returns to tab)
    const handleFocus = () => {
      refreshToken();
    };

    // Add event listeners
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refreshToken]);

  // Check for first password status
  useEffect(() => {
    if (user?.isFirstPassword) {
      // You can implement forced redirect here if needed
      // if (pathname !== '/hr/settings/password') router.push('/hr/settings/password');

      // For now, let's show a toast
      const { toast } = require("sonner");
      toast.warning("Please change your password", {
        description: "You are using a temporary password. Please update it immediately.",
        duration: Infinity,
        action: {
          label: "Change Now",
          onClick: () => router.push("/hr/settings/password"),
        },
      });
    }
  }, [user, router]);

  // Proactive session check - refresh token if needed
  const checkAndRefreshSession = useCallback(async () => {
    if (!user) return false;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/auth/check-session`, {
        credentials: "include",
      });

      if (res.status === 401) {
        // Token expired, try to refresh
        return await refreshToken();
      }

      return res.ok;
    } catch (error) {
      console.error("Session check failed:", error);
      return false;
    }
  }, [user, refreshToken]);

  // Update preference - only update local state since preferences are handled by /api/auth/me
  const updatePreference = useCallback(async (key: string, value: any) => {
    // Update local state immediately for instant UI feedback
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Get preference by key
  const getPreference = useCallback((key: string) => {
    return preferences[key] ?? null;
  }, [preferences]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(0);
    await fetchUser();
  }, [fetchUser]);

  // Logout
  const logout = useCallback(async () => {
    const { logoutClient } = await import("@/lib/client-auth");
    await logoutClient();
    setUser(null);
    setPreferences({});
    router.push("/auth/login");
  }, [router]);

  // Permission helpers
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user?.role?.permissions) return false;
    return user.role.permissions.some(p => p.permission.name === permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user?.role?.permissions) return false;
    return permissions.some(permission =>
      user.role?.permissions?.some(p => p.permission.name === permission)
    );
  }, [user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user?.role?.permissions) return false;
    return permissions.every(permission =>
      user.role?.permissions?.some(p => p.permission.name === permission)
    );
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user?.role?.name === "admin" || user?.role?.name === "super_admin";
  }, [user]);

  // Don't render children until mounted and initial load is complete
  // This prevents hydration mismatch between server and client
  if (!mounted || loading) {
    return (
      <AuthContext.Provider
        value={{
          user,
          preferences,
          loading: true,
          isAuthenticated: false,
          refreshUser,
          updatePreference,
          getPreference,
          logout,
          hasPermission: () => false,
          hasAnyPermission: () => false,
          hasAllPermissions: () => false,
          isAdmin: () => false,
          refreshToken: async () => false,
          checkAndRefreshSession: async () => false,
          fetchWithAuth: async (url: string, options?: RequestInit) => fetch(url, options),
        }}
      >
        <LoadingScreen progress={loadingProgress} message={loadingMessage} />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        loading,
        isAuthenticated: !!user,
        refreshUser,
        updatePreference,
        getPreference,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        refreshToken,
        checkAndRefreshSession,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

