// Route to permission mapping for HRM pages
// This ensures users can only access routes they have permissions for

export const routePermissions: Record<string, string[]> = {
  // Dashboard - public (no permissions required)
  "/hr": [],
  
  // Employee Setup
  "/hr/employee/create": ["employee.create"],
  "/hr/employee/list": ["employee.read"],
  "/hr/employee/view": ["employee.read"],
  "/hr/employee/edit": ["employee.update"],
  "/hr/employee/user-account": ["user.read"],
  "/hr/employee/user-account/create": ["user.create"],
  
  // Exit Clearance
  "/hr/exit-clearance/create": ["employee.create"],
  "/hr/exit-clearance/list": ["employee.read"],
  
  // Attendance Setup
  "/hr/attendance/manage": ["attendance.update"],
  "/hr/attendance/view": ["attendance.read"],
  "/hr/attendance/summary": ["attendance.read"],
  "/hr/attendance/request": ["attendance.read"],
  "/hr/attendance/request-list": ["attendance.read"],
  "/hr/attendance/exemptions": ["attendance-exemption.read"],
  "/hr/attendance/exemptions-list": ["attendance-exemption.read"],
  
  // Working Hours
  "/hr/working-hours/create": ["attendance.read"],
  "/hr/working-hours/view": ["attendance.read"],
  "/hr/working-hours/assign-policy": ["attendance.read"],
  
  // Holidays
  "/hr/holidays/add": ["attendance.read"],
  "/hr/holidays/list": ["attendance.read"],
  
  // Leaves
  "/hr/leaves/create-leaves": ["leave-application.create"],
  "/hr/leaves/requests": ["leave-application.read"],
  
  // Payroll Setup
  "/hr/payroll-setup/payroll/create": ["payroll.create"],
  "/hr/payroll-setup/payroll/report": ["payroll.read"],
  "/hr/payroll-setup/payroll/bank-report": ["payroll.read"],
  "/hr/payroll-setup/payroll/payslips": ["payroll.read"],
  
  // Allowance
  "/hr/payroll-setup/allowance/create": ["allowance.create"],
  "/hr/payroll-setup/allowance/view": ["allowance.read"],
  "/hr/payroll-setup/allowance/bank-report": ["allowance.read"],
  "/hr/payroll-setup/allowance/payslip": ["allowance.read"],
  
  // Deduction
  "/hr/payroll-setup/deduction/create": ["deduction.create"],
  "/hr/payroll-setup/deduction/view": ["deduction.read"],
  
  // Advance Salary
  "/hr/payroll-setup/advance-salary/create": ["advance-salary.create"],
  "/hr/payroll-setup/advance-salary/view": ["advance-salary.read"],
  
  // Loan Requests
  "/hr/loan-requests/create": ["loan-request.create"],
  "/hr/loan-requests/view": ["loan-request.read"],
  
  // Increment
  "/hr/payroll-setup/increment/create": ["payroll.read"],
  "/hr/payroll-setup/increment/view": ["payroll.read"],
  
  // Bonus
  "/hr/payroll-setup/bonus/issue": ["bonus.create"],
  "/hr/payroll-setup/bonus/view": ["bonus.read"],
  "/hr/payroll-setup/bonus/bank-report": ["bonus.read"],
  "/hr/payroll-setup/bonus/payslip": ["bonus.read"],
  
  // Leave Encashment
  "/hr/payroll-setup/leave-encashment/create": ["payroll.read"],
  "/hr/payroll-setup/leave-encashment/list": ["payroll.read"],
  
  // PF for Employee
  "/hr/payroll-setup/pf-employee/view": ["provident-fund.read"],
  "/hr/payroll-setup/pf-employee/withdraw-create": ["provident-fund.read"],
  "/hr/payroll-setup/pf-employee/withdraw-view": ["provident-fund.read"],
  "/hr/payroll-setup/pf-employee/report": ["provident-fund.read"],
  "/hr/payroll-setup/pf-employee/ledger": ["provident-fund.read"],
  
  // Final Settlement
  "/hr/payroll-setup/final-settlement/create": ["payroll.read"],
  "/hr/payroll-setup/final-settlement/list": ["payroll.read"],
  
  // Salary Sheet
  "/hr/salary-sheet/tax-certificate": ["payroll.read"],
  
  // Request Forwarding
  "/hr/request-forwarding": ["attendance.read", "advance-salary.read", "loan-request.read"],
  
  // Settings - public (all authenticated users)
  "/hr/settings/password": [],
  "/hr/settings/profile": [],
};

// Default permissions for routes that don't have explicit mapping
// If a route is not in the mapping above, it will require these permissions
// Set to empty array [] to allow all authenticated users, or specify permissions to restrict
const DEFAULT_ROUTE_PERMISSIONS: string[] = [];

/**
 * Check if route should be accessible without explicit permissions
 */
export function isPublicRoute(pathname: string): boolean {
  // Dashboard and settings are always public
  if (pathname === "/hr" || pathname.startsWith("/hr/settings")) {
    return true;
  }
  
  // If route has explicit empty permissions, it's public
  const permissions = getRoutePermissions(pathname);
  return permissions.length === 0 && routePermissions[pathname] !== undefined;
}

/**
 * Get required permissions for a route
 */
export function getRoutePermissions(pathname: string): string[] {
  // Normalize pathname (remove trailing slash, handle query params)
  const normalizedPath = pathname.split('?')[0].replace(/\/$/, '') || pathname;
  
  // Check exact match first
  if (routePermissions[normalizedPath]) {
    return routePermissions[normalizedPath];
  }
  
  // Check prefix matches (for dynamic routes like /hr/employee/view/[id])
  // Sort by length (longest first) to match most specific routes first
  const sortedRoutes = Object.entries(routePermissions).sort((a, b) => b[0].length - a[0].length);
  
  for (const [route, permissions] of sortedRoutes) {
    if (normalizedPath.startsWith(route)) {
      return permissions;
    }
  }
  
  // If route is not in mapping, check if it's a known HR route
  // For unknown routes, require at least some HR permission to prevent unauthorized access
  if (normalizedPath.startsWith("/hr/")) {
    // Return default permissions for unknown HR routes
    // This ensures users can't access routes that aren't explicitly allowed
    return DEFAULT_ROUTE_PERMISSIONS.length > 0 ? DEFAULT_ROUTE_PERMISSIONS : ["employee.read"];
  }
  
  // Default: no permissions required (public route)
  return [];
}

/**
 * Check if a route requires permissions
 */
export function routeRequiresPermissions(pathname: string): boolean {
  const permissions = getRoutePermissions(pathname);
  return permissions.length > 0;
}

