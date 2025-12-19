import { AllowanceList } from "./allowance-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

export default async function ViewAllowancePage() {
  try {
    // TODO: Replace with actual API call to fetch allowances
    // const result = await getAllowances();
    // For now, using empty array as initial data
    const initialData: any[] = [];

    return <AllowanceList initialData={initialData} />;
  } catch (error) {
    console.error("Error in ViewAllowancePage:", error);
    return (
      <ListError
        title="Failed to load allowances"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}

