"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import { getTransferReportSummary } from "@/lib/actions/transfer-request";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";

import { TransferRecord, TransferGrandTotals } from "./types";
import { useStockTransferData } from "./use-stock-transfer-data";
import { StockTransferHeader } from "./stock-transfer-header";
import { StockTransferFilters } from "./stock-transfer-filters";
import { StockTransferTable } from "./stock-transfer-table";
import { exportStockTransferSummaryToExcel } from "./excel-export";
import { exportStockTransferSummaryToPdf } from "./pdf-export";

import { useAuth } from "@/components/providers/auth-provider";

interface StockTransferSummaryViewProps {
    title?: string;
    companyName?: string;
    isPosLevel?: boolean;
}

export function StockTransferSummaryView({
    title = "Stock Transfer Movement & Status Report",
    companyName = "Speed Limit ERP",
    isPosLevel = false,
}: StockTransferSummaryViewProps) {
    const { user } = useAuth();
    const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;

    // Date range - default to current month or fiscal year
    const now = new Date();
    const currentMonth = now.getMonth();
    const fyStartYear = currentMonth >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const [dateRange, setDateRange] = useState<DateRange>({
        from: new Date(fyStartYear, 6, 1),
        to: new Date(fyStartYear + 1, 5, 30, 23, 59, 59),
    });

    // Locations & Warehouses multi-select
    const [locations, setLocations] = useState<Location[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
    const [selectedDestIds, setSelectedDestIds] = useState<string[]>([]);

    // Route & Status multi-select Sets
    const [filterTransferTypes, setFilterTransferTypes] = useState<Set<string>>(new Set());
    const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    // SKU Attribute filters
    const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
    const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
    const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
    const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
    const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
    const [filterColors, setFilterColors] = useState<Set<string>>(new Set());

    // Raw records from backend
    const [rawTransfers, setRawTransfers] = useState<TransferRecord[]>([]);
    const [serverGrandTotals, setServerGrandTotals] = useState<TransferGrandTotals>({
        totalTransfers: 0,
        totalItems: 0,
        totalSentQty: 0,
        totalReceivedQty: 0,
        totalPendingQty: 0,
        totalCostValue: 0,
        totalRetailValue: 0,
        statusCounts: { completed: 0, pending: 0, inTransit: 0, cancelled: 0 },
        typeCounts: { warehouseToOutlet: 0, outletToWarehouse: 0, outletToOutlet: 0, warehouseToWarehouse: 0 },
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Enforce POS location if viewing on POS level
    useEffect(() => {
        if (isPosLevel && posLocationId) {
            setSelectedSourceIds([posLocationId]);
        }
    }, [isPosLevel, posLocationId]);

    // Load metadata on mount
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

    // Main fetch function
    const fetchTransfers = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                startDate: dateRange.from?.toISOString(),
                endDate: dateRange.to?.toISOString(),
                limit: 2000,
            };

            if (selectedSourceIds.length > 0) {
                params.fromLocationId = selectedSourceIds.join(",");
            }
            if (selectedDestIds.length > 0) {
                params.toLocationId = selectedDestIds.join(",");
            }

            const res = await getTransferReportSummary(params);
            if (res && res.status !== false && res.data) {
                setRawTransfers(res.data.transfers || []);
                if (res.data.grandTotals) {
                    setServerGrandTotals(res.data.grandTotals);
                }
            } else {
                toast.error(res?.message || "Failed to load transfer movements");
            }
        } catch (err) {
            console.error("Error fetching transfer report:", err);
            toast.error("Failed to fetch transfer movements");
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, selectedSourceIds, selectedDestIds]);

    // Debounce fetch when primary query parameters change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTransfers();
        }, 250);
        return () => clearTimeout(timer);
    }, [fetchTransfers]);

    // Client-side filtering & dynamic totals calculation
    const { attributeOptions, filteredTransfers, computedTotals } = useStockTransferData({
        rawTransfers,
        searchQuery,
        selectedSourceIds,
        selectedDestIds,
        filterTransferTypes,
        filterStatuses,
        filterBrands,
        filterDivisions,
        filterCategories,
        filterGenders,
        filterSilhouettes,
        filterSizes,
        filterColors,
    });

    // Excel Export Handler
    const handleExcelExport = async () => {
        if (filteredTransfers.length === 0) {
            toast.warning("No transfer records to export");
            return;
        }

        setIsExporting(true);
        const dateRangeStr = `${dateRange.from ? format(dateRange.from, "dd-MMM-yyyy") : ""} to ${
            dateRange.to ? format(dateRange.to, "dd-MMM-yyyy") : ""
        }`;

        const toastId = toast.loading("Preparing Excel export...");
        try {
            await exportStockTransferSummaryToExcel({
                transfers: filteredTransfers,
                grandTotals: computedTotals,
                dateRangeStr,
                companyName,
                onProgress: (percent, msg) => {
                    toast.loading(`${msg} (${percent}%)`, { id: toastId });
                },
            });
            toast.success("Excel report exported successfully", { id: toastId });
        } catch (err: any) {
            console.error("Excel export error:", err);
            toast.error(`Export failed: ${err.message || "Unknown error"}`, { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    // PDF / Print Export Handler
    const handlePdfExport = async () => {
        if (filteredTransfers.length === 0) {
            toast.warning("No transfer records to print");
            return;
        }

        setIsExporting(true);
        const dateRangeStr = `${dateRange.from ? format(dateRange.from, "dd-MMM-yyyy") : ""} to ${
            dateRange.to ? format(dateRange.to, "dd-MMM-yyyy") : ""
        }`;

        const toastId = toast.loading("Generating printable report...");
        try {
            await exportStockTransferSummaryToPdf({
                transfers: filteredTransfers,
                grandTotals: computedTotals,
                dateRangeStr,
                companyName,
                onProgress: (percent, msg) => {
                    toast.loading(`${msg} (${percent}%)`, { id: toastId });
                },
            });
            toast.success("Print view generated", { id: toastId });
        } catch (err: any) {
            console.error("Print export error:", err);
            toast.error(`Print failed: ${err.message || "Unknown error"}`, { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>{title}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Track all-over stock transfers between outlets and warehouses with complete approval workflow and acceptance tracking.
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <StockTransferHeader
                grandTotals={computedTotals}
                isLoading={isLoading}
            />

            {/* Filters Bar */}
            <StockTransferFilters
                isPosLevel={isPosLevel}
                posLocationName={locations.find((l) => l.id === posLocationId)?.name}
                dateRange={dateRange}
                setDateRange={setDateRange}
                locations={locations}
                warehouses={warehouses}
                selectedSourceIds={selectedSourceIds}
                setSelectedSourceIds={setSelectedSourceIds}
                selectedDestIds={selectedDestIds}
                setSelectedDestIds={setSelectedDestIds}
                filterTransferTypes={filterTransferTypes}
                setFilterTransferTypes={setFilterTransferTypes}
                filterStatuses={filterStatuses}
                setFilterStatuses={setFilterStatuses}
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
                isLoading={isLoading}
                onRefresh={fetchTransfers}
                onExcelExport={handleExcelExport}
                onPdfExport={handlePdfExport}
                isExporting={isExporting}
            />

            {/* Data Table */}
            <StockTransferTable
                filteredTransfers={filteredTransfers}
                grandTotals={computedTotals}
                searchQuery={searchQuery}
                isLoading={isLoading}
            />
        </div>
    );
}
