"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueSalesListPreview,
  getSalesListResult,
} from "@/lib/actions/pos-sales";
import { useReportSse } from "@/hooks/use-report-sse";
import { SalesListReportData } from "./types";
import { useSalesListData } from "./use-sales-list-data";
import { SalesListHeader } from "./sales-list-header";
import { SalesListFilters } from "./sales-list-filters";
import { SalesListTable } from "./sales-list-table";
import { generateSalesListExcel } from "./excel-export";
import { generateSalesListPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

interface SalesListViewProps {
  isPosLevel?: boolean;
}

export function SalesListView({ isPosLevel = false }: SalesListViewProps) {
  const { user } = useAuth();
  const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
  const posLocationName = user?.terminal?.location?.name || (user as any)?.location?.name || "Current Store";

  const [locations, setLocations] = useState<Location[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>(undefined);

  // Enforce POS terminal location when on POS level
  useEffect(() => {
    if (isPosLevel && posLocationId) {
      setSelectedLocationIds([posLocationId]);
    }
  }, [isPosLevel, posLocationId]);

  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportData, setReportData] = useState<SalesListReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Client export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "sales-list");

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
        const res = await queueSalesListPreview({
          locationId: locationParam,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          cashierUserId: selectedCashierId,
          reportType,
        });

        if (res && res.status && res.data?.jobId) {
          setPreviewJobId(res.data.jobId);
        } else {
          toast.error(res?.message || "Failed to queue sales list calculation");
        }
      } catch (err: any) {
        toast.error("Error queueing sales list calculation job");
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
      getSalesListResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
          } else {
            toast.error("Failed to load completed sales list dataset");
          }
        })
        .catch((err) => {
          toast.error("Error retrieving completed sales list preview");
        })
        .finally(() => {
          setIsFetchingResult(false);
        });
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  const {
    searchQuery,
    setSearchQuery,
    paymentModeFilter,
    setPaymentModeFilter,
    fbrOnlyFilter,
    setFbrOnlyFilter,
    groupingLevels,
    handleToggleLevel,
    grandTotals,
    flatRows,
    toggleNode,
    expandAll,
    collapseAll,
  } = useSalesListData(reportData);

  // Client Excel Export Handler
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName } = await generateSalesListExcel({
        exportType: type,
        invoices: reportData.invoices || [],
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
      toast.success("Excel report generated successfully");
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
      await generateSalesListPdf({
        invoices: reportData.invoices || [],
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
      <SalesListHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress Banner */}
      <SalesListFilters
        isPosLevel={isPosLevel}
        posLocationName={posLocationName}
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
        paymentModeFilter={paymentModeFilter}
        onPaymentModeChange={setPaymentModeFilter}
        fbrOnlyFilter={fbrOnlyFilter}
        onFbrOnlyChange={setFbrOnlyFilter}
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
      <SalesListTable
        rows={flatRows}
        grandTotals={grandTotals}
        onToggleNode={toggleNode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
