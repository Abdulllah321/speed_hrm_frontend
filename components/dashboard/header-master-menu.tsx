"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Database, ChevronRight, Search } from "lucide-react";
import { masterMenuData, MenuItem } from "./sidebar-menu-data";
import { cn } from "@/lib/utils";

function MasterMenuItem({ item, pathname, onNavigate }: { item: MenuItem; pathname: string; onNavigate: () => void }) {
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
              <Link
                key={child.href}
                href={child.href || "#"}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === child.href && "bg-accent text-accent-foreground font-medium"
                )}
              >
                {child.title}
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        pathname === item.href && "bg-accent text-accent-foreground font-medium"
      )}
    >
      <span>{item.title}</span>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </Link>
  );
}

export function HeaderMasterMenu() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredMenu = useMemo(() => {
    if (!search) return masterMenuData;
    const searchLower = search.toLowerCase();
    return masterMenuData.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const childMatch = item.children?.some((child) =>
        child.title.toLowerCase().includes(searchLower)
      );
      return titleMatch || childMatch;
    });
  }, [search]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Database className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Master Menu
          </SheetTitle>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search master menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="grid gap-1 pr-4">
            {filteredMenu.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No results found
              </p>
            ) : (
              filteredMenu.map((item) => (
                <MasterMenuItem key={item.title} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
