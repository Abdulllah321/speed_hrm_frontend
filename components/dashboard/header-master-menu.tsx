"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Database, ChevronRight, Search, LayoutGrid, Users, Package } from "lucide-react";
import { masterMenuData, MenuItem, filterMenuByPermissions } from "./sidebar-menu-data";
import { createNavigationHandler } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

function MasterMenuItem({ item, pathname, onNavigate }: { item: MenuItem; pathname: string; onNavigate: (href: string, e: React.MouseEvent) => void }) {
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = item.children?.some((child) => child.href === pathname);

  if (hasChildren) {
    return (
      <Collapsible defaultOpen={isChildActive}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
          <span>{item.title}</span>
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90 [[data-state=open]>&]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 border-l pl-2 mt-1 space-y-1">
            {item.children?.map((child) => (
              <button
                key={child.href}
                onClick={(e) => child.href && onNavigate(child.href, e)}
                className={cn(
                  "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left",
                  pathname === child.href && "bg-accent text-accent-foreground font-medium"
                )}
              >
                {child.title}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <button
      onClick={(e) => item.href && onNavigate(item.href, e)}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left",
        pathname === item.href && "bg-accent text-accent-foreground font-medium"
      )}
    >
      <span>{item.title}</span>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function HeaderMasterMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("COMMON");
  const { hasAnyPermission, hasAllPermissions, isAdmin } = useAuth();

  // Create navigation handler with router
  const navigate = createNavigationHandler(router);

  const filteredMasterMenu = useMemo(
    () =>
      filterMenuByPermissions(masterMenuData, {
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
      }),
    [hasAnyPermission, hasAllPermissions, isAdmin]
  );

  const filteredMenu = useMemo(() => {
    const searchLower = search.toLowerCase();
    const filteredBySearch = search
      ? filteredMasterMenu.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const childMatch = item.children?.some((child) =>
          child.title.toLowerCase().includes(searchLower)
        );
        return titleMatch || childMatch;
      })
      : filteredMasterMenu;

    return {
      COMMON: filteredBySearch.filter(item => item.environment === "BOTH"),
      HRM: filteredBySearch.filter(item => item.environment === "HR"),
      ERP: filteredBySearch.filter(item => item.environment === "ERP"),
    };
  }, [search, filteredMasterMenu]);

  const handleClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    setOpen(false);
  };

  if (filteredMasterMenu.length === 0) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Database className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Master Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[440px] px-0 py-0 gap-0 border-l shadow-2xl">
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-md">
          <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-xl font-bold tracking-tight">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Database className="h-6 w-6" />
                </div>
                Master Repository
              </SheetTitle>
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search master records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
              />
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0" variant="underline">
            <div className="px-6 py-2 border-b bg-secondary/20">
              <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-background/50 backdrop-blur rounded-lg">
                <TabsTrigger value="COMMON" className="text-xs font-semibold gap-2 rounded-md transition-all data-[state=active]:shadow-sm">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Common
                </TabsTrigger>
                <TabsTrigger value="HRM" className="text-xs font-semibold gap-2 rounded-md transition-all data-[state=active]:shadow-sm">
                  <Users className="h-3.5 w-3.5" />
                  HRM
                </TabsTrigger>
                <TabsTrigger value="ERP" className="text-xs font-semibold gap-2 rounded-md transition-all data-[state=active]:shadow-sm">
                  <Package className="h-3.5 w-3.5" />
                  ERP
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="flex-1 mt-0 min-h-0 overflow-hidden outline-none">
              <ScrollArea className="h-full" showShadows>
                <div className="px-6 py-4 space-y-1">
                  {filteredMenu[activeTab as keyof typeof filteredMenu].length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-4 rounded-full bg-secondary/50 mb-3">
                        <Search className="h-8 w-8 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs opacity-70">Try searching for something else</p>
                    </div>
                  ) : (
                    <div className="grid gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                      {filteredMenu[activeTab as keyof typeof filteredMenu].map((item) => (
                        <MasterMenuItem
                          key={item.title}
                          item={item}
                          pathname={pathname}
                          onNavigate={handleClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

        </div>
      </SheetContent>
    </Sheet>
  );
}
