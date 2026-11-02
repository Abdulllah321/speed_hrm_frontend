"use client";

import React, { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import { getCookie } from "@/lib/utils";
import {
    queueAvailableStockSummaryPreview,
    getAvailableStockSummaryResult,
} from "@/lib/actions/stock-ledger";
import { useReportSse } from "@/hooks/use-report-sse";
import { format } from "date-fns";
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
    isPosOnly?: boolean;
}

export function AvailableStockSummaryView({
    title = "Available Stock Summary",
    companyName = "Speed Limit ERP",
    isPosLevel = false,
    isPosOnly,
}: AvailableStockSummaryViewProps) {
    const isPos = isPosOnly !== undefined ? isPosOnly : isPosLevel;
    const { user } = useAuth();
    const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;
    const posWarehouseId = (user as any)?.warehouseId || (user as any)?.warehouse?.id;

    const [asOfDate, setAsOfDate] = useState<string>(
        format(new Date(), "yyyy-MM-dd")
    );

    const getFiscalYearStart = (asOfStr: string) => {
        const d = new Date(asOfStr);
        const year = d.getFullYear();
        const month = d.getMonth(); // 0 = Jan, 6 = July
        const fyStartYear = month >= 6 ? year : year - 1;
        return new Date(fyStartYear, 6, 1, 0, 0, 0, 0);
    };

    const [locations, setLocations] = useState<Location[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
    const [cookieLocationId, setCookieLocationId] = useState<string>("");

    // Read POS active location from cookie or local storage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const cLoc = getCookie("pos_location_id") || localStorage.getItem("pos_location_id") || "";
            if (cLoc) {
                setCookieLocationId(cLoc);
            } else {
                try {
                    const term = localStorage.getItem("pos_terminal");
                    if (term) {
                        const parsed = JSON.parse(term);
                        const termLoc = parsed?.location?.id || parsed?.locationId;
                        if (termLoc) setCookieLocationId(termLoc);
                    }
                } catch (e) {}
            }
        }
    }, []);

    // Resolve active store location reliably across POS terminals, cashier logins, and admin switcher
    const resolvedPosLocationId = useMemo(() => {
        if (posLocationId) return posLocationId;
        if (cookieLocationId) return cookieLocationId;
        if (selectedLocationIds.length === 1) return selectedLocationIds[0];
        if (isPos && locations.length > 0) return locations[0]?.id || "";
        return "";
    }, [posLocationId, cookieLocationId, selectedLocationIds, isPos, locations]);

    const posLocationName = useMemo(() => {
        if (user?.terminal?.location?.name) return user.terminal.location.name;
        if ((user as any)?.location?.name) return (user as any).location.name;
        const matched = locations.find((l) => l.id === resolvedPosLocationId);
        if (matched) return matched.name;
        if ((user as any)?.warehouse?.name) return (user as any).warehouse.name;
        return "Current Store";
    }, [user, locations, resolvedPosLocationId]);

    // Enforce POS terminal location/warehouse when on POS level
    useEffect(() => {
        if (isPos && resolvedPosLocationId) {
            setSelectedLocationIds([resolvedPosLocationId]);
            if (posWarehouseId) setSelectedWarehouseIds([posWarehouseId]);
        }
    }, [isPos, resolvedPosLocationId, posWarehouseId]);

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

    const [cacheStatus, setCacheStatus] = useState<"cached" | "live" | "syncing">("syncing");
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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

    // Fetch completed result with SWR session caching
    const loadCompletedResult = useCallback((targetJobId: string, isFromDiskCache: boolean = false) => {
        setIsFetchingData(true);
        setFetchProgressMessage(isFromDiskCache ? "Loading instant disk cache..." : "Loading completed available stock dataset...");

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
                    setCacheStatus(isFromDiskCache ? "cached" : "live");
                    setLastSyncTime(new Date());

                    // Save in browser session storage for 0.0s instant open on revisit
                    try {
                        const locKey = isPos ? (resolvedPosLocationId || "pos") : (selectedLocationIds.join("-") || "all");
                        sessionStorage.setItem(
                            `speedlimit_stock_${locKey}_${asOfDate}`,
                            JSON.stringify({ items: itemsList, timestamp: Date.now() })
                        );
                    } catch (e) {
                        /* ignore storage quota exceeded */
                    }
                } else {
                    if (rawItems.length === 0) setRawItems([]);
                    toast.error("Failed to load completed available stock data");
                }
            })
            .catch((err) => {
                if (activeJobIdRef.current === targetJobId) {
                    setIsFetchingData(false);
                    console.error("Failed to fetch result:", err);
                }
            });
    }, [isPos, resolvedPosLocationId, selectedLocationIds, asOfDate, rawItems.length]);

    // Main API Fetch function (scoped by location/warehouse for low server RAM overhead)
    const fetchDataset = useCallback((forceRefresh: boolean = false) => {
        if (!asOfDate) return;

        const fyStartDate = getFiscalYearStart(asOfDate);
        const endDateObj = new Date(asOfDate);
        endDateObj.setHours(23, 59, 59, 999);

        // Scope strictly to current store when on POS level, or selected locations in ERP
        const targetLocationId = isPos
            ? (resolvedPosLocationId || (selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined))
            : selectedLocationIds.length > 0
                ? selectedLocationIds.join(",")
                : undefined;

        // If on POS level, wait until store location is resolved before querying
        if (isPos && !targetLocationId) {
            setIsFetchingData(false);
            return;
        }

        const targetWarehouseId = isPos
            ? posWarehouseId
            : selectedWarehouseIds.length > 0
                ? selectedWarehouseIds.join(",")
                : undefined;

        setIsFetchingData(true);
        setFetchProgressMessage(forceRefresh ? "Forcing fresh database calculation..." : "Queueing available stock summary query...");
        setPreviewJobId(null);

        queueAvailableStockSummaryPreview({
            asOfDate,
            startDate: fyStartDate.toISOString(),
            endDate: endDateObj.toISOString(),
            reportType: "separate", // Always fetch per-location stock separately from server
            locationId: targetLocationId,
            warehouseId: targetWarehouseId,
            forceRefresh,
        }).then((queueRes) => {
            if (queueRes && queueRes.status && queueRes.data?.jobId) {
                const newJobId = queueRes.data.jobId;
                activeJobIdRef.current = newJobId;
                setPreviewJobId(newJobId);

                // Fast-path: Served from zero-RAM SSD disk cache -> load instantly without waiting for SSE stream!
                if (queueRes.data.cached) {
                    loadCompletedResult(newJobId, true);
                }
            } else {
                setIsFetchingData(false);
                toast.error("Failed to queue stock data fetch");
            }
        });
    }, [asOfDate, isPos, resolvedPosLocationId, posWarehouseId, selectedLocationIds, selectedWarehouseIds, loadCompletedResult]);

    // SWR + Revalidation on mount or filter change
    useEffect(() => {
        const locKey = isPos
            ? (resolvedPosLocationId || "pos")
            : (selectedLocationIds.join("-") || "all");

        // 1. Instant 0.0s paint from browser session cache if available
        let hasValidCache = false;
        try {
            const cachedRaw = sessionStorage.getItem(`speedlimit_stock_${locKey}_${asOfDate}`);
            if (cachedRaw) {
                const parsed = JSON.parse(cachedRaw);
                if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
                    setRawItems(parsed.items);
                    setCacheStatus("cached");
                    if (parsed.timestamp) {
                        setLastSyncTime(new Date(parsed.timestamp));
                        // Consider cache fresh if synced within last 15 minutes
                        const ageMs = Date.now() - parsed.timestamp;
                        if (ageMs < 15 * 60 * 1000) {
                            hasValidCache = true;
                        }
                    }
                }
            }
        } catch (e) {}

        // 2. If valid fresh cache is present, DO NOT block UI with automatic loading overlay!
        if (hasValidCache) {
            setIsFetchingData(false);
            return;
        }

        // 3. Otherwise queue fresh fetch in background
        const timer = setTimeout(() => {
            fetchDataset(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [asOfDate, isPos, resolvedPosLocationId, selectedLocationIds]);

    // Handle SSE progress & completed event
    useEffect(() => {
        if (sseState.message) {
            setFetchProgressMessage(sseState.message);
        }

        if (sseState.status === "completed" && previewJobId && activeJobIdRef.current === previewJobId) {
            loadCompletedResult(previewJobId, false);
        }
    }, [sseState.status, sseState.message, previewJobId, loadCompletedResult]);

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
        locations,
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
            const fyStartStr = format(getFiscalYearStart(asOfDate), "yyyy-MM-dd");
            await exportAvailableStockSummaryToExcel({
                treeData,
                filteredItems,
                grandTotals,
                reportType,
                exportMode,
                dateFromStr: fyStartStr,
                dateToStr: asOfDate,
                asOfDate,
                companyName,
                isPosLevel: isPos,
                isPosOnly: isPos,
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
            const fyStartStr = format(getFiscalYearStart(asOfDate), "yyyy-MM-dd");
            await exportAvailableStockSummaryToPdf({
                treeData,
                filteredItems,
                grandTotals,
                reportType,
                exportMode,
                dateFromStr: fyStartStr,
                dateToStr: asOfDate,
                asOfDate,
                companyName,
                isPosLevel: isPos,
                isPosOnly: isPos,
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
                isPosLevel={isPos}
            />

            {/* Filters Toolbar */}
            <AvailableStockFilters
                isPosLevel={isPos}
                posLocationId={posLocationId}
                posLocationName={posLocationName}
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
                onRefresh={() => fetchDataset(true)}
                onExcelExport={handleExcelExport}
                onPdfExport={handlePdfExport}
                exportProgressPercent={exportProgressPercent}
                exportProgressMessage={exportProgressMessage}
                isExporting={isExporting}
                lastSyncTime={lastSyncTime}
                cacheStatus={cacheStatus}
            />

            {/* Hierarchical Tree Table View */}
            <AvailableStockTable
                treeData={treeData}
                grandTotals={grandTotals}
                searchQuery={searchQuery}
                isLoading={isFetchingData}
                isPosLevel={isPos}
            />
        </div>
    );
}
