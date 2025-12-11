import { getEmployees } from "@/lib/actions/employee";
import { AttendanceExemptionsList } from "./attendance-exemptions-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

// Mock data - replace with actual API call
const mockExemptions = [
  {
    id: "1",
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "IT",
    subDepartment: "Development",
    attendanceDate: "2024-01-15",
    flagType: "Late",
    exemptionType: "Medical Emergency",
    reason: "Had a medical emergency",
    approvalStatus: "pending",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    employeeId: "EMP002",
    employeeName: "Jane Smith",
    department: "HR",
    subDepartment: "Recruitment",
    attendanceDate: "2024-01-16",
    flagType: "Absent",
    exemptionType: "Family Emergency",
    reason: "Family emergency situation",
    approvalStatus: "approved",
    createdAt: "2024-01-16T09:00:00Z",
  },
];

export default async function AttendanceExemptionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const employeesResult = await getEmployees();

    if (!employeesResult.status || !employeesResult.data) {
      return (
        <ListError
          title="Failed to load employees"
          message={employeesResult.message || "Unable to fetch employees. Please check your connection and try again."}
        />
      );
    }

    const employees = employeesResult.data || [];
    // TODO: Replace mockExemptions with actual API call
    // const exemptionsResult = await getAttendanceExemptions();
    // const exemptions = exemptionsResult.status && exemptionsResult.data ? exemptionsResult.data : [];

    return (
      <AttendanceExemptionsList
        initialExemptions={mockExemptions}
        employees={employees}
        newItemId={newItemId}
      />
    );
  } catch (error) {
    console.error("Error in AttendanceExemptionsListPage:", error);
    return (
      <ListError
        title="Failed to load attendance exemptions"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}

