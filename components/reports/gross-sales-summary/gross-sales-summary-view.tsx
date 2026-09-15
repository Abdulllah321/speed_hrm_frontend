"use client";

import React, { useState, useEffect, useTransition, useRef, useMemo, useCallback } from "react";
import {
  GrossSalesSummaryReportData,
  GrossSalesSummaryFlatRecord,
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
  queueGrossSalesSummaryReportExport,
  getGrossSalesExportStatus,
} from "@/lib/actions/pos-sales";
import { toast } from "sonner";
import { DateRange } from "@/components/ui/date-range-picker";
import { FileSpreadsheet, Printer } from "lucide-react";
import { format } from "date-fns";

import { getLocations } from "@/lib/actions/location";
import { getUsers } from "@/lib/actions/users";
import { useAuth } from "@/components/providers/auth-provider";
import { getApiBaseUrl } from "@/lib/utils";

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

interface GrossSalesSummaryViewProps {
  initialReportData?: GrossSalesSummaryReportData | null;
  locations?: any[];
  cashiers?: any[];
  userId?: string;
  isPosLevel?: boolean;
}

export function GrossSalesSummaryView({
  initialReportData = null,
  locations: propLocations = [],
  cashiers: propCashiers = [],
  userId = "system",
  isPosLevel = false,
}: GrossSalesSummaryViewProps = {}) {
  const { user } = useAuth();
  const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
  const posLocationName = user?.terminal?.location?.name || (user as any)?.location?.name || "Current Store";

  const [locations, setLocations] = useState<any[]>(propLocations);
  const [cashiers, setCashiers] = useState<any[]>(propCashiers);

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

  useEffect(() => {
    async function loadOptions() {
      try {
        if (locations.length === 0 || cashiers.length === 0) {
          const [locRes, cashierRes] = await Promise.all([getLocations(), getUsers()]);
          const locData = Array.isArray(locRes) ? locRes : (locRes as any)?.data || [];
          const userList = Array.isArray(cashierRes) ? cashierRes : (cashierRes as any)?.data || [];

          if (Array.isArray(locData) && locData.length > 0) setLocations(locData);
          if (Array.isArray(userList) && userList.length > 0) setCashiers(userList);
        }
      } catch (err) {
        console.error("Failed to load options:", err);
      }
    }
    loadOptions();
  }, []);

  const [reportData, setReportData] = useState<GrossSalesSummaryReportData | null>(
    initialReportData
  );
  const [reportType, setReportType] = useState<"merged" | "separate">(
    initialReportData?.reportType || "merged"
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  // Period / Base Date Selection (Default: Current Fiscal Year)
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

  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
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

  const [isPending, startTransition] = useTransition();
  const hasFetchedJobIdRef = useRef<string | null>(null);

  const sseState = useReportSse(previewJobId, "gross-sales-summary");

  const activeSelectionNames = useMemo(() => {
    if (isPosLevel) return posLocationName;
    if (selectedLocationIds.length === 0) return "All Outlets (Stores)";
    const selected = locations.filter((loc) => selectedLocationIds.includes(loc.id));
    return selected.map((loc) => loc.name).join(", ");
  }, [isPosLevel, posLocationName, selectedLocationIds, locations]);

  // Backend Preview Fetcher: ONLY triggered on Fiscal Year / Base Period change or explicit Refresh
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

          // Pos level restricts to single location; ERP mode restricts to selected location(s) if picked, or all locations
          const locationId = isPosLevel
            ? posLocationId
            : selectedLocationIds.length > 0
            ? selectedLocationIds.join(",")
            : undefined;

          const res = await queueGrossSalesSummaryPreview({
            locationId,
            startDate,
            endDate,
            reportType,
            fiscalYear,
            year,
          });

          const jobId = res.data?.jobId;
          if (res.status && jobId) {
            setPreviewJobId(jobId);
          } else {
            toast.error(res.message || "Failed to queue summary report preview.");
          }
        } catch (err: any) {
          toast.error("Error launching summary calculation");
        } finally {
          setIsQueueingJob(false);
        }
      });
    },
    [periodPreset, dateRange, reportType, isPosLevel, posLocationId, selectedLocationIds]
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

  // Single API Fetch when Bull calculation completes via SSE (<100ms)
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId &&
      hasFetchedJobIdRef.current !== previewJobId
    ) {
      hasFetchedJobIdRef.current = previewJobId;
      setIsFetchingResult(true);

      getGrossSalesSummaryResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
            toast.success("Gross sales summary updated");
          } else {
            toast.error("Failed to load completed gross sales summary dataset");
          }
        })
        .catch(() => {
          toast.error("Error retrieving completed gross sales summary preview");
        })
        .finally(() => {
          setIsFetchingResult(false);
        });
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  // Client-Side In-Memory Slicing & Grouping (Instant 0ms, Zero Backend Hits)
  const {
    groupingLevels,
    handleToggleLevel,
    grandTotals,
    treeData,
    filteredFlatItems,
  } = useGrossSalesSummaryData(reportData, {
    reportType,
    selectedLocationIds,
    selectedCashierId,
    subDateRange: dateRange,
    searchQuery,
  });

  // Intelligent Export Handler: Instant Client (<2,500) vs Background Bull Queue (>2,500)
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);
    setExportProgressState({
      isExporting: true,
      type: "excel",
      label: type === "flat" ? "Exporting Line Items (Excel)" : "Exporting Summary Matrix (Excel)",
      progress: 5,
      message: "Initializing Excel export...",
    });

    const totalCount = filteredFlatItems.length;

    // Instant On-The-Fly Server Filtered Streaming Export
    // Zero browser CPU lag, zero database re-querying, preserving current search & outlet filters.
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
        if (selectedLocationIds.length > 0) params.append("locationId", selectedLocationIds.join(","));

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `gross-sales-summary-${type}-${dateStr}.xlsx`;
        const downloadUrl = `${apiOrigin}/api/pos-sales/reports/gross-sales-summary/stream-preview-excel/${previewJobId}/${encodeURIComponent(fileName)}?${params.toString()}`;
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

    // For large un-previewed datasets, offload to Bull Queue streaming worker
    if (totalCount > 2500) {
      try {
        setExportProgressState((prev) => ({
          ...prev,
          progress: 10,
          message: `Large dataset (${totalCount.toLocaleString()} items) detected. Initializing streaming background export...`,
        }));

        const queueRes = await queueGrossSalesSummaryReportExport({
          locationId: selectedLocationIds.length === 1 ? selectedLocationIds[0] : undefined,
          locationIds: selectedLocationIds.length > 1 ? selectedLocationIds : undefined,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          cashierUserId: selectedCashierId,
          format: "xlsx",
          exportType: type,
          search: searchQuery || undefined,
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
                  const fileName = `gross-sales-summary-report-${dateStr}.xlsx`;
                  const downloadUrl = `${apiOrigin}/api/pos-sales/reports/gross-sales-summary/export/${jobId}/download/${encodeURIComponent(fileName)}`;
                  window.open(downloadUrl, "_blank");

                  toast.success("Excel report downloaded successfully!");
                  resolve();
                } else if (state === "failed") {
                  clearInterval(pollInterval);
                  reject(new Error(message || "Export processing failed on server"));
                }
              }
            } catch (pollErr) {
              clearInterval(pollInterval);
              reject(pollErr);
            }
          }, 2000);
        });
      } catch (err: any) {
        toast.error(err.message || "Background export job failed");
      } finally {
        setIsExportingExcel(false);
        setTimeout(() => {
          setExportProgressState((prev) => ({ ...prev, isExporting: false }));
        }, 1200);
      }
      return;
    }

    // Instant browser export for small datasets
    try {
      await generateGrossSalesSummaryExcel({
        exportType: type,
        treeData,
        flatItems: filteredFlatItems,
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
        onProgress: (percent: number) => {
          setExportProgressState((prev) => ({
            ...prev,
            progress: percent,
            message: `Rendering Excel (${percent}%)...`,
          }));
        },
      });
      toast.success("Excel exported successfully!");
    } catch (err: any) {
      toast.error("Failed to generate Excel file");
    } finally {
      setIsExportingExcel(false);
      setTimeout(() => {
        setExportProgressState((prev) => ({ ...prev, isExporting: false }));
      }, 1000);
    }
  };

  const handleExportPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);
    setExportProgressState({
      isExporting: true,
      type: "pdf",
      label: "Generating PDF Print View",
      progress: 10,
      message: "Initializing printable layout...",
    });

    try {
      await generateGrossSalesSummaryPdf({
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

      <GrossSalesSummaryHeader totals={grandTotals} />

      <GrossSalesSummaryFilters
        isPosLevel={isPosLevel}
        posLocationName={posLocationName}
        reportType={reportType}
        onReportTypeChange={setReportType}
        periodPreset={periodPreset}
        onPeriodPresetChange={handlePeriodPresetChange}
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
        groupingLevels={groupingLevels}
        onToggleLevel={handleToggleLevel}
        onRefresh={() => handleFetchReport()}
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
