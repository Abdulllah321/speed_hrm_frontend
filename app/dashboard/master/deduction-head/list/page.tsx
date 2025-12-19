import { getDeductionHeads } from "@/lib/actions/deduction-head";
import { DeductionHeadList } from "./deduction-head-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

export default async function DeductionHeadListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getDeductionHeads();

    if (!result.status || !result.data) {
      return (
        <ListError
          title="Failed to load deduction heads"
          message={result.message || "Unable to fetch deduction heads. Please check your connection and try again."}
        />
      );
    }

    return (
      <DeductionHeadList
        initialDeductionHeads={result.data || []}
        newItemId={newItemId}
      />
    );
  } catch (error) {
    console.error("Error in DeductionHeadListPage:", error);
    return (
      <ListError
        title="Failed to load deduction heads"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}

