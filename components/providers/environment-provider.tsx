"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export type EnvironmentType = "HR" | "ERP";

interface EnvironmentContextType {
  environment: EnvironmentType;
  setEnvironment: (env: EnvironmentType) => void;
  toggleEnvironment: () => void;
  isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironmentState] = useState<EnvironmentType>("HR");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved environment from local storage
    const saved = typeof window !== "undefined" ? localStorage.getItem("app-environment") : null;
    if (saved === "ERP") {
      setEnvironmentState("ERP");
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = "ERP";
      }
    } else {
      // Default to HR
      setEnvironmentState("HR");
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = "HR";
      }
    }
    setIsLoading(false);
  }, []);

  const setEnvironment = (env: EnvironmentType) => {
    try {
      setEnvironmentState(env);
      if (typeof window !== "undefined") {
        localStorage.setItem("app-environment", env);
      }
      if (typeof document !== "undefined") {
        document.documentElement.dataset.environment = env;
      }
      
      // Show feedback
      toast.success(`Switched to ${env} Environment`, {
        description: `You are now working in the ${env} environment.`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to switch environment:", error);
      toast.error("Failed to switch environment", {
        description: "An error occurred while saving your preference.",
      });
      // Revert state if needed, but since setEnvironmentState is async/batch, maybe not critical here 
      // as the error is likely in localStorage.
    }
  };

  const toggleEnvironment = () => {
    const next = environment === "HR" ? "ERP" : "HR";
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
