import { getMaritalStatuses } from "@/lib/actions/marital-status";
import { MaritalStatusList } from "./marital-status-list";

export default async function MaritalStatusListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  const { newItemId } = await searchParams;
  const { data: maritalStatuses } = await getMaritalStatuses();

  return <MaritalStatusList initialMaritalStatuses={maritalStatuses || []} newItemId={newItemId} />;
}
