"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Layers, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Archive,
  Warehouse, // Added new icon
  BarChart3, // Added new icon
  Receipt // Added new icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const mainNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { 
        name: "POS / New Sale", 
        href: "/pos", 
        icon: ShoppingCart, 
        active: true,
        subItems: [
            { name: "Return/Exchange", href: "/pos/return", active: true }, // Highlighted in screenshot
            { name: "Request", href: "#" },
            { name: "Report", href: "#" }
        ]
    },
    { name: "Products", href: "/products", icon: Package },
    { name: "Categories", href: "/categories", icon: Layers },
    { name: "Inventory", href: "/inventory", icon: Warehouse },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Receipts", href: "/receipts", icon: Receipt },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function PosSidebar() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full w-20 md:w-64 border-r bg-card text-card-foreground">
      <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
            </div>
            <span className="hidden md:inline">City Mart</span>
        </div>
      </div>

        <div className="flex-1 overflow-y-auto py-4">
            <nav className="grid gap-1 px-2">
                {mainNavItems.map((item, index) => (
                    <div key={index}>
                        <Link
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                item.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                            {item.subItems && (
                                <span className="ml-auto text-xs">▼</span>
                            )}
                        </Link>
                        {item.subItems && (
                            <div className="ml-9 mt-1 grid gap-1 border-l pl-2">
                                {item.subItems.map((sub, subIndex) => (
                                    <Link
                                        key={subIndex}
                                        href={sub.href}
                                        className={cn(
                                            "block rounded-md px-3 py-1.5 text-xs font-medium transition-all hover:text-primary",
                                           // Simple check for sub-item active state based on name specifically for this demo
                                           sub.name === "Return/Exchange" && pathname?.includes("return") 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {sub.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </div>
      <div className="p-3 border-t">
         <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">Logout</span>
         </Button>
      </div>
    </div>
  );
}
