import { getSalePools } from "@/lib/actions/sale-pool";
import { SalePoolList } from "./sale-pool-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

export default async function SalePoolListPage() {
  try {
    const result = await getSalePools();

    if (!result.status || !result.data) {
      return (
        <ListError
          title="Failed to load sale pools"
          message={result.message || "Unable to fetch sale pools. Please check your connection and try again."}
        />
      );
    }

    return (
      <SalePoolList
        initialSalePools={result.data || []}
      />
    );
  } catch (error) {
    return (
      <ListError
        title="Failed to load sale pools"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
