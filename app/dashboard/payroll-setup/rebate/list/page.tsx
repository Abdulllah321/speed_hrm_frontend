import { RebateList } from "./rebate-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

// TODO: Replace with actual API call when backend is ready
// import { getAllRebates } from "@/lib/actions/rebate";

export default async function RebateListPage() {
  try {
    // TODO: Uncomment when backend is ready
    // const result = await getAllRebates();
    // const initialData = result.status && result.data ? result.data : [];

    // Temporary empty data for frontend-only implementation
    const initialData: any[] = [];

    return <RebateList initialData={initialData} />;
  } catch (error) {
    console.error("Error in RebateListPage:", error);
    return (
      <ListError
        title="Failed to load rebate records"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}

