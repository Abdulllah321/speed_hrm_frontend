import { getDesignations } from "@/lib/actions/designation";
import { DesignationList } from "./designation-list";

export default async function DesignationListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  const { newItemId } = await searchParams;
  const { data: designations } = await getDesignations();

  return (
    <DesignationList
      initialDesignations={designations || []}
      newItemId={newItemId}
    />
  );
}
