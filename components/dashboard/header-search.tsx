"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { menuData, masterMenuData, flattenMenu, filterMenuByPermissions } from "./sidebar-menu-data";
import { useAuth } from "@/components/providers/auth-provider";

interface HeaderSearchProps {
  onNavigate?: () => void;
}

export function HeaderSearch({ onNavigate }: HeaderSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { hasAnyPermission, hasAllPermissions, isAdmin } = useAuth();

  const filteredMenuTree = useMemo(
    () =>
      filterMenuByPermissions(menuData, {
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
      }),
    [hasAnyPermission, hasAllPermissions, isAdmin]
  );

  const flatMenu = useMemo(() => flattenMenu(filteredMenuTree), [filteredMenuTree]);
  const filteredMasterMenuTree = useMemo(
    () =>
      filterMenuByPermissions(masterMenuData, {
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
      }),
    [hasAnyPermission, hasAllPermissions, isAdmin]
  );

  const flatMasterMenu = useMemo(
    () => flattenMenu(filteredMasterMenuTree, "Master Menu"),
    [filteredMasterMenuTree]
  );

  const filteredNav = useMemo(() => {
    if (!search) return flatMenu.slice(0, 6);
    return flatMenu.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.path.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, flatMenu]);

  const filteredMaster = useMemo(() => {
    if (!search) return flatMasterMenu.slice(0, 4);
    return flatMasterMenu.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.path.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, flatMasterMenu]);

  return (
    <div className="relative w-full max-w-xs lg:max-w-sm">
      <Command className="rounded-lg border bg-background">
        <CommandInput
          placeholder="Search navigation..."
          value={search}
          onValueChange={setSearch}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-9 text-sm"
        />
        <CommandList 
          className={`absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md z-50 transition-all duration-200 ease-out origin-top ${
            open 
              ? "max-h-80 opacity-100 scale-y-100 overflow-auto" 
              : "max-h-0 opacity-0 scale-y-95 pointer-events-none overflow-hidden"
          }`}
        >
          <CommandEmpty>No results found.</CommandEmpty>
          {filteredNav.length > 0 && (
            <CommandGroup heading="Navigation">
              {filteredNav.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.path}
                  onSelect={() => {
                    router.push(item.href);
                    setOpen(false);
                    setSearch("");
                    onNavigate?.();
                  }}
                >
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {filteredMaster.length > 0 && (
            <CommandGroup heading="Master Menu">
              {filteredMaster.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.path}
                  onSelect={() => {
                    router.push(item.href);
                    setOpen(false);
                    setSearch("");
                    onNavigate?.();
                  }}
                >
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

