import { getCompanyGroups } from "@/lib/actions/company-group";
import { CompanyGroupList } from "./company-group-list";
import { ListError } from "@/components/dashboard/list-error";
// import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function CompanyGroupListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getCompanyGroups();

    const data = result?.data || [];
    const status = result?.status ?? false;

    if (!status && !data.length) {
      return (
        <ListError
          title="Failed to load company groups"
          message={result?.message || "Unable to fetch company groups. Please check your connection and try again."}
        />
      );
    }

    return (
      // <PermissionGuard permissions="master.company-group.read">
        <CompanyGroupList
          initialData={data}
          newItemId={newItemId}
        />
      // </PermissionGuard>
    );
  } catch (error) {
    console.error("Error in CompanyGroupListPage:", error);
    return (
      <ListError
        title="Failed to load company groups"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
