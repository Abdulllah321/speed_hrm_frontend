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

  // Fetch user data including preferences from /api/auth/me
  const fetchUser = useCallback(async () => {
    try {
      setLoadingMessage("Connecting to server...");
      setLoadingProgress(10);

      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

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
  }, [preferencesToObject]);

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
    router.push("/login");
  }, [router]);

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

