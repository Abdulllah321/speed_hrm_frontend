"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueNetSalesSummaryPreview,
  getNetSalesSummaryResult,
} from "@/lib/actions/pos-sales";
import { useReportSse } from "@/hooks/use-report-sse";
import { NetSalesSummaryReportData } from "./types";
import { useNetSalesSummaryData } from "./use-net-sales-summary-data";
import { NetSalesSummaryHeader } from "./net-sales-summary-header";
import { NetSalesSummaryFilters } from "./net-sales-summary-filters";
import { NetSalesSummaryTable } from "./net-sales-summary-table";
import { generateNetSalesSummaryExcel } from "./excel-export";
import { generateNetSalesSummaryPdf } from "./pdf-export";
import { toast } from "sonner";

export function NetSalesSummaryView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>(undefined);

  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportData, setReportData] = useState<NetSalesSummaryReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Client export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "net-sales-summary");

  // Load Outlets & Cashiers on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [locRes, cashierRes] = await Promise.all([getLocations(), getUsers()]);
        const locData = Array.isArray(locRes) ? locRes : (locRes as any)?.data || [];
        const userList = Array.isArray(cashierRes) ? cashierRes : (cashierRes as any)?.data || [];

        if (Array.isArray(locData)) setLocations(locData);
        if (Array.isArray(userList)) setCashiers(userList);
      } catch (err) {
        console.error("Failed to load outlet or cashier options:", err);
      }
    }
    loadOptions();
  }, []);

  const locationParam = useMemo(
    () => (selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined),
    [selectedLocationIds],
  );

  const activeSelectionNames = useMemo(() => {
    if (selectedLocationIds.length === 0) return "All Outlets (Stores)";
    return locations
      .filter((l) => selectedLocationIds.includes(l.id))
      .map((l) => l.name)
      .join(", ");
  }, [selectedLocationIds, locations]);

  // Queue preview calculation
  const handleFetchReport = useCallback(() => {
    if (!dateRange.from || !dateRange.to) return;

    setIsQueueingJob(true);
    setPreviewJobId(null);

    startTransition(async () => {
      try {
        const res = await queueNetSalesSummaryPreview({
          locationId: locationParam,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          cashierUserId: selectedCashierId,
          reportType,
        });

        if (res && res.status && res.data?.jobId) {
          setPreviewJobId(res.data.jobId);
        } else {
          toast.error(res?.message || "Failed to queue net sales summary calculation");
        }
      } catch (err: any) {
        toast.error("Error queueing net sales summary calculation job");
      } finally {
        setIsQueueingJob(false);
      }
    });
  }, [locationParam, dateRange, selectedCashierId, reportType]);

  // Initial fetch on mount or parameters change
  useEffect(() => {
    handleFetchReport();
  }, [locationParam, dateRange, selectedCashierId, reportType]);

  // Fetch result when SSE completes
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId
    ) {
      setIsFetchingResult(true);
      getNetSalesSummaryResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
          } else {
            toast.error("Failed to load completed net sales summary dataset");
          }
        })
        .catch((err) => {
          toast.error("Error retrieving completed net sales summary preview");
        })
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
    flatRows,
    toggleNode,
    expandAll,
    collapseAll,
  } = useNetSalesSummaryData(reportData);

  // Client Excel Export Handler
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName } = await generateNetSalesSummaryExcel({
        exportType: type,
        categories: reportData.categories || [],
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

  // Client PDF Print Handler
  const handleExportPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);

    try {
      await generateNetSalesSummaryPdf({
        categories: reportData.categories || [],
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
      {/* KPI Header Cards */}
      <NetSalesSummaryHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress Banner */}
      <NetSalesSummaryFilters
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

      {/* Virtualized Minimal Light Theme Matrix Table */}
      <NetSalesSummaryTable
        rows={flatRows}
        grandTotals={grandTotals}
        onToggleNode={toggleNode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
