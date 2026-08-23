"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
    queueStockTransactionDetailPreview,
    getStockTransactionDetailResult,
} from "@/lib/actions/stock-ledger";
import { useReportSse } from "@/hooks/use-report-sse";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { DateRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";

import { FlatItemRecord, TransactionRecord } from "./types";
import { useStockTransactionDetailData } from "./use-stock-transaction-detail-data";
import { StockTransactionDetailHeader } from "./stock-transaction-detail-header";
import { StockTransactionDetailFilters } from "./stock-transaction-detail-filters";
import { StockTransactionDetailTable } from "./stock-transaction-detail-table";
import { exportStockTransactionDetailToExcel } from "./excel-export";
import { exportStockTransactionDetailToPdf } from "./pdf-export";

import { useAuth } from "@/components/providers/auth-provider";

interface StockTransactionDetailViewProps {
    title?: string;
    companyName?: string;
    isPosLevel?: boolean;
}

export function StockTransactionDetailView({
    title = "Stock Transaction Movement Detail Report",
    companyName = "Speed Limit ERP",
    isPosLevel = false,
}: StockTransactionDetailViewProps) {
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

    const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
    const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
    const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
    const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
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

    const sseState = useReportSse(previewJobId, "transaction-detail");

    // Load locations & warehouses metadata
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

                if (node.level === "variant" || !node.children || node.children.length === 0) {
                    const txs: TransactionRecord[] = Array.isArray(node.transactions)
                        ? node.transactions.map((tx: any) => ({
                              id: tx.id || tx.docRef,
                              date: tx.date || tx.createdAt,
                              docType: tx.docType || tx.type || "Movement",
                              docRef: tx.docRef || tx.referenceNo || "-",
                              docRefId: tx.docRefId || tx.referenceId,
                              remarks: tx.remarks || tx.description || "",
                              inQty: Number(tx.inQty || 0),
                              outQty: Number(tx.outQty || 0),
                              isInTransit: !!tx.isInTransit,
                          }))
                        : [];

                    items.push({
                        itemId: node.itemId || node.value,
                        brand: currentInfo.brand || node.brand || "No Brand",
                        division: currentInfo.division || node.division || "No Division",
                        category: currentInfo.category || node.category || "No Category",
                        gender: currentInfo.gender || node.gender || "No Gender",
                        silhouette: currentInfo.silhouette || node.silhouette || "No Silhouette",
                        sku: currentInfo.sku || node.sku || "",
                        articleName: currentInfo.articleName || node.articleName || node.description || "",
                        barCode: node.barCode || node.totals?.barCode || "",
                        size: node.size || node.totals?.size || "Default",
                        color: node.color || node.totals?.color || "Default",
                        openingBalance: Number(node.openingBalance || node.totals?.openingBalance || 0),
                        inQty: Number(node.inQty || node.totals?.inQty || 0),
                        outQty: Number(node.outQty || node.totals?.outQty || 0),
                        inTransitQty: Number(node.inTransitQty || node.totals?.inTransitQty || 0),
                        closingBalance: Number(node.closingBalance || node.totals?.closingBalance || 0),
                        transactions: txs,
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

    // Main Single API Fetch function via SSE Queue
    const fetchDataset = useCallback(() => {
        setIsFetchingData(true);
        setFetchProgressMessage("Queueing stock transaction detail query...");
        setPreviewJobId(null);

        const startDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
        const endDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
        const locationIdStr = selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined;
        const warehouseIdStr = selectedWarehouseIds.length > 0 ? selectedWarehouseIds.join(",") : undefined;

        queueStockTransactionDetailPreview({
            startDate: startDateStr,
            endDate: endDateStr,
            locationId: locationIdStr,
            warehouseId: warehouseIdStr,
            showVariant: true,
        }).then((queueRes) => {
            if (queueRes && queueRes.status && queueRes.data?.jobId) {
                const newJobId = queueRes.data.jobId;
                activeJobIdRef.current = newJobId;
                setPreviewJobId(newJobId);
            } else {
                setIsFetchingData(false);
                toast.error("Failed to queue stock transaction query");
            }
        });
    }, [dateRange, selectedLocationIds, selectedWarehouseIds]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDataset();
        }, 300);
        return () => clearTimeout(timer);
    }, [dateRange, selectedLocationIds, selectedWarehouseIds]);

    // Handle SSE progress & completed event
    useEffect(() => {
        if (sseState.message) {
            setFetchProgressMessage(sseState.message);
        }

        if (sseState.status === "completed" && previewJobId && activeJobIdRef.current === previewJobId) {
            setFetchProgressMessage("Loading completed stock transaction movement dataset...");
            const targetJobId = previewJobId;

            getStockTransactionDetailResult(targetJobId)
                .then((res) => {
                    if (activeJobIdRef.current !== targetJobId) return;
                    setIsFetchingData(false);

                    if (res && res.status !== false) {
                        const payload = res.data?.data ? res.data.data : res.data;
                        let itemsList: FlatItemRecord[] = [];

                        if (Array.isArray(payload?.root)) {
                            itemsList = flattenNodesToItems(payload.root);
                        } else if (Array.isArray(payload)) {
                            itemsList = flattenNodesToItems(payload);
                        }

                        setRawItems(itemsList);
                    } else {
                        setRawItems([]);
                        toast.error("Failed to load completed stock transaction dataset");
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

    // Client-side filtration & metrics hook
    const { attributeOptions, filteredItems, grandTotals } = useStockTransactionDetailData({
        rawItems,
        searchQuery,
        filterBrands,
        filterDivisions,
        filterCategories,
        filterGenders,
        filterSilhouettes,
        filterSizes,
        filterColors,
    });

    const dateRangeStr = `${dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""} to ${dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}`;

    // Handle non-blocking client-side Excel Export
    const handleExcelExport = async () => {
        if (filteredItems.length === 0) {
            toast.error("No stock transaction items available to export");
            return;
        }

        setIsExporting(true);
        setExportProgressPercent(0);
        setExportProgressMessage("Preparing Excel stock transaction ledger file...");

        try {
            await exportStockTransactionDetailToExcel({
                filteredItems,
                grandTotals,
                dateRangeStr,
                companyName,
                onProgress: (percent, message) => {
                    setExportProgressPercent(percent);
                    setExportProgressMessage(message);
                },
            });
            toast.success("Excel stock transaction detail report generated successfully");
        } catch (err) {
            toast.error("Failed to generate Excel export");
        } finally {
            setIsExporting(false);
        }
    };

    // Handle non-blocking client-side PDF Export
    const handlePdfExport = async () => {
        if (filteredItems.length === 0) {
            toast.error("No stock transaction items available to export");
            return;
        }

        setIsExporting(true);
        setExportProgressPercent(0);
        setExportProgressMessage("Preparing PDF print layout...");

        try {
            await exportStockTransactionDetailToPdf({
                filteredItems,
                grandTotals,
                dateRangeStr,
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
        <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-4">
            {/* Page Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Item-wise stock movement history, GRN receipts, POS sales, transfers, and transaction ledger details
                    </p>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <StockTransactionDetailHeader
                grandTotals={grandTotals}
                isLoading={isFetchingData}
            />

            {/* Filters Toolbar */}
            <StockTransactionDetailFilters
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
                fetchProgressMessage={sseState.message || fetchProgressMessage}
                fetchProgressStage={sseState.stage}
                onRefresh={fetchDataset}
                onExcelExport={handleExcelExport}
                onPdfExport={handlePdfExport}
                exportProgressPercent={exportProgressPercent}
                exportProgressMessage={exportProgressMessage}
                isExporting={isExporting}
            />

            {/* Transaction Ledger Table View */}
            <StockTransactionDetailTable
                filteredItems={filteredItems}
                grandTotals={grandTotals}
                searchQuery={searchQuery}
                isLoading={isFetchingData}
            />
        </div>
    );
}
