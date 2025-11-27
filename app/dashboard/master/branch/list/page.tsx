import { getBranches } from "@/lib/actions/branch";
import { getCities } from "@/lib/actions/city";
import { BranchList } from "./branch-list";

interface PageProps {
  searchParams: Promise<{ newItemId?: string }>;
}

export default async function BranchListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [branchesRes, citiesRes] = await Promise.all([getBranches(), getCities()]);

  return (
    <BranchList
      initialBranches={branchesRes.data || []}
      cities={citiesRes.data || []}
      newItemId={params.newItemId}
    />
  );
}

