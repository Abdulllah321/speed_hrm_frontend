"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/common/data-table";
import { columns, UserRow } from "./columns";
import { User, updateUserRole } from "@/lib/actions/users";
import { Role } from "@/lib/actions/roles";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface UserListProps {
  initialUsers: User[];
  roles: Role[];
  userPermissions: string[];
}

export function UserList({ initialUsers, roles, userPermissions }: UserListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const canCreate = userPermissions.includes('user.create');
  const canUpdate = userPermissions.includes('user.update');

  const handleCreate = () => {
    router.push("/hr/employee/user-account/create");
  };

  const handleEdit = (id: string) => {
    // For now, we only support role assignment via the separate action, 
    // but we could navigate to a full edit page if needed.
    // For this task, "assign hr panel" implies role assignment.
    const user = data.find(u => u.id === id);
    if (user) {
        setSelectedUser(user);
        // Find the role id based on name (imperfect but works if we don't have id in row)
        // Better: pass roleId in UserRow
        const currentRole = roles.find(r => r.name === user.roleName);
        setSelectedRoleId(currentRole?.id || "");
        setRoleDialogOpen(true);
    }
  };

  const handleRoleSave = () => {
      if (!selectedUser) return;
      
      startTransition(async () => {
          const result = await updateUserRole(selectedUser.id, selectedRoleId);
          if (result.status) {
              toast.success("Role assigned successfully");
              setRoleDialogOpen(false);
              router.refresh();
          } else {
              toast.error(result.message);
          }
      });
  }

  const data: UserRow[] = initialUsers.map((user) => ({
    id: user.id,
    name: user.firstName + " " + user.lastName,
    email: user.email,
    roleName: user.role?.name || "",
    employeeName: user.employee?.employeeName || "N/A",
    department: user.employee?.department?.name || "N/A",
    designation: user.employee?.designation?.name || "N/A",
    status: user.status,
  }));

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchFields={[{ key: "email", label: "Email" }, { key: "name", label: "Name" }]}
        toggleAction={canCreate ? handleCreate : undefined}
        onRowEdit={canUpdate ? (row) => handleEdit(row.id) : undefined}
        actionText="Create User Account"
        title="User Accounts"
        // Disable delete for now as it's not requested
        onMultiDelete={undefined} 
      />

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.employeeName} ({selectedUser?.email}) to grant system access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="col-span-3">
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
