import { getSalesmen } from "@/lib/actions/salesman";
import { SalesmanList } from "./salesman-list";
import { ListError } from "@/components/dashboard/list-error";
import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function SalesmanListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getSalesmen();

    const data = result?.data || [];
    const status = result?.status ?? false;

    if (!status && !data.length) {
      return (
        <ListError
          title="Failed to load salesmen"
          message={result?.message || "Unable to fetch salesmen. Please check your connection and try again."}
        />
      );
    }

    return (
      <PermissionGuard permissions="salesman.read">
        <SalesmanList
          initialSalesmen={data}
          newItemId={newItemId}
        />
      </PermissionGuard>
    );
  } catch (error) {
    console.error("Error in SalesmanListPage:", error);
    return (
      <ListError
        title="Failed to load salesmen"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
