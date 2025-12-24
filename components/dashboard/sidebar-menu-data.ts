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
    title: "Allowance",
    children: [
      { title: "Add", href: "/dashboard/master/allowance-head/add" },
      { title: "View", href: "/dashboard/master/allowance-head/list" },
    ],
  },
  {
    title: "Deduction",
    children: [
      { title: "Add", href: "/dashboard/master/deduction-head/add" },
      { title: "View", href: "/dashboard/master/deduction-head/list" },
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
          { title: "Request", href: "/dashboard/attendance/request" },
          { title: "Request List", href: "/dashboard/attendance/request-list" },
          { title: "Exemptions", href: "/dashboard/attendance/exemptions" },
          {
            title: "Exemptions List",
            href: "/dashboard/attendance/exemptions-list",
          },
          {
            title: "Request Forwarding",
            href: "/dashboard/request-forwarding?type=attendance",
          },
        ],
      },
      {
        title: "Working Hours Policy",
        children: [
          { title: "Create", href: "/dashboard/working-hours/create" },
          { title: "View", href: "/dashboard/working-hours/view" },
          {
            title: "Assign Policy",
            href: "/dashboard/working-hours/assign-policy",
          },
        ],
      },
      {
        title: "Holidays",
        children: [
          { title: "Create", href: "/dashboard/holidays/add" },
          { title: "List", href: "/dashboard/holidays/list" },
        ],
      },
    ],
  },
  {
    title: "Leaves Setup",
    icon: Palmtree,
    children: [
      { title: "Create Leave", href: "/dashboard/leaves/create-leaves" },
      { title: "View Requests", href: "/dashboard/leaves/requests" },
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
          { title: "Create", href: "/dashboard/payroll-setup/allowance/create" },
          { title: "View", href: "/dashboard/payroll-setup/allowance/view" },
        ],
      },
      {
        title: "Deduction",
        children: [
          { title: "Create", href: "/dashboard/payroll-setup/deduction/create" },
          { title: "View", href: "/dashboard/payroll-setup/deduction/view" },
        ],
      },
      {
        title: "Advance Salary",
        children: [
          { title: "Create Request", href: "/dashboard/payroll-setup/advance-salary/create" },
          { title: "View Requests", href: "/dashboard/payroll-setup/advance-salary/view" },
          { title: "Request Forwarding", href: "/dashboard/request-forwarding?type=advance-salary" },
        ],
      },
      {
        title: "Loan Requests",
        children: [
          { title: "Create Request", href: "/dashboard/loan-requests/create" },
          { title: "View & Reports", href: "/dashboard/loan-requests/view" },
          { title: "Request Forwarding", href: "/dashboard/request-forwarding?type=loan" },
        ],
      },
      {
        title: "Increment/Decrement",
        children: [
          { title: "Create", href: "/dashboard/payroll-setup/increment/create" },
          { title: "View", href: "/dashboard/payroll-setup/increment/view" },
        ],
      },
      {
        title: "Bonus",
        icon: Gift,
        children: [
          { title: "Issue Bonus", href: "/dashboard/payroll-setup/bonus/issue" },
          { title: "View Report", href: "/dashboard/payroll-setup/bonus/report" },
          { title: "Bank Report", href: "/dashboard/payroll-setup/bonus/bank-report" },
          { title: "Bonus Payslip", href: "/dashboard/payroll-setup/bonus/payslip" },
        ],
      },
      {
        title: "Overtime",
        icon: Timer,
        children: [
          { title: "Create", href: "/dashboard/payroll-setup/overtime/create" },
          { title: "List", href: "/dashboard/payroll-setup/overtime/view" },
            
          {
            title: "Request Forwarding",
            href: "/dashboard/request-forwarding?type=overtime",
          },
        ],
      },
      {
        title: "Leave Encashment",
        icon: Coins,
        children: [
          { title: "Create", href: "/dashboard/payroll-setup/leave-encashment/create" },
          { title: "List", href: "/dashboard/payroll-setup/leave-encashment/list" },
          {
            title: "Request Forwarding",
            href: "/dashboard/request-forwarding?type=leave-encashment",
          },
        ],
      },
     
      {
        title: "PF for Employee",
        children: [
          { title: "Create PF", href: "/dashboard/payroll-setup/pf-employee/create" },
          { title: "View PF", href: "/dashboard/payroll-setup/pf-employee/view" },
          {
            title: "Create Withdraw",
            href: "/dashboard/payroll-setup/pf-employee/withdraw-create",
          },
          {
            title: "View Withdraw",
            href: "/dashboard/payroll-setup/pf-employee/withdraw-view",
          },
          { title: "View Report", href: "/dashboard/payroll-setup/pf-employee/report" },
          { title: "View Ledger", href: "/dashboard/payroll-setup/pf-employee/ledger" },
        ],
      },
      {
        title: "Final Settlement",
        children: [
          { title: "Create", href: "/dashboard/payroll-setup/final-settlement/create" },
          { title: "List", href: "/dashboard/payroll-setup/final-settlement/list" },
        ],
      },
      {
        title: "HR Letters",
        icon: FileText,
        children: [
          { title: "Create", href: "/dashboard/payroll-setup/hr-letters/create" },
          { title: "View", href: "/dashboard/payroll-setup/hr-letters/view" },
          { title: "Upload", href: "/dashboard/payroll-setup/hr-letters/upload" },
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
          { title: "Create", href: "/dashboard/payroll-setup/rebate/create" },
          { title: "List", href: "/dashboard/payroll-setup/rebate/list" },
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
