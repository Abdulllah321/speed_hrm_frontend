"use client";

import React, { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
    queueAvailableStockSummaryPreview,
    getAvailableStockSummaryResult,
} from "@/lib/actions/stock-ledger";
import { useReportSse } from "@/hooks/use-report-sse";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";

import { FlatItemRecord, GroupingLevels } from "./types";
import { useAvailableStockData } from "./use-available-stock-data";
import { AvailableStockHeader } from "./available-stock-header";
import { AvailableStockFilters } from "./available-stock-filters";
import { AvailableStockTable } from "./available-stock-table";
import { exportAvailableStockSummaryToExcel } from "./excel-export";
import { exportAvailableStockSummaryToPdf } from "./pdf-export";

import { useAuth } from "@/components/providers/auth-provider";

interface AvailableStockSummaryViewProps {
    title?: string;
    companyName?: string;
    isPosLevel?: boolean;
}

export function AvailableStockSummaryView({
    title = "Available Stock Summary",
    companyName = "Speed Limit ERP",
    isPosLevel = false,
}: AvailableStockSummaryViewProps) {
    const { user } = useAuth();
    const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
    const posWarehouseId = (user as any)?.warehouseId || (user as any)?.warehouse?.id;
    const posLocationName = user?.terminal?.location?.name || (user as any)?.location?.name || (user as any)?.warehouse?.name || "Current Store";

    const now = new Date();
    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfMonth(now),
        to: endOfMonth(now),
    });

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

    const [searchQuery, setSearchQuery] = useState("");
    const [reportType, setReportType] = useState<"merged" | "separate">("separate");

    const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
    const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
    const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
    const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
    const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
    const [filterColors, setFilterColors] = useState<Set<string>>(new Set());

    const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
        brand: true,
        division: true,
        category: true,
        gender: true,
        silhouette: true,
        article: true,
        variant: true,
    });

    const [rawItems, setRawItems] = useState<FlatItemRecord[]>([]);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [fetchProgressMessage, setFetchProgressMessage] = useState("");

    const [previewJobId, setPreviewJobId] = useState<string | null>(null);
    const activeJobIdRef = useRef<string | null>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [exportProgressPercent, setExportProgressPercent] = useState(0);
    const [exportProgressMessage, setExportProgressMessage] = useState("");

    const sseState = useReportSse(previewJobId);

    // Fetch Locations & Warehouses on mount
    useEffect(() => {
        async function loadMetadata() {
            try {
                const [locRes, whData] = await Promise.all([getLocations(), getWarehouses()]);
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

    // Main Single API Fetch function (runs on initial load, date range change, or manual refresh)
    const fetchDataset = useCallback(() => {
        if (!dateRange.from || !dateRange.to) return;

        setIsFetchingData(true);
        setFetchProgressMessage("Queueing available stock summary query...");
        setPreviewJobId(null);

        queueAvailableStockSummaryPreview({
            startDate: dateRange.from?.toISOString(),
            endDate: dateRange.to?.toISOString(),
            reportType: "separate", // Always fetch per-location stock separately from server
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
    }, [dateRange]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDataset();
        }, 300);
        return () => clearTimeout(timer);
    }, [dateRange]);

    // Handle SSE progress & completed event
    useEffect(() => {
        if (sseState.message) {
            setFetchProgressMessage(sseState.message);
        }

        if (sseState.status === "completed" && previewJobId && activeJobIdRef.current === previewJobId) {
            setFetchProgressMessage("Loading completed available stock dataset...");
            const targetJobId = previewJobId;

            getAvailableStockSummaryResult(targetJobId)
                .then((res) => {
                    if (activeJobIdRef.current !== targetJobId) return;
                    setIsFetchingData(false);

                    if (res && res.status !== false) {
                        const payload = res.data?.flatItemsList
                            ? res.data
                            : (res.flatItemsList
                                ? res
                                : (res.data?.data ? res.data.data : res.data));

                        const itemsList: FlatItemRecord[] = Array.isArray(payload?.flatItemsList)
                            ? payload.flatItemsList
                            : (Array.isArray(payload?.root)
                                ? payload.root
                                : (Array.isArray(payload) ? payload : []));

                        setRawItems(itemsList);
                    } else {
                        setRawItems([]);
                        toast.error("Failed to load completed available stock data");
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

    // Custom React hook doing 100% client side filtering, searching, merging, and tree construction
    const { attributeOptions, filteredItems, treeData, grandTotals } = useAvailableStockData({
        rawItems,
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
        reportType,
        groupingLevels,
    });

    // Handle instant client-side Excel Export
    const handleExcelExport = async (exportMode: "hierarchy" | "flat" | "both" = "both") => {
        if (treeData.length === 0 && filteredItems.length === 0) {
            toast.error("No items available to export");
            return;
        }

        setIsExporting(true);
        setExportProgressPercent(0);
        setExportProgressMessage("Preparing Excel file...");

        try {
            await exportAvailableStockSummaryToExcel({
                treeData,
                filteredItems,
                grandTotals,
                reportType,
                exportMode,
                dateFromStr: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
                dateToStr: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
                companyName,
                onProgress: (percent, message) => {
                    setExportProgressPercent(percent);
                    setExportProgressMessage(message);
                },
            });
            toast.success("Excel report generated successfully");
        } catch (err) {
            toast.error("Failed to generate Excel export");
        } finally {
            setIsExporting(false);
        }
    };

    // Handle instant client-side PDF Export
    const handlePdfExport = async (exportMode: "hierarchy" | "flat" = "hierarchy") => {
        if (treeData.length === 0 && filteredItems.length === 0) {
            toast.error("No items available to export");
            return;
        }

        setIsExporting(true);
        setExportProgressPercent(0);
        setExportProgressMessage("Preparing PDF print layout...");

        try {
            await exportAvailableStockSummaryToPdf({
                treeData,
                filteredItems,
                grandTotals,
                reportType,
                exportMode,
                dateFromStr: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
                dateToStr: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
                companyName,
                onProgress: (percent, message) => {
                    setExportProgressPercent(percent);
                    setExportProgressMessage(message);
                },
            });
            toast.success("PDF print layout opened successfully");
        } catch (err) {
            toast.error("Failed to generate PDF layout");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
            {/* Page Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Real-time stock ledger analysis across all outlets and warehouses
                    </p>
                </div>
            </div>

            {/* KPI Summary Cards Header */}
            <AvailableStockHeader
                grandTotals={grandTotals}
                totalItemsCount={filteredItems.length}
                isLoading={isFetchingData}
            />

            {/* Filters Toolbar */}
            <AvailableStockFilters
                isPosLevel={isPosLevel}
                posLocationName={posLocationName}
                dateRange={dateRange}
                setDateRange={setDateRange}
                locations={locations}
                warehouses={warehouses}
                selectedLocationIds={selectedLocationIds}
                setSelectedLocationIds={setSelectedLocationIds}
                selectedWarehouseIds={selectedWarehouseIds}
                setSelectedWarehouseIds={setSelectedWarehouseIds}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                reportType={reportType}
                setReportType={setReportType}
                groupingLevels={groupingLevels}
                setGroupingLevels={setGroupingLevels}
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

            {/* Hierarchical Tree Table View */}
            <AvailableStockTable
                treeData={treeData}
                grandTotals={grandTotals}
                searchQuery={searchQuery}
                isLoading={isFetchingData}
            />
        </div>
    );
}
