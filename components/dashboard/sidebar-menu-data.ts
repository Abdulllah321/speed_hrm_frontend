import {
  LayoutDashboard,
  Users,
  LogOut,
  Clock,
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
  Database,
} from "lucide-react";

export type MenuItem = {
  title: string;
  icon?: React.ElementType;
  href?: string;
  children?: MenuItem[];
};

export const masterMenuData: MenuItem[] = [
  {
    title: "Department",
    children: [
      { title: "Add", href: "/dashboard/master/department/add" },
      { title: "View", href: "/dashboard/master/department/list" },
    ],
  },
  {
    title: "Sub Department",
    children: [
      { title: "Add", href: "/dashboard/master/sub-department/add" },
      { title: "View", href: "/dashboard/master/sub-department/list" },
    ],
  },
  {
    title: "Institute",
    children: [
      { title: "Add", href: "/dashboard/master/institute/add" },
      { title: "View", href: "/dashboard/master/institute/list" },
    ],
  },
  {
    title: "Designation",
    children: [
      { title: "Add", href: "/dashboard/master/designation/add" },
      { title: "View", href: "/dashboard/master/designation/list" },
    ],
  },
  {
    title: "Job Type",
    children: [
      { title: "Add", href: "/dashboard/master/job-type/add" },
      { title: "View", href: "/dashboard/master/job-type/list" },
    ],
  },
  {
    title: "Marital Status",
    children: [
      { title: "Add", href: "/dashboard/master/marital-status/add" },
      { title: "View", href: "/dashboard/master/marital-status/list" },
    ],
  },
  {
    title: "Employee Grade",
    children: [
      { title: "Add", href: "/dashboard/master/employee-grade/add" },
      { title: "View", href: "/dashboard/master/employee-grade/list" },
    ],
  },
  {
    title: "Employement Status",
    children: [
      { title: "Add", href: "/dashboard/master/employee-status/add" },
      { title: "View", href: "/dashboard/master/employee-status/list" },
    ],
  },
  {
    title: "Qualification",
    children: [
      { title: "Add", href: "/dashboard/master/qualification/add" },
      { title: "View", href: "/dashboard/master/qualification/list" },
    ],
  },
  {
    title: "City",
    children: [
      { title: "Add", href: "/dashboard/master/city/add" },
      { title: "View", href: "/dashboard/master/city/list" },
    ],
  },
  {
    title: "Branch",
    children: [
      { title: "Add", href: "/dashboard/master/branch/add" },
      { title: "View", href: "/dashboard/master/branch/list" },
    ],
  },
  {
    title: "Loan Types",
    children: [
      { title: "Add", href: "/dashboard/master/loan-types/add" },
      { title: "View", href: "/dashboard/master/loan-types/list" },
    ],
  },
  {
    title: "Leave Types",
    children: [
      { title: "Add", href: "/dashboard/master/leave-types/add" },
      { title: "View", href: "/dashboard/master/leave-types/list" },
    ],
  },
  {
    title: "Leaves Policy",
    children: [
      { title: "Add", href: "/dashboard/master/leaves-policy/add" },
      { title: "View", href: "/dashboard/master/leaves-policy/list" },
      {
        title: "Add Manual Leaves",
        href: "/dashboard/master/leaves-policy/manual-leaves",
      },
    ],
  },
  {
    title: "Equipment",
    children: [
      { title: "Add", href: "/dashboard/master/equipment/add" },
      { title: "View", href: "/dashboard/master/equipment/list" },
    ],
  },
  {
    title: "Salary Breakup",
    children: [
      { title: "Add", href: "/dashboard/master/salary-breakup/add" },
      { title: "View", href: "/dashboard/master/salary-breakup/list" },
    ],
  },
  {
    title: "EOBI",
    children: [
      { title: "Add", href: "/dashboard/master/eobi/add" },
      { title: "View", href: "/dashboard/master/eobi/list" },
    ],
  },
  {
    title: "Tax Slabs",
    children: [
      { title: "Add", href: "/dashboard/master/tax-slabs/add" },
      { title: "View", href: "/dashboard/master/tax-slabs/list" },
    ],
  },
  {
    title: "Provident Fund",
    children: [
      { title: "Add", href: "/dashboard/master/provident-fund/add" },
      { title: "View", href: "/dashboard/master/provident-fund/list" },
    ],
  },
  {
    title: "Bonus Types",
    children: [
      { title: "Add", href: "/dashboard/master/bonus-types/add" },
      { title: "View", href: "/dashboard/master/bonus-types/list" },
    ],
  },
  {
    title: "Multi-level Approval",
    children: [
      { title: "Add", href: "/dashboard/master/approval-settings/add" },
      { title: "View", href: "/dashboard/master/approval-settings/list" },
    ],
  },
];

export const menuData: MenuItem[] = [
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
          { title: "User Accounts", href: "/dashboard/employee/accounts" },
        ],
      },
      {
        title: "Exit Clearance",
        icon: LogOut,
        children: [
          { title: "Create", href: "/dashboard/exit-clearance/create" },
          { title: "List", href: "/dashboard/exit-clearance/list" },
        ],
      },
    ],
  },

  {
    title: "Attendance Setup",
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
          {
            title: "Exemptions List",
            href: "/dashboard/attendance/exemptions-list",
          },
          {
            title: "Request Forwarding",
            href: "/dashboard/attendance/request-forwarding",
          },
        ],
      },
      {
        title: "Working Hours Policy",
        children: [
          { title: "Create", href: "/dashboard/working-hours/create" },
          { title: "View", href: "/dashboard/working-hours/view" },
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
          {
            title: "Request Forwarding",
            href: "/dashboard/load-requests/forwarding",
          },
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
          {
            title: "Request Forwarding",
            href: "/dashboard/overtime/forwarding",
          },
        ],
      },
      {
        title: "Leave Encashment",
        icon: Coins,
        children: [
          { title: "Create", href: "/dashboard/leave-encashment/create" },
          { title: "List", href: "/dashboard/leave-encashment/list" },
          {
            title: "Request Forwarding",
            href: "/dashboard/leave-encashment/forwarding",
          },
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
          {
            title: "Create Withdraw",
            href: "/dashboard/pf-employee/withdraw-create",
          },
          {
            title: "View Withdraw",
            href: "/dashboard/pf-employee/withdraw-view",
          },
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
          {
            title: "Tax Certificate",
            href: "/dashboard/salary-sheet/tax-certificate",
          },
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

export function flattenMenu(
  items: MenuItem[],
  parentPath = ""
): { title: string; href: string; path: string }[] {
  const result: { title: string; href: string; path: string }[] = [];
  for (const item of items) {
    const currentPath = parentPath
      ? `${parentPath} > ${item.title}`
      : item.title;
    if (item.href) {
      result.push({ title: item.title, href: item.href, path: currentPath });
    }
    if (item.children) {
      result.push(...flattenMenu(item.children, currentPath));
    }
  }
  return result;
}
