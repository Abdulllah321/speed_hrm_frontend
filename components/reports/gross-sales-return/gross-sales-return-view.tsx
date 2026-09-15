"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueGrossSalesReturnPreview,
  getGrossSalesReturnResult,
  queueGrossSalesReturnReportExport,
  getGrossSalesExportStatus,
} from "@/lib/actions/pos-sales";
import { useReportSse } from "@/hooks/use-report-sse";
import { GrossSalesReturnReportData } from "./types";
import { useGrossSalesReturnData } from "./use-gross-sales-return-data";
import { GrossSalesReturnHeader } from "./gross-sales-return-header";
import { GrossSalesReturnFilters } from "./gross-sales-return-filters";
import { GrossSalesReturnTable } from "./gross-sales-return-table";
import { generateGrossSalesReturnExcel } from "./excel-export";
import { generateGrossSalesReturnPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { FileSpreadsheet, Printer } from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";
import { format } from "date-fns";

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

interface GrossSalesReturnViewProps {
  initialReportData?: GrossSalesReturnReportData | null;
  locations?: Location[];
  cashiers?: User[];
  userId?: string;
  isPosLevel?: boolean;
}

export function GrossSalesReturnView({
  initialReportData = null,
  locations: propLocations = [],
  cashiers: propCashiers = [],
  userId = "system",
  isPosLevel = false,
}: GrossSalesReturnViewProps = {}) {
  const { user } = useAuth();
  const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
  const posLocationName = user?.terminal?.location?.name || (user as any)?.location?.name || "Current Store";

  const [locations, setLocations] = useState<Location[]>(propLocations);
  const [cashiers, setCashiers] = useState<User[]>(propCashiers);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (propLocations && propLocations.length > 0) {
      setLocations(propLocations);
    }
  }, [propLocations]);

  useEffect(() => {
    if (propCashiers && propCashiers.length > 0) {
      setCashiers(propCashiers);
    }
  }, [propCashiers]);

  // Enforce POS terminal location when on POS level
  useEffect(() => {
    if (isPosLevel && posLocationId) {
      setSelectedLocationIds([posLocationId]);
    }
  }, [isPosLevel, posLocationId]);

  const [reportType, setReportType] = useState<"merged" | "separate">(
    initialReportData?.reportType || "merged"
  );

  // Period / Base Date Selection (Default: Current Fiscal Year)
  const [periodPreset, setPeriodPreset] = useState<string>("fy-current");
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const init = getPresetPeriodInfo("fy-current");
    return { from: init.from, to: init.to };
  });

  const [reportData, setReportData] = useState<GrossSalesReturnReportData | null>(initialReportData);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Client export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Floating background export progress state
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

  const hasFetchedJobIdRef = useRef<string | null>(null);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "gross-sales-return");

  // Load Outlets & Cashiers on mount if empty
  useEffect(() => {
    async function loadOptions() {
      try {
        if (locations.length === 0 || cashiers.length === 0) {
          const [locRes, cashierRes] = await Promise.all([getLocations(), getUsers()]);
          const locData = Array.isArray(locRes) ? locRes : (locRes as any)?.data || [];
          const userList = Array.isArray(cashierRes) ? cashierRes : (cashierRes as any)?.data || [];

          if (locations.length === 0 && Array.isArray(locData)) setLocations(locData);
          if (cashiers.length === 0 && Array.isArray(userList)) setCashiers(userList);
        }
      } catch (err) {
        console.error("Failed to load outlet or cashier options:", err);
      }
    }
    loadOptions();
  }, []);

  const locationParam = useMemo(
    () => (isPosLevel && posLocationId ? posLocationId : selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined),
    [isPosLevel, posLocationId, selectedLocationIds],
  );

  const activeSelectionNames = useMemo(() => {
    if (isPosLevel && posLocationName) return posLocationName;
    if (selectedLocationIds.length === 0) return "All Outlets (Stores)";
    return locations
      .filter((l) => selectedLocationIds.includes(l.id))
      .map((l) => l.name)
      .join(", ");
  }, [isPosLevel, posLocationName, selectedLocationIds, locations]);

  // Queue preview calculation
  const handleFetchReport = useCallback(
    (presetOverride?: string, rangeOverride?: DateRange) => {
      const activePreset = presetOverride || periodPreset;
      const activeRange = rangeOverride || dateRange;
      const periodInfo = getPresetPeriodInfo(activePreset);

      if (!activeRange.from || !activeRange.to) return;
      if (isPosLevel && !posLocationId) return;

      setIsQueueingJob(true);
      setPreviewJobId(null);
      hasFetchedJobIdRef.current = null;

      startTransition(async () => {
        try {
          let startDate: string | undefined;
          let endDate: string | undefined;
          let fiscalYear: string | undefined;
          let year: number | undefined;

          if (activePreset === "fy-current" || activePreset === "fy-previous") {
            fiscalYear = periodInfo.fiscalYear;
            startDate = periodInfo.from.toISOString();
            endDate = periodInfo.to.toISOString();
          } else if (activePreset === "year-current" || activePreset === "year-previous") {
            year = periodInfo.year;
            startDate = periodInfo.from.toISOString();
            endDate = periodInfo.to.toISOString();
          } else {
            startDate = activeRange.from ? format(activeRange.from, "yyyy-MM-dd") : undefined;
            endDate = activeRange.to ? format(activeRange.to, "yyyy-MM-dd") : undefined;
          }

          const res = await queueGrossSalesReturnPreview({
            locationId: locationParam,
            startDate,
            endDate,
            cashierUserId: selectedCashierId,
            reportType,
            fiscalYear,
            year,
          });

          if (res && res.status && res.data?.jobId) {
            setPreviewJobId(res.data.jobId);
          } else {
            toast.error(res?.message || "Failed to queue sales return calculation");
          }
        } catch (err: any) {
          toast.error("Error queueing sales return calculation job");
        } finally {
          setIsQueueingJob(false);
        }
      });
    },
    [locationParam, periodPreset, dateRange, selectedCashierId, reportType, isPosLevel, posLocationId]
  );

  const initialFetchDoneRef = useRef(false);

  // Initial fetch on mount: wait for posLocationId if on POS level
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

  const handlePeriodPresetChange = (newPreset: string) => {
    setPeriodPreset(newPreset);
    if (newPreset !== "custom") {
      const info = getPresetPeriodInfo(newPreset);
      const newRange: DateRange = { from: info.from, to: info.to };
      setDateRange(newRange);
      handleFetchReport(newPreset, newRange);
    }
  };

  const handleCustomDateRangeChange = (range: DateRange) => {
    setPeriodPreset("custom");
    setDateRange(range);
    if (range.from && range.to) {
      handleFetchReport("custom", range);
    }
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

      getGrossSalesReturnResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
          } else {
            toast.error("Failed to load completed sales return dataset");
          }
        })
        .catch(() => {
          toast.error("Error retrieving completed sales return preview");
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
  } = useGrossSalesReturnData(reportData);

  // Intelligent Export Handler: Instant Client (<2,500) vs Background Bull Queue (>2,500)
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);
    setExportProgressState({
      isExporting: true,
      type: "excel",
      label: type === "flat" ? "Exporting Return Line Items (Excel)" : "Exporting Return Summary (Excel)",
      progress: 5,
      message: "Initializing Excel export...",
    });

    const totalCount = reportData.flatItems?.length || 0;

    // Instant On-The-Fly Server Filtered Streaming Export
    // Zero browser CPU freeze, zero database re-querying, preserving current search, payment mode, FBR toggle & outlet filters.
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
        if (paymentModeFilter && paymentModeFilter !== "all") params.append("paymentMode", paymentModeFilter);
        if (fbrOnlyFilter) params.append("fbrOnly", "true");
        if (selectedLocationIds.length > 0) params.append("locationId", selectedLocationIds.join(","));

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `gross-sales-return-${type}-${dateStr}.xlsx`;
        const downloadUrl = `${apiOrigin}/api/pos-sales/reports/gross-sales-return/stream-preview-excel/${previewJobId}/${encodeURIComponent(fileName)}?${params.toString()}`;
        window.open(downloadUrl, "_blank");
        toast.success("Filtered return Excel stream started! Download will begin shortly.");

        setExportProgressState((prev) => ({
          ...prev,
          progress: 100,
          message: "Download initiated successfully!",
        }));
      } catch (err: any) {
        toast.error("Failed to initiate filtered return Excel download");
      } finally {
        setIsExportingExcel(false);
        setTimeout(() => {
          setExportProgressState((prev) => ({ ...prev, isExporting: false }));
        }, 1200);
      }
      return;
    }

    // For large un-previewed datasets (> 2,500), offload to server Bull Queue streaming worker
    if (totalCount > 2500) {
      try {
        setExportProgressState((prev) => ({
          ...prev,
          progress: 10,
          message: `Large dataset (${totalCount.toLocaleString()} items) detected. Initializing streaming background export...`,
        }));

        const queueRes = await queueGrossSalesReturnReportExport({
          locationId: selectedLocationIds.length === 1 ? selectedLocationIds[0] : undefined,
          locationIds: selectedLocationIds.length > 1 ? selectedLocationIds : undefined,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          cashierUserId: selectedCashierId,
          format: "xlsx",
          exportType: type,
          search: searchQuery || undefined,
          paymentModeGroup: paymentModeFilter !== "all" ? paymentModeFilter : undefined,
          fbrOnly: fbrOnlyFilter || undefined,
        });

        if (!queueRes.status || !queueRes.data?.jobId) {
          throw new Error(queueRes.message || "Failed to queue background export job");
        }

        const jobId = queueRes.data.jobId;

        // Poll job progress every 2 seconds
        await new Promise<void>((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await getGrossSalesExportStatus(jobId);
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

                  // CORS-safe download via window.open (Workspace Rule AGENTS.md)
                  const apiOrigin = getApiBaseUrl().replace(/\/api\/?$/, "");
                  const dateStr = new Date().toISOString().slice(0, 10);
                  const fileName = `gross-sales-return-report-${dateStr}.xlsx`;
                  const downloadUrl = `${apiOrigin}/api/pos-sales/reports/gross-sales-export/${jobId}/download/${encodeURIComponent(fileName)}`;
                  window.open(downloadUrl, "_blank");
                  toast.success("Excel return report exported successfully!");
                  resolve();
                } else if (state === "failed") {
                  clearInterval(pollInterval);
                  reject(new Error("Background export task failed on server."));
                }
              }
            } catch (pollErr) {
              console.error("[GrossSalesReturn export poll error]", pollErr);
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

    // Fast instant generation for small datasets
    try {
      const { excelBuffer, fileName } = await generateGrossSalesReturnExcel({
        exportType: type,
        returns: reportData.returns || [],
        flatItems: reportData.flatItems || [],
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
        onProgress: (percent) => {
          setExportProgressState((prev) => ({
            ...prev,
            progress: percent,
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
      toast.success("Excel return report generated successfully");
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

  // Client PDF Print Handler with Smooth Floating Progress Card
  const handleExportPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);
    setExportProgressState({
      isExporting: true,
      type: "pdf",
      label: "Generating Return PDF Print View",
      progress: 10,
      message: "Initializing printable layout...",
    });

    try {
      await generateGrossSalesReturnPdf({
        returns: reportData.returns || [],
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {exportProgressState.message}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {exportProgressState.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-200 rounded-full"
              style={{ width: `${exportProgressState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* KPI Header Cards */}
      <GrossSalesReturnHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress Banner */}
      <GrossSalesReturnFilters
        isPosLevel={isPosLevel}
        posLocationName={posLocationName}
        reportType={reportType}
        onReportTypeChange={setReportType}
        dateRange={dateRange}
        onDateRangeChange={handleCustomDateRangeChange}
        periodPreset={periodPreset}
        onPeriodPresetChange={handlePeriodPresetChange}
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
      <GrossSalesReturnTable
        rows={flatRows}
        grandTotals={grandTotals}
        onToggleNode={toggleNode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
