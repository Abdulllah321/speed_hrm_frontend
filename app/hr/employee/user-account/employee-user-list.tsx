"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/common/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Employee } from "@/lib/actions/employee";
import type { Role } from "@/lib/actions/roles";
import type { User } from "@/lib/actions/users";
import { updateUserRole, createUser, resetUserPassword } from "@/lib/actions/users";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, LayoutDashboard, KeyRound } from "lucide-react";
import Link from "next/link";
import { ManagerVerificationDialog } from "@/components/auth/manager-verification-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

interface Row {
  employeeId: string;
  employeeCode: string;
  userId: string | null;
  roleId: string | null;
  employeeName: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  isDashboardEnabled: boolean;
}

interface Props {
  employees: Employee[];
  users: User[];
  roles: Role[];
  userPermissions: string[];
  userRole?: string | null;
}

export function EmployeeUserList({
  employees,
  users,
  roles,
  userPermissions,
  userRole,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [savingForId, setSavingForId] = useState<string | null>(null);
  const [impersonatePendingId, setImpersonatePendingId] = useState<
    string | null
  >(null);

  // Reset password state
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetRow, setResetTargetRow] = useState<Row | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, startResetTransition] = useTransition();

  const roleName = (userRole || "").toLowerCase().trim();
  const isAdminRole =
    roleName === "admin" ||
    roleName === "super_admin" ||
    roleName === "super admin" ||
    roleName === "super-admin";
  const canCreate = isAdminRole || userPermissions.includes("user.create");
  const canUpdate = isAdminRole || userPermissions.includes("user.update");

  const userByEmployeeId = new Map<string, User>();
  for (const u of users) {
    if (u.employee?.id) {
      userByEmployeeId.set(u.employee.id, u);
    } else if (u.employeeId) {
      userByEmployeeId.set(u.employeeId, u);
    }
  }

  const rows: Row[] = employees.map((e) => {
    const matchedUser = userByEmployeeId.get(e.id) || null;
    const email = matchedUser?.email || e.officialEmail || "";
    return {
      employeeId: e.id,
      employeeCode: e.employeeId,
      userId: matchedUser?.id || null,
      roleId: matchedUser?.role?.id || null,
      employeeName: e.employeeName,
      email,
      department: e.departmentName || e.department || "N/A",
      designation: e.designationName || e.designation || "N/A",
      status: e.status,
      isDashboardEnabled: matchedUser?.isDashboardEnabled || false,
    };
  });

  // If coming from Employee List with a specific employeeId, show only that employee's user row
  const employeeIdParam = searchParams.get("employeeId");
  const visibleRows = employeeIdParam
    ? rows.filter((r) => r.employeeId === employeeIdParam)
    : rows;

  const handleAssign = (row: Row, newRoleId: string | null) => {
    if (!canUpdate) return;

    if (!row.userId) {
      if (!canCreate) {
        toast.error("You don't have permission to create user accounts");
        return;
      }
      if (!row.email) {
        toast.error("Official email not set for this employee");
        return;
      }
      const parts = row.employeeName.trim().split(" ");
      const firstName = parts[0] || row.employeeName;
      const lastName = parts.slice(1).join(" ") || "";

      setSavingForId(row.employeeId);
      startTransition(async () => {
        const result = await createUser({
          email: row.email,
          firstName,
          lastName,
          employeeId: row.employeeId,
          roleId: newRoleId || undefined,
        });
        if (result.status) {
          toast.success("User account created and role assigned");
          window.location.reload();
        } else {
          toast.error(result.message || "Failed to create user");
        }
        setSavingForId(null);
      });
    } else {
      setSavingForId(row.employeeId);
      startTransition(async () => {
        const result = await updateUserRole(row.userId!, newRoleId);
        if (result.status) {
          toast.success("Role updated successfully");
          router.refresh();
        } else {
          toast.error(result.message || "Failed to update role");
        }
        setSavingForId(null);
      });
    }
  };

  // Opens the manager verification dialog before showing the reset form
  const handleResetPasswordClick = (row: Row) => {
    if (!row.userId) {
      toast.error("No user account linked to this employee");
      return;
    }
    setResetTargetRow(row);
    setNewPassword("");
    setConfirmPassword("");
    setVerifyDialogOpen(true);
  };

  // Called after manager verification passes — show the new-password form
  const handleVerified = () => {
    setResetDialogOpen(true);
  };

  // Performs the actual password reset
  const handleConfirmReset = () => {
    if (!newPassword) {
      toast.error("New password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!resetTargetRow?.userId) return;

    startResetTransition(async () => {
      const result = await resetUserPassword(resetTargetRow.userId!, newPassword);
      if (result.status) {
        toast.success(`Password reset for ${resetTargetRow.employeeName}. They will be prompted to change it on next login.`);
        setResetDialogOpen(false);
        setResetTargetRow(null);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.message || "Failed to reset password");
      }
    });
  };

  const handleDashboardAccess = async (row: Row) => {
    try {
      setImpersonatePendingId(row.employeeId);

      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

      const res = await fetch(`${apiBase}/auth/impersonate-by-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ employeeId: row.employeeId }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.status) {
        toast.error(
          payload.message ||
            "Failed to open dashboard. Make sure user account & dashboard access exist.",
        );
        return;
      }

      // Navigate in the same tab so the impersonation banner is visible
      window.location.href = "/hr";
    } catch (error) {
      console.error("Error impersonating user:", error);
      toast.error("Failed to open dashboard");
    } finally {
      setImpersonatePendingId(null);
    }
  };

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "employeeCode",
      header: "Employee ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("employeeCode")}</div>
      ),
    },
    {
      accessorKey: "employeeName",
      header: "Employee Details",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium">{r.employeeName}</div>
            <div className="text-xs text-muted-foreground">
              {r.department} • {r.designation}
            </div>
          </div>
        );
      },
    },
    { accessorKey: "email", header: "Email / Username" },
    {
      accessorKey: "roleId",
      header: "Assigned Role",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <Select
            value={r.roleId || "none"}
            onValueChange={(value) =>
              handleAssign(r, value === "none" ? null : value)
            }
            disabled={!canUpdate || isPending || savingForId === r.employeeId}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Role</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "active" ? "default" : "destructive"}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="flex w-full items-center"
                  onClick={() => handleDashboardAccess(r)}
                  disabled={!!impersonatePendingId}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {impersonatePendingId === r.employeeId
                    ? "Opening..."
                    : "Dashboard Access"}
                </button>
              </DropdownMenuItem>
              {canUpdate && r.userId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button
                      type="button"
                      className="flex w-full items-center text-amber-600 focus:text-amber-600"
                      onClick={() => handleResetPasswordClick(r)}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </button>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={visibleRows}
        searchFields={[
          { key: "email", label: "Email" },
          { key: "employeeName", label: "Name" },
        ]}
        toggleAction={
          canCreate
            ? () => router.push("/hr/employee/user-account/create")
            : undefined
        }
        actionText="Create User Account"
        title="User Accounts"
        onMultiDelete={undefined}
      />

      <div className="mt-4 text-xs text-muted-foreground">
        Current Role: {userRole || "None"} | Admin Access:{" "}
        {isAdminRole ? "Yes" : "No"}
      </div>

      {/* Step 1: Manager verification */}
      <ManagerVerificationDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        onVerified={handleVerified}
        title="Manager Verification Required"
        description={`Verify your identity before resetting the password for ${resetTargetRow?.employeeName || "this employee"}.`}
      />

      {/* Step 2: New password form */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={(o) => {
          if (!isResetting) {
            setResetDialogOpen(o);
            if (!o) {
              setNewPassword("");
              setConfirmPassword("");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-amber-500/10">
                <KeyRound className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle>Reset Password</DialogTitle>
            </div>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium">{resetTargetRow?.employeeName}</span>.
              They will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isResetting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isResetting}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmReset()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
