"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
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
  queueGrossSalesSummaryReportExport,
  getGrossSalesExportStatus,
} from "@/lib/actions/pos-sales";
import { streamGrossSalesSummaryResult } from "@/lib/stream-ndjson";
import { toast } from "sonner";
import { DateRange } from "@/components/ui/date-range-picker";
import { FileSpreadsheet, Printer, Zap } from "lucide-react";

import { getLocations } from "@/lib/actions/location";
import { getUsers } from "@/lib/actions/users";
import { useAuth } from "@/components/providers/auth-provider";
import { getApiBaseUrl } from "@/lib/utils";

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
          if (locations.length === 0) setLocations(locData);
          if (cashiers.length === 0) setCashiers(userList);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
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

  // Enforce POS terminal location when on POS level
  useEffect(() => {
    if (isPosLevel && posLocationId) {
      setSelectedLocationIds([posLocationId]);
    }
  }, [isPosLevel, posLocationId]);

  const getDefaultFiscalDateRange = (): DateRange => {
    const now = new Date();
    const year = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
    return {
      from: new Date(year, 6, 1),
      to: now,
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultFiscalDateRange);

  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Progressive NDJSON streaming progress state
  const [streamProgress, setStreamProgress] = useState<{
    isStreaming: boolean;
    loadedRecords: number;
    totalRecords: number;
    percent: number;
  }>({
    isStreaming: false,
    loadedRecords: 0,
    totalRecords: 0,
    percent: 0,
  });

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
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  const sseState = useReportSse(previewJobId, "gross-sales-summary");

  const activeSelectionNames = React.useMemo(() => {
    if (selectedLocationIds.length === 0) return "All Outlets";
    const selected = locations.filter((loc) => selectedLocationIds.includes(loc.id));
    return selected.map((loc) => loc.name).join(", ");
  }, [selectedLocationIds, locations]);

  const handleFetchReport = () => {
    setIsQueueingJob(true);
    setPreviewJobId(null);

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
    handleFetchReport();
  }, [selectedLocationIds, selectedCashierId, reportType, dateRange.from, dateRange.to]);

  // Progressive NDJSON Stream Ingestion upon SSE Completion
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId
    ) {
      streamAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      streamAbortControllerRef.current = abortController;

      setIsFetchingResult(true);
      setStreamProgress({
        isStreaming: true,
        loadedRecords: 0,
        totalRecords: 0,
        percent: 0,
      });

      streamGrossSalesSummaryResult(
        previewJobId,
        {
          onMeta: (meta) => {
            setReportData({
              reportType: meta.reportType || "merged",
              dateRange: meta.dateRange || {},
              locationNames: meta.locationNames || "",
              categories: [],
              flatItems: [],
              grandTotals: {
                orderCount: 0,
                totalItems: 0,
                grossAmount: 0,
                wostAmount: 0,
                discountAmount: 0,
                netAmount: 0,
                taxAmount: 0,
              },
            });
            setStreamProgress((prev) => ({
              ...prev,
              totalRecords: meta.totalRecords || 0,
            }));
          },
          onBatch: (newCategories) => {
            setReportData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                categories: [...(prev.categories || []), ...newCategories],
              };
            });
          },
          onFlatItemsBatch: (newFlatItems) => {
            setReportData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                flatItems: [...(prev.flatItems || []), ...newFlatItems],
              };
            });
            setStreamProgress((prev) => {
              const newCount = prev.loadedRecords + newFlatItems.length;
              const total = prev.totalRecords || newCount;
              return {
                ...prev,
                loadedRecords: newCount,
                percent: total > 0 ? Math.min(100, Math.round((newCount / total) * 100)) : 100,
              };
            });
          },
          onComplete: (totals, totalRecords) => {
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
              loadedRecords: totalRecords || prev.loadedRecords,
              percent: 100,
            }));
          },
          onError: (err) => {
            console.error("[GrossSalesSummary Stream Error]", err);
            getGrossSalesSummaryResult(previewJobId)
              .then((res) => {
                if (res?.status && res.data) {
                  setReportData(res.data);
                }
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

  const {
    searchQuery,
    setSearchQuery,
    groupingLevels,
    handleToggleLevel,
    grandTotals,
    treeData,
  } = useGrossSalesSummaryData(reportData);

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

    const totalCount = reportData.flatItems?.length || 0;

    // Instant On-The-Fly Server Filtered Streaming Export
    // Zero browser CPU lag, zero database re-querying, preserving current search & outlet filters.
    if (previewJobId) {
      try {
        setExportProgressState((prev) => ({
          ...prev,
          progress: 50,
          message: "Streaming filtered Excel directly from server...",
        }));

        const baseUrl = getApiBaseUrl();
        const params = new URLSearchParams();
        params.append("exportType", type);
        if (searchQuery) params.append("search", searchQuery);
        if (selectedLocationIds.length > 0) params.append("locationId", selectedLocationIds.join(","));

        const downloadUrl = `${baseUrl}/pos-sales/reports/gross-sales-summary/stream-preview-excel/${previewJobId}?${params.toString()}`;
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
                  const downloadUrl = `/api/pos-sales/reports/gross-sales-export/${jobId}/download`;
                  window.open(downloadUrl, "_blank");
                  toast.success("Excel summary report exported successfully!");
                  resolve();
                } else if (state === "failed") {
                  clearInterval(pollInterval);
                  reject(new Error("Background export task failed on server."));
                }
              }
            } catch (pollErr) {
              console.error("[GrossSalesSummary export poll error]", pollErr);
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
      const { excelBuffer, fileName } = await generateGrossSalesSummaryExcel({
        exportType: type,
        treeData,
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
      toast.success("Excel summary report generated successfully");
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
        flatItems: reportData.flatItems || [],
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
        isFetchingResult={isFetchingResult && !streamProgress.isStreaming}
        onExportExcelFlat={() => handleExportExcel("flat")}
        onExportExcelHierarchy={() => handleExportExcel("hierarchical")}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
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
                <span>⚡ Live Streaming Gross Sales Summary</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800 text-[11px]">
                  {streamProgress.loadedRecords.toLocaleString()}
                  {streamProgress.totalRecords > 0 ? ` / ${streamProgress.totalRecords.toLocaleString()}` : ""} items ({streamProgress.percent}%)
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Categories and line items are updating in real-time as data streams from the server
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
          </div>
        </div>
      )}

      <GrossSalesSummaryTable
        treeData={treeData}
        grandTotals={grandTotals}
        searchQuery={searchQuery}
        isLoading={isPending || isQueueingJob || (isFetchingResult && !streamProgress.isStreaming)}
      />
    </div>
  );
}
