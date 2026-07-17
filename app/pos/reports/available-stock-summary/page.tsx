"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
    getAvailableStockSummaryReport,
    queueAvailableStockSummaryReportExport,
    getAvailableStockSummaryReportExportStatus
} from "@/lib/actions/stock-ledger";
import { getLocations, Location } from "@/lib/actions/location";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Download,
    Printer,
    Loader2,
    Calendar,
    ArrowUpRight,
    TrendingUp,
    Store,
    Layers,
    ShoppingCart,
    Inbox,
    RefreshCw,
    Folder,
    Settings,
    Coins,
    Truck,
    Search,
    X,
    SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, COMPANY_NAME, getApiBaseUrl, formatCurrency } from "@/lib/utils";

export default function AvailableStockSummaryReportPage() {
    const { user } = useAuth();
    const defaultLocationId = user?.terminal?.location?.id || user?.locationId;
    const defaultLocationName = user?.terminal?.location?.name || "Store";

    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const [groupingLevels, setGroupingLevels] = useState({
        brand: true,
        division: true,
        category: true,
        gender: true,
        silhouette: true,
        article: true,
        variant: true,
    });

    const [reportData, setReportData] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    // Excel Export Queue States
    const [exportJobId, setExportJobId] = useState<string | null>(null);
    const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [exportProgress, setExportProgress] = useState<number>(0);

    // PDF Export Queue States
    const [pdfJobId, setPdfJobId] = useState<string | null>(null);
    const [pdfExportState, setPdfExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [pdfExportProgress, setPdfExportProgress] = useState<number>(0);

    const summaryOnly = !groupingLevels.variant;

    // Fetch Locations
    useEffect(() => {
        async function fetchLocations() {
            try {
                const res = await getLocations();
                if (res && res.status && Array.isArray(res.data)) {
                    setLocations(res.data);
                }
            } catch (err) {
                console.error("Failed to load locations:", err);
            }
        }
        fetchLocations();
    }, []);

    // Set Default Location
    useEffect(() => {
        if (defaultLocationId && !selectedLocationId) {
            setSelectedLocationId(defaultLocationId);
        }
    }, [defaultLocationId]);

    const fetchReport = useCallback(() => {
        const activeLocationId = selectedLocationId || defaultLocationId;
        if (!activeLocationId || !dateRange.from || !dateRange.to) return;
        
        startTransition(async () => {
            const result = await getAvailableStockSummaryReport({
                locationId: activeLocationId,
                startDate: dateRange.from?.toISOString(),
                endDate: dateRange.to?.toISOString(),
                summaryOnly,
                showBrand: groupingLevels.brand,
                showDivision: groupingLevels.division,
                showCategory: groupingLevels.category,
                showGender: groupingLevels.gender,
                showSilhouette: groupingLevels.silhouette,
                showArticle: groupingLevels.article,
                showVariant: groupingLevels.variant,
            });
            if (result && result.status !== false) {
                setReportData(result.data?.root || result.data || result || []);
            } else {
                toast.error("Failed to load available stock summary report data");
            }
        });
    }, [selectedLocationId, defaultLocationId, dateRange, groupingLevels, summaryOnly]);

    useEffect(() => {
        fetchReport();
    }, [selectedLocationId, groupingLevels]);

    // Poll Excel Export Job Status
    useEffect(() => {
        if (exportState !== "queueing" && exportState !== "processing") return;
        if (!exportJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getAvailableStockSummaryReportExportStatus(exportJobId);
                if (res && res.status) {
                    const { state, progress } = res.data || {};
                    setExportProgress(progress || 0);

                    if (state === "completed") {
                        setExportState("completed");
                        toast.success("Excel Export processed successfully! Ready to download.");
                        clearInterval(interval);
                    } else if (state === "failed") {
                        setExportState("failed");
                        toast.error("Background Excel export processing failed.");
                        clearInterval(interval);
                    } else {
                        setExportState("processing");
                    }
                }
            } catch (err) {
                console.error("Error polling job status:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [exportState, exportJobId]);

    // Poll PDF Export Job Status
    useEffect(() => {
        if (pdfExportState !== "queueing" && pdfExportState !== "processing") return;
        if (!pdfJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getAvailableStockSummaryReportExportStatus(pdfJobId);
                if (res && res.status) {
                    const { state, progress } = res.data || {};
                    setPdfExportProgress(progress || 0);

                    if (state === "completed") {
                        setPdfExportState("completed");
                        toast.success("PDF Report generated successfully! Ready to download.");
                        clearInterval(interval);
                    } else if (state === "failed") {
                        setPdfExportState("failed");
                        toast.error("Background PDF generation failed.");
                        clearInterval(interval);
                    } else {
                        setPdfExportState("processing");
                    }
                }
            } catch (err) {
                console.error("Error polling PDF job status:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [pdfExportState, pdfJobId]);

    const handleExportExcelClick = async () => {
        const activeLocationId = selectedLocationId || defaultLocationId;
        if (!activeLocationId || !dateRange.from || !dateRange.to) return;

        if (exportState === "completed" && exportJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/stock-ledger/available-stock-summary/export/${exportJobId}/download`;
            window.open(url, "_blank");
            
            // Reset
            setExportState("idle");
            setExportJobId(null);
            setExportProgress(0);
            return;
        }

        setExportState("queueing");
        try {
            const res = await queueAvailableStockSummaryReportExport({
                locationId: activeLocationId,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
                format: "xlsx",
                summaryOnly,
                showBrand: groupingLevels.brand,
                showDivision: groupingLevels.division,
                showCategory: groupingLevels.category,
                showGender: groupingLevels.gender,
                showSilhouette: groupingLevels.silhouette,
                showArticle: groupingLevels.article,
                showVariant: groupingLevels.variant,
            });

            if (res && res.status && res.data?.jobId) {
                setExportJobId(res.data.jobId);
                setExportState("processing");
                setExportProgress(5);
                toast.info("Background Excel generation queued.");
            } else {
                setExportState("failed");
                toast.error(res.message || "Failed to queue export job.");
            }
        } catch (err) {
            setExportState("failed");
            console.error(err);
            toast.error("Failed to queue export job.");
        }
    };

    const handleExportPdfClick = async () => {
        const activeLocationId = selectedLocationId || defaultLocationId;
        if (!activeLocationId || !dateRange.from || !dateRange.to) return;

        if (pdfExportState === "completed" && pdfJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/stock-ledger/available-stock-summary/export/${pdfJobId}/download`;
            window.open(url, "_blank");
            
            // Reset
            setPdfExportState("idle");
            setPdfJobId(null);
            setPdfExportProgress(0);
            return;
        }

        setPdfExportState("queueing");
        try {
            const res = await queueAvailableStockSummaryReportExport({
                locationId: activeLocationId,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
                format: "pdf",
                summaryOnly,
                showBrand: groupingLevels.brand,
                showDivision: groupingLevels.division,
                showCategory: groupingLevels.category,
                showGender: groupingLevels.gender,
                showSilhouette: groupingLevels.silhouette,
                showArticle: groupingLevels.article,
                showVariant: groupingLevels.variant,
            });

            if (res && res.status && res.data?.jobId) {
                setPdfJobId(res.data.jobId);
                setPdfExportState("processing");
                setPdfExportProgress(5);
                toast.info("Background PDF generation queued.");
            } else {
                setPdfExportState("failed");
                toast.error(res.message || "Failed to queue export job.");
            }
        } catch (err) {
            setPdfExportState("failed");
            console.error(err);
            toast.error("Failed to queue export job.");
        }
    };

    // Advanced Hierarchical Client-Side Search
    const filteredReportData = useMemo(() => {
        if (!searchQuery.trim()) return reportData;
        const query = searchQuery.toLowerCase().trim();

        const filterNode = (node: any): any => {
            const nodeMatches = 
                (node.value && node.value.toLowerCase().includes(query)) ||
                (node.sku && node.sku.toLowerCase().includes(query)) ||
                (node.articleName && node.articleName.toLowerCase().includes(query)) ||
                (node.color && node.color.toLowerCase().includes(query)) ||
                (node.size && node.size.toLowerCase().includes(query));

            if (nodeMatches) {
                return node;
            }

            if (node.children && node.children.length > 0) {
                const filteredChildren = node.children
                    .map(filterNode)
                    .filter(Boolean);

                if (filteredChildren.length > 0) {
                    return {
                        ...node,
                        children: filteredChildren,
                    };
                }
            }

            return null;
        };

        return reportData.map(filterNode).filter(Boolean);
    }, [reportData, searchQuery]);

    // Calculate Grand Totals (based on filtered data!)
    const grandTotals = useMemo(() => {
        const t = {
            totalArticles: 0,
            quantity: 0,
            transit: 0,
            total: 0,
            value: 0,
        };

        if (!Array.isArray(filteredReportData)) return t;

        for (const node of filteredReportData) {
            if (!node || !node.totals) continue;
            t.quantity += node.totals.quantity || 0;
            t.transit += node.totals.transit || 0;
            t.total += node.totals.total || 0;
            t.value += node.totals.value || 0;
        }

        const countArticles = (node: any) => {
            if (!node) return;
            if (node.level === 'article') {
                t.totalArticles += 1;
            }
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    countArticles(child);
                }
            }
        };

        for (const node of filteredReportData) {
            countArticles(node);
        }

        return t;
    }, [filteredReportData]);

    // Flatten nested tree for virtualization (based on filtered data!)
    const flatRows = useMemo(() => {
        const rows: any[] = [];
        if (!Array.isArray(filteredReportData)) return rows;
        
        const visit = (node: any, path: string = "") => {
            if (!node) return;
            const currentPath = path ? `${path}-${node.level}-${node.value}` : `${node.level}-${node.value}`;
            
            if (node.level === 'article') {
                rows.push({
                    id: `art-${node.sku}`,
                    type: 'article',
                    label: node.articleName,
                    sku: node.sku,
                    totals: node.totals,
                });
            } else if (node.level === 'variant') {
                rows.push({
                    id: `var-${currentPath}`,
                    type: 'variant',
                    color: node.color,
                    size: node.size,
                    totals: node.totals,
                });
            } else {
                rows.push({
                    id: `${node.level}-${currentPath}`,
                    type: node.level,
                    label: `${node.value.toUpperCase()}`,
                    totals: node.totals,
                });
            }
            
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    visit(child, currentPath);
                }
            }
        };

        for (const rootNode of filteredReportData) {
            visit(rootNode);
        }
        
        return rows;
    }, [filteredReportData]);

    const handleToggleLevel = (level: keyof typeof groupingLevels, checked: boolean) => {
        setGroupingLevels(prev => {
            const next = { ...prev, [level]: checked };
            if (level === 'division' && checked) {
                next.brand = true;
            }
            if (level === 'brand' && !checked) {
                next.division = false;
            }
            return next;
        });
    };

    // Virtual list setup
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: flatRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 12,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

    const getExportButtonText = () => {
        switch (exportState) {
            case "queueing": return "Queueing...";
            case "processing": return `Generating ${exportProgress}%`;
            case "completed": return "Download Excel";
            case "failed": return "Retry Excel Export";
            case "idle":
            default: return "Export Excel";
        }
    };

    const getPdfButtonText = () => {
        switch (pdfExportState) {
            case "queueing": return "Queueing...";
            case "processing": return `Generating ${pdfExportProgress}%`;
            case "completed": return "Download PDF";
            case "failed": return "Retry PDF Export";
            case "idle":
            default: return "Export PDF";
        }
    };

    const formatVal = (val: number) => val === 0 ? "-" : val.toLocaleString();
    const formatPriceVal = (val: number) => val === 0 ? "-" : formatCurrency(val);

    const getActiveLocationName = () => {
        if (!selectedLocationId) return defaultLocationName;
        const matched = locations.find(l => l.id === selectedLocationId);
        return matched ? matched.name : defaultLocationName;
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        Available Stock Summary
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                        <Store className="h-4 w-4 text-primary/70" />
                        Stock Balance & Valuation for <span className="text-foreground font-semibold">{getActiveLocationName()}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant={pdfExportState === "completed" ? "default" : "outline"}
                        onClick={handleExportPdfClick}
                        disabled={(pdfExportState === "queueing" || pdfExportState === "processing") || reportData.length === 0}
                        className={cn(
                            "gap-2 font-semibold transition-all",
                            pdfExportState === "completed"
                                ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 border-none"
                                : "border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        )}
                    >
                        {pdfExportState === "queueing" || pdfExportState === "processing" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                        ) : (
                            <Printer className="h-4 w-4" />
                        )}
                        {getPdfButtonText()}
                    </Button>
                    <Button
                        variant={exportState === "completed" ? "default" : "outline"}
                        onClick={handleExportExcelClick}
                        disabled={(exportState === "queueing" || exportState === "processing") || reportData.length === 0}
                        className={cn(
                            "gap-2 font-semibold transition-all",
                            exportState === "completed"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-none"
                                : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        )}
                    >
                        {exportState === "queueing" || exportState === "processing" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        {getExportButtonText()}
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-center text-slate-900">Available Stock Summary</h1>
                <p className="text-sm text-center text-slate-600 mt-1">Outlet: {getActiveLocationName()}</p>
                <p className="text-xs text-center text-slate-500">
                    As of: {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "Today"}
                </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-end justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 border p-4 rounded-xl shadow-sm no-print">
                <div className="flex flex-wrap items-end gap-4 flex-1">
                    {/* Location selector */}
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Store className="h-3.5 w-3.5 text-primary" />
                            Outlet / Store
                        </span>
                        <Select
                            value={selectedLocationId}
                            onValueChange={(val) => setSelectedLocationId(val)}
                        >
                            <SelectTrigger className="h-10 text-sm font-medium bg-background border-slate-200">
                                <SelectValue placeholder="Select Outlet" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name} ({loc.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date period picker */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            As of Period
                        </span>
                        <DateRangePicker
                            initialDateFrom={dateRange.from}
                            initialDateTo={dateRange.to}
                            onUpdate={({ range }: { range: DateRange }) => {
                                if (range) {
                                    setDateRange(range);
                                }
                            }}
                        />
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[260px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Search className="h-3.5 w-3.5 text-primary" />
                            Quick Search
                        </span>
                        <div className="relative">
                            <Input
                                placeholder="Search by SKU, Product Name, Size, Color, Category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pl-9 pr-9 text-sm bg-background border-slate-200"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Search className="h-4 w-4" />
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={fetchReport}
                        disabled={isPending}
                        className="h-10 px-5 font-bold gap-1.5"
                    >
                        <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                        Refresh Report
                    </Button>
                </div>
            </div>

            {/* Hierarchy Configuration */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                            Report Hierarchy Configuration
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Customize the nesting structure. Check the levels you want to group and report by.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 pt-2">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-brand"
                            checked={groupingLevels.brand}
                            onChange={(e) => handleToggleLevel('brand', e.target.checked)}
                            disabled={groupingLevels.division}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer disabled:opacity-50"
                        />
                        <label htmlFor="group-brand" className={cn("text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5", groupingLevels.division && "opacity-60 cursor-not-allowed")}>
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            Brand
                        </label>
                    </div>

                    {/* Division */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-division"
                            checked={groupingLevels.division}
                            onChange={(e) => handleToggleLevel('division', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-division" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5 text-blue-500" />
                            Division
                        </label>
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-category"
                            checked={groupingLevels.category}
                            onChange={(e) => handleToggleLevel('category', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-category" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
                            Category
                        </label>
                    </div>

                    {/* Gender */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-gender"
                            checked={groupingLevels.gender}
                            onChange={(e) => handleToggleLevel('gender', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-gender" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-rose-500" />
                            Gender
                        </label>
                    </div>

                    {/* Silhouette */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-silhouette"
                            checked={groupingLevels.silhouette}
                            onChange={(e) => handleToggleLevel('silhouette', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-silhouette" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                            Silhouette
                        </label>
                    </div>

                    {/* Article */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-article"
                            checked={groupingLevels.article}
                            onChange={(e) => handleToggleLevel('article', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-article" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Inbox className="h-3.5 w-3.5 text-cyan-500" />
                            Article
                        </label>
                    </div>

                    {/* Variant */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-variant"
                            checked={groupingLevels.variant}
                            onChange={(e) => handleToggleLevel('variant', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-variant" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Printer className="h-3.5 w-3.5 text-fuchsia-500" />
                            Variant (Sizes)
                        </label>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print">
                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Products</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{grandTotals.totalArticles}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                            <Layers className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Available Qty</p>
                            <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatVal(grandTotals.quantity)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                            <Inbox className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">In Transit</p>
                            <h3 className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-500">{formatVal(grandTotals.transit)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                            <Truck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Qty</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{formatVal(grandTotals.total)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-slate-100 dark:bg-slate-800 text-slate-600">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Valuation</p>
                            <h3 className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{formatPriceVal(grandTotals.value)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                            <Coins className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Virtualized Scrolling Table */}
            <div ref={parentRef} className="overflow-auto max-h-[700px] border rounded-xl shadow-sm bg-background no-print">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-[#1e293b] text-slate-100 border-b border-border/80 text-[10px] uppercase font-bold sticky top-0 z-10 shadow-sm">
                            <th className="p-3 w-[300px] border-r bg-[#1e293b]">GPC / Category / Product</th>
                            <th className="p-3 w-[90px] border-r text-center bg-[#1e293b]">Size</th>
                            <th className="p-3 w-[110px] border-r text-center bg-[#1e293b]">Color</th>
                            <th className="p-3 w-[110px] border-r text-right bg-[#1e293b]">Quantity</th>
                            <th className="p-3 w-[110px] border-r text-right bg-[#1e293b]">In Transit</th>
                            <th className="p-3 w-[110px] border-r text-right bg-[#0f172a] font-extrabold text-white">Total</th>
                            <th className="p-3 w-[120px] border-r text-right bg-[#1e293b]">Selling Price</th>
                            <th className="p-3 w-[150px] text-right bg-[#0f172a] font-extrabold text-emerald-300">Value (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                        {isPending ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        Aggregating available inventory levels and valuation...
                                    </div>
                                </td>
                            </tr>
                        ) : flatRows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                                    No available stock records match the filters or search query.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {paddingTop > 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ height: `${paddingTop}px` }} />
                                    </tr>
                                )}
                                {virtualItems.map((virtualRow) => {
                                    const row = flatRows[virtualRow.index];
                                    
                                    const LEVEL_UI_STYLES: Record<string, { className: string; indentClass: string }> = {
                                        brand: { className: "bg-[#0f172a] text-white font-black border-b h-[40px]", indentClass: "pl-3 text-white" },
                                        division: { className: "bg-[#1e293b] text-white font-extrabold border-b h-[40px]", indentClass: "pl-6 text-white" },
                                        category: { className: "bg-[#334155] text-white font-bold border-b h-[40px]", indentClass: "pl-9 text-white" },
                                        gender: { className: "bg-[#475569] text-white font-semibold border-b h-[40px]", indentClass: "pl-12 text-white" },
                                        silhouette: { className: "bg-[#64748b] text-slate-100 font-medium border-b h-[40px]", indentClass: "pl-16 text-slate-100" },
                                        article: { className: "bg-[#f1f5f9] dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 font-bold border-b h-[45px]", indentClass: "pl-20" },
                                        variant: { className: "hover:bg-slate-50 dark:hover:bg-slate-900/35 text-slate-600 dark:text-slate-400 bg-background transition-colors h-[36px]", indentClass: "pl-24" },
                                    };

                                    const style = LEVEL_UI_STYLES[row.type] || LEVEL_UI_STYLES.brand;
                                    const isArticle = row.type === 'article';
                                    const isVariant = row.type === 'variant';
                                    const isHeaderRow = ['brand', 'division', 'category', 'gender', 'silhouette'].includes(row.type);
                                    
                                    const totals = row.totals || {
                                        quantity: 0,
                                        transit: 0,
                                        total: 0,
                                        unitPrice: 0,
                                        value: 0,
                                    };

                                    // Define clean text colors for table cells to avoid dark-on-dark slate colors on dark rows
                                    const cellTextClass = isHeaderRow 
                                        ? "text-white font-bold" 
                                        : isArticle 
                                            ? "text-slate-800 dark:text-slate-200 font-semibold" 
                                            : "text-slate-700 dark:text-slate-350 font-medium";

                                    const totalCellClass = isHeaderRow
                                        ? "text-white font-black bg-slate-500/15"
                                        : isArticle
                                            ? "text-slate-900 dark:text-white font-bold bg-slate-500/5"
                                            : "text-slate-700 dark:text-slate-300 font-medium bg-slate-500/5";

                                    const valueCellClass = isHeaderRow
                                        ? "text-[#4ade80] dark:text-emerald-400 font-black bg-emerald-500/15" // Extremely visible green
                                        : isArticle
                                            ? "text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/5"
                                            : "text-emerald-600 dark:text-emerald-450 font-semibold bg-emerald-500/5";

                                    const subTextClass = isHeaderRow 
                                        ? "text-slate-300 font-semibold"
                                        : "text-muted-foreground";

                                    return (
                                        <tr key={row.id} className={style.className}>
                                            {isArticle ? (
                                                <td className={cn("p-3 border-r flex flex-col font-bold justify-center", style.indentClass)}>
                                                    <span className="text-[10px] text-primary">SKU: {row.sku}</span>
                                                    <span className="text-slate-900 dark:text-slate-100">{row.label}</span>
                                                </td>
                                            ) : isVariant ? (
                                                <td className={cn("p-3 border-r text-muted-foreground italic", style.indentClass)}>
                                                    &mdash; Variant Item
                                                </td>
                                            ) : (
                                                <td colSpan={3} className={cn("p-3 border-r text-xs font-bold", style.indentClass)}>
                                                    {row.label}
                                                </td>
                                            )}

                                            {isArticle && (
                                                <>
                                                    <td className="p-3 border-r text-center text-[10px] font-bold text-muted-foreground uppercase bg-slate-50/20">All Sizes</td>
                                                    <td className="p-3 border-r text-center text-[10px] font-bold text-muted-foreground uppercase bg-slate-50/20">All Colors</td>
                                                </>
                                            )}

                                            {isVariant && (
                                                <>
                                                    <td className="p-3 border-r text-center font-semibold text-slate-750 dark:text-slate-350">{row.size}</td>
                                                    <td className="p-3 border-r text-center font-semibold text-slate-700 dark:text-slate-300">{row.color}</td>
                                                </>
                                            )}

                                            <td className={cn("p-3 border-r text-right", cellTextClass)}>{formatVal(totals.quantity)}</td>
                                            <td className={cn("p-3 border-r text-right", cellTextClass)}>{formatVal(totals.transit)}</td>
                                            <td className={cn("p-3 border-r text-right", totalCellClass)}>{formatVal(totals.total)}</td>
                                            
                                            {isArticle ? (
                                                <td className="p-3 border-r text-right font-bold bg-slate-500/5 text-slate-900 dark:text-white">
                                                    {formatPriceVal(totals.unitPrice)}
                                                </td>
                                            ) : (
                                                <td className={cn("p-3 border-r text-center", subTextClass)}>&mdash;</td>
                                            )}

                                            <td className={cn("p-3 text-right", valueCellClass)}>
                                                {formatPriceVal(totals.value)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paddingBottom > 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ height: `${paddingBottom}px` }} />
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>

                    {/* GRAND TOTALS FOOTER ROW */}
                    {reportData.length > 0 && (
                        <tfoot className="sticky bottom-0 z-10 shadow-md">
                            <tr className="bg-[#1e293b] text-slate-100 font-extrabold border-t-2 border-slate-900 text-xs">
                                <td colSpan={3} className="p-3 border-r text-left uppercase tracking-wider font-black bg-[#1e293b]">
                                    GRAND TOTALS
                                </td>
                                <td className="p-3 border-r text-right font-black bg-[#1e293b] text-white">{formatVal(grandTotals.quantity)}</td>
                                <td className="p-3 border-r text-right font-black bg-[#1e293b] text-white">{formatVal(grandTotals.transit)}</td>
                                <td className="p-3 border-r text-right font-black bg-[#0f172a] text-white">{formatVal(grandTotals.total)}</td>
                                <td className="p-3 border-r text-right font-black bg-[#1e293b] text-white">&mdash;</td>
                                <td className="p-3 text-right font-black bg-[#0f172a] text-[#4ade80]">{formatPriceVal(grandTotals.value)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Downloader Fixed Overlay Screen */}
            {downloadingFile && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center pointer-events-auto">
                    <div className="bg-background border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl flex flex-col items-center gap-4 text-center">
                        <div className="relative h-12 w-12 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm text-foreground">Preparing Download</h4>
                            <p className="text-xs text-muted-foreground break-all max-w-[280px]">
                                Downloading {downloadingFile}... Please wait.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        color: black !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 6px 4px !important;
                        font-size: 8px !important;
                        color: black !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                }
            `}</style>
        </div>
    );
}
