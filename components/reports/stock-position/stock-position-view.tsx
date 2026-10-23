"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DateRange, getFiscalYearInfo } from "@/components/ui/date-range-picker";
import { useReportSse } from "@/hooks/use-report-sse";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
  StockPositionReportData,
  queueStockPositionPreview,
  getStockPositionResult,
  registerClientStockPositionExport,
} from "@/lib/actions/stock-position";

import { StockPositionHeader } from "./stock-position-header";
import { StockPositionFilters } from "./stock-position-filters";
import { StockPositionTable } from "./stock-position-table";
import { useStockPositionData } from "./use-stock-position-data";
import { generateStockPositionExcel } from "./excel-export";
import { generateStockPositionPdfHtml } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";

interface StockPositionViewProps {
  isPosLevel?: boolean;
  title?: string;
}

export function StockPositionView({
  isPosLevel = false,
  title = "Stock Position Report",
}: StockPositionViewProps) {
  const { user } = useAuth();
  const posLocationId =
    user?.terminal?.location?.id ||
    user?.locationId ||
    (user as any)?.location?.id;
  const posWarehouseId =
    (user as any)?.warehouseId || (user as any)?.warehouse?.id;

  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);

  // Enforce POS terminal location/warehouse when on POS level
  useEffect(() => {
    if (isPosLevel) {
      if (posLocationId) setSelectedLocationIds([posLocationId]);
      if (posWarehouseId) setSelectedWarehouseIds([posWarehouseId]);
    }
  }, [isPosLevel, posLocationId, posWarehouseId]);

  // Default to current fiscal year
  const currentFY = getFiscalYearInfo();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: currentFY.startDate,
    to: currentFY.endDate,
  });

  const [reportData, setReportData] = useState<StockPositionReportData | null>(
    null,
  );
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);

  const activeJobIdRef = useRef<string | null>(null);
  const fetchedJobIdRef = useRef<string | null>(null);

  // Client Export state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "stock-position");

  // Load Store & Warehouse locations
  useEffect(() => {
    async function loadData() {
      try {
        const [locRes, whRes] = await Promise.all([
          getLocations(),
          getWarehouses(),
        ]);
        const locData = Array.isArray(locRes)
          ? locRes
          : (locRes as any)?.data || [];
        const whData = Array.isArray(whRes)
          ? whRes
          : (whRes as any)?.data || [];

        if (Array.isArray(locData)) setLocations(locData);
        if (Array.isArray(whData)) setWarehouses(whData);
      } catch (err) {
        console.error("Failed to load locations/warehouses:", err);
      }
    }
    loadData();
  }, []);

  const locationParam = useMemo(
    () =>
      selectedLocationIds.length > 0
        ? selectedLocationIds.join(",")
        : undefined,
    [selectedLocationIds],
  );

  const warehouseParam = useMemo(
    () =>
      selectedWarehouseIds.length > 0
        ? selectedWarehouseIds.join(",")
        : undefined,
    [selectedWarehouseIds],
  );

  const activeSelectionNames = useMemo(() => {
    const names: string[] = [];
    if (selectedLocationIds.length > 0) {
      const locMap = new Map(locations.map((l) => [l.id, l.name]));
      for (const id of selectedLocationIds) {
        if (locMap.has(id)) names.push(locMap.get(id)!);
      }
    }
    if (selectedWarehouseIds.length > 0) {
      const whMap = new Map(warehouses.map((w) => [w.id, w.name]));
      for (const id of selectedWarehouseIds) {
        if (whMap.has(id)) names.push(whMap.get(id)!);
      }
    }
    return names.length > 0 ? names.join(", ") : "All Stores & Warehouses";
  }, [selectedLocationIds, selectedWarehouseIds, locations, warehouses]);

  // Queue preview computation job
  const handleCalculateReport = useCallback(async () => {
    setIsQueueingJob(true);
    setReportData(null);
    fetchedJobIdRef.current = null;

    const startDate = dateRange.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined;
    const endDate = dateRange.to
      ? format(dateRange.to, "yyyy-MM-dd")
      : undefined;

    try {
      const res = await queueStockPositionPreview({
        locationId: locationParam,
        warehouseId: warehouseParam,
        startDate,
        endDate,
      });

      if (res && res.status && res.data?.jobId) {
        activeJobIdRef.current = res.data.jobId;
        setPreviewJobId(res.data.jobId);
        toast.info("Queued Stock Position preview computation...");
      } else {
        toast.error(res?.message || "Failed to start preview computation");
      }
    } catch (err: any) {
      console.error("Error queueing preview:", err);
      toast.error(err.message || "Failed to submit calculation request");
    } finally {
      setIsQueueingJob(false);
    }
  }, [dateRange, locationParam, warehouseParam]);

  // Automatically queue calculation on initial mount once locations load or default
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      handleCalculateReport();
    }
  }, [handleCalculateReport]);

  // Listen to SSE job completion and fetch result payload exactly once
  useEffect(() => {
    if (
      sseState.status === "completed" &&
      previewJobId &&
      activeJobIdRef.current === previewJobId &&
      fetchedJobIdRef.current !== previewJobId
    ) {
      fetchedJobIdRef.current = previewJobId;
      setIsFetchingResult(true);
      const targetJobId = previewJobId;

      getStockPositionResult(targetJobId)
        .then((res) => {
          if (activeJobIdRef.current !== targetJobId) return;
          if (res && res.status && res.data) {
            setReportData(res.data);
            setPreviewJobId(null);
            toast.success("Stock Position report loaded successfully!");
          } else {
            toast.error(res?.message || "Failed to load report result");
          }
        })
        .catch(() => {
          if (activeJobIdRef.current === targetJobId) {
            toast.error("Error downloading report preview result");
          }
        })
        .finally(() => {
          setIsFetchingResult(false);
        });
    }
  }, [sseState.status, previewJobId]);

  // Hook for filtering, grand totals, and table rows
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    groupingLevels,
    setGroupingLevels,
    rows,
    flatFilteredItems,
    grandTotals,
    filterOptions,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
    filterSeasons,
    toggleBrand,
    toggleDivision,
    toggleCategory,
    toggleGender,
    toggleSilhouette,
    toggleSize,
    toggleColor,
    toggleSeason,
    clearAllFilters,
    activeFiltersCount,
    toggleNode,
    expandAll,
    collapseAll,
  } = useStockPositionData(reportData);

  // Client-side Excel Export Handler
  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error("No report data available to export");
      return;
    }
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName, fileBase64 } =
        await generateStockPositionExcel({
          exportType: viewMode === "tree" ? "hierarchical" : "flat",
          brands: reportData.brands || [],
          flatItems: flatFilteredItems,
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
      registerClientStockPositionExport({
        fileName,
        fileBase64,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }).catch((e) =>
        console.warn("Failed to register export history with S3:", e),
      );

      toast.success(`Exported ${fileName} successfully!`);
    } catch (err) {
      console.error("Excel Export Error:", err);
      toast.error("Failed to generate Excel export");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Printable HTML/PDF Export Handler
  const handleExportPdf = () => {
    if (!reportData) {
      toast.error("No report data available to export");
      return;
    }
    setIsExportingPdf(true);

    try {
      const html = generateStockPositionPdfHtml({
        brands: reportData.brands || [],
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
      });

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        toast.error("Popup blocked! Please allow popups to print report.");
      }
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to generate print document");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[100vw] overflow-x-hidden">
      {/* Title & Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Realtime Sell-Through Rate, Beginning/End Stock & Variant Position
            Matrix
          </p>
        </div>
      </div>

      {/* KPI Cards Header */}
      <StockPositionHeader
        totals={grandTotals}
        totalSkus={reportData?.flatItems?.length || 0}
      />

      {/* Filters & Control Panel */}
      <StockPositionFilters
        locations={locations}
        warehouses={warehouses}
        selectedLocationIds={selectedLocationIds}
        setSelectedLocationIds={setSelectedLocationIds}
        selectedWarehouseIds={selectedWarehouseIds}
        setSelectedWarehouseIds={setSelectedWarehouseIds}
        previewJobId={previewJobId}
        isFetchingResult={isFetchingResult}
        dateRange={dateRange}
        setDateRange={setDateRange}
        isQueueingJob={isQueueingJob}
        onRefresh={handleCalculateReport}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        sseState={sseState}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        groupingLevels={groupingLevels}
        setGroupingLevels={setGroupingLevels}
        filterOptions={filterOptions}
        filterBrands={filterBrands}
        filterDivisions={filterDivisions}
        filterCategories={filterCategories}
        filterGenders={filterGenders}
        filterSilhouettes={filterSilhouettes}
        filterSizes={filterSizes}
        filterColors={filterColors}
        filterSeasons={filterSeasons}
        toggleBrand={toggleBrand}
        toggleDivision={toggleDivision}
        toggleCategory={toggleCategory}
        toggleGender={toggleGender}
        toggleSilhouette={toggleSilhouette}
        toggleSize={toggleSize}
        toggleColor={toggleColor}
        toggleSeason={toggleSeason}
        clearAllFilters={clearAllFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Synchronized Virtualized Table */}
      <StockPositionTable
        rows={rows}
        grandTotals={grandTotals}
        viewMode={viewMode}
        onToggleNode={toggleNode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
