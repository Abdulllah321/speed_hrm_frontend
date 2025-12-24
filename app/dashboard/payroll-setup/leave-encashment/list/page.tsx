import { LeaveEncashmentList } from "./leave-encashment-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

// TODO: Replace with actual API call when backend is ready
// import { getAllLeaveEncashments } from "@/lib/actions/leave-encashment";

export default async function LeaveEncashmentListPage() {
  try {
    // TODO: Uncomment when backend is ready
    // const result = await getAllLeaveEncashments();
    // const initialData = result.status && result.data ? result.data : [];

    // Temporary empty data for frontend-only implementation
    const initialData: any[] = [];

    return <LeaveEncashmentList initialData={initialData} />;
  } catch (error) {
    console.error("Error in LeaveEncashmentListPage:", error);
    return (
      <ListError
        title="Failed to load leave encashment records"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}

