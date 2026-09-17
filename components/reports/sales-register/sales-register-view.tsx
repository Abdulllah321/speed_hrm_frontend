"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueSalesRegisterPreview,
  getSalesRegisterResult,
} from "@/lib/actions/pos-sales";
import { useReportSse } from "@/hooks/use-report-sse";
import { SalesRegisterReportData } from "./types";
import { useSalesRegisterData } from "./use-sales-register-data";
import { SalesRegisterHeader } from "./sales-register-header";
import { SalesRegisterFilters } from "./sales-register-filters";
import { SalesRegisterTable } from "./sales-register-table";
import { generateSalesRegisterExcel } from "./excel-export";
import { generateSalesRegisterPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

interface SalesRegisterViewProps {
  isPosLevel?: boolean;
}

export function SalesRegisterView({ isPosLevel = false }: SalesRegisterViewProps) {
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

  const [reportData, setReportData] = useState<SalesRegisterReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Mount tracking refs — prevents double-fetch and race conditions (same pattern as sales-list-view)
  const initialFetchDoneRef = useRef(false);
  const hasFetchedJobIdRef = useRef<string | null>(null);

  // Client export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "sales-register");

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

  // Queue preview calculation — only triggered explicitly (mount or user-triggered refresh)
  const handleFetchReport = useCallback(() => {
    if (!dateRange.from || !dateRange.to) return;

    setIsQueueingJob(true);
    setPreviewJobId(null);
    hasFetchedJobIdRef.current = null;

    startTransition(async () => {
      try {
        const locationId = isPosLevel
          ? posLocationId
          : selectedLocationIds.length > 0
          ? selectedLocationIds.join(",")
          : undefined;

        const res = await queueSalesRegisterPreview({
          locationId,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          cashierUserId: selectedCashierId,
          reportType,
        });

        if (res && res.status && res.data?.jobId) {
          setPreviewJobId(res.data.jobId);
        } else {
          toast.error(res?.message || "Failed to queue sales register calculation");
        }
      } catch (err: any) {
        toast.error("Error queueing sales register calculation job");
      } finally {
        setIsQueueingJob(false);
      }
    });
  }, [locationParam, dateRange, selectedCashierId, reportType, isPosLevel, posLocationId, selectedLocationIds]);

  // Initial fetch on mount — wait for posLocationId if on POS level; fire once only
  useEffect(() => {
    if (isPosLevel) {
      if (posLocationId && !initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        handleFetchReport();
      }
    } else {
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        handleFetchReport();
      }
    }
  }, [isPosLevel, posLocationId, handleFetchReport]);

  // Fetch result when SSE completes — useRef guard prevents fetching same jobId twice
  // 800ms delay guards against the race where Bull emits progress=100 before the gz file is flushed
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId &&
      hasFetchedJobIdRef.current !== previewJobId
    ) {
      hasFetchedJobIdRef.current = previewJobId;
      setIsFetchingResult(true);

      const fetchWithRetry = async (attemptsLeft: number): Promise<void> => {
        await new Promise((r) => setTimeout(r, 800));
        try {
          const res = await getSalesRegisterResult(previewJobId);
          if (res && res.status && res.data) {
            setReportData(res.data);
            setIsFetchingResult(false);
          } else if (attemptsLeft > 0) {
            // Result not ready yet — retry once more after another 1.5s
            await new Promise((r) => setTimeout(r, 1500));
            const retry = await getSalesRegisterResult(previewJobId);
            if (retry && retry.status && retry.data) {
              setReportData(retry.data);
            } else {
              toast.error("Failed to load completed sales register dataset");
            }
            setIsFetchingResult(false);
          } else {
            toast.error("Failed to load completed sales register dataset");
            setIsFetchingResult(false);
          }
        } catch {
          toast.error("Error retrieving completed sales register preview");
          setIsFetchingResult(false);
        }
      };

      fetchWithRetry(1);
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
  } = useSalesRegisterData(reportData);

  // Client Excel Export Handler
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName } = await generateSalesRegisterExcel({
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
      await generateSalesRegisterPdf({
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
      <SalesRegisterHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress Banner */}
      <SalesRegisterFilters
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
      <SalesRegisterTable
        rows={flatRows}
        grandTotals={grandTotals}
        onToggleNode={toggleNode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}

