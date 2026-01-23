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
  Landmark,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

export type MenuItem = {
  title: string;
  icon?: React.ElementType;
  href?: string;
  children?: MenuItem[];
  permissions?: string[];
  requireAllPermissions?: boolean;
  environment?: "HR" | "ERP" | "BOTH" | "ADMIN";
};

export const masterMenuData: MenuItem[] = [
  {
    title: "Department",
    permissions: ["department.read", "department.create"],
    children: [
      { title: "Add", href: "/master/department/add" },
      { title: "View", href: "/master/department/list" },
    ],
  },
  {
    title: "Sub Department",
    permissions: ["sub-department.read", "sub-department.create"],
    children: [
      { title: "Add", href: "/master/sub-department/add" },
      { title: "View", href: "/master/sub-department/list" },
    ],
  },
  {
    title: "Institute",
    permissions: ["institute.read", "institute.create"],
    children: [
      { title: "Add", href: "/master/institute/add" },
      { title: "View", href: "/master/institute/list" },
    ],
  },
  {
    title: "Designation",
    permissions: ["designation.read", "designation.create"],
    children: [
      { title: "Add", href: "/master/designation/add" },
      { title: "View", href: "/master/designation/list" },
    ],
  },
  {
    title: "Job Type",
    permissions: ["job-type.read", "job-type.create"],
    children: [
      { title: "Add", href: "/master/job-type/add" },
      { title: "View", href: "/master/job-type/list" },
    ],
  },
  {
    title: "Marital Status",
    permissions: ["marital-status.read", "marital-status.create"],
    children: [
      { title: "Add", href: "/master/marital-status/add" },
      { title: "View", href: "/master/marital-status/list" },
    ],
  },
  {
    title: "Employee Grade",
    permissions: ["employee-grade.read", "employee-grade.create"],
    children: [
      { title: "Add", href: "/master/employee-grade/add" },
      { title: "View", href: "/master/employee-grade/list" },
    ],
  },
  {
    title: "Employement Status",
    permissions: ["employee-status.read", "employee-status.create"],
    children: [
      { title: "Add", href: "/master/employee-status/add" },
      { title: "View", href: "/master/employee-status/list" },
    ],
  },
  {
    title: "Qualification",
    permissions: ["qualification.read", "qualification.create"],
    children: [
      { title: "Add", href: "/master/qualification/add" },
      { title: "View", href: "/master/qualification/list" },
    ],
  },
  {
    title: "City",
    permissions: ["city.read", "city.create"],
    children: [
      { title: "Add", href: "/master/city/add" },
      { title: "View", href: "/master/city/list" },
    ],
  },
  {
    title: "Location",
    permissions: ["location.read", "location.create"],
    children: [
      { title: "Add", href: "/master/location/add" },
      { title: "View", href: "/master/location/list" },
    ],
  },
  {
    title: "Allocation",
    permissions: ["allocation.read", "allocation.create"],
    children: [
      { title: "Add", href: "/master/allocation/add" },
      { title: "View", href: "/master/allocation/list" },
    ],
  },
  {
    title: "Loan Types",
    permissions: ["loan-type.read", "loan-type.create"],
    children: [
      { title: "Add", href: "/master/loan-types/add" },
      { title: "View", href: "/master/loan-types/list" },
    ],
  },
  {
    title: "Leave Types",
    permissions: ["leave-type.read", "leave-type.create"],
    children: [
      { title: "Add", href: "/master/leave-types/add" },
      { title: "View", href: "/master/leave-types/list" },
    ],
  },
  {
    title: "Leaves Policy",
    permissions: ["leaves-policy.read", "leaves-policy.create"],
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
    permissions: ["equipment.read", "equipment.create"],
    children: [
      { title: "Add", href: "/master/equipment/add" },
      { title: "View", href: "/master/equipment/list" },
    ],
  },
  {
    title: "Salary Breakup",
    permissions: ["salary-breakup.read", "salary-breakup.create"],
    children: [
      { title: "Add", href: "/master/salary-breakup/add" },
      { title: "View", href: "/master/salary-breakup/list" },
    ],
  },
  {
    title: "EOBI",
    permissions: ["eobi.read", "eobi.create"],
    children: [
      { title: "Add", href: "/master/eobi/add" },
      { title: "View", href: "/master/eobi/list" },
    ],
  },
  {
    title: "Social Security",
    permissions: ["social-security.read", "social-security.create"],
    children: [
      { title: "Add", href: "/master/social-security/add" },
      { title: "View", href: "/master/social-security/list" },
    ],
  },
  {
    title: "Tax Slabs",
    permissions: ["tax-slab.read", "tax-slab.create"],
    children: [
      { title: "Add", href: "/master/tax-slabs/add" },
      { title: "View", href: "/master/tax-slabs/list" },
    ],
  },
  {
    title: "Provident Fund",
    permissions: ["provident-fund.read", "provident-fund.create"],
    children: [
      { title: "Add", href: "/master/provident-fund/add" },
      { title: "View", href: "/master/provident-fund/list" },
    ],
  },
  {
    title: "Bonus Types",
    permissions: ["bonus-type.read", "bonus-type.create"],
    children: [
      { title: "Add", href: "/master/bonus-types/add" },
      { title: "View", href: "/master/bonus-types/list" },
    ],
  },
  {
    title: "Allowance",
    permissions: ["allowance-head.read", "allowance-head.create"],
    children: [
      { title: "Add", href: "/master/allowance-head/add" },
      { title: "View", href: "/master/allowance-head/list" },
    ],
  },
  {
    title: "Deduction",
    permissions: ["deduction-head.read", "deduction-head.create"],
    children: [
      { title: "Add", href: "/master/deduction-head/add" },
      { title: "View", href: "/master/deduction-head/list" },
    ],
  },
  {
    title: "Bank",
    permissions: ["bank.read", "bank.create"],
    children: [
      { title: "Add", href: "/master/banks/add" },
      { title: "View", href: "/master/banks/list" },
    ],
  },
  // {
  //   title: "Rebate Nature",
  //   children: [
  //     { title: "Add", href: "/master/rebate-nature/add" },
  //     { title: "View", href: "/master/rebate-nature/list" },
  //   ],
  // },
];

export const menuData: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/hr",
    environment: "BOTH",
  },
  {
    title: "Finance & Accounts",
    icon: Landmark,
    environment: "ERP",
    permissions: ["finance.read"],
    children: [
      {
        title: "Chart of Accounts",
        children: [
          { title: "List", href: "/erp/finance/chart-of-accounts" },
          { title: "Create", href: "/erp/finance/chart-of-accounts/create" },
        ],
      },
      {
        title: "Journal Voucher",
        children: [
          { title: "List", href: "/erp/finance/journal-voucher" },
          { title: "Create", href: "/erp/finance/journal-voucher/create" },
        ],
      },
      {
        title: "Bank Payment",
        children: [
          { title: "List", href: "/erp/finance/bank-payment" },
          { title: "Create", href: "/erp/finance/bank-payment/create" },
        ],
      },
      {
        title: "Bank Receipt",
        children: [
          { title: "List", href: "/erp/finance/bank-receipt" },
          { title: "Create", href: "/erp/finance/bank-receipt/create" },
        ],
      },
      {
        title: "Cash Payment",
        children: [
          { title: "List", href: "/erp/finance/cash-payment" },
          { title: "Create", href: "/erp/finance/cash-payment/create" },
        ],
      },
      {
        title: "Cash Receipt",
        children: [
          { title: "List", href: "/erp/finance/cash-receipt" },
          { title: "Create", href: "/erp/finance/cash-receipt/create" },
        ],
      },
      {
        title: "Reports",
        children: [
          { title: "General Ledger", href: "/erp/finance/reports/general-ledger" },
          { title: "Trial Balance", href: "/erp/finance/reports/trial-balance" },
          { title: "Balance Sheet", href: "/erp/finance/reports/balance-sheet" },
          { title: "Profit & Loss", href: "/erp/finance/reports/profit-loss" },
        ],
      },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    environment: "ERP",
    permissions: ["inventory.read"],
    children: [
      {
         title: "Item Setup",
         children: [
            { title: "Items", href: "/erp/inventory/items" },
            { title: "Categories", href: "/erp/inventory/categories" },
            { title: "Warehouses", href: "/erp/inventory/warehouses" },
         ]
      },
      {
        title: "Transactions",
        children: [
             { title: "Stock Received", href: "/erp/inventory/stock-received" },
             { title: "Delivery Note", href: "/erp/inventory/delivery-note" },
             { title: "Stock Transfer", href: "/erp/inventory/stock-transfer" },
        ]
      }
    ],
  },
  {
    title: "Procurement",
    icon: ShoppingCart,
    environment: "ERP",
    permissions: ["procurement.read"],
    children: [
      { title: "Vendors", href: "/erp/procurement/vendors" },
      { title: "Purchase Requisition", href: "/erp/procurement/purchase-requisition" },
      { title: "Purchase Order", href: "/erp/procurement/purchase-order" },
      { title: "Purchase Invoice", href: "/erp/procurement/purchase-invoice" },
    ],
  },
  {
    title: "Sales",
    icon: TrendingUp,
    environment: "ERP",
    permissions: ["sales.read"],
    children: [
      { title: "Customers", href: "/erp/sales/customers" },
      { title: "Quotations", href: "/erp/sales/quotations" },
      { title: "Sales Order", href: "/erp/sales/sales-order" },
      { title: "Sales Invoice", href: "/erp/sales/sales-invoice" },
    ],
  },
  {
    title: "Employee Setup",
    icon: Users,
    environment: "HR",
    permissions: [
      "employee.read",
      "employee.create",
      "user.read",
      "user.create",
    ],
    children: [
      {
        title: "Employee",
        children: [
          { title: "Create", href: "/hr/employee/create" },
          { title: "List", href: "/hr/employee/list" },
          { title: "User Accounts", href: "/hr/employee/user-account" },
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
    environment: "HR",
    permissions: [
      "attendance.read",
      "attendance.update",
      "attendance-exemption.read",
      "attendance-request-query.read",
      "working-hours-policy.read",
      "holiday.read",
    ],
    children: [
      {
        title: "Attendance",
        permissions: [
          "attendance.read",
          "attendance.update",
          "attendance-exemption.read",
          "attendance-request-query.read",
          "request-forwarding.read"
        ],
        children: [
          { title: "Manage", href: "/hr/attendance/manage", permissions: ["attendance.update"] },
          { title: "View", href: "/hr/attendance/view", permissions: ["attendance.read"] },
          { title: "Summary", href: "/hr/attendance/summary", permissions: ["attendance.read"] },
          { title: "Request", href: "/hr/attendance/request", permissions: ["attendance-request-query.create"] },
          { title: "Request List", href: "/hr/attendance/request-list", permissions: ["attendance-request-query.read"] },
          {
            title: "Exemptions",
            href: "/hr/attendance/exemptions",
            permissions: ["attendance-exemption.create"],
          },
          {
            title: "Exemptions List",
            href: "/hr/attendance/exemptions-list",
            permissions: ["attendance-exemption.read"],
          },
          {
            title: "Request Forwarding",
            href: "/hr/request-forwarding?type=attendance",
            permissions: ["request-forwarding.read"],
          },
        ],
      },
      {
        title: "Working Hours Policy",
        permissions: ["working-hours-policy.read"],
        children: [
          { title: "Create", href: "/hr/working-hours/create", permissions: ["working-hours-policy.create"] },
          { title: "View", href: "/hr/working-hours/view", permissions: ["working-hours-policy.read"] },
          {
            title: "Assign Policy",
            href: "/hr/working-hours/assign-policy",
            permissions: ["working-hours-policy.update"],
          },
        ],
      },
      {
        title: "Holidays",
        permissions: ["holiday.read"],
        children: [
          { title: "Create", href: "/hr/holidays/add", permissions: ["holiday.create"] },
          { title: "List", href: "/hr/holidays/list", permissions: ["holiday.read"] },
        ],
      },
    ],
  },
  {
    title: "Leaves Setup",
    icon: Palmtree,
    environment: "HR",
    permissions: [
      "leave-application.read",
      "leave-application.create",
    ],
    children: [
      { title: "Create Leave", href: "/hr/leaves/create-leaves", permissions: ["leave-application.create"] },
      { title: "View Requests", href: "/hr/leaves/requests", permissions: ["leave-application.read"] },
    ],
  },

  {
    title: "Payroll Setup",
    icon: Wallet,
    environment: "HR",
    permissions: [
      "payroll.read",
      "payroll.create",
      "allowance.read",
      "allowance.create",
      "deduction.read",
      "deduction.create",
      "advance-salary.read",
      "advance-salary.create",
      "loan-request.read",
      "loan-request.create",
      "bonus.read",
      "bonus.create",
      "provident-fund.read",
    ],
    children: [
      {
        title: "Payroll",
        permissions: ["payroll.read", "payroll.create"],
        children: [
          { title: "Create", href: "/hr/payroll-setup/payroll/create", permissions: ["payroll.create"] },
          { title: "View Report", href: "/hr/payroll-setup/payroll/report", permissions: ["payroll.create"] },
          { title: "Bank Report", href: "/hr/payroll-setup/payroll/bank-report", permissions: ["payroll.create"] },
          { title: "Payslips Emails", href: "/hr/payroll-setup/payroll/payslips", permissions: ["payroll.read"] },
        ],
      },
      {
        title: "Allowance",
        permissions: ["allowance.read", "allowance.create"],
        children: [
          { title: "Create", href: "/hr/payroll-setup/allowance/create", permissions: ["allowance.create"] },
          { title: "View", href: "/hr/payroll-setup/allowance/view", permissions: ["allowance.read"] },
          { title: "Bank Report", href: "/hr/payroll-setup/allowance/bank-report", permissions: ["allowance.read"] },
          { title: "Allowance Payslip", href: "/hr/payroll-setup/allowance/payslip", permissions: ["allowance.read"] },
        ],
      },
      {
        title: "Deduction",
        permissions: ["deduction.read", "deduction.create"],
        children: [
          { title: "Create", href: "/hr/payroll-setup/deduction/create", permissions: ["deduction.create"] },
          { title: "View", href: "/hr/payroll-setup/deduction/view", permissions: ["deduction.read"] },
        ],
      },
      {
        title: "Advance Salary",
        permissions: ["advance-salary.read", "advance-salary.create"],
        children: [
          { title: "Create Request", href: "/hr/payroll-setup/advance-salary/create", permissions: ["advance-salary.create"] },
          { title: "View Requests", href: "/hr/payroll-setup/advance-salary/view", permissions: ["advance-salary.read"] },
          { title: "Request Forwarding", href: "/hr/request-forwarding?type=advance-salary", permissions: ["advance-salary.read"] },
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
          // { title: "Create PF", href: "/hr/payroll-setup/pf-employee/create" },
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
        title: "Social Security",
        children: [
          { title: "View Social Security", href: "/hr/payroll-setup/social-security-employee/view" },
        ],
      },
      {
        title: "Final Settlement",
        children: [
          { title: "Create", href: "/hr/payroll-setup/final-settlement/create" },
          { title: "List", href: "/hr/payroll-setup/final-settlement/list" },
        ],
      },
      // {
      //   title: "HR Letters",
      //   icon: FileText,
      //   children: [
      //     { title: "Create", href: "/hr/payroll-setup/hr-letters/create" },
      //     { title: "View", href: "/hr/payroll-setup/hr-letters/view" },
      //     { title: "Upload", href: "/hr/payroll-setup/hr-letters/upload" },
      //   ],
      // },
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
    title: "Admin",
    icon: Shield,
    environment: "ADMIN",
    children: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Activity Logs", href: "/admin/activity-logs", icon: FileText },
      { title: "Roles & Permissions", href: "/admin/roles", icon: Users },
      { title: "System Settings", href: "/admin/settings", icon: Settings },
    ],
  },
  {
    title: "Profile Settings",
    icon: Settings,
    environment: "BOTH",
    children: [
    { title: "Change Password", href: "/hr/settings/password" },
    { title: "Edit Profile", href: "/hr/settings/profile" },
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

export function filterMenuByPermissions(
  items: MenuItem[],
  options: {
    hasAnyPermission: (permissions: string[]) => boolean;
    hasAllPermissions: (permissions: string[]) => boolean;
    isAdmin: () => boolean;
  }
): MenuItem[] {
  const { hasAnyPermission, hasAllPermissions, isAdmin } = options;

  // Only bypass permission checks for super_admin role
  // Regular admin roles and all other roles must respect their assigned permissions
  // This ensures role-based access control works correctly
  if (isAdmin()) {
    // isAdmin() now only returns true for super_admin
    return items;
  }

  const filterItems = (source: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];

    for (const item of source) {
      const hasOwnPermissions = item.permissions && item.permissions.length > 0;
      
      // For items with children, filter children FIRST
      // Then decide if parent should be shown based on accessible children
      let children = item.children ? filterItems(item.children) : undefined;
      
      // If item has children and all children were filtered out, hide parent
      // UNLESS it's "Profile Settings" which should always be shown
      if (item.children && (!children || children.length === 0) && !item.href && item.title !== "Profile Settings") {
        if (process.env.NODE_ENV === 'development') {
          console.log(`RBAC Filter Parent: ${item.title} - All children filtered out, hiding parent`);
        }
        continue;
      }
      
      // Now check if parent itself should be shown
      let allowed = true; // Default to true for items without permissions
      
      // If item has permissions defined, check them
      if (hasOwnPermissions) {
        // Use normal OR/AND logic - if user has ANY of the required permissions, show the menu
        allowed = item.requireAllPermissions
          ? hasAllPermissions(item.permissions!)
          : hasAnyPermission(item.permissions!);
          
        if (process.env.NODE_ENV === 'development') {
          console.log(`RBAC Filter Item: ${item.title}`, {
            required: item.permissions,
            allowed,
            hasOwnPermissions,
            hasAnyPermission: hasAnyPermission(item.permissions!),
            hasAllPermissions: hasAllPermissions(item.permissions!),
            accessibleChildren: children?.length || 0
          });
        }

        // If user doesn't have required permissions, skip this item
        // UNLESS it has accessible children (in which case we already checked above)
        if (!allowed && (!item.children || !children || children.length === 0)) {
          continue;
        }
        
        // If parent doesn't have permissions but has accessible children, show it
        if (!allowed && children && children.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`RBAC Filter Parent: ${item.title} - Showing parent because user has access to ${children.length} child(ren) even without parent permissions`);
          }
          allowed = true; // Override to show parent
        }
      } else {
        // Items without permissions are only allowed if they have no children OR
        // if they're explicitly public items like Dashboard
        // For security, we'll hide items without permissions unless they're explicitly marked
        // Dashboard is an exception - it should be visible to all authenticated users
        if (item.title === "Dashboard" || item.title === "Profile Settings" || item.title === "Change Password" || item.title === "Edit Profile") {
          allowed = true; // Allow Dashboard and Profile Settings for all authenticated users
        } else if (item.children && (!children || children.length === 0)) {
          // Hide items without permissions if they have no accessible children
          // UNLESS it's "Profile Settings"
          if (process.env.NODE_ENV === 'development') {
            console.log(`RBAC Filter Item: ${item.title} - No permissions defined and no accessible children, hiding for security`);
          }
          if (item.title !== "Profile Settings") {
             continue;
          }
        } else if (item.children && children && children.length > 0) {
          // Item has no permissions but has accessible children - show it
          allowed = true;
        } else {
          // Hide other items without permissions for security
          if (process.env.NODE_ENV === 'development') {
            console.log(`RBAC Filter Item: ${item.title} - No permissions defined, hiding for security`);
          }
          continue;
        }
      }

      result.push({
        ...item,
        children,
      });
    }

    return result;
  };

  return filterItems(items);
}
