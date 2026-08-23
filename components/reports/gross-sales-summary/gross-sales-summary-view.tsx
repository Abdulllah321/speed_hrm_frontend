"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  GrossSalesSummaryReportData,
} from "./types";
import { GrossSalesSummaryHeader } from "./gross-sales-summary-header";
import { GrossSalesSummaryFilters } from "./gross-sales-summary-filters";
import { GrossSalesSummaryTable } from "./gross-sales-summary-table";
import { useGrossSalesSummaryData } from "./use-gross-sales-summary-data";
import { generateGrossSalesSummaryExcel } from "./excel-export";
import { generateGrossSalesSummaryPdf } from "./pdf-export";
import { useReportSse } from "@/hooks/use-report-sse";
import {
  queueGrossSalesSummaryPreview,
  getGrossSalesSummaryResult,
} from "@/lib/actions/pos-sales";
import { toast } from "sonner";
import { DateRange } from "@/components/ui/date-range-picker";

interface GrossSalesSummaryViewProps {
  initialReportData?: GrossSalesSummaryReportData | null;
  locations?: any[];
  cashiers?: any[];
  userId?: string;
}

export function GrossSalesSummaryView({
  initialReportData = null,
  locations = [],
  cashiers = [],
  userId = "system",
}: GrossSalesSummaryViewProps = {}) {
  const [reportData, setReportData] = useState<GrossSalesSummaryReportData | null>(
    initialReportData
  );
  const [reportType, setReportType] = useState<"merged" | "separate">(
    initialReportData?.reportType || "merged"
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [isPending, startTransition] = useTransition();

  const sseState = useReportSse(previewJobId, "gross-sales-summary");

  const activeSelectionNames = React.useMemo(() => {
    if (selectedLocationIds.length === 0) return "All Outlets";
    const selected = locations.filter((loc) => selectedLocationIds.includes(loc.id));
    return selected.map((loc) => loc.name).join(", ");
  }, [selectedLocationIds, locations]);

  const handleFetchReport = () => {
    setIsQueueingJob(true);
    startTransition(async () => {
      try {
        const startStr = dateRange.from ? dateRange.from.toISOString() : undefined;
        const endStr = dateRange.to ? dateRange.to.toISOString() : undefined;

        const res = await queueGrossSalesSummaryPreview({
          locationId: selectedLocationIds.join(","),
          cashierUserId: selectedCashierId,
          startDate: startStr,
          endDate: endStr,
          reportType,
        });

        const jobId = res.data?.jobId;
        if (res.status && jobId) {
          setPreviewJobId(jobId);
          toast.success("Queued preview calculation in background...");
        } else {
          toast.error(res.message || "Failed to queue summary report preview.");
        }
      } catch (err: any) {
        toast.error("Error launching summary calculation");
      } finally {
        setIsQueueingJob(false);
      }
    });
  };

  useEffect(() => {
    if (sseState.status === "completed" && previewJobId && !isFetchingResult) {
      setIsFetchingResult(true);
      getGrossSalesSummaryResult(previewJobId)
        .then((res) => {
          if (res.status && res.data) {
            setReportData(res.data);
            toast.success("Gross sales summary updated");
          } else {
            toast.error(res.message || "Failed to load summary result");
          }
        })
        .catch(() => toast.error("Error fetching preview result"))
        .finally(() => {
          setIsFetchingResult(false);
        });
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  const {
    searchQuery,
    setSearchQuery,
    groupingLevels,
    handleToggleLevel,
    grandTotals,
    treeData,
  } = useGrossSalesSummaryData(reportData);

  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName } = await generateGrossSalesSummaryExcel({
        exportType: type,
        treeData,
        flatItems: reportData.flatItems || [],
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel summary report generated successfully");
    } catch (err: any) {
      toast.error("Failed to generate Excel export");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);

    try {
      await generateGrossSalesSummaryPdf({
        flatItems: reportData.flatItems || [],
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
      });
    } catch (err: any) {
      toast.error("Failed to render PDF print view");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1750px] mx-auto">
      <GrossSalesSummaryHeader totals={grandTotals} />

      <GrossSalesSummaryFilters
        reportType={reportType}
        onReportTypeChange={setReportType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        locations={locations}
        cashiers={cashiers}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
        selectedCashierId={selectedCashierId}
        onCashierChange={setSelectedCashierId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        groupingLevels={groupingLevels}
        onToggleLevel={handleToggleLevel}
        onRefresh={handleFetchReport}
        isPending={isPending}
        previewJobId={previewJobId}
        sseState={sseState}
        isQueueingJob={isQueueingJob}
        isFetchingResult={isFetchingResult}
        onExportExcelFlat={() => handleExportExcel("flat")}
        onExportExcelHierarchy={() => handleExportExcel("hierarchical")}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
      />

      <GrossSalesSummaryTable
        treeData={treeData}
        grandTotals={grandTotals}
        searchQuery={searchQuery}
        isLoading={isPending || isQueueingJob || isFetchingResult}
      />
    </div>
  );
}
