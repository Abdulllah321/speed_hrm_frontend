"use client";

import React, { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";
import { DateRange } from "@/components/ui/date-range-picker";
import { useReportSse } from "@/hooks/use-report-sse";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
  StockActivityReportData,
  queueStockActivityPreview,
  getStockActivityResult,
  registerClientStockActivityExport,
} from "@/lib/actions/stock-activity";

import { StockActivityHeader } from "./stock-activity-header";
import { StockActivityFilters } from "./stock-activity-filters";
import { StockActivityTable } from "./stock-activity-table";
import { useStockActivityData } from "./use-stock-activity-data";
import { generateStockActivityExcel } from "./excel-export";
import { generateStockActivityPdfHtml } from "./pdf-export";
import { COMPANY_NAME } from "@/lib/utils";

export function StockActivityView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportData, setReportData] = useState<StockActivityReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Non-blocking Client Export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "stock-activity");

  // Load Store & Warehouse locations
  useEffect(() => {
    async function loadData() {
      try {
        const [locRes, whRes] = await Promise.all([getLocations(), getWarehouses()]);
        const locData = Array.isArray(locRes) ? locRes : (locRes as any)?.data || [];
        const whData = Array.isArray(whRes) ? whRes : (whRes as any)?.data || [];

        if (Array.isArray(locData)) setLocations(locData);
        if (Array.isArray(whData)) setWarehouses(whData);
      } catch (err) {
        console.error("Failed to load location/warehouse options:", err);
      }
    }
    loadData();
  }, []);

  const locationParam = useMemo(
    () => (selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined),
    [selectedLocationIds],
  );

  const warehouseParam = useMemo(
    () => (selectedWarehouseIds.length > 0 ? selectedWarehouseIds.join(",") : undefined),
    [selectedWarehouseIds],
  );

  const activeSelectionNames = useMemo(() => {
    const names: string[] = [];
    if (selectedLocationIds.length > 0) {
      const locNames = locations
        .filter((l) => selectedLocationIds.includes(l.id))
        .map((l) => l.name);
      names.push(...locNames);
    }
    if (selectedWarehouseIds.length > 0) {
      const whNames = warehouses
        .filter((w) => selectedWarehouseIds.includes(w.id))
        .map((w) => w.name);
      names.push(...whNames);
    }
    return names.length > 0 ? names.join(", ") : "All Outlets & Warehouses";
  }, [selectedLocationIds, selectedWarehouseIds, locations, warehouses]);

  // Queue preview calculation
  const handleFetchReport = useCallback(() => {
    if (!dateRange.from || !dateRange.to) return;

    setIsQueueingJob(true);
    setPreviewJobId(null);

    startTransition(async () => {
      try {
        const res = await queueStockActivityPreview({
          locationId: locationParam,
          warehouseId: warehouseParam,
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
        });

        if (res && res.status && res.data?.jobId) {
          setPreviewJobId(res.data.jobId);
        } else {
          toast.error(res?.message || "Failed to queue stock activity calculation");
        }
      } catch (err: any) {
        toast.error("Error queueing report calculation job");
      } finally {
        setIsQueueingJob(false);
      }
    });
  }, [locationParam, warehouseParam, dateRange]);

  // Trigger initial report queue on mount or location/date change
  useEffect(() => {
    handleFetchReport();
  }, [locationParam, warehouseParam, dateRange]);

  // Fetch gzipped preview result when SSE completes
  useEffect(() => {
    if (
      (sseState.status === "completed" || sseState.progressPercent === 100) &&
      previewJobId
    ) {
      setIsFetchingResult(true);
      getStockActivityResult(previewJobId)
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
    attributeOptions,
    filterBrands,
    setFilterBrands,
    filterDivisions,
    setFilterDivisions,
    filterCategories,
    setFilterCategories,
    filterGenders,
    setFilterGenders,
    filterSilhouettes,
    setFilterSilhouettes,
    filterSizes,
    setFilterSizes,
    filterColors,
    setFilterColors,
    filteredBrands,
    grandTotals,
    flatRows,
    toggleNode,
    expandAll,
    collapseAll,
  } = useStockActivityData(reportData);

  // Client-side Excel Export Handler (Flat or Hierarchical)
  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (!reportData) return;
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName, fileBase64 } = await generateStockActivityExcel({
        exportType: type,
        brands: filteredBrands,
        flatItems: reportData.flatItems || [],
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
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
      registerClientStockActivityExport({
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
    }
  };

  // Printable HTML/PDF Export Handler
  const handleExportPdf = () => {
    if (!reportData) return;
    setIsExportingPdf(true);

    try {
      const html = generateStockActivityPdfHtml({
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
    <div className="p-6 space-y-6 max-w-[1750px] mx-auto">
      {/* KPI Cards */}
      <StockActivityHeader totals={grandTotals} />

      {/* Filter Bar, SSE Queue Progress & Attribute Popover Dropdowns */}
      <StockActivityFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        locations={locations}
        warehouses={warehouses}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
        selectedWarehouseIds={selectedWarehouseIds}
        onWarehouseChange={setSelectedWarehouseIds}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        groupingLevels={groupingLevels}
        onToggleLevel={handleToggleLevel}
        attributeOptions={attributeOptions}
        filterBrands={filterBrands}
        setFilterBrands={setFilterBrands}
        filterDivisions={filterDivisions}
        setFilterDivisions={setFilterDivisions}
        filterCategories={filterCategories}
        setFilterCategories={setFilterCategories}
        filterGenders={filterGenders}
        setFilterGenders={setFilterGenders}
        filterSilhouettes={filterSilhouettes}
        setFilterSilhouettes={setFilterSilhouettes}
        filterSizes={filterSizes}
        setFilterSizes={setFilterSizes}
        filterColors={filterColors}
        setFilterColors={setFilterColors}
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
      />

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b pb-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{COMPANY_NAME}</h1>
        <h2 className="text-lg font-bold text-slate-700">Stock Activity Report</h2>
        <p className="text-xs text-slate-600">Outlets & Warehouses: {activeSelectionNames}</p>
        <p className="text-xs text-slate-500">
          Period: {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start"} to{" "}
          {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End"}
        </p>
      </div>

      {/* Virtualized Matrix Table with Collapsible Accordion */}
      <StockActivityTable
        rows={flatRows}
        grandTotals={grandTotals}
        onToggleNode={toggleNode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
