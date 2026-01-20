import { getPermissions } from "@/lib/actions/permissions";
import { RoleForm } from "./role-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function CreateRolePage() {
  const { data: permissions, status } = await getPermissions();

  return (
    <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Create New Role</h1>
        {!status && (
            <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to load permissions. Please ensure you are logged in and have the necessary access.
                </AlertDescription>
            </Alert>
        )}
        <RoleForm permissions={permissions || []} />
    </div>
  );
}
