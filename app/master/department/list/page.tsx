import { getDepartments } from "@/lib/actions/department";
import { DepartmentList } from "./department-list";
import { ListError } from "@/components/dashboard/list-error";
import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function DepartmentListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  console.log("🔍 DepartmentListPage: Starting to load...");

  try {
    const { newItemId } = await searchParams;
    console.log("🔍 DepartmentListPage: searchParams resolved, newItemId:", newItemId);

    console.log("🔍 DepartmentListPage: Calling getDepartments()...");
    const result = await getDepartments();
    console.log("🔍 DepartmentListPage: getDepartments() result:", result);

    if (!result.status || !result.data) {
      console.log("❌ DepartmentListPage: API call failed or no data");
      return (
        <ListError
          title="Failed to load departments"
          message={result.message || "Unable to fetch departments. Please check your connection and try again."}
        />
      );
    }

    console.log("✅ DepartmentListPage: Rendering DepartmentList with data:", result.data.length, "items");
    return (
      <PermissionGuard permissions="department.read">
        <DepartmentList
          initialDepartments={result.data || []}
          newItemId={newItemId}
        />
      </PermissionGuard>
    );
  } catch (error) {
    console.error("❌ Error in DepartmentListPage:", error);
    return (
      <ListError
        title="Failed to load departments"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
