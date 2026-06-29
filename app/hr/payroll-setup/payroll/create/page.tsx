
import { Suspense } from "react";
import { GeneratePayrollClient } from "./client";
import { getDepartments } from "@/lib/actions/department";
import { getLocations } from "@/lib/actions/location";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
    title: "Generate Payroll | HRM",
    description: "Generate monthly payroll for employees",
};

export default async function GeneratePayrollPage() {
    const [departmentsResult, locationsResult, user] = await Promise.all([
        getDepartments(),
        getLocations(),
        getCurrentUser(),
    ]);

    const departments = departmentsResult.status ? departmentsResult.data : [];
    const locations = locationsResult.status ? locationsResult.data : [];
    const userId = user?.id?.toString() || "";

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GeneratePayrollClient
                initialDepartments={departments}
                initialLocations={locations}
                currentUserId={userId}
            />
        </Suspense>
    );
}
