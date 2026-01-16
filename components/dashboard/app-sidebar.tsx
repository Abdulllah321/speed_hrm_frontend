"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import { MenuItem, menuData, filterMenuByPermissions } from "./sidebar-menu-data";
import { cn } from "@/lib/utils";
import { getCurrentSubdomain } from "@/lib/navigation";
import { useAuth } from "@/components/providers/auth-provider";

// Normalize path by stripping subdomain prefix for comparison
function normalizePathForComparison(path: string, currentSubdomain: string | null): string {
  if (!path) return path;
  if (!currentSubdomain) return path;
  
  // Strip subdomain prefix if present (e.g., /hr/dashboard -> /dashboard)
  const prefix = `/${currentSubdomain}`;
  if (path.startsWith(prefix)) {
    const remaining = path.slice(prefix.length);
    return remaining || "/";
  }
  
  return path;
}

function SubMenuItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const currentSubdomain = getCurrentSubdomain();
  const normalizedPathname = normalizePathForComparison(pathname, currentSubdomain);
  const normalizedHref = normalizePathForComparison(item.href || "", currentSubdomain);
  const isActive = normalizedHref === normalizedPathname;

  if (item.children) {
    return (
      <Collapsible className="group/submenu">
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton className="cursor-pointer">
            <span>{item.title}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/submenu:rotate-90" />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.title}>
                <SubMenuItem item={child} pathname={pathname} />
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuSubButton 
      asChild 
      isActive={isActive}
      className={cn(
        "transition-all duration-200 hover:bg-sidebar-accent/60",
        isActive && "bg-sidebar-accent/80 font-medium shadow-sm"
      )}
    >
      <Link href={item.href || "#"}>
        <span>{item.title}</span>
      </Link>
    </SidebarMenuSubButton>
  );
}

function MenuItemComponent({ item, pathname }: { item: MenuItem; pathname: string }) {
  const Icon = item.icon;
  const currentSubdomain = getCurrentSubdomain();
  const normalizedPathname = normalizePathForComparison(pathname, currentSubdomain);
  const normalizedHref = normalizePathForComparison(item.href || "", currentSubdomain);
  const isActive = normalizedHref === normalizedPathname;
  const { state } = useSidebar();

  if (item.children) {
    // When sidebar is collapsed, show sub-menu in popover on hover
    if (state === "collapsed") {
      const [isOpen, setIsOpen] = React.useState(false);
      const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

      const handleMouseEnter = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
      };

      const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
          setIsOpen(false);
        }, 150);
      };

      React.useEffect(() => {
        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }, []);

      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <SidebarMenuItem 
            hasSubMenu={true}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <PopoverTrigger asChild>
              <SidebarMenuButton className="cursor-pointer w-full">
                {Icon && <Icon className="h-4 w-4" />}
                <span className="sr-only">{item.title}</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              align="start" 
              className="w-56 p-1"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="space-y-1">
                {item.children.map((child) => (
                  <SubMenuItemInPopover key={child.title} item={child} pathname={pathname} />
                ))}
              </div>
            </PopoverContent>
          </SidebarMenuItem>
        </Popover>
      );
    }

    // When sidebar is expanded, show normal collapsible menu
    return (
      <Collapsible className="group/collapsible">
        <SidebarMenuItem hasSubMenu={true}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="cursor-pointer transition-all duration-200 hover:bg-sidebar-accent/80 hover:shadow-sm">
              {Icon && <Icon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:scale-110" />}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden">
            <SidebarMenuSub className="mt-1">
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.title}>
                  <SubMenuItem item={child} pathname={pathname} />
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        asChild 
        isActive={isActive}
        className={cn(
          "group relative transition-all duration-200",
          "hover:bg-sidebar-accent/80 hover:shadow-sm",
          isActive && "bg-sidebar-accent shadow-md font-semibold",
          "data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-md"
        )}
      >
        <Link href={item.href || "#"}>
          {Icon && (
            <Icon className={cn(
              "h-4 w-4 transition-transform duration-200",
              isActive && "scale-110"
            )} />
          )}
          <span className="relative z-10">{item.title}</span>
          {isActive && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-3 rounded-r-full bg-primary transition-all duration-200" />
          )}
          {
            isActive && (
              <div className="absolute right-[0.3rem] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent transition-all duration-200" />
            )
          }
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SubMenuItemInPopover({ item, pathname }: { item: MenuItem; pathname: string }) {
  const currentSubdomain = getCurrentSubdomain();
  const normalizedPathname = normalizePathForComparison(pathname, currentSubdomain);
  const normalizedHref = normalizePathForComparison(item.href || "", currentSubdomain);
  const isActive = normalizedHref === normalizedPathname;

  if (item.children) {
    const [isOpen, setIsOpen] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsOpen(true);
    };

    const handleMouseLeave = () => {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={`
              w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm
              hover:bg-accent hover:text-accent-foreground
              ${isActive ? "bg-accent text-accent-foreground font-medium" : ""}
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <span>{item.title}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="right" 
          align="start" 
          className="w-56 p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="space-y-1">
            {item.children.map((child) => (
              <SubMenuItemInPopover key={child.title} item={child} pathname={pathname} />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={`
        block w-full rounded-sm px-2 py-1.5 text-sm
        hover:bg-accent hover:text-accent-foreground
        ${isActive ? "bg-accent text-accent-foreground font-medium" : ""}
      `}
    >
      {item.title}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, hasAnyPermission, hasAllPermissions, isAdmin } = useAuth();

  const filteredMenu = React.useMemo(() => {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('RBAC Debug - AppSidebar:', {
        role: user?.role,
        roleName: user?.role?.name || (user as any)?.role,
        isAdmin: isAdmin(),
        permissionsFromRole: user?.role?.permissions,
        permissionsFlat: (user as any)?.permissions,
        userObject: user,
        menuItemsCount: menuData.length
      });
    }

    const filtered = filterMenuByPermissions(menuData, {
      hasAnyPermission,
      hasAllPermissions,
      isAdmin,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('RBAC Filtered Menu:', {
        originalCount: menuData.length,
        filteredCount: filtered.length,
        filteredItems: filtered.map(item => item.title)
      });
    }

    return filtered;
  }, [hasAnyPermission, hasAllPermissions, isAdmin, user]);

  return (
    <Sidebar collapsible="icon" className="border-0 overflow-hidden">
      <SidebarRail />
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-r from-sidebar to-sidebar-accent/30 px-4 py-3 backdrop-blur-sm ">
        <div className="flex items-center gap-3 px-2 justify-center group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-center size-10 aspect-square rounded-xl bg-white text-primary shadow-sm group-data-[collapsible=icon]:rounded-lg transition-all duration-200">
            <Image 
              src={'/image.png'}
              alt="Logo"
              width={30}
              height={30}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            <span className="font-bold text-base leading-tight text-sidebar-foreground">
              Speed Pvt. Ltd
            </span>
            <span className="text-xs text-sidebar-foreground/60 font-medium">
              Dashboard
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 ">
        <ScrollArea className="-mx-2 px-2" showShadows >
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2 group-data-[collapsible=icon]:hidden">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {filteredMenu.map((item) => (
                  <MenuItemComponent key={item.title} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 px-4 py-3">
        <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            <div className="flex items-center justify-center size-8 rounded-lg overflow-hidden bg-transparent">
              <Image
                src="/logo.png"
                alt="Innovative Network Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-sidebar-foreground/60">
                Powered by
              </span>
              <span className="text-xs font-semibold text-sidebar-foreground truncate">
                Innovative Network
              </span>
            </div>
          </div>
          <div className="group-data-[collapsible=icon]:block hidden">
            <div className="flex items-center justify-center size-8 rounded-lg overflow-hidden bg-transparent">
              <Image
                src="/logo.png"
                alt="Innovative Network Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

