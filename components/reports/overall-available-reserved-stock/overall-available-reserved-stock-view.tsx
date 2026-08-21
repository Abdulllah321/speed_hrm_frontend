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

import { FlatItemRecord, GroupingLevels } from "./types";
import { useOverallAvailableReservedStockData } from "./use-overall-available-reserved-stock-data";
import { OverallAvailableReservedHeader } from "./overall-available-reserved-header";
import { OverallAvailableReservedFilters } from "./overall-available-reserved-filters";
import { OverallAvailableReservedTable } from "./overall-available-reserved-table";
import { exportOverallAvailableReservedStockToExcel } from "./excel-export";
import { exportOverallAvailableReservedStockToPdf } from "./pdf-export";

interface OverallAvailableReservedStockViewProps {
    title?: string;
    companyName?: string;
}

export function OverallAvailableReservedStockView({
    title = "Overall Available & Reserved Stock Report",
    companyName = "Speed Limit ERP",
}: OverallAvailableReservedStockViewProps) {
    const [asOfDate, setAsOfDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

    const [locations, setLocations] = useState<Location[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);

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

    const sseState = useReportSse(previewJobId, "overall-reserved");

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

    // Main Single API Fetch function
    const fetchDataset = useCallback(() => {
        setIsFetchingData(true);
        setFetchProgressMessage("Queueing overall available reserved stock query...");
        setPreviewJobId(null);

        queueOverallAvailableReservedStockPreview({
            asOfDate,
            reportType: "separate",
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

    // Handle SSE progress & completed event
    useEffect(() => {
        if (sseState.message) {
            setFetchProgressMessage(sseState.message);
        }

        if (sseState.status === "completed" && previewJobId && activeJobIdRef.current === previewJobId) {
            setFetchProgressMessage("Loading completed available reserved stock dataset...");
            const targetJobId = previewJobId;

            getOverallAvailableReservedStockResult(targetJobId)
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
                        toast.error("Failed to load completed stock data");
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
    const { attributeOptions, filteredItems, treeData, grandTotals } = useOverallAvailableReservedStockData({
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

    // Handle non-blocking client-side Excel Export
    const handleExcelExport = async (exportMode: "hierarchy" | "flat" | "both" = "both") => {
        if (treeData.length === 0 && filteredItems.length === 0) {
            toast.error("No items available to export");
            return;
        }

        setIsExporting(true);
        setExportProgressPercent(0);
        setExportProgressMessage("Preparing Excel file...");

        try {
            await exportOverallAvailableReservedStockToExcel({
                treeData,
                filteredItems,
                grandTotals,
                reportType,
                exportMode,
                dateToStr: asOfDate,
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

    // Handle non-blocking client-side PDF Export
    const handlePdfExport = async (exportMode: "hierarchy" | "flat" = "hierarchy") => {
        if (treeData.length === 0 && filteredItems.length === 0) {
            toast.error("No items available to export");
            return;
        }

        setIsExporting(true);
        setExportProgressPercent(0);
        setExportProgressMessage("Preparing PDF print layout...");

        try {
            await exportOverallAvailableReservedStockToPdf({
                treeData,
                filteredItems,
                grandTotals,
                reportType,
                exportMode,
                dateToStr: asOfDate,
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
                        Real-time available and reserved stock valuation across all outlets and warehouses
                    </p>
                </div>
            </div>

            {/* KPI Summary Cards Header */}
            <OverallAvailableReservedHeader
                grandTotals={grandTotals}
                totalItemsCount={filteredItems.length}
                isLoading={isFetchingData}
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
            <OverallAvailableReservedTable
                treeData={treeData}
                grandTotals={grandTotals}
                searchQuery={searchQuery}
                isLoading={isFetchingData}
            />
        </div>
    );
}
