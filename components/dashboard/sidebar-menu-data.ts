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
      { title: "Add", href: "/master/department/add" },
      { title: "View", href: "/master/department/list" },
    ],
  },
  {
    title: "Sub Department",
    children: [
      { title: "Add", href: "/master/sub-department/add" },
      { title: "View", href: "/master/sub-department/list" },
    ],
  },
  {
    title: "Institute",
    children: [
      { title: "Add", href: "/master/institute/add" },
      { title: "View", href: "/master/institute/list" },
    ],
  },
  {
    title: "Designation",
    children: [
      { title: "Add", href: "/master/designation/add" },
      { title: "View", href: "/master/designation/list" },
    ],
  },
  {
    title: "Job Type",
    children: [
      { title: "Add", href: "/master/job-type/add" },
      { title: "View", href: "/master/job-type/list" },
    ],
  },
  {
    title: "Marital Status",
    children: [
      { title: "Add", href: "/master/marital-status/add" },
      { title: "View", href: "/master/marital-status/list" },
    ],
  },
  {
    title: "Employee Grade",
    children: [
      { title: "Add", href: "/master/employee-grade/add" },
      { title: "View", href: "/master/employee-grade/list" },
    ],
  },
  {
    title: "Employement Status",
    children: [
      { title: "Add", href: "/master/employee-status/add" },
      { title: "View", href: "/master/employee-status/list" },
    ],
  },
  {
    title: "Qualification",
    children: [
      { title: "Add", href: "/master/qualification/add" },
      { title: "View", href: "/master/qualification/list" },
    ],
  },
  {
    title: "City",
    children: [
      { title: "Add", href: "/master/city/add" },
      { title: "View", href: "/master/city/list" },
    ],
  },
  {
    title: "Location",
    children: [
      { title: "Add", href: "/master/location/add" },
      { title: "View", href: "/master/location/list" },
    ],
  },
  {
    title: "Allocation",
    children: [
      { title: "Add", href: "/master/allocation/add" },
      { title: "View", href: "/master/allocation/list" },
    ],
  },
  {
    title: "Loan Types",
    children: [
      { title: "Add", href: "/master/loan-types/add" },
      { title: "View", href: "/master/loan-types/list" },
    ],
  },
  {
    title: "Leave Types",
    children: [
      { title: "Add", href: "/master/leave-types/add" },
      { title: "View", href: "/master/leave-types/list" },
    ],
  },
  {
    title: "Leaves Policy",
    children: [
      { title: "Add", href: "/master/leaves-policy/add" },
      { title: "View", href: "/master/leaves-policy/list" },
      {
        title: "Add Manual Leaves",
        href: "/master/leaves-policy/manual-leaves",
      },
    ],
  },
  {
    title: "Equipment",
    children: [
      { title: "Add", href: "/master/equipment/add" },
      { title: "View", href: "/master/equipment/list" },
    ],
  },
  {
    title: "Salary Breakup",
    children: [
      { title: "Add", href: "/master/salary-breakup/add" },
      { title: "View", href: "/master/salary-breakup/list" },
    ],
  },
  {
    title: "EOBI",
    children: [
      { title: "Add", href: "/master/eobi/add" },
      { title: "View", href: "/master/eobi/list" },
    ],
  },
  {
    title: "Social Security",
    children: [
      { title: "Add", href: "/master/social-security/add" },
      { title: "View", href: "/master/social-security/list" },
    ],
  },
  {
    title: "Tax Slabs",
    children: [
      { title: "Add", href: "/master/tax-slabs/add" },
      { title: "View", href: "/master/tax-slabs/list" },
    ],
  },
  {
    title: "Provident Fund",
    children: [
      { title: "Add", href: "/master/provident-fund/add" },
      { title: "View", href: "/master/provident-fund/list" },
    ],
  },
  {
    title: "Bonus Types",
    children: [
      { title: "Add", href: "/master/bonus-types/add" },
      { title: "View", href: "/master/bonus-types/list" },
    ],
  },
  {
    title: "Allowance",
    children: [
      { title: "Add", href: "/master/allowance-head/add" },
      { title: "View", href: "/master/allowance-head/list" },
    ],
  },
  {
    title: "Deduction",
    children: [
      { title: "Add", href: "/master/deduction-head/add" },
      { title: "View", href: "/master/deduction-head/list" },
    ],
  },
  {
    title: "Bank",
    children: [
      { title: "Add", href: "/master/banks/add" },
      { title: "View", href: "/master/banks/list" },
    ],
  },
  {
    title: "Rebate Nature",
    children: [
      { title: "Add", href: "/master/rebate-nature/add" },
      { title: "View", href: "/master/rebate-nature/list" },
    ],
  },
];

export const menuData: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { title: "Main Dashboard", href: "/hr" },
      { title: "User Dashboard", href: "/hr/user" },
    ],
  },
  {
    title: "Employee Setup",
    icon: Users,
    children: [
      {
        title: "Employee",
        children: [
          { title: "Create", href: "/hr/employee/create" },
          { title: "List", href: "/hr/employee/list" },
          { title: "User Accounts", href: "/hr/employee/accounts" },
        ],
      },
      {
        title: "Exit Clearance",
        icon: LogOut,
        children: [
          { title: "Create", href: "/hr/exit-clearance/create" },
          { title: "List", href: "/hr/exit-clearance/list" },
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
          { title: "Manage", href: "/hr/attendance/manage" },
          { title: "View", href: "/hr/attendance/view" },
          { title: "Summary", href: "/hr/attendance/summary" },
          { title: "Request", href: "/hr/attendance/request" },
          { title: "Request List", href: "/hr/attendance/request-list" },
          // { title: "Exemptions", href: "/hr/attendance/exemptions" },
          // {
          //   title: "Exemptions List",
          //   href: "/hr/attendance/exemptions-list",
          // },
          {
            title: "Request Forwarding",
            href: "/hr/request-forwarding?type=attendance",
          },
        ],
      },
      {
        title: "Working Hours Policy",
        children: [
          { title: "Create", href: "/hr/working-hours/create" },
          { title: "View", href: "/hr/working-hours/view" },
          {
            title: "Assign Policy",
            href: "/hr/working-hours/assign-policy",
          },
        ],
      },
      {
        title: "Holidays",
        children: [
          { title: "Create", href: "/hr/holidays/add" },
          { title: "List", href: "/hr/holidays/list" },
        ],
      },
    ],
  },
  {
    title: "Leaves Setup",
    icon: Palmtree,
    children: [
      { title: "Create Leave", href: "/hr/leaves/create-leaves" },
      { title: "View Requests", href: "/hr/leaves/requests" },
    ],
  },

  {
    title: "Payroll Setup",
    icon: Wallet,
    children: [
      {
        title: "Payroll",
        children: [
          { title: "Create", href: "/hr/payroll/create" },
          { title: "View Report", href: "/hr/payroll/report" },
          { title: "Bank Report", href: "/hr/payroll/bank-report" },
          { title: "Payslips Emails", href: "/hr/payroll/payslips" },
        ],
      },
      {
        title: "Allowance",
        children: [
          { title: "Create", href: "/hr/payroll-setup/allowance/create" },
          { title: "View", href: "/hr/payroll-setup/allowance/view" },
          { title: "Bank Report", href: "/hr/payroll-setup/allowance/bank-report" },
          { title: "Allowance Payslip", href: "/hr/payroll-setup/allowance/payslip" },
        ],
      },
      {
        title: "Deduction",
        children: [
          { title: "Create", href: "/hr/payroll-setup/deduction/create" },
          { title: "View", href: "/hr/payroll-setup/deduction/view" },
        ],
      },
      {
        title: "Advance Salary",
        children: [
          { title: "Create Request", href: "/hr/payroll-setup/advance-salary/create" },
          { title: "View Requests", href: "/hr/payroll-setup/advance-salary/view" },
          { title: "Request Forwarding", href: "/hr/request-forwarding?type=advance-salary" },
        ],
      },
      {
        title: "Loan Requests",
        children: [
          { title: "Create Request", href: "/hr/loan-requests/create" },
          { title: "View & Reports", href: "/hr/loan-requests/view" },
          { title: "Request Forwarding", href: "/hr/request-forwarding?type=loan" },
        ],
      },
      {
        title: "Increment/Decrement",
        children: [
          { title: "Create", href: "/hr/payroll-setup/increment/create" },
          { title: "View", href: "/hr/payroll-setup/increment/view" },
        ],
      },
      {
        title: "Bonus",
        icon: Gift,
        children: [
          { title: "Issue Bonus", href: "/hr/payroll-setup/bonus/issue" },
          { title: "View & Reports", href: "/hr/payroll-setup/bonus/view" },
          { title: "Bank Report", href: "/hr/payroll-setup/bonus/bank-report" },
          { title: "Bonus Payslip", href: "/hr/payroll-setup/bonus/payslip" },
        ],
      },
      // {
      //   title: "Overtime",
      //   icon: Timer,
      //   children: [
      //     { title: "Create", href: "/hr/payroll-setup/overtime/create" },
      //     { title: "List", href: "/hr/payroll-setup/overtime/view" },

      //     {
      //       title: "Request Forwarding",
      //       href: "/hr/request-forwarding?type=overtime",
      //     },
      //   ],
      // },
      {
        title: "Leave Encashment",
        icon: Coins,
        children: [
          { title: "Create", href: "/hr/payroll-setup/leave-encashment/create" },
          { title: "List", href: "/hr/payroll-setup/leave-encashment/list" },
          {
            title: "Request Forwarding",
            href: "/hr/request-forwarding?type=leave-encashment",
          },
        ],
      },

      {
        title: "PF for Employee",
        children: [
          { title: "Create PF", href: "/hr/payroll-setup/pf-employee/create" },
          { title: "View PF", href: "/hr/payroll-setup/pf-employee/view" },
          {
            title: "Create Withdraw",
            href: "/hr/payroll-setup/pf-employee/withdraw-create",
          },
          {
            title: "View Withdraw",
            href: "/hr/payroll-setup/pf-employee/withdraw-view",
          },
          { title: "View Report", href: "/hr/payroll-setup/pf-employee/report" },
          { title: "View Ledger", href: "/hr/payroll-setup/pf-employee/ledger" },
        ],
      },
      {
        title: "Final Settlement",
        children: [
          { title: "Create", href: "/hr/payroll-setup/final-settlement/create" },
          { title: "List", href: "/hr/payroll-setup/final-settlement/list" },
        ],
      },
      {
        title: "HR Letters",
        icon: FileText,
        children: [
          { title: "Create", href: "/hr/payroll-setup/hr-letters/create" },
          { title: "View", href: "/hr/payroll-setup/hr-letters/view" },
          { title: "Upload", href: "/hr/payroll-setup/hr-letters/upload" },
        ],
      },
      {
        title: "Salary Sheet",
        icon: Receipt,
        children: [
          {
            title: "Tax Certificate",
            href: "/hr/salary-sheet/tax-certificate",
          },
        ],
      },
      // {
      //   title: "Rebate",
      //   children: [
      //     { title: "Create", href: "/hr/payroll-setup/rebate/create" },
      //     { title: "List", href: "/hr/payroll-setup/rebate/list" },
      //   ],
      // },
    ],
  },
  {
    title: "Profile Settings",
    icon: Settings,
    children: [
      {
        title: "Settings",
        children: [
          { title: "Change Password", href: "/hr/settings/password" },
          { title: "Edit Profile", href: "/hr/settings/profile" },
        ],
      },
      {
        title: "Roles",
        icon: Shield,
        children: [
          { title: "Add Role", href: "/hr/roles/add" },
          { title: "View Role", href: "/hr/roles/view" },
        ],
      },
      {
        title: "Sub Menu",
        icon: Menu,
        children: [
          { title: "Add and View", href: "/hr/submenu/manage" },
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
