import { getBranches } from "@/lib/actions/branch";
import { getCities } from "@/lib/actions/city";
import { BranchList } from "./branch-list";
import { ListError } from "@/components/dashboard/list-error";

interface PageProps {
  searchParams: Promise<{ newItemId?: string }>;
}

export const dynamic = "force-dynamic";

export default async function BranchListPage({ searchParams }: PageProps) {
  try {
    const params = await searchParams;
    const [branchesRes, citiesRes] = await Promise.all([getBranches(), getCities()]);
    
    // Check if requests failed
    if (!branchesRes.status) {
      return (
        <ListError
          title="Failed to load branches"
          message={branchesRes.message || "Unable to fetch branches. Please check your connection and try again."}
        />
      );
    }

    if (!citiesRes.status || !citiesRes.data) {
      return (
        <ListError
          title="Failed to load cities"
          message="Unable to fetch cities. Please check your connection and try again."
        />
      );
    }

    return (
      <BranchList
        initialBranches={branchesRes.data || []}
        cities={citiesRes.data || []}
        newItemId={params.newItemId}
      />
    );
  } catch (error) {
    console.error("Error in BranchListPage:", error);
    return (
      <ListError
        title="Failed to load branches"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}

