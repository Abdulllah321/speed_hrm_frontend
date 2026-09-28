"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueSalesReturnListPreview,
  getSalesReturnListResult,
  queueSalesReturnListReportExport,
  getSalesReturnListReportExportStatus,
} from "@/lib/actions/pos-sales";
import { useReportSse } from "@/hooks/use-report-sse";
import { SalesReturnListReportData, ReturnSubType } from "./types";
import { useSalesReturnListData } from "./use-sales-return-list-data";
import { SalesReturnListHeader } from "./sales-return-list-header";
import { SalesReturnListFilters } from "./sales-return-list-filters";
import { SalesReturnListTable } from "./sales-return-list-table";
import { generateSalesReturnListExcel } from "./excel-export";
import { generateSalesReturnListPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Printer, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/utils";

interface SalesReturnListViewProps {
  isPosLevel?: boolean;
}

// Helper: Calculate standard dates for Fiscal Years (Pakistan July 1 - June 30) & Calendar Years
const getPresetPeriodInfo = (
  preset: string,
): { from: Date; to: Date; fiscalYear?: string; year?: number } => {
  if (preset === "fy-current" || preset === "fy-26-27") {
    return {
      from: new Date(2026, 6, 1, 0, 0, 0, 0),
      to: new Date(2027, 5, 30, 23, 59, 59, 999),
      fiscalYear: "current",
    };
  }
  if (preset === "all-time") {
    return {
      from: new Date(2020, 0, 1, 0, 0, 0, 0),
      to: new Date(2035, 11, 31, 23, 59, 59, 999),
      fiscalYear: "all-time",
    };
  }
  if (preset === "year-current" || preset === "year-2026") {
    return {
      from: new Date(2026, 0, 1, 0, 0, 0, 0),
      to: new Date(2026, 11, 31, 23, 59, 59, 999),
      year: 2026,
    };
  }
  if (preset === "fy-previous" || preset === "fy-25-26") {
    return {
      from: new Date(2025, 6, 1, 0, 0, 0, 0),
      to: new Date(2026, 5, 30, 23, 59, 59, 999),
      fiscalYear: "previous",
    };
  }
  if (preset === "year-previous" || preset === "year-2025") {
    return {
      from: new Date(2025, 0, 1, 0, 0, 0, 0),
      to: new Date(2025, 11, 31, 23, 59, 59, 999),
      year: 2025,
    };
  }
  return {
    from: new Date(2026, 6, 1, 0, 0, 0, 0),
    to: new Date(2027, 5, 30, 23, 59, 59, 999),
    fiscalYear: "current",
  };
};

export function SalesReturnListView({ isPosLevel = false }: SalesReturnListViewProps) {
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
  const [subTypeFilter, setSubTypeFilter] = useState<ReturnSubType>("ALL");
  const [refundModeFilter, setRefundModeFilter] = useState<string>("ALL");
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");

  // Period / Base Date Selection (Default: Current Fiscal Year 2026-2027)
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

  const [reportData, setReportData] = useState<SalesReturnListReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Mount tracking refs
  const initialFetchDoneRef = useRef(false);
  const hasFetchedJobIdRef = useRef<string | null>(null);

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
  const sseState = useReportSse(previewJobId, "sales-return-list");

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

  // Backend Preview Fetcher: Triggered on Fiscal Year / Base Period change or explicit Refresh
  const handleFetchReport = useCallback(
    (targetPreset?: string, targetRange?: DateRange) => {
      const activePreset = targetPreset || periodPreset;
      const activeRange = targetRange || dateRange;
      const periodInfo = getPresetPeriodInfo(activePreset);

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

          const payload: any = {
            locationId,
          };

          if (
            activePreset === "fy-current" ||
            activePreset === "fy-previous" ||
            activePreset === "all-time" ||
            activePreset === "fy-26-27" ||
            activePreset === "fy-25-26"
          ) {
            payload.fiscalYear = periodInfo.fiscalYear;
            payload.startDate = periodInfo.from.toISOString();
            payload.endDate = periodInfo.to.toISOString();
          } else if (
            activePreset === "year-current" ||
            activePreset === "year-previous" ||
            activePreset === "year-2026" ||
            activePreset === "year-2025"
          ) {
            payload.year = periodInfo.year;
            payload.startDate = periodInfo.from.toISOString();
            payload.endDate = periodInfo.to.toISOString();
          } else {
            // Custom date range
            if (activeRange?.from) {
              const start = new Date(activeRange.from);
              start.setHours(0, 0, 0, 0);
              payload.startDate = start.toISOString();
            }
            if (activeRange?.to) {
              const end = new Date(activeRange.to);
              end.setHours(23, 59, 59, 999);
              payload.endDate = end.toISOString();
            }
          }

          const res = await queueSalesReturnListPreview(payload);

          if (res && res.status && res.data?.jobId) {
            setPreviewJobId(res.data.jobId);
          } else {
            toast.error(res?.message || "Failed to queue sales return list calculation");
          }
        } catch (err: any) {
          toast.error("Error queueing sales return list calculation job");
        } finally {
          setIsQueueingJob(false);
        }
      });
    },
    [periodPreset, dateRange, isPosLevel, posLocationId, selectedLocationIds],
  );

  // Initial fetch on mount for default Current Fiscal Year (2026-2027)
  useEffect(() => {
    if (isPosLevel) {
      if (posLocationId && !initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        handleFetchReport("fy-current");
      }
    } else {
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        handleFetchReport("fy-current");
      }
    }
  }, [isPosLevel, posLocationId, handleFetchReport]);

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

  // When DateRange changes: switch to custom and re-fetch
  const handleDateRangeChange = (range: DateRange) => {
    if (!range?.from) return;
    setDateRange(range);
    setPeriodPreset("custom");
    handleFetchReport("custom", range);
  };

  // Single API Fetch when Bull calculation completes via SSE (<100ms)
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId &&
      hasFetchedJobIdRef.current !== previewJobId
    ) {
      hasFetchedJobIdRef.current = previewJobId;
      setIsFetchingResult(true);

      getSalesReturnListResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
          } else {
            toast.error("Failed to load completed sales return list dataset");
          }
        })
        .catch(() => {
          toast.error("Error retrieving completed sales return list preview");
        })
        .finally(() => {
          setIsFetchingResult(false);
        });
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  // Client-Side In-Memory Slicing & Grouping (Instant 0ms, Zero Backend Hits)
  const {
    filteredReturns,
    getFilteredFlatItems,
    grandTotals,
    matrixRows,
    toggleRow,
    expandAll,
    collapseAll,
  } = useSalesReturnListData(reportData, {
    reportType,
    selectedLocationIds,
    selectedCashierId,
    subTypeFilter,
    refundModeFilter,
    subDateRange: dateRange,
    searchQuery,
  });

  // Excel Export Handler
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);
    setExportProgressState({
      isExporting: true,
      type: "excel",
      label: type === "flat" ? "Exporting Return Line Items (Excel)" : "Exporting Return Documents (Excel)",
      progress: 5,
      message: "Initializing Excel export...",
    });

    const flatItemsToExport = type === "flat" ? getFilteredFlatItems() : [];
    const totalCount = type === "flat" ? flatItemsToExport.length : filteredReturns.length;

    // Instant On-The-Fly Server Filtered Streaming Export
    if (previewJobId) {
      try {
        setExportProgressState((prev) => ({
          ...prev,
          progress: 50,
          message: "Streaming filtered Excel directly from server...",
        }));

        const apiOrigin = getApiBaseUrl().replace(/\/api\/?$/, "");
        const params = new URLSearchParams();
        params.append("exportType", type);
        if (searchQuery) params.append("search", searchQuery);
        if (subTypeFilter && subTypeFilter !== "ALL") params.append("subType", subTypeFilter);
        if (refundModeFilter && refundModeFilter !== "ALL") params.append("refundMode", refundModeFilter);
        if (selectedLocationIds.length > 0) params.append("locationId", selectedLocationIds.join(","));
        if (selectedCashierId && selectedCashierId !== "all") params.append("cashierId", selectedCashierId);

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `sales-return-list-${type}-${dateStr}.xlsx`;
        const downloadUrl = `${apiOrigin}/api/pos-sales/reports/sales-return-list/stream-preview-excel/${previewJobId}/${encodeURIComponent(fileName)}?${params.toString()}`;
        window.open(downloadUrl, "_blank");
        toast.success("Filtered Excel stream started! Download will begin shortly.");

        setExportProgressState((prev) => ({
          ...prev,
          progress: 100,
          message: "Download initiated successfully!",
        }));
      } catch (err: any) {
        toast.error("Failed to initiate filtered Excel download");
      } finally {
        setIsExportingExcel(false);
        setTimeout(() => {
          setExportProgressState((prev) => ({ ...prev, isExporting: false }));
        }, 1200);
      }
      return;
    }

    // Large un-previewed background export (> 2,500 items)
    if (totalCount > 2500) {
      try {
        setExportProgressState((prev) => ({
          ...prev,
          progress: 10,
          message: `Large dataset (${totalCount.toLocaleString()} returns) detected. Initializing streaming background export...`,
        }));

        const queueRes = await queueSalesReturnListReportExport({
          locationId: selectedLocationIds.length === 1 ? selectedLocationIds[0] : undefined,
          locationIds: selectedLocationIds.length > 1 ? selectedLocationIds : undefined,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          cashierUserId: selectedCashierId !== "all" ? selectedCashierId : undefined,
          format: "xlsx",
          exportType: type,
          search: searchQuery || undefined,
          subType: subTypeFilter !== "ALL" ? subTypeFilter : undefined,
        });

        if (!queueRes.status || !queueRes.data?.jobId) {
          throw new Error(queueRes.message || "Failed to queue background export job");
        }

        const jobId = queueRes.data.jobId;

        // Poll job progress every 2 seconds
        await new Promise<void>((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await getSalesReturnListReportExportStatus(jobId);
              if (statusRes.status && statusRes.data) {
                const { state, progress, message } = statusRes.data;
                setExportProgressState((prev) => ({
                  ...prev,
                  progress: Math.max(10, Math.min(99, progress || 10)),
                  message: message || `Processing on server (${progress || 0}%)...`,
                }));

                if (state === "completed") {
                  clearInterval(pollInterval);
                  setExportProgressState((prev) => ({
                    ...prev,
                    progress: 100,
                    message: "Export completed! Initiating download...",
                  }));

                  const apiOrigin = getApiBaseUrl().replace(/\/api\/?$/, "");
                  const dateStr = new Date().toISOString().slice(0, 10);
                  const fileName = `sales-return-list-report-${dateStr}.xlsx`;
                  const downloadUrl = `${apiOrigin}/api/pos-sales/reports/sales-return-list/export/${jobId}/download/${encodeURIComponent(fileName)}`;
                  window.open(downloadUrl, "_blank");
                  toast.success("Excel report exported successfully!");
                  resolve();
                } else if (state === "failed") {
                  clearInterval(pollInterval);
                  reject(new Error("Background export task failed on server."));
                }
              }
            } catch (pollErr) {
              console.error("[SalesReturnListExport poll error]", pollErr);
            }
          }, 2000);
        });
      } catch (err: any) {
        console.error("Export error:", err);
        toast.error(err.message || "Failed to generate Excel export");
      } finally {
        setIsExportingExcel(false);
        setTimeout(() => {
          setExportProgressState((prev) => ({ ...prev, isExporting: false }));
        }, 1500);
      }
      return;
    }

    // Fast client-side generation
    try {
      const { excelBuffer, fileName } = await generateSalesReturnListExcel({
        exportType: type,
        returns: filteredReturns,
        flatItems: flatItemsToExport,
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

  // Client PDF Print Handler
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
      await generateSalesReturnListPdf({
        returns: filteredReturns,
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
      toast.success("Print preview opened successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF document");
    } finally {
      setIsExportingPdf(false);
      setExportProgressState((prev) => ({
        ...prev,
        progress: 100,
        message: "Print dialog ready!",
      }));
      setTimeout(() => {
        setExportProgressState((prev) => ({ ...prev, isExporting: false }));
      }, 600);
    }
  };

  const isCalculating =
    isQueueingJob ||
    (sseState.status === "active" && sseState.progressPercent < 100) ||
    isFetchingResult;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8 pt-4 max-w-[1700px] mx-auto w-full">
      {/* 1. Header & KPI Metrics Strip */}
      <SalesReturnListHeader
        grandTotals={grandTotals}
        dateRange={dateRange}
        selectedLocations={activeSelectionNames}
        isCalculating={isCalculating}
        progressPercent={sseState.progressPercent}
        progressMessage={sseState.message}
      />

      {/* 2. Interactive Filter Bar */}
      <SalesReturnListFilters
        locations={locations}
        cashiers={cashiers}
        selectedLocationIds={selectedLocationIds}
        selectedCashierId={selectedCashierId}
        subTypeFilter={subTypeFilter}
        refundModeFilter={refundModeFilter}
        reportType={reportType}
        periodPreset={periodPreset}
        dateRange={dateRange}
        searchQuery={searchQuery}
        isCalculating={isCalculating}
        isPending={isPending}
        isQueueingJob={isQueueingJob}
        isFetchingResult={isFetchingResult}
        previewJobId={previewJobId}
        sseState={sseState}
        onLocationChange={setSelectedLocationIds}
        onCashierChange={setSelectedCashierId}
        onSubTypeChange={setSubTypeFilter}
        onRefundModeChange={setRefundModeFilter}
        onReportTypeChange={setReportType}
        onPeriodPresetChange={handlePeriodPresetChange}
        onDateRangeChange={handleDateRangeChange}
        onSearchChange={setSearchQuery}
        onRefresh={() => handleFetchReport()}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isPosLevel={isPosLevel}
      />

      {/* 3. Progress Card during Calculation */}
      {isCalculating && (
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 space-y-2.5 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 animate-spin text-amber-600" />
              {sseState.message || "Computing sales returns dataset across nodes..."}
            </span>
            <span className="font-mono font-bold">{sseState.progressPercent || 10}%</span>
          </div>
          <Progress value={sseState.progressPercent || 10} className="h-2 bg-amber-200/50 dark:bg-amber-900/50" />
        </div>
      )}

      {/* 4. Export Progress Modal Dialog */}
      {exportProgressState.isExporting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                {exportProgressState.type === "excel" ? (
                  <FileSpreadsheet className="h-6 w-6 animate-pulse" />
                ) : (
                  <Printer className="h-6 w-6 animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {exportProgressState.label}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {exportProgressState.message}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                <span>Progress</span>
                <span className="font-bold">{exportProgressState.progress}%</span>
              </div>
              <Progress value={exportProgressState.progress} className="h-2" />
            </div>
          </div>
        </div>
      )}

      {/* 5. Virtualized Multi-Tier Sales Return Matrix Table */}
      <SalesReturnListTable
        rows={matrixRows}
        grandTotals={grandTotals}
        onToggleRow={toggleRow}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
