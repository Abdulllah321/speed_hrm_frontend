import { getDepartments, getSubDepartments } from "@/lib/actions/department";
import { SubDepartmentList } from "./sub-department-list";

export default async function SubDepartmentListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  const { newItemId } = await searchParams;
  const [subDeptRes, deptRes] = await Promise.all([
    getSubDepartments(),
    getDepartments(),
  ]);

  return (
    <SubDepartmentList
      initialSubDepartments={subDeptRes.data || []}
      departments={deptRes.data || []}
      newItemId={newItemId}
    />
  );
}
