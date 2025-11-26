"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Clock,
  Calendar,
  Palmtree,
  Wallet,
  Gift,
  Timer,
  Coins,
  PiggyBank,
  FileText,
  Receipt,
  Settings,
  Shield,
  Menu,
  ChevronRight,
  Building2,
  Bell,
  Search,
  User,
} from "lucide-react";

type MenuItem = {
  title: string;
  icon?: React.ElementType;
  href?: string;
  children?: MenuItem[];
};

const menuData: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { title: "Main Dashboard", href: "/dashboard" },
      { title: "User Dashboard", href: "/dashboard/user" },
    ],
  },
  {
    title: "Employee Setup",
    icon: Users,
    children: [
      {
        title: "Employee",
        children: [
          { title: "Create", href: "/dashboard/employee/create" },
          { title: "List", href: "/dashboard/employee/list" },
          { title: "Upload", href: "/dashboard/employee/upload" },
          { title: "User Accounts", href: "/dashboard/employee/accounts" },
        ],
      },
    ],
  },
  {
    title: "Exit Clearance",
    icon: LogOut,
    children: [
      { title: "Create", href: "/dashboard/exit-clearance/create" },
      { title: "View", href: "/dashboard/exit-clearance/view" },
    ],
  },
  {
    title: "Advance Setup",
    icon: Clock,
    children: [
      {
        title: "Attendance",
        children: [
          { title: "Manage", href: "/dashboard/attendance/manage" },
          { title: "View", href: "/dashboard/attendance/view" },
          { title: "Summary", href: "/dashboard/attendance/summary" },
          { title: "Requests", href: "/dashboard/attendance/requests" },
          { title: "Request List", href: "/dashboard/attendance/request-list" },
          { title: "Exemptions", href: "/dashboard/attendance/exemptions" },
          { title: "Exemptions List", href: "/dashboard/attendance/exemptions-list" },
          { title: "Request Forwarding", href: "/dashboard/attendance/request-forwarding" },
        ],
      },
      {
        title: "Working Hours Policy",
        children: [
          { title: "Create", href: "/dashboard/working-hours/create" },
          { title: "View", href: "/dashboard/working-hours/view" },
          { title: "Assign Policy", href: "/dashboard/working-hours/assign" },
        ],
      },
      {
        title: "Holidays",
        children: [
          { title: "Create", href: "/dashboard/holidays/create" },
          { title: "List", href: "/dashboard/holidays/list" },
        ],
      },
    ],
  },
  {
    title: "Leaves Setup",
    icon: Palmtree,
    children: [
      {
        title: "Leave Application",
        children: [
          { title: "Mine List", href: "/dashboard/leaves/mine" },
          { title: "View Requests", href: "/dashboard/leaves/requests" },
          { title: "Request Forwarding", href: "/dashboard/leaves/forwarding" },
        ],
      },
    ],
  },
  {
    title: "Payroll Setup",
    icon: Wallet,
    children: [
      {
        title: "Payroll",
        children: [
          { title: "Create", href: "/dashboard/payroll/create" },
          { title: "View Report", href: "/dashboard/payroll/report" },
          { title: "Bank Report", href: "/dashboard/payroll/bank-report" },
          { title: "Payslips Emails", href: "/dashboard/payroll/payslips" },
        ],
      },
      {
        title: "Allowance",
        children: [
          { title: "Create", href: "/dashboard/allowance/create" },
          { title: "View", href: "/dashboard/allowance/view" },
        ],
      },
      {
        title: "Deduction",
        children: [
          { title: "Create", href: "/dashboard/deduction/create" },
          { title: "View", href: "/dashboard/deduction/view" },
        ],
      },
      {
        title: "Advance Salary",
        children: [
          { title: "Create", href: "/dashboard/advance-salary/create" },
          { title: "View", href: "/dashboard/advance-salary/view" },
        ],
      },
      {
        title: "Load Requests",
        children: [
          { title: "Create", href: "/dashboard/load-requests/create" },
          { title: "View", href: "/dashboard/load-requests/view" },
          { title: "View Requests", href: "/dashboard/load-requests/requests" },
          { title: "Request Forwarding", href: "/dashboard/load-requests/forwarding" },
        ],
      },
      {
        title: "Increment/Decrement",
        children: [
          { title: "Create", href: "/dashboard/increment/create" },
          { title: "View", href: "/dashboard/increment/view" },
          { title: "Letters Email", href: "/dashboard/increment/letters" },
        ],
      },
      {
        title: "Bonus",
        icon: Gift,
        children: [
          { title: "Add", href: "/dashboard/bonus/add" },
          { title: "View", href: "/dashboard/bonus/view" },
          { title: "Issue Bonus", href: "/dashboard/bonus/issue" },
          { title: "View Report", href: "/dashboard/bonus/report" },
          { title: "Bank Report", href: "/dashboard/bonus/bank-report" },
          { title: "Bonus Payslip", href: "/dashboard/bonus/payslip" },
        ],
      },
      {
        title: "Overtime",
        icon: Timer,
        children: [
          { title: "Create", href: "/dashboard/overtime/create" },
          { title: "List", href: "/dashboard/overtime/list" },
          { title: "Request Forwarding", href: "/dashboard/overtime/forwarding" },
        ],
      },
      {
        title: "Leave Encashment",
        icon: Coins,
        children: [
          { title: "Create", href: "/dashboard/leave-encashment/create" },
          { title: "List", href: "/dashboard/leave-encashment/list" },
          { title: "Request Forwarding", href: "/dashboard/leave-encashment/forwarding" },
        ],
      },
      {
        title: "Provident Fund",
        icon: PiggyBank,
        children: [
          { title: "Create", href: "/dashboard/provident-fund/create" },
          { title: "List", href: "/dashboard/provident-fund/list" },
        ],
      },
      {
        title: "PF for Employee",
        children: [
          { title: "Create PF", href: "/dashboard/pf-employee/create" },
          { title: "View PF", href: "/dashboard/pf-employee/view" },
          { title: "Create Withdraw", href: "/dashboard/pf-employee/withdraw-create" },
          { title: "View Withdraw", href: "/dashboard/pf-employee/withdraw-view" },
          { title: "View Report", href: "/dashboard/pf-employee/report" },
          { title: "View Ledger", href: "/dashboard/pf-employee/ledger" },
        ],
      },
      {
        title: "Final Settlement",
        children: [
          { title: "Create", href: "/dashboard/final-settlement/create" },
          { title: "List", href: "/dashboard/final-settlement/list" },
        ],
      },
      {
        title: "HR Letters",
        icon: FileText,
        children: [
          { title: "Create", href: "/dashboard/hr-letters/create" },
          { title: "View", href: "/dashboard/hr-letters/view" },
          { title: "Upload", href: "/dashboard/hr-letters/upload" },
        ],
      },
      {
        title: "Salary Sheet",
        icon: Receipt,
        children: [
          { title: "Tax Certificate", href: "/dashboard/salary-sheet/tax-certificate" },
        ],
      },
      {
        title: "Rebate",
        children: [
          { title: "Create", href: "/dashboard/rebate/create" },
          { title: "List", href: "/dashboard/rebate/list" },
        ],
      },
    ],
  },
  {
    title: "Profile Settings",
    icon: Settings,
    children: [
      {
        title: "Settings",
        children: [
          { title: "Change Password", href: "/dashboard/settings/password" },
          { title: "Edit Profile", href: "/dashboard/settings/profile" },
        ],
      },
      {
        title: "Roles",
        icon: Shield,
        children: [
          { title: "Add Role", href: "/dashboard/roles/add" },
          { title: "View Role", href: "/dashboard/roles/view" },
        ],
      },
      {
        title: "Sub Menu",
        icon: Menu,
        children: [
          { title: "Add and View", href: "/dashboard/submenu/manage" },
        ],
      },
    ],
  },
];

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

  if (item.children) {
    return (
      <Collapsible className="group/collapsible">
        <SidebarMenuItem>
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

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2 justify-center">
          <Building2 className="size-6 min-w-6 min-h-6 shrink-0 text-primary" />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
            HRM
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

// Flatten menu for search
function flattenMenu(items: MenuItem[], parentPath = ""): { title: string; href: string; path: string }[] {
  const result: { title: string; href: string; path: string }[] = [];
  for (const item of items) {
    const currentPath = parentPath ? `${parentPath} > ${item.title}` : item.title;
    if (item.href) {
      result.push({ title: item.title, href: item.href, path: currentPath });
    }
    if (item.children) {
      result.push(...flattenMenu(item.children, currentPath));
    }
  }
  return result;
}

function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const flatMenu = useMemo(() => flattenMenu(menuData), []);

  const filtered = useMemo(() => {
    if (!search) return flatMenu.slice(0, 10);
    return flatMenu.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.path.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, flatMenu]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-64 justify-start text-muted-foreground gap-2">
          <Search className="h-4 w-4" />
          <span>Search navigation...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search navigation..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {filtered.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.path}
                  onSelect={() => {
                    router.push(item.href);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          
          <HeaderSearch />
          
          <div className="flex-1" />
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">New leave request</span>
                <span className="text-xs text-muted-foreground">John Doe requested 3 days leave</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">Payroll processed</span>
                <span className="text-xs text-muted-foreground">November payroll has been processed</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">New employee added</span>
                <span className="text-xs text-muted-foreground">Sarah Smith joined the team</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-muted-foreground">admin@company.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/password">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

