import { getPermissions } from "@/lib/actions/permissions";
import { getRoleById } from "@/lib/actions/roles";
import { RoleForm } from "../../create/role-form";
import { notFound } from "next/navigation";

interface EditRolePageProps {
  params: Promise<{
    id: string;
  }>
}

export default async function EditRolePage({ params }: EditRolePageProps) {
  const { id } = await params;
  const [{ data: role }, { data: permissions }] = await Promise.all([
    getRoleById(id),
    getPermissions()
  ]);

  if (!role) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">

      <RoleForm permissions={permissions} initialData={role} />
    </div>
  );
}
