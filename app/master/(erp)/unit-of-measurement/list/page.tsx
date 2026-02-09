import { getUoms } from "@/lib/actions/uom";
import { UomList } from "./uom-list";
import { ListError } from "@/components/dashboard/list-error";
import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function UomListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getUoms();

    if (!result.status || !result.data) {
      return (
        <ListError
          title="Failed to load UOMs"
          message={result.message || "Unable to fetch units of measurement."}
        />
      );
    }

    return (
      <PermissionGuard permissions="erp.uom.read">
        <UomList initialUoms={result.data || []} newItemId={newItemId} />
      </PermissionGuard>
    );
  } catch (error) {
    console.error("Error in UomListPage:", error);
    return (
      <ListError
        title="Failed to load UOMs"
        message={error instanceof Error ? error.message : "An unexpected error occurred."}
      />
    );
  }
}
