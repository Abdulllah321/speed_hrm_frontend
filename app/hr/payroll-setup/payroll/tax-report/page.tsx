import { Metadata } from "next";
import { TaxReportContent } from "./tax-report-content";
import { getDepartments } from "@/lib/actions/department";
import { getLocations } from "@/lib/actions/location";

export const metadata: Metadata = {
  title: "Tax Deduction Report | HRM",
  description: "View and export month-wise payroll tax deduction report to Excel.",
};

export default async function TaxReportPage() {
  const [departmentsResponse, locationsResponse] = await Promise.all([
    getDepartments(),
    getLocations(),
  ]);

  const departments = departmentsResponse.status
    ? departmentsResponse.data || []
    : [];
  const locations = locationsResponse.status
    ? locationsResponse.data || []
    : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <TaxReportContent
        initialDepartments={departments}
        initialLocations={locations}
      />
    </div>
  );
}
