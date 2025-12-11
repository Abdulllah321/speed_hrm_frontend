import { getAllAttendanceRequestQueries } from "@/lib/actions/attendance-request-query";
import { getAllEmployeesForClearance } from "@/lib/actions/exit-clearance";
import { AttendanceRequestQueryList } from "./attendance-request-query-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

export default async function AttendanceRequestQueryListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const [queriesResult, employeesResult] = await Promise.all([
      getAllAttendanceRequestQueries(),
      getAllEmployeesForClearance(),
    ]);

    if (!queriesResult.status || !queriesResult.data) {
      return (
        <ListError
          title="Failed to load attendance request queries"
          message={queriesResult.message || "Unable to fetch attendance request queries. Please check your connection and try again."}
        />
      );
    }

    const employees = employeesResult.status && employeesResult.data ? employeesResult.data : [];

    return (
      <AttendanceRequestQueryList
        initialQueries={queriesResult.data || []}
        employees={employees}
        newItemId={newItemId}
      />
    );
  } catch (error) {
    console.error("Error in AttendanceRequestQueryListPage:", error);
    return (
      <ListError
        title="Failed to load attendance request queries"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}

