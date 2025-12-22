import { IncrementList } from "./increment-list";
import { ListError } from "@/components/dashboard/list-error";
import type { IncrementRow } from "./columns";

export const dynamic = "force-dynamic";

export default async function ViewIncrementPage() {
  try {
    // TODO: Replace with actual API call to fetch increments
    // const result = await getIncrements();
    // For now, using dummy data
    const initialData: IncrementRow[] = [
      {
        id: "1",
        sNo: 1,
        empId: "10",
        empName: "Uzair Ahmed",
        department: "Development",
        subDepartment: "WooCommerce Development",
        designation: "Regional Sales Manager",
        increment: "-50,000",
        salary: "250,000",
        date: "01-Feb-2026",
        status: "Active",
      },
      {
        id: "2",
        sNo: 2,
        empId: "10",
        empName: "Uzair Ahmed",
        department: "Development",
        subDepartment: "WooCommerce Development",
        designation: "Regional Sales Manager",
        increment: "-50,000",
        salary: "200,000",
        date: "01-Jan-2026",
        status: "Active",
      },
    ];

    return <IncrementList initialData={initialData} />;
  } catch (error) {
    console.error("Error in ViewIncrementPage:", error);
    return (
      <ListError
        title="Failed to load increments"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}

