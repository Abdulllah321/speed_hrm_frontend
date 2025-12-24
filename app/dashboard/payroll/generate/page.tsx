
import { Suspense } from "react";
import { GeneratePayrollClient } from "./client";
import { getDepartments } from "@/lib/actions/department";
import { getEmployeesForDropdown } from "@/lib/actions/employee";

export const metadata = {
    title: "Generate Payroll | HRM",
    description: "Generate monthly payroll for employees",
};

export default async function GeneratePayrollPage() {
    const [departmentsResult, employeesResult] = await Promise.all([
        getDepartments(),
        getEmployeesForDropdown(),
    ]);

    const departments = departmentsResult.status ? departmentsResult.data : [];
    const employees = employeesResult.status ? employeesResult.data : [];

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GeneratePayrollClient
                initialDepartments={departments}
                initialEmployees={employees}
            />
        </Suspense>
    );
}
