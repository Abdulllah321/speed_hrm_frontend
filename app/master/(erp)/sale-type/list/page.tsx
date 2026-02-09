import { getSaleTypes } from "@/lib/actions/sale-type";
import { SaleTypeList } from "./sale-type-list";
import { ListError } from "@/components/dashboard/list-error";
// import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function SaleTypeListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getSaleTypes();

    if (!result || (result.status === false && result.message)) {
       // Note: result might be array if backend returns array directly, or object with data
       // Designation action returns { status: boolean, data: [] }
       // My implemented sale-type action returns { status: boolean, data: [] }
    }
    
    // In case result is null or undefined check
    const data = result?.data || [];
    const status = result?.status ?? false;

    if (!status && !data.length) {
      return (
        <ListError
          title="Failed to load sale types"
          message={result?.message || "Unable to fetch sale types. Please check your connection and try again."}
        />
      );
    }

    return (
      // <PermissionGuard permissions="sale-type.read">
        <SaleTypeList
          initialSaleTypes={data}
          newItemId={newItemId}
        />
      // </PermissionGuard>
    );
  } catch (error) {
    console.error("Error in SaleTypeListPage:", error);
    return (
      <ListError
        title="Failed to load sale types"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
