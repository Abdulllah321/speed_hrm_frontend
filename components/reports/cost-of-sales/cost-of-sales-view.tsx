"use client";

import React, { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";
import { MultiSelectOption } from "@/components/ui/multi-select";
import { DateRange } from "@/components/ui/date-range-picker";
import { useReportSse } from "@/hooks/use-report-sse";
import { getLocations, Location } from "@/lib/actions/location";
import {
  CostOfSalesReportData,
  queueCostOfSalesPreview,
  getCostOfSalesResult,
  registerClientCostOfSalesExport,
} from "@/lib/actions/cost-of-sales";

import { CostOfSalesHeader } from "./cost-of-sales-header";
import { CostOfSalesFilters } from "./cost-of-sales-filters";
import { CostOfSalesTable } from "./cost-of-sales-table";
import { useCostOfSalesData } from "./use-cost-of-sales-data";
import { generateCostOfSalesExcel } from "./excel-export";
import { generateCostOfSalesPdfHtml } from "./pdf-export";
import { COMPANY_NAME } from "@/lib/utils";

export function CostOfSalesView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportData, setReportData] = useState<CostOfSalesReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Non-blocking Client Export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgressPercent, setExportProgressPercent] = useState(0);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "cost-of-sales");

  // Load Store & Warehouse locations
  useEffect(() => {
    async function loadLocs() {
      try {
        const res = await getLocations();
        if (Array.isArray(res)) setLocations(res);
        else if (res?.status && Array.isArray(res.data)) setLocations(res.data);
      } catch (err) {
        console.error("Failed to load locations:", err);
      }
    }
    loadLocs();
  }, []);

  const locationParam = useMemo(
    () => (selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined),
    [selectedLocationIds],
  );

  const locationOptions: MultiSelectOption[] = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.id,
        label: loc.name,
        description: loc.code ? `Code: ${loc.code}` : undefined,
      })),
    [locations],
  );

  const activeSelectionNames = useMemo(() => {
    if (selectedLocationIds.length > 0) {
      return locations
        .filter((l) => selectedLocationIds.includes(l.id))
        .map((l) => l.name)
        .join(", ");
    }
    return "All Outlets & Warehouses";
  }, [selectedLocationIds, locations]);

  // Queue preview calculation
  const handleFetchReport = useCallback(() => {
    if (!dateRange.from || !dateRange.to) return;

    setIsQueueingJob(true);
    setPreviewJobId(null);

    startTransition(async () => {
      try {
        const res = await queueCostOfSalesPreview({
          locationId: locationParam,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
        });

        if (res && res.status && res.data?.jobId) {
          setPreviewJobId(res.data.jobId);
        } else {
          toast.error(res?.message || "Failed to queue cost-of-sales calculation");
        }
      } catch (err: any) {
        toast.error("Error queueing report calculation job");
      } finally {
        setIsQueueingJob(false);
      }
    });
  }, [locationParam, dateRange]);

  // Trigger initial report queue on mount or location/date change
  useEffect(() => {
    handleFetchReport();
  }, [locationParam, dateRange]);

  // Fetch gzipped preview result when SSE completes
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId
    ) {
      setIsFetchingResult(true);
      getCostOfSalesResult(previewJobId)
        .then((res) => {
          if (res && res.status && res.data) {
            setReportData(res.data);
          } else {
            toast.error("Failed to load completed report dataset");
          }
        })
        .catch(() => toast.error("Error downloading report calculation result"))
        .finally(() => setIsFetchingResult(false));
    }
  }, [sseState.status, sseState.progressPercent, previewJobId]);

  // Client-side filtration & matrix hook
  const {
    searchQuery,
    setSearchQuery,
    groupingLevels,
    handleToggleLevel,
    filteredBrands,
    grandTotals,
    flatRows,
  } = useCostOfSalesData(reportData);

  // Client-side Excel Export Handler (Flat or Hierarchical)
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);
    setExportProgressPercent(5);

    try {
      const { excelBuffer, fileName, fileBase64 } = await generateCostOfSalesExcel({
        exportType: type,
        brands: filteredBrands,
        flatItems: reportData.flatItems || [],
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
        onProgress: (pct) => setExportProgressPercent(pct),
      });

      // Trigger browser download
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

      // Register export in background with S3 and ExportHistory
      registerClientCostOfSalesExport({
        fileName,
        fileBase64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }).catch((e) => console.warn("Failed to register export history:", e));

      toast.success(`Exported ${fileName} successfully!`);
    } catch (err) {
      console.error("Excel Export Error:", err);
      toast.error("Failed to generate Excel export file");
    } finally {
      setIsExportingExcel(false);
      setExportProgressPercent(0);
    }
  };

  // Printable HTML/PDF Export Handler
  const handleExportPdf = () => {
    if (!reportData) return;
    setIsExportingPdf(true);

    try {
      const html = generateCostOfSalesPdfHtml({
        brands: filteredBrands,
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
      });

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      toast.error("Failed to render printable PDF report");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* KPI Cards */}
      <CostOfSalesHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress & Checkboxes */}
      <CostOfSalesFilters
        locationOptions={locationOptions}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        groupingLevels={groupingLevels}
        onToggleLevel={handleToggleLevel}
        onRefresh={handleFetchReport}
        isPending={isPending || isQueueingJob || isFetchingResult}
        previewJobId={previewJobId}
        sseState={sseState}
        isQueueingJob={isQueueingJob}
        isFetchingResult={isFetchingResult}
        onExportExcelFlat={() => handleExportExcel("flat")}
        onExportExcelHierarchy={() => handleExportExcel("hierarchical")}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        exportProgressPercent={exportProgressPercent}
      />

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b pb-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{COMPANY_NAME}</h1>
        <h2 className="text-lg font-bold text-slate-700">Cost of Sales Report</h2>
        <p className="text-xs text-slate-600">Outlets & Warehouses: {activeSelectionNames}</p>
        <p className="text-xs text-slate-500">
          Period: {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start"} to{" "}
          {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End"}
        </p>
      </div>

      {/* Virtualized Matrix Table */}
      <CostOfSalesTable rows={flatRows} grandTotals={grandTotals} />
    </div>
  );
}
