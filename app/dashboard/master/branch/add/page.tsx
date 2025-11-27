import { getCities } from "@/lib/actions/city";
import { BranchAddForm } from "./branch-add-form";

export default async function BranchAddPage() {
  const citiesRes = await getCities();

  return <BranchAddForm cities={citiesRes.data || []} />;
}

