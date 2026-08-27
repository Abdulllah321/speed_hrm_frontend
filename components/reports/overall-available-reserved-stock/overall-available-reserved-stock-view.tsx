"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
  queueOverallAvailableReservedStockPreview,
  getOverallAvailableReservedStockResult,
} from "@/lib/actions/stock-ledger";
import { useReportSse } from "@/hooks/use-report-sse";
import { format } from "date-fns";
import { toast } from "sonner";

import { FlatItemRecord } from "./types";
import { useOverallAvailableReservedStockData } from "./use-overall-available-reserved-stock-data";
import { OverallAvailableReservedHeader } from "./overall-available-reserved-header";
import { OverallAvailableReservedFilters } from "./overall-available-reserved-filters";
import { OverallAvailableReservedTable } from "./overall-available-reserved-table";
import { exportOverallAvailableReservedStockToExcel } from "./excel-export";
import { exportOverallAvailableReservedStockToPdf } from "./pdf-export";

interface OverallAvailableReservedStockViewProps {
  title?: string;
  companyName?: string;
  isPosLevel?: boolean;
}

export function OverallAvailableReservedStockView({
  title = "Overall Available & Reserved Stock Report",
  companyName = "Speed Limit ERP",
  isPosLevel = false,
}: OverallAvailableReservedStockViewProps) {
  const [asOfDate, setAsOfDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>(
    [],
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
  const [filterDivisions, setFilterDivisions] = useState<Set<string>>(
    new Set(),
  );
  const [filterCategories, setFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
  const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(
    new Set(),
  );
  const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set());

  const [rawItems, setRawItems] = useState<FlatItemRecord[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchProgressMessage, setFetchProgressMessage] = useState("");

  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const activeJobIdRef = useRef<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressPercent, setExportProgressPercent] = useState(0);
  const [exportProgressMessage, setExportProgressMessage] = useState("");

  const sseState = useReportSse(previewJobId, "overall-reserved");

  // Fetch Outlets & Warehouses on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [locRes, whData] = await Promise.all([
          getLocations(),
          getWarehouses(),
        ]);
        if (locRes && locRes.status && Array.isArray(locRes.data)) {
          setLocations(locRes.data);
        }
        if (Array.isArray(whData)) {
          setWarehouses(whData);
        }
      } catch (err) {
        console.error("Error loading location metadata:", err);
      }
    }
    loadMetadata();
  }, []);

  // Main Single API Fetch function
  const fetchDataset = useCallback(() => {
    setIsFetchingData(true);
    setFetchProgressMessage(
      "Queueing overall available reserved stock matrix query...",
    );
    setPreviewJobId(null);

    queueOverallAvailableReservedStockPreview({
      asOfDate,
      summaryOnly: false,
      includeCosting: true,
    }).then((queueRes) => {
      if (queueRes && queueRes.status && queueRes.data?.jobId) {
        const newJobId = queueRes.data.jobId;
        activeJobIdRef.current = newJobId;
        setPreviewJobId(newJobId);
      } else {
        setIsFetchingData(false);
        toast.error("Failed to queue stock data fetch");
      }
    });
  }, [asOfDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDataset();
    }, 300);
    return () => clearTimeout(timer);
  }, [asOfDate]);

  // Flatten tree payload into individual SKU/variant items if backend returned hierarchical root
  const flattenNodesToItems = (nodes: any[]): FlatItemRecord[] => {
    const items: FlatItemRecord[] = [];

    function traverse(list: any[], parentInfo: Partial<FlatItemRecord> = {}) {
      for (const node of list) {
        const currentInfo: Partial<FlatItemRecord> = { ...parentInfo };

        if (node.level === "brand") currentInfo.brand = node.value;
        if (node.level === "division") currentInfo.division = node.value;
        if (node.level === "category") currentInfo.category = node.value;
        if (node.level === "gender") currentInfo.gender = node.value;
        if (node.level === "silhouette") currentInfo.silhouette = node.value;
        if (node.level === "article") {
          currentInfo.sku = node.sku || node.value;
          currentInfo.articleName = node.articleName;
        }
        if (
          node.level === "variant" ||
          !node.children ||
          node.children.length === 0
        ) {
          items.push({
            itemId: node.itemId || node.value,
            brand: currentInfo.brand || node.brand || "",
            division: currentInfo.division || node.division || "",
            category: currentInfo.category || node.category || "",
            gender: currentInfo.gender || node.gender || "",
            silhouette: currentInfo.silhouette || node.silhouette || "",
            sku: currentInfo.sku || node.sku || "",
            articleName:
              currentInfo.articleName ||
              node.articleName ||
              node.description ||
              "",
            barCode: node.barCode || node.totals?.barCode || "",
            size: node.size || node.totals?.size || "",
            color: node.color || node.totals?.color || "",
            unitPrice: node.totals?.unitPrice || node.unitPrice || 0,
            value: node.totals?.value || node.value || 0,
            unitCost: node.totals?.unitCost || node.unitCost || 0,
            costingValue: node.totals?.costingValue || node.costingValue || 0,
            quantity: node.totals?.quantity ?? node.quantity ?? 0,
            transit: node.totals?.transit ?? node.transit ?? 0,
            reserved: node.totals?.reserved ?? node.reserved ?? 0,
            total: node.totals?.total ?? node.total ?? 0,
            locationStocks:
              node.totals?.locationStocks || node.locationStocks || {},
            warehouseStocks:
              node.totals?.warehouseStocks || node.warehouseStocks || {},
          });
        }

        if (node.children && node.children.length > 0) {
          traverse(node.children, currentInfo);
        }
      }
    }

    traverse(nodes);
    return items;
  };

  // Handle SSE progress & completed event
  useEffect(() => {
    if (sseState.message) {
      setFetchProgressMessage(sseState.message);
    }

    if (
      sseState.status === "completed" &&
      previewJobId &&
      activeJobIdRef.current === previewJobId
    ) {
      setFetchProgressMessage(
        "Loading completed overall stock matrix dataset...",
      );
      const targetJobId = previewJobId;

      getOverallAvailableReservedStockResult(targetJobId)
        .then((res) => {
          if (activeJobIdRef.current !== targetJobId) return;
          setIsFetchingData(false);

          if (res && res.status !== false) {
            const payload = res.data?.flatItemsList
              ? res.data
              : res.flatItemsList
                ? res
                : res.data?.data
                  ? res.data.data
                  : res.data;

            if (
              Array.isArray(payload?.warehouses) &&
              payload.warehouses.length > 0
            ) {
              setWarehouses(payload.warehouses);
            }
            if (
              Array.isArray(payload?.stockLocations) &&
              payload.stockLocations.length > 0
            ) {
              setLocations(payload.stockLocations);
            }

            let itemsList: FlatItemRecord[] = [];
            if (Array.isArray(payload?.flatItemsList)) {
              itemsList = payload.flatItemsList;
            } else if (Array.isArray(payload?.root)) {
              itemsList = flattenNodesToItems(payload.root);
            } else if (Array.isArray(payload)) {
              itemsList = flattenNodesToItems(payload);
            }

            setRawItems(itemsList);
          } else {
            setRawItems([]);
            toast.error("Failed to load completed stock matrix");
          }
        })
        .catch((err) => {
          if (activeJobIdRef.current === targetJobId) {
            setIsFetchingData(false);
            console.error("Failed to fetch result:", err);
          }
        });
    }
  }, [sseState.status, sseState.message, previewJobId]);

  // Custom React hook doing matrix calculations and store column mappings
  const { locationHeaders, attributeOptions, filteredItems, grandTotals } =
    useOverallAvailableReservedStockData({
      rawItems,
      locations,
      warehouses,
      selectedLocationIds,
      selectedWarehouseIds,
      searchQuery,
      filterBrands,
      filterDivisions,
      filterCategories,
      filterGenders,
      filterSilhouettes,
      filterSizes,
      filterColors,
    });

  // Handle non-blocking client-side Excel Matrix Export
  const handleExcelExport = async () => {
    if (filteredItems.length === 0) {
      toast.error("No stock items available to export");
      return;
    }

    setIsExporting(true);
    setExportProgressPercent(0);
    setExportProgressMessage("Preparing Excel Matrix file...");

    try {
      await exportOverallAvailableReservedStockToExcel({
        filteredItems,
        locationHeaders,
        grandTotals,
        asOfDate,
        companyName,
        onProgress: (percent, message) => {
          setExportProgressPercent(percent);
          setExportProgressMessage(message);
        },
      });
      toast.success("Excel stock matrix report generated successfully");
    } catch (err) {
      toast.error("Failed to generate Excel matrix export");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle non-blocking client-side PDF Matrix Export
  const handlePdfExport = async () => {
    if (filteredItems.length === 0) {
      toast.error("No stock items available to export");
      return;
    }

    setIsExporting(true);
    setExportProgressPercent(0);
    setExportProgressMessage("Preparing PDF matrix print layout...");

    try {
      await exportOverallAvailableReservedStockToPdf({
        filteredItems,
        locationHeaders,
        grandTotals,
        asOfDate,
        companyName,
        onProgress: (percent, message) => {
          setExportProgressPercent(percent);
          setExportProgressMessage(message);
        },
      });
      toast.success("PDF print layout opened successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF layout.");
    } finally {
      setIsExporting(false);
      setExportProgressPercent(0);
      setExportProgressMessage("");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1920px] mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overall stock matrix breakdown with store-wise stock quantities
            across all outlets & warehouses
          </p>
        </div>
      </div>

      {/* KPI Summary Cards Header */}
      <OverallAvailableReservedHeader
        grandTotals={grandTotals}
        totalItemsCount={filteredItems.length}
        isLoading={isFetchingData}
        isPosLevel={isPosLevel}
      />

      {/* Filters Toolbar */}
      <OverallAvailableReservedFilters
        asOfDate={asOfDate}
        setAsOfDate={setAsOfDate}
        locations={locations}
        warehouses={warehouses}
        selectedLocationIds={selectedLocationIds}
        setSelectedLocationIds={setSelectedLocationIds}
        selectedWarehouseIds={selectedWarehouseIds}
        setSelectedWarehouseIds={setSelectedWarehouseIds}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
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
        isLoading={isFetchingData}
        fetchProgressPercent={sseState.progressPercent}
        fetchProgressMessage={fetchProgressMessage}
        onRefresh={fetchDataset}
        onExcelExport={handleExcelExport}
        onPdfExport={handlePdfExport}
        exportProgressPercent={exportProgressPercent}
        exportProgressMessage={exportProgressMessage}
        isExporting={isExporting}
      />

      {/* Store/Warehouse Matrix Table View */}
      <OverallAvailableReservedTable
        filteredItems={filteredItems}
        locationHeaders={locationHeaders}
        grandTotals={grandTotals}
        searchQuery={searchQuery}
        isLoading={isFetchingData}
        isPosLevel={isPosLevel}
      />
    </div>
  );
}
