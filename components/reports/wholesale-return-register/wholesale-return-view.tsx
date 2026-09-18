"use client";

import React, { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { WholesaleReturnRegisterData } from "./types";
import { WholesaleReturnHeader } from "./wholesale-return-header";
import { WholesaleReturnFilters } from "./wholesale-return-filters";
import { WholesaleReturnTable } from "./wholesale-return-table";
import { useWholesaleReturnData } from "./use-wholesale-return-data";
import { useReportSse } from "@/hooks/use-report-sse";
import {
  queueWholesaleReturnRegisterPreview,
  getWholesaleReturnRegisterResult,
  queueWholesaleReturnRegisterExport,
  getWholesaleReturnRegisterExportStatus,
} from "@/lib/actions/wholesale-return-register";
import { toast } from "sonner";
import { DateRange } from "@/components/ui/date-range-picker";
import { getCustomers } from "@/lib/actions/customer";
import { getApiBaseUrl } from "@/lib/utils";

const getPresetPeriodInfo = (
  preset: string,
): { from: Date; to: Date; fiscalYear?: string; year?: number } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
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
  return {
    from: new Date(fyStartYear, 6, 1),
    to: new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999),
  };
};

export function WholesaleReturnView() {
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const custRes = await getCustomers({ limit: 1000 });
        if (custRes && custRes.data) {
          setCustomers(custRes.data);
        }
      } catch (err) {
        console.error("Failed to load options:", err);
      }
    }
    loadOptions();
  }, []);

  const [reportData, setReportData] = useState<WholesaleReturnRegisterData | null>(null);
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [periodPreset, setPeriodPreset] = useState<string>("fy-current");
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const init = getPresetPeriodInfo("fy-current");
    return { from: init.from, to: init.to };
  });

  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [isPending, startTransition] = useTransition();
  const hasFetchedJobIdRef = useRef<string | null>(null);

  const sseState = useReportSse(previewJobId, "wholesale-return-register");

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

          if (activePreset !== "custom") {
            startDate = periodInfo.from.toISOString();
            endDate = periodInfo.to.toISOString();
          } else {
            startDate = activeRange.from?.toISOString();
            endDate = activeRange.to?.toISOString();
          }

          const customerId = selectedCustomerIds.length === 1 ? selectedCustomerIds[0] : undefined;

          const res = await queueWholesaleReturnRegisterPreview({
            customerId,
            startDate,
            endDate,
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
    [periodPreset, dateRange, selectedCustomerIds]
  );

  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      handleFetchReport("fy-current");
    }
  }, [handleFetchReport]);

  const handlePeriodPresetChange = (newPreset: string) => {
    setPeriodPreset(newPreset);
    if (newPreset !== "custom") {
      const info = getPresetPeriodInfo(newPreset);
      const newRange = { from: info.from, to: info.to };
      setDateRange(newRange);
      handleFetchReport(newPreset, newRange);
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setPeriodPreset("custom");
    handleFetchReport("custom", range);
  };

  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId &&
      hasFetchedJobIdRef.current !== previewJobId
    ) {
      hasFetchedJobIdRef.current = previewJobId;
      setIsFetchingResult(true);

      getWholesaleReturnRegisterResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
            toast.success("Wholesale Return register updated");
          } else {
            toast.error("Failed to load completed wholesale Return register dataset");
          }
        })
        .catch(() => {
          toast.error("Error retrieving completed wholesale Return preview");
        })
        .finally(() => {
          setIsFetchingResult(false);
        });
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  const {
    groupingLevels,
    handleToggleLevel,
    grandTotals,
    treeData,
  } = useWholesaleReturnData(reportData, {
    reportType,
    selectedCustomerIds,
    subDateRange: dateRange,
    searchQuery,
  });

  const triggerExportJob = async (format: "xlsx" | "pdf") => {
    try {
      if (format === "xlsx") setIsExportingExcel(true);
      else setIsExportingPdf(true);

      const customerId = selectedCustomerIds.length === 1 ? selectedCustomerIds[0] : undefined;
      const res = await queueWholesaleReturnRegisterExport({
        customerId,
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
        format,
        search: searchQuery || undefined,
      });

      if (!res.status || !res.data?.jobId) {
        throw new Error(res.message || "Failed to queue export");
      }

      const jobId = res.data.jobId;
      toast.success(`${format.toUpperCase()} export queued. Downloading when ready...`);

      const pollInterval = setInterval(async () => {
        const statusRes = await getWholesaleReturnRegisterExportStatus(jobId);
        if (statusRes.status && statusRes.data) {
          if (statusRes.data.state === "completed") {
            clearInterval(pollInterval);
            const apiOrigin = getApiBaseUrl().replace(/\/api\/?$/, "");
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `wholesale-return-register-${dateStr}.${format}`;
            const downloadUrl = `${apiOrigin}/api/sales/reports/wholesale-return-register/export/${jobId}/download/${encodeURIComponent(fileName)}`;
            window.open(downloadUrl, "_blank");
            if (format === "xlsx") setIsExportingExcel(false);
            else setIsExportingPdf(false);
          } else if (statusRes.data.state === "failed") {
            clearInterval(pollInterval);
            toast.error("Export failed on server");
            if (format === "xlsx") setIsExportingExcel(false);
            else setIsExportingPdf(false);
          }
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
      setIsExportingExcel(false);
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1750px] mx-auto relative">
      <WholesaleReturnHeader totals={grandTotals} />

      <WholesaleReturnFilters
        reportType={reportType}
        onReportTypeChange={setReportType}
        periodPreset={periodPreset}
        onPeriodPresetChange={handlePeriodPresetChange}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        customers={customers}
        selectedCustomerIds={selectedCustomerIds}
        onCustomerChange={setSelectedCustomerIds}
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
        onExportExcelFlat={() => triggerExportJob("xlsx")}
        onExportExcelHierarchy={() => triggerExportJob("xlsx")}
        onExportPdf={() => triggerExportJob("pdf")}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
      />

      <WholesaleReturnTable
        treeData={treeData}
        grandTotals={grandTotals}
        searchQuery={searchQuery}
        isLoading={isPending || isQueueingJob || isFetchingResult}
      />
    </div>
  );
}
