import { getPermissions } from "@/lib/actions/permissions";
import { RoleForm } from "./role-form";

export default async function CreateRolePage() {
  const { data: permissions } = await getPermissions();

  return (
    <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Create New Role</h1>
        <RoleForm permissions={permissions} />
    </div>
  );
}
