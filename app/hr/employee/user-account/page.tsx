import { getUsers } from "@/lib/actions/users";
import { getRoles } from "@/lib/actions/roles";
import { getCurrentUser } from "@/lib/auth";
import { UserList } from "./user-list";

export default async function UserAccountPage() {
  const [{ data: users }, { data: roles }, user] = await Promise.all([
    getUsers(),
    getRoles(),
    getCurrentUser()
  ]);

  return (
    <div className="container mx-auto py-6">
      <UserList initialUsers={users} roles={roles} userPermissions={user?.permissions || []} />
    </div>
  );
}
