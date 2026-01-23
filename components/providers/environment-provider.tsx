"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { setEnvironmentCookie } from "@/app/actions/set-environment";

export type EnvironmentType = "HR" | "ERP" | "POS" | "ADMIN";

interface EnvironmentContextType {
  environment: EnvironmentType;
  setEnvironment: (env: EnvironmentType, silent?: boolean) => void;
  toggleEnvironment: () => void;
  isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironmentState] = useState<EnvironmentType>("HR");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved environment from cookies first, then local storage as fallback
    const savedCookie = Cookies.get("app-environment");
    const savedLocal = typeof window !== "undefined" ? localStorage.getItem("app-environment") : null;
    
    const saved = savedCookie || savedLocal;

    if (saved === "ERP") {
      setEnvironmentState("ERP");
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = "ERP";
      }
    } else if (saved === "POS") {
      setEnvironmentState("POS");
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = "POS";
      }
    } else if (saved === "ADMIN") {
      setEnvironmentState("ADMIN");
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = "ADMIN";
      }
    } else {
      // Check current path for admin
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        setEnvironmentState("ADMIN");
        if (typeof document !== "undefined") {
          document.documentElement.dataset.environment = "ADMIN";
        }
      } else {
        // Default to HR
        setEnvironmentState("HR");
        if (typeof document !== "undefined") {
          document.documentElement.dataset.environment = "HR";
        }
      }
    }
    setIsLoading(false);
  }, []);

  const setEnvironment = async (env: EnvironmentType, silent: boolean = false) => {
    try {
      setEnvironmentState(env);
      
      // Update DOM
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = env;
      }
      
      // Update LocalStorage (as backup)
      if (typeof window !== "undefined") {
        localStorage.setItem("app-environment", env);
      }

      // Use Server Action to set cookie (handles cross-subdomain logic via server headers)
      await setEnvironmentCookie(env);
      
      // Show feedback only if not silent
      if (!silent) {
        toast.success(`Switched to ${env} Environment`, {
          description: `You are now working in the ${env} environment.`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Failed to switch environment:", error);
      if (!silent) {
        toast.error("Failed to switch environment", {
          description: "An error occurred while saving your preference.",
        });
      }
    }
  };

  const toggleEnvironment = () => {
    const next = environment === "HR" ? "ERP" : environment === "ERP" ? "POS" : environment === "POS" ? "ADMIN" : "HR";
    setEnvironment(next);
  };

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        setEnvironment,
        toggleEnvironment,
        isLoading,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
}
