"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { HeaderSearch } from "@/components/dashboard/header-search";
import { HeaderNotifications } from "@/components/dashboard/header-notifications";
import { HeaderUserMenu } from "@/components/dashboard/header-user-menu";
import { HeaderMasterMenu } from "@/components/dashboard/header-master-menu";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { SessionChecker } from "@/components/auth/session-checker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SessionChecker />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <HeaderSearch />
          <div className="flex-1" />
          <HeaderMasterMenu />
          <ThemeToggle />
          <HeaderNotifications />
          <HeaderUserMenu />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
