"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes (proactive refresh handles token expiration)

export function SessionChecker() {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionExpired, setSessionExpired] = useState(false);

  const performCheck = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check-session");
      const data = await res.json();
      if (!data.valid) {
        setSessionExpired(true);
      }
    } catch (error) {
      console.error("Session check failed:", error);
    }
  }, []);

  useEffect(() => {
    // Initial check
    performCheck();

    // Set up interval
    const interval = setInterval(performCheck, CHECK_INTERVAL);

    // Also check on window focus
    const handleFocus = () => {
      performCheck();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [performCheck]);

  const handleLogin = () => {
    const callbackUrl = encodeURIComponent(pathname || "/dashboard");
    router.push(`/login?callbackUrl=${callbackUrl}`);
  };

  return (
    <AlertDialog open={sessionExpired}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired. Please log in again to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleLogin}>
            Go to Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

