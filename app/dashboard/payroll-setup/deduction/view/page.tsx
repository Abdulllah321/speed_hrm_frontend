import { DeductionList } from "./deduction-list";
import { ListError } from "@/components/dashboard/list-error";
import type { DeductionRow } from "./columns";

export const dynamic = "force-dynamic";

export default async function ViewDeductionPage() {
  try {
    // TODO: Replace with actual API call to fetch deductions
    // const result = await getDeductions();
    // For now, using dummy data
    const initialData: DeductionRow[] = [
      {
        id: "1",
        sNo: 1,
        empId: "272",
        empName: "Syed Nauman Ali",
        department: "Quality Assurance",
        subDepartment: "WooCommerce",
        deductionType: "LWP",
        deduction: "435 Day",
        monthYear: "Till (Apr-2024)",
        status: "Active",
      },
      {
        id: "2",
        sNo: 2,
        empId: "272",
        empName: "Syed Nauman Ali",
        department: "Quality Assurance",
        subDepartment: "WooCommerce",
        deductionType: "LWP",
        deduction: "400 Day",
        monthYear: "Till (Aug-2024)",
        status: "Active",
      },
      {
        id: "3",
        sNo: 3,
        empId: "264",
        empName: "Sajad Ali Memon",
        department: "Development",
        subDepartment: "UI/UX Development",
        deductionType: "Penalty",
        deduction: "400",
        monthYear: "Till (Jul-2024)",
        status: "Active",
      },
      {
        id: "4",
        sNo: 4,
        empId: "61",
        empName: "Hassan Ali Khan",
        department: "Quality Assurance",
        subDepartment: "",
        deductionType: "LWP",
        deduction: "1 Day",
        monthYear: "Till (Oct-2024)",
        status: "Active",
      },
      {
        id: "5",
        sNo: 5,
        empId: "272",
        empName: "Syed Nauman Ali",
        department: "Quality Assurance",
        subDepartment: "WooCommerce",
        deductionType: "LWP",
        deduction: "1 Day",
        monthYear: "Till (Oct-2024)",
        status: "Active",
      },
      {
        id: "6",
        sNo: 6,
        empId: "272",
        empName: "Syed Nauman Ali",
        department: "Quality Assurance",
        subDepartment: "WooCommerce",
        deductionType: "Penalty",
        deduction: "23",
        monthYear: "Till (Jul-2024)",
        status: "Active",
      },
    ];

    return <DeductionList initialData={initialData} />;
  } catch (error) {
    console.error("Error in ViewDeductionPage:", error);
    return (
      <ListError
        title="Failed to load deductions"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}

