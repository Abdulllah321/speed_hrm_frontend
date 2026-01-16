import { getRoles } from "@/lib/actions/roles";
import { getCurrentUser } from "@/lib/auth";
import { RoleList } from "./list/role-list";

export default async function RolesPage() {
  const [{ data: roles }, user] = await Promise.all([
    getRoles(),
    getCurrentUser()
  ]);

  return (
    <div className="container mx-auto py-6">
      <RoleList initialRoles={roles} userPermissions={user?.permissions || []} />
    </div>
  );
}
