import { Metadata } from "next";
import { ReportContent } from "./report-content";
import { getDepartments } from "@/lib/actions/department";
import { getLocations } from "@/lib/actions/location";

export const metadata: Metadata = {
    title: "Payroll Report | HRM",
    description: "View and export detailed payroll reports.",
};

export default async function PayrollReportPage() {
    const [departmentsResponse, locationsResponse] = await Promise.all([
        getDepartments(),
        getLocations(),
    ]);

    const departments = departmentsResponse.status ? departmentsResponse.data || [] : [];
    const locations = locationsResponse.status ? locationsResponse.data || [] : [];

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <ReportContent initialDepartments={departments} initialLocations={locations} />
        </div>
    );
}
