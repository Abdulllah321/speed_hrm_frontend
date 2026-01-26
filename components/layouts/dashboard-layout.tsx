"use client";

import { useEffect, useState } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { HeaderSearch } from "@/components/dashboard/header-search";
import { HeaderNotifications } from "@/components/dashboard/header-notifications";
import { HeaderUserMenu } from "@/components/dashboard/header-user-menu";
import { HeaderMasterMenu } from "@/components/dashboard/header-master-menu";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { SessionChecker } from "@/components/auth/session-checker";
import { useAuth } from "@/components/providers/auth-provider";
import { useEnvironment } from "@/components/providers/environment-provider";
import { Button } from "@/components/ui/button";
import { Search, X, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { environment, setEnvironment } = useEnvironment();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = usePathname();

  // Sync environment with route
  useEffect(() => {
    if (pathname.startsWith("/erp") && environment !== "ERP") {
      setEnvironment("ERP", true);
    } else if (pathname.startsWith("/hr") && environment !== "HR") {
      setEnvironment("HR", true);
    } else if (pathname.startsWith("/pos") && environment !== "POS") {
      setEnvironment("POS", true);
    } else if (pathname.startsWith("/admin") && environment !== "ADMIN") {
      setEnvironment("ADMIN", true);
    }
  }, [pathname, setEnvironment]);

  return (<>
     {/* First Password Banner - Full Screen Width */}
      {user?.isFirstPassword && (
        <div className="bg-orange-600 text-white text-center font-medium shrink-0 h-10 z-60 flex items-center justify-center gap-4 shadow-md border-b border-orange-700 fixed top-0 left-0 right-0">
          <AlertTriangle className="h-4 w-4 text-white animate-pulse" />
          <span className="text-xs tracking-wide">
            TEMPORARY PASSWORD DETECTED - PLEASE CHANGE YOUR PASSWORD
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-3 text-xs bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold border-0"
            onClick={() => (window.location.href = "/hr/settings/password")}
          >
            Change Now
          </Button>
        </div>
      )}
    <SidebarProvider className="flex-1">
   

      <SessionChecker />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-3 sm:gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 sm:px-6 sticky z-40 w-full justify-between shadow-sm" style={{
          top:"var(--banner-height)"
        }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SidebarTrigger className="shrink-0" />
            {/* Desktop Search */}
            <div className="hidden sm:block flex-1 max-w-xs lg:max-w-sm">
              <HeaderSearch />
            </div>
          </div>
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden shrink-0"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <HeaderMasterMenu />
            <ThemeToggle />
            <HeaderNotifications />
            <HeaderUserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">{children}</main>
      </SidebarInset>

      {/* Mobile Floating Search */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[50] sm:hidden"
              onClick={() => setMobileSearchOpen(false)}
            />
            {/* Floating Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-10 left-[10px] w-[calc(100%-20px)] z-[51] sm:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-background rounded-lg border shadow-lg p-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <HeaderSearch
                      onNavigate={() => setMobileSearchOpen(false)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 mt-0"
                    onClick={() => setMobileSearchOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SidebarProvider></>
  );
}
