"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
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
import { ChevronRight, Building2 } from "lucide-react";
import { MenuItem, menuData } from "./sidebar-menu-data";

function SubMenuItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const isActive = item.href === pathname;

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
    <SidebarMenuSubButton asChild isActive={isActive}>
      <Link href={item.href || "#"}>
        <span>{item.title}</span>
      </Link>
    </SidebarMenuSubButton>
  );
}

function MenuItemComponent({ item, pathname }: { item: MenuItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = item.href === pathname;
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
              <SidebarMenuButton className="cursor-pointer w-full" tooltip={item.title}>
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
            <SidebarMenuButton className="cursor-pointer">
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
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
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.href || "#"}>
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SubMenuItemInPopover({ item, pathname }: { item: MenuItem; pathname: string }) {
  const isActive = item.href === pathname;

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

  return (
    <Sidebar collapsible="icon" >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2 justify-center">
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
            Speed Pvt. Ltd
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuData.map((item) => (
                  <MenuItemComponent key={item.title} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

