import { Suspense } from "react";
import { EOBIReportList } from "./eobi-report-list";
import { getEOBIReportData } from "@/lib/actions/eobi-report";
import { Loader2 } from "lucide-react";

export default async function EOBIReportPage() {
    const result = await getEOBIReportData();
    const data = result.status && result.data ? result.data : [];
    const availableMonths = result.status && result.availableMonths ? result.availableMonths : [];
    const regionBreakdown = result.status && result.regionBreakdown ? result.regionBreakdown : {};

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <EOBIReportList
                    initialData={data}
                    initialAvailableMonths={availableMonths}
                    initialRegionBreakdown={regionBreakdown}
                />
            </Suspense>
        </div>
    );
}
