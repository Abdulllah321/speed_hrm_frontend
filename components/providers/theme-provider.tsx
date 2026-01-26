"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import Cookies from "js-cookie";

function ThemeSync() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // On mount, check cookie
    const savedTheme = Cookies.get("app-theme");
    // If cookie exists and is valid, and differs from what next-themes initialized (from localStorage), sync it.
    // However, next-themes might have already read from localStorage.
    // We want the cookie to be the source of truth for cross-domain.
    if (savedTheme && (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system")) {
      setTheme(savedTheme);
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!mounted || !theme) return;

    // When theme changes, update cookie
    // Use the configured cookie domain or auto-detect
    const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;
    
    // Safety check for localhost
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );

    const cookieOptions: Cookies.CookieAttributes = {
      expires: 365,
      // Don't set domain if on localhost, otherwise it won't work
      domain: isLocalhost ? undefined : domain
    };

    Cookies.set("app-theme", theme, cookieOptions);
  }, [theme, mounted]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}

