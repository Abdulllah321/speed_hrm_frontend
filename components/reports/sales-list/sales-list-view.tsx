"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueSalesListPreview,
  getSalesListResult,
} from "@/lib/actions/pos-sales";
import { streamSalesListResult } from "@/lib/stream-ndjson";
import { useReportSse } from "@/hooks/use-report-sse";
import { SalesListReportData } from "./types";
import { useSalesListData } from "./use-sales-list-data";
import { SalesListHeader } from "./sales-list-header";
import { SalesListFilters } from "./sales-list-filters";
import { SalesListTable } from "./sales-list-table";
import { generateSalesListExcel } from "./excel-export";
import { generateSalesListPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Printer, Zap } from "lucide-react";
import { toast } from "sonner";

interface SalesListViewProps {
  isPosLevel?: boolean;
}

// Helper: Calculate standard dates for Fiscal Years (Pakistan July 1 - June 30) & Calendar Years
const getPresetPeriodInfo = (
  preset: string,
): { from: Date; to: Date; fiscalYear?: string; year?: number } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = July
  const fyStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;

  if (preset === "fy-current") {
    return {
      from: new Date(fyStartYear, 6, 1),
      to: new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999),
      fiscalYear: "current",
    };
  }
  if (preset === "fy-previous") {
    return {
      from: new Date(fyStartYear - 1, 6, 1),
      to: new Date(fyStartYear, 5, 30, 23, 59, 59, 999),
      fiscalYear: "previous",
    };
  }
  if (preset === "year-current") {
    return {
      from: new Date(currentYear, 0, 1),
      to: new Date(currentYear, 11, 31, 23, 59, 59, 999),
      year: currentYear,
    };
  }
  if (preset === "year-previous") {
    return {
      from: new Date(currentYear - 1, 0, 1),
      to: new Date(currentYear - 1, 11, 31, 23, 59, 59, 999),
      year: currentYear - 1,
    };
  }
  // default / custom
  return {
    from: new Date(fyStartYear, 6, 1),
    to: new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999),
  };
};

export function SalesListView({ isPosLevel = false }: SalesListViewProps) {
  const { user } = useAuth();
  const posLocationId =
    user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
  const posLocationName =
    user?.terminal?.location?.name || (user as any)?.location?.name || "Current Store";

  const [locations, setLocations] = useState<Location[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);

  // Client-Side Instant Filters State (0ms Latency)
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>(undefined);
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

  // Period / Base Date Selection (Default: Current Fiscal Year 2025-2026)
  const [periodPreset, setPeriodPreset] = useState<string>("fy-current");
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const init = getPresetPeriodInfo("fy-current");
    return { from: init.from, to: init.to };
  });

  // Enforce POS terminal location when on POS level
  useEffect(() => {
    if (isPosLevel && posLocationId) {
      setSelectedLocationIds([posLocationId]);
    }
  }, [isPosLevel, posLocationId]);

  const [reportData, setReportData] = useState<SalesListReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Progressive NDJSON streaming state
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const [streamProgress, setStreamProgress] = useState<{
    isStreaming: boolean;
    loadedInvoices: number;
    totalInvoices: number;
    percent: number;
  }>({
    isStreaming: false,
    loadedInvoices: 0,
    totalInvoices: 0,
    percent: 0,
  });

  // Client export state with progress tracking
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgressState, setExportProgressState] = useState<{
    isExporting: boolean;
    type: "excel" | "pdf";
    label: string;
    progress: number;
    message: string;
  }>({
    isExporting: false,
    type: "excel",
    label: "",
    progress: 0,
    message: "",
  });

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

  const activeSelectionNames = useMemo(() => {
    if (selectedLocationIds.length === 0) return "All Outlets (Stores)";
    return locations
      .filter((l) => selectedLocationIds.includes(l.id))
      .map((l) => l.name)
      .join(", ");
  }, [selectedLocationIds, locations]);

  // Backend Preview Fetcher: ONLY triggered on Fiscal Year / Base Period change or explicit Refresh
  const handleFetchReport = useCallback(
    (targetPreset?: string, targetRange?: DateRange) => {
      const activePreset = targetPreset || periodPreset;
      const activeRange = targetRange || dateRange;
      const periodInfo = getPresetPeriodInfo(activePreset);

      setIsQueueingJob(true);
      setPreviewJobId(null);

      startTransition(async () => {
        try {
          const payload: any = {
            // Pos level restricts to single location; ERP report loads all locations for instant client slicing
            locationId: isPosLevel && posLocationId ? posLocationId : undefined,
          };

          if (activePreset === "fy-current" || activePreset === "fy-previous") {
            payload.fiscalYear = periodInfo.fiscalYear;
            payload.startDate = periodInfo.from.toISOString();
            payload.endDate = periodInfo.to.toISOString();
          } else if (activePreset === "year-current" || activePreset === "year-previous") {
            payload.year = periodInfo.year;
            payload.startDate = periodInfo.from.toISOString();
            payload.endDate = periodInfo.to.toISOString();
          } else {
            // Custom date range
            payload.startDate = activeRange.from?.toISOString();
            payload.endDate = activeRange.to?.toISOString();
          }

          const res = await queueSalesListPreview(payload);

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
    },
    [periodPreset, dateRange, isPosLevel, posLocationId],
  );

  // Initial fetch on mount for default Current Fiscal Year
  useEffect(() => {
    handleFetchReport("fy-current");
  }, []); // Only once on mount!

  // When Fiscal Year / Year preset changes: update dates and re-fetch that year once
  const handlePeriodPresetChange = (newPreset: string) => {
    setPeriodPreset(newPreset);
    if (newPreset !== "custom") {
      const info = getPresetPeriodInfo(newPreset);
      const newRange = { from: info.from, to: info.to };
      setDateRange(newRange);
      handleFetchReport(newPreset, newRange);
    }
  };

  // When DateRange changes:
  // If in custom mode, fetch custom range; otherwise, slices client-side within loaded year!
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    if (periodPreset === "custom") {
      handleFetchReport("custom", range);
    }
  };

  // Fetch result with real-time progressive NDJSON streaming when calculation completes
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId
    ) {
      // Cancel previous stream if one was active
      streamAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      streamAbortControllerRef.current = abortController;

      setIsFetchingResult(true);
      setStreamProgress({
        isStreaming: true,
        loadedInvoices: 0,
        totalInvoices: 0,
        percent: 0,
      });

      const emptyTotals = {
        orderCount: 0,
        totalItems: 0,
        grossAmount: 0,
        discountAmount: 0,
        netAmount: 0,
        taxAmount: 0,
        paidAmount: 0,
        cashAmount: 0,
        cardAmount: 0,
        walletAmount: 0,
        creditAmount: 0,
        cashSale: 0,
        cashReturn: 0,
        cardSale: 0,
        creditSale: 0,
        giftVoucherAmount: 0,
        creditVoucherAmount: 0,
        exchangeVoucherAmount: 0,
        claimVoucherAmount: 0,
        giftVoucherCorporate: 0,
        creditVoucherIssuedAmount: 0,
        rewardVoucherAmount: 0,
        onCreditAmount: 0,
      };

      streamSalesListResult(
        previewJobId,
        {
          onMeta: (meta) => {
            // First chunk: instantly set up layout and headers (~50ms)
            setReportData({
              reportType: meta.reportType,
              dateRange: meta.dateRange,
              locationNames: meta.locationNames,
              locations: meta.locations,
              grandTotals: emptyTotals,
              invoices: [],
              flatItems: [],
            });
            setStreamProgress((prev) => ({
              ...prev,
              totalInvoices: meta.totalInvoices || 0,
            }));
          },
          onBatch: (newInvoices) => {
            // Progressive chunks: append new invoices directly to the table
            setReportData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                invoices: [...prev.invoices, ...newInvoices],
              };
            });
            setStreamProgress((prev) => {
              const newCount = prev.loadedInvoices + newInvoices.length;
              const total = prev.totalInvoices || newCount;
              return {
                ...prev,
                loadedInvoices: newCount,
                percent: total > 0 ? Math.min(100, Math.round((newCount / total) * 100)) : 100,
              };
            });
          },
          onComplete: (totals, totalInvoices) => {
            // Final chunk: lock in verified Grand Totals
            setReportData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                grandTotals: totals,
              };
            });
            setIsFetchingResult(false);
            setStreamProgress((prev) => ({
              ...prev,
              isStreaming: false,
              loadedInvoices: totalInvoices || prev.loadedInvoices,
              percent: 100,
            }));
          },
          onError: (err) => {
            console.error("[SalesList Stream Error]", err);
            // Fallback to monolithic fetch if stream interrupted
            getSalesListResult(previewJobId)
              .then((res) => {
                if (res && res.status && res.data) {
                  setReportData(res.data);
                } else {
                  toast.error("Failed to load completed sales list dataset");
                }
              })
              .catch(() => {
                toast.error("Error retrieving completed sales list preview");
              })
              .finally(() => {
                setIsFetchingResult(false);
                setStreamProgress((prev) => ({ ...prev, isStreaming: false }));
              });
          },
        },
        abortController.signal
      );
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  // Client-Side In-Memory Slicing & Grouping (Instant 0ms, Zero Backend Hits)
  const {
    filteredInvoices,
    filteredFlatItems,
    grandTotals,
    flatRows,
    groupingLevels,
    handleToggleLevel,
    toggleNode,
    expandAll,
    collapseAll,
  } = useSalesListData(reportData, {
    reportType,
    selectedLocationIds,
    selectedCashierId,
    subDateRange: dateRange,
    paymentModeFilter,
    fbrOnlyFilter,
    searchQuery,
  });

  // Client Excel Export Handler using filtered dataset with progress
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);
    setExportProgressState({
      isExporting: true,
      type: "excel",
      label: type === "flat" ? "Exporting Line Items (Excel)" : "Exporting Invoices (Excel)",
      progress: 5,
      message: "Initializing Excel export...",
    });

    try {
      const { excelBuffer, fileName } = await generateSalesListExcel({
        exportType: type,
        invoices: filteredInvoices,
        flatItems: filteredFlatItems,
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
        onProgress: (percent, message) => {
          setExportProgressState((prev) => ({
            ...prev,
            progress: percent,
            message: message || prev.message,
          }));
        },
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
      setExportProgressState((prev) => ({
        ...prev,
        progress: 100,
        message: "Download started!",
      }));
      setTimeout(() => {
        setExportProgressState((prev) => ({ ...prev, isExporting: false }));
      }, 800);
    }
  };

  // Client PDF Print Handler using filtered dataset with progress
  const handleExportPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);
    setExportProgressState({
      isExporting: true,
      type: "pdf",
      label: "Generating PDF Document",
      progress: 5,
      message: "Initializing print layout...",
    });

    try {
      await generateSalesListPdf({
        invoices: filteredInvoices,
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
        onProgress: (percent, message) => {
          setExportProgressState((prev) => ({
            ...prev,
            progress: percent,
            message: message || prev.message,
          }));
        },
      });
    } catch (err: any) {
      toast.error("Failed to render PDF print view");
    } finally {
      setIsExportingPdf(false);
      setExportProgressState((prev) => ({
        ...prev,
        progress: 100,
        message: "Print window ready!",
      }));
      setTimeout(() => {
        setExportProgressState((prev) => ({ ...prev, isExporting: false }));
      }, 800);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1750px] mx-auto relative">
      {/* Floating Smooth Export Progress Card */}
      {exportProgressState.isExporting && (
        <div className="fixed bottom-6 right-6 z-50 w-96 p-4 rounded-2xl border border-emerald-300/80 dark:border-emerald-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              {exportProgressState.type === "excel" ? (
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Printer className="h-4 w-4" />
                </div>
              )}
              <div className="space-y-0.5 overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {exportProgressState.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[210px]">
                  {exportProgressState.message}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              {exportProgressState.progress}%
            </span>
          </div>
          <Progress
            value={exportProgressState.progress}
            className="h-2 bg-emerald-100/70 dark:bg-emerald-950/60"
          />
        </div>
      )}

      {/* KPI Header Cards: Recalculates dynamically based on active client filters */}
      <SalesListHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress Banner */}
      <SalesListFilters
        isPosLevel={isPosLevel}
        posLocationName={posLocationName}
        reportType={reportType}
        onReportTypeChange={setReportType}
        periodPreset={periodPreset}
        onPeriodPresetChange={handlePeriodPresetChange}
        matchingCount={filteredInvoices.length}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
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
        onRefresh={() => handleFetchReport()}
        isPending={isPending}
        previewJobId={previewJobId}
        sseState={sseState}
        isQueueingJob={isQueueingJob}
        isFetchingResult={isFetchingResult && !streamProgress.isStreaming}
        onExportExcelFlat={() => handleExportExcel("flat")}
        onExportExcelHierarchy={() => handleExportExcel("hierarchical")}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        exportProgress={exportProgressState.isExporting ? exportProgressState.progress : undefined}
        exportStatusMessage={exportProgressState.isExporting ? exportProgressState.message : undefined}
      />

      {/* AI-Style Progressive Real-Time Streaming Progress Banner */}
      {streamProgress.isStreaming && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-purple-50/90 dark:from-indigo-950/30 dark:via-sky-950/20 dark:to-purple-950/30 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs animate-pulse shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>⚡ Live Streaming Invoices</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800 text-[11px]">
                  {streamProgress.loadedInvoices.toLocaleString()}
                  {streamProgress.totalInvoices > 0 ? ` / ${streamProgress.totalInvoices.toLocaleString()}` : ""} invoices ({streamProgress.percent}%)
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Table rows are interactive in real-time as data streams from the server
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-36 sm:w-56 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-sky-500 h-full transition-all duration-150 rounded-full"
                style={{ width: `${streamProgress.percent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 w-10 text-right">
              {streamProgress.percent}%
            </span>
          </div>
        </div>
      )}

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
