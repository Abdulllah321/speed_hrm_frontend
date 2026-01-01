import { getEmployees } from "@/lib/actions/employee";
import { getDepartments } from "@/lib/actions/department";
import { getAttendanceProgressSummary, type AttendanceProgress } from "@/lib/actions/attendance";
import { AttendanceProgressSummary } from "./attendance-progress-summary";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";


export default async function AttendanceProgressSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    newItemId?: string;
    employeeId?: string;
    departmentId?: string;
    subDepartmentId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  try {
    const params = await searchParams;
    const { newItemId, employeeId, departmentId, subDepartmentId, dateFrom, dateTo } = params;
    
    // Default date range: current month
    const defaultDateFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const defaultDateTo = new Date();
    
    const [employeesResult, departmentsResult, progressResult] = await Promise.all([
      getEmployees(),
      getDepartments(),
      getAttendanceProgressSummary({
        employeeId,
        departmentId,
        subDepartmentId,
        dateFrom: dateFrom ? new Date(dateFrom) : defaultDateFrom,
        dateTo: dateTo ? new Date(dateTo) : defaultDateTo,
      }),
    ]);

    if (!employeesResult.status || !employeesResult.data) {
      return (
        <ListError
          title="Failed to load employees"
          message={employeesResult.message || "Unable to fetch employees. Please check your connection and try again."}
        />
      );
    }

    if (!departmentsResult.status || !departmentsResult.data) {
      return (
        <ListError
          title="Failed to load departments"
          message={departmentsResult.message || "Unable to fetch departments. Please check your connection and try again."}
        />
      );
    }

    if (!progressResult.status) {
      return (
        <ListError
          title="Failed to load attendance progress"
          message={progressResult.message || "Unable to fetch attendance progress. Please check your connection and try again."}
        />
      );
    }

    const employees = employeesResult.data || [];
    const departments = departmentsResult.data || [];
    const progressData = progressResult.data || [];

    return (
      <AttendanceProgressSummary
        initialData={progressData}
        employees={employees}
        departments={departments}
        newItemId={newItemId}
      />
    );
  } catch (error) {
    console.error("Error in AttendanceProgressSummaryPage:", error);
    return (
      <ListError
        title="Failed to load attendance progress"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}

