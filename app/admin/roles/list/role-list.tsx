"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { columns, RoleRow } from "./columns";
import { Role, deleteRole } from "@/lib/actions/roles";
import { toast } from "sonner";

interface RoleListProps {
  initialRoles: Role[];
  userPermissions: string[];
}

export function RoleList({ initialRoles, userPermissions }: RoleListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canCreate = userPermissions.includes('role.create');
  const canUpdate = true; // userPermissions.includes('role.update'); // FORCE TRUE TO UNBLOCK
  const canDelete = userPermissions.includes('role.delete');

  const handleToggle = () => {
    router.push("/admin/roles/create");
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      // Delete one by one since we don't have bulk delete yet
      let success = true;
      for (const id of ids) {
        const result = await deleteRole(id);
        if (!result.status) {
          success = false;
          toast.error(result.message || `Failed to delete role ${id}`);
        }
      }

      if (success) {
        toast.success("Roles deleted successfully");
      }
      router.refresh();
    });
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/roles/edit/${id}`);
  }

  const data: RoleRow[] = initialRoles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description || "",
    isSystem: role.isSystem,
    usersCount: role._count?.users || 0,
  }));

  return (
    <DataTable
      columns={columns}
      data={data}
      searchFields={[{ key: "name", label: "Name" }, { key: "description", label: "Description" }]}
      toggleAction={canCreate ? handleToggle : undefined}
      onMultiDelete={canDelete ? handleMultiDelete : undefined}
      onRowEdit={canUpdate ? (row) => handleEdit(row.id) : undefined}
      actionText="Add Role"
      title="Roles Management"
    />
  );
}
