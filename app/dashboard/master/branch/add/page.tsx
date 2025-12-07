import { getCities } from "@/lib/actions/city";
import { BranchAddForm } from "./branch-add-form";

export const dynamic = "force-dynamic";

export default async function BranchAddPage() {
  const citiesRes = await getCities();

  return <BranchAddForm cities={citiesRes.data || []} />;
}

