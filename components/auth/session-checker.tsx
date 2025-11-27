"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { checkSession } from "@/lib/auth";

const CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds

export function SessionChecker() {
  const router = useRouter();
  const [sessionExpired, setSessionExpired] = useState(false);

  const performCheck = useCallback(async () => {
    const result = await checkSession();
    if (!result.valid) {
      setSessionExpired(true);
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
    router.push("/login");
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

