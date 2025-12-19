import { AdvanceSalaryList } from "./advance-salary-list";
import { ListError } from "@/components/dashboard/list-error";
import type { AdvanceSalaryRow } from "./columns";

export const dynamic = "force-dynamic";

export default async function ViewAdvanceSalaryPage() {
  try {
    // TODO: Replace with actual API call to fetch advance salaries
    // const result = await getAdvanceSalaries();
    // For now, using dummy data
    const initialData: AdvanceSalaryRow[] = [
      {
        id: "1",
        sNo: 1,
        empId: "1",
        empName: "Malik Zeeshan Akbar",
        amountNeeded: 3000,
        salaryNeedOn: "12-Nov-2025",
        deductionMonthYear: "Nov / 2025",
        approval1: "Approved",
        status: "Active",
      },
      {
        id: "2",
        sNo: 2,
        empId: "101",
        empName: "test",
        amountNeeded: 3000,
        salaryNeedOn: "12-Nov-2025",
        deductionMonthYear: "Nov / 2025",
        approval1: "Approved",
        status: "Active",
      },
      {
        id: "3",
        sNo: 3,
        empId: "101",
        empName: "test",
        amountNeeded: 30000,
        salaryNeedOn: "19-Dec-2025",
        deductionMonthYear: "Dec / 2025",
        approval1: "Approved",
        status: "Active",
      },
    ];

    return <AdvanceSalaryList initialData={initialData} />;
  } catch (error) {
    console.error("Error in ViewAdvanceSalaryPage:", error);
    return (
      <ListError
        title="Failed to load advance salaries"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}

