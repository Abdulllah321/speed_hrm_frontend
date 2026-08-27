"use client";

import React, { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
  queueInventoryAgingPreview,
  getInventoryAgingResult,
} from "@/lib/actions/inventory-aging";
import { useReportSse } from "@/hooks/use-report-sse";
import { InventoryAgingReportData } from "./types";
import { useInventoryAgingData } from "./use-inventory-aging-data";
import { InventoryAgingHeader } from "./inventory-aging-header";
import { InventoryAgingFilters } from "./inventory-aging-filters";
import { InventoryAgingTable } from "./inventory-aging-table";
import { generateInventoryAgingExcel } from "./excel-export";
import { generateInventoryAgingPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

interface InventoryAgingViewProps {
  isPosLevel?: boolean;
}

export function InventoryAgingView({ isPosLevel = false }: InventoryAgingViewProps) {
  const { user } = useAuth();
  const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
  const posLocationName = user?.terminal?.location?.name || (user as any)?.location?.name || "Current Store";

  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);

  // Enforce POS terminal location when on POS level
  useEffect(() => {
    if (isPosLevel && posLocationId) {
      setSelectedLocationIds([posLocationId]);
    }
  }, [isPosLevel, posLocationId]);

  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>("all");
  const [selectedAgeBucket, setSelectedAgeBucket] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [reportData, setReportData] = useState<InventoryAgingReportData | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [isQueueingJob, setIsQueueingJob] = useState(false);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Export handlers state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgressPercent, setExportProgressPercent] = useState(0);
  const [exportProgressMessage, setExportProgressMessage] = useState("");

  // SSE Stream Monitoring
  const sseState = useReportSse(previewJobId, "inventory-aging");

  // Load Outlets & Warehouses metadata on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [locRes, whRes] = await Promise.all([getLocations(), getWarehouses()]);
        const locData = Array.isArray(locRes) ? locRes : (locRes as any)?.data || [];
        const whData = Array.isArray(whRes) ? whRes : (whRes as any)?.data || [];

        if (Array.isArray(locData)) setLocations(locData);
        if (Array.isArray(whData)) setWarehouses(whData);
      } catch (err) {
        console.error("Failed to load store/warehouse options:", err);
      }
    }
    loadOptions();
  }, []);

  const activeSelectionNames = useMemo(() => {
    if (selectedLocationIds.length === 0 && selectedWarehouseIds.length === 0) {
      return "All Outlets & Warehouses";
    }
    const locNames = locations
      .filter((l) => selectedLocationIds.includes(l.id))
      .map((l) => l.name);
    const whNames = warehouses
      .filter((w) => selectedWarehouseIds.includes(w.id))
      .map((w) => w.name);

    return [...locNames, ...whNames].join(", ");
  }, [selectedLocationIds, selectedWarehouseIds, locations, warehouses]);

  // Queue calculation preview job
  const handleFetchReport = useCallback(() => {
    setIsQueueingJob(true);
    setPreviewJobId(null);

    startTransition(async () => {
      try {
        const res = await queueInventoryAgingPreview({
          locationId: selectedLocationIds.join(","),
          warehouseId: selectedWarehouseIds.join(","),
          endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
          reportType,
        });

        if (res && res.status && (res.data?.jobId || res.jobId)) {
          setPreviewJobId(res.data?.jobId || res.jobId);
        } else {
          toast.error(res?.message || "Failed to queue inventory aging calculation");
        }
      } catch (err: any) {
        toast.error("Error queueing inventory aging calculation job");
      } finally {
        setIsQueueingJob(false);
      }
    });
  }, [selectedLocationIds, selectedWarehouseIds, dateRange.to, reportType]);

  // Auto trigger report fetch on filter change
  useEffect(() => {
    handleFetchReport();
  }, [handleFetchReport]);

  // Handle SSE completed state
  useEffect(() => {
    if (sseState.status === "completed" && previewJobId && !isFetchingResult) {
      const currentJobId = previewJobId;
      setIsFetchingResult(true);
      getInventoryAgingResult(currentJobId)
        .then((res) => {
          const payload = res?.data?.data || res?.data || res;
          if (payload && (payload.flatItemsList || res?.status)) {
            const dataToSet = payload.flatItemsList ? payload : payload.data;
            setReportData(dataToSet);
            const count = dataToSet?.flatItemsList?.length || 0;
            toast.success(`Inventory Aging calculated successfully across ${count} items!`);
          } else {
            toast.error(res?.message || "Failed to load inventory aging preview data");
          }
        })
        .catch(() => {
          toast.error("Error loading inventory aging result payload");
        })
        .finally(() => {
          setIsFetchingResult(false);
          setPreviewJobId(null);
        });
    }
  }, [sseState.status, previewJobId, isFetchingResult]);

  const isReportLoading =
    isQueueingJob ||
    isFetchingResult ||
    (!!previewJobId && sseState.status !== "completed") ||
    (!reportData && isPending);

  // Client-side filtration hook
  const { filteredItems, grandTotals } = useInventoryAgingData({
    rawItems: reportData?.flatItemsList || [],
    locations: reportData?.locations || locations,
    warehouses: reportData?.warehouses || warehouses,
    searchQuery,
    selectedBrandId,
    selectedCategoryId,
    selectedAgeBucket,
    isPosLevel,
  });

  // Export handlers
  const handleExportExcelFlat = async () => {
    if (!reportData) return;
    setIsExportingExcel(true);
    setExportProgressPercent(5);
    setExportProgressMessage("Initializing Excel export...");
    try {
      await generateInventoryAgingExcel({
        items: filteredItems,
        totals: grandTotals,
        locations: reportData.locations || locations,
        warehouses: reportData.warehouses || warehouses,
        dateRange,
        reportType,
        activeSelectionNames,
        isPosLevel,
        onProgress: (percent, message) => {
          setExportProgressPercent(percent);
          setExportProgressMessage(message);
        },
      });
      toast.success("Excel report exported successfully");
    } catch (err: any) {
      toast.error("Failed to generate Excel export");
    } finally {
      setIsExportingExcel(false);
      setExportProgressPercent(0);
      setExportProgressMessage("");
    }
  };

  const handleExportPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);
    setExportProgressPercent(5);
    setExportProgressMessage("Preparing PDF print layout...");
    try {
      await generateInventoryAgingPdf({
        items: filteredItems,
        totals: grandTotals,
        locations: reportData.locations || locations,
        warehouses: reportData.warehouses || warehouses,
        dateRange,
        reportType,
        activeSelectionNames,
        isPosLevel,
        onProgress: (percent, message) => {
          setExportProgressPercent(percent);
          setExportProgressMessage(message);
        },
      });
      toast.success("PDF print layout opened successfully");
    } catch (err: any) {
      toast.error("Failed to render PDF print view");
    } finally {
      setIsExportingPdf(false);
      setExportProgressPercent(0);
      setExportProgressMessage("");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1750px] mx-auto">
      {/* KPI Header Section */}
      <InventoryAgingHeader totals={grandTotals} isPosLevel={isPosLevel} />

      {/* Filter Bar & Progress Banner */}
      <InventoryAgingFilters
        isPosLevel={isPosLevel}
        posLocationName={posLocationName}
        reportType={reportType}
        onReportTypeChange={setReportType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        locations={locations}
        warehouses={warehouses}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
        selectedWarehouseIds={selectedWarehouseIds}
        onWarehouseChange={setSelectedWarehouseIds}
        selectedBrandId={selectedBrandId}
        onBrandChange={setSelectedBrandId}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        selectedAgeBucket={selectedAgeBucket}
        onAgeBucketChange={setSelectedAgeBucket}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onRefresh={handleFetchReport}
        isPending={isPending}
        previewJobId={previewJobId}
        sseState={sseState}
        isQueueingJob={isQueueingJob}
        isFetchingResult={isFetchingResult}
        onExportExcelFlat={handleExportExcelFlat}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        exportProgressPercent={exportProgressPercent}
        exportProgressMessage={exportProgressMessage}
      />

      {/* Virtualized Table Container */}
      <InventoryAgingTable
        items={filteredItems}
        totals={grandTotals}
        locations={reportData?.locations || locations}
        warehouses={reportData?.warehouses || warehouses}
        reportType={reportType}
        isPending={isPending}
        isLoading={isReportLoading}
        progressPercent={sseState.progressPercent || (isQueueingJob ? 5 : 0)}
        progressMessage={sseState.message || (isQueueingJob ? "Submitting calculation job..." : "Loading inventory aging data...")}
        isPosLevel={isPosLevel}
      />
    </div>
  );
}
