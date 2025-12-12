import { getEmployees } from "@/lib/actions/employee";
import { getDepartments } from "@/lib/actions/department";
import { AttendanceProgressSummary, type AttendanceProgress } from "./attendance-progress-summary";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

// Mock data - replace with actual API call
const mockAttendanceProgress: AttendanceProgress[] = [
  {
    id: "1",
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "dept-1",
    departmentName: "IT",
    subDepartment: "sub-dept-1",
    subDepartmentName: "Development",
    designation: "desig-1",
    designationName: "Senior Developer",
    days: 30,
    scheduleDays: 22,
    offDays: 8,
    present: 20,
    presentOnHoliday: 2,
    leaves: 2,
    absents: 0,
    late: 3,
    halfDay: 1,
    shortDays: 0,
    scheduleTime: "176h",
    actualWorkedTime: "160h",
    breakTime: "16h",
    absentTime: "0h",
    overtimeBeforeTime: "5h",
    overtimeAfterTime: "10h",
    shortExcessTime: "0h",
  },
  {
    id: "2",
    employeeId: "EMP002",
    employeeName: "Jane Smith",
    department: "dept-2",
    departmentName: "HR",
    subDepartment: "sub-dept-2",
    subDepartmentName: "Recruitment",
    designation: "desig-2",
    designationName: "HR Manager",
    days: 30,
    scheduleDays: 22,
    offDays: 8,
    present: 22,
    presentOnHoliday: 0,
    leaves: 0,
    absents: 0,
    late: 0,
    halfDay: 0,
    shortDays: 0,
    scheduleTime: "176h",
    actualWorkedTime: "176h",
    breakTime: "16h",
    absentTime: "0h",
    overtimeBeforeTime: "0h",
    overtimeAfterTime: "5h",
    shortExcessTime: "0h",
  },
];

export default async function AttendanceProgressSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    
    const [employeesResult, departmentsResult] = await Promise.all([
      getEmployees(),
      getDepartments(),
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

    const employees = employeesResult.data || [];
    const departments = departmentsResult.data || [];
    
    // TODO: Replace mockAttendanceProgress with actual API call
    // const progressResult = await getAttendanceProgressSummary();
    // const progressData = progressResult.status && progressResult.data ? progressResult.data : [];

    return (
      <AttendanceProgressSummary
        initialData={mockAttendanceProgress}
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

