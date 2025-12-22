import { getOvertimeRequestById } from "@/lib/actions/overtime";
import { getEmployeesForDropdown } from "@/lib/actions/employee";
import { EditOvertimeClient } from "./edit-overtime-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOvertimePage({ params }: PageProps) {
  const { id } = await params;
  // Fetch overtime request and employees in parallel
  const [overtimeResult, empResult] = await Promise.all([
    getOvertimeRequestById(id),
    getEmployeesForDropdown(),
  ]);

  if (!overtimeResult.status || !overtimeResult.data) {
    notFound();
  }

  const employees = empResult.status && empResult.data ? empResult.data : [];

  return (
    <EditOvertimeClient
      initialData={overtimeResult.data}
      initialEmployees={employees}
    />
  );
}

