import { getEmployeesForDropdown } from "@/lib/actions/employee";
import { CreateOvertimeClient } from "./create-overtime-client";

export default async function CreateOvertimePage() {
  // Fetch initial data on server
  const empResult = await getEmployeesForDropdown();

  const employees = empResult.status && empResult.data ? empResult.data : [];

  return (
    <CreateOvertimeClient
      initialEmployees={employees}
    />
  );
}

