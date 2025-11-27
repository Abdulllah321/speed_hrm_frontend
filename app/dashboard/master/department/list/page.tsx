import { getDepartments } from "@/lib/actions/department";
import { DepartmentList } from "./department-list";

export default async function DepartmentListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  const { newItemId } = await searchParams;
  const { data: departments } = await getDepartments();

  return (
    <DepartmentList
      initialDepartments={departments || []}
      newItemId={newItemId}
    />
  );
}
