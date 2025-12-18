"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { HeaderSearch } from "@/components/dashboard/header-search";
import { HeaderNotifications } from "@/components/dashboard/header-notifications";
import { HeaderUserMenu } from "@/components/dashboard/header-user-menu";
import { HeaderMasterMenu } from "@/components/dashboard/header-master-menu";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { SessionChecker } from "@/components/auth/session-checker";
import { Button } from "@/components/ui/button";
import { Search, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [erpMode, setErpMode] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("erp-mode") : null;
    const isOn = saved === "on";
    setErpMode(isOn);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.erpMode = isOn ? "on" : "off";
    }
  }, []);

  const toggleErpMode = () => {
    const next = !erpMode;
    setErpMode(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("erp-mode", next ? "on" : "off");
    }
    if (typeof document !== "undefined") {
      document.documentElement.dataset.erpMode = next ? "on" : "off";
    }
  };

  return (
    <SidebarProvider>
      <SessionChecker />
      <AppSidebar />
      <SidebarInset className="max-w-[calc(100%-17rem)]">
        <header className="flex h-[3.95rem] items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6 sticky top-0 z-40 w-full justify-between">
          <div className="flex items-center gap-2">

          <SidebarTrigger />
          {/* Desktop Search */}
          <div className="hidden sm:block flex-1 max-w-xs lg:max-w-sm">
            <HeaderSearch />
          </div>
          </div>
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <div className="flex-1 sm:flex-none" />
          <div className="flex items-center gap-1 sm:gap-2">
            <HeaderMasterMenu />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={erpMode ? "default" : "outline"}
                size="sm"
                className={`relative overflow-hidden ${erpMode ? "animate-pulse" : ""}`}
                onClick={toggleErpMode}
             >
                <Sparkles className="h-4 w-4 mr-2" />
                {erpMode ? "ERP Mode On" : "Switch to ERP mode"}
                <motion.span
                  className="absolute inset-0"
                  initial={false}
                  animate={erpMode ? { opacity: [0.2, 0.5, 0.2] } : { opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background:
                      "radial-gradient(120% 120% at 50% 50%, rgba(99,102,241,0.15) 0%, rgba(147,51,234,0.15) 50%, transparent 100%)",
                  }}
                />
              </Button>
            </motion.div>
            <ThemeToggle />
            <HeaderNotifications />
            <HeaderUserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
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
                    <HeaderSearch onNavigate={() => setMobileSearchOpen(false)} />
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
    </SidebarProvider>
  );
}
