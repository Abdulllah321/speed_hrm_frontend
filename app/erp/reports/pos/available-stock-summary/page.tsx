"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getWarehouses, Warehouse } from "@/lib/actions/warehouse";
import {
    getAvailableStockSummaryReport,
    queueAvailableStockSummaryReportExport,
    getAvailableStockSummaryReportExportStatus,
    queueAvailableStockSummaryPreview,
    getAvailableStockSummaryResult,
} from "@/lib/actions/stock-ledger";
import { useReportSse } from "@/hooks/use-report-sse";
import { ReportQueueProgress } from "@/components/reports/ReportQueueProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Download,
    Printer,
    Loader2,
    Calendar,
    TrendingUp,
    Store,
    Layers,
    ShoppingCart,
    Inbox,
    RefreshCw,
    Folder,
    Coins,
    Truck,
    Search,
    X,
    SlidersHorizontal,
    Package
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, getApiBaseUrl, formatCurrency } from "@/lib/utils";

// ─── Highlight helper ──────────────────────────────────────────────────────────
function highlight(text: string, query: string | string[]) {
    if (!text) return <></>;
    const tokens = Array.isArray(query) 
        ? query.filter(q => Boolean(q && q.trim())) 
        : (query && query.trim() ? [query.trim()] : []);
    
    if (tokens.length === 0) return <>{text}</>;

    try {
        const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
        const parts = text.split(pattern);

        return (
            <>
                {parts.map((part, i) => {
                    const isMatch = tokens.some(t => t.toLowerCase() === part.toLowerCase());
                    return isMatch ? (
                        <mark key={i} className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-sm px-0.5 font-semibold">
                            {part}
                        </mark>
                    ) : (
                        part
                    );
                })}
            </>
        );
    } catch {
        return <>{text}</>;
    }
}

// ─── Autocomplete multi-select ─────────────────────────────────────────────────
function AutocompleteMultiSelect({
    label, options, selected, onToggle, searchable = true,
}: {
    label: string;
    options: string[];
    selected: Set<string>;
    onToggle: (val: string) => void;
    searchable?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = useMemo(() =>
        options.filter(o => o.toLowerCase().includes(search.toLowerCase())),
        [options, search]
    );

    const selectedCount = selected.size;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                    selectedCount > 0
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
            >
                <span>{label}</span>
                {selectedCount > 0 && (
                    <span className="bg-white/20 text-inherit px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{selectedCount}</span>
                )}
                <svg className={cn("h-3 w-3 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[200px] max-w-[280px] bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                    {searchable && (
                        <div className="p-2 border-b border-border">
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 outline-none focus:border-primary"
                            />
                        </div>
                    )}
                    <div className="max-h-56 overflow-y-auto py-1">
                        {filtered.length === 0 && (
                            <p className="text-xs text-muted-foreground px-3 py-2 text-center">No results</p>
                        )}
                        {filtered.map(opt => (
                            <label
                                key={opt}
                                className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.has(opt)}
                                    onChange={() => onToggle(opt)}
                                    className="h-3.5 w-3.5 accent-primary cursor-pointer"
                                />
                                <span className="text-xs font-medium text-foreground">
                                    {highlight(opt, search)}
                                </span>
                            </label>
                        ))}
                    </div>
                    {selectedCount > 0 && (
                        <div className="px-3 py-2 border-t border-border">
                            <button
                                type="button"
                                onClick={() => filtered.forEach(o => selected.has(o) && onToggle(o))}
                                className="text-[11px] text-muted-foreground hover:text-destructive font-semibold transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ERPAvailableStockSummaryReportPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(true);

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);

    const getFiscalYearStart = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0 = Jan, 6 = July
        const fyYear = month >= 6 ? year : year - 1;
        return new Date(fyYear, 6, 1);
    };

    const [dateRange, setDateRange] = useState<DateRange>({
        from: getFiscalYearStart(),
        to: new Date(),
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [reportType, setReportType] = useState<"merged" | "separate">("separate");

    // Client-side attribute & multi-select filters
    const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
    const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
    const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
    const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
    const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
    const [filterColors, setFilterColors] = useState<Set<string>>(new Set());

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

    // Excel Export Queue States (Hierarchy)
    const [exportJobId, setExportJobId] = useState<string | null>(null);
    const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [exportProgress, setExportProgress] = useState<number>(0);

    // Excel Export Queue States (Flat)
    const [flatExportJobId, setFlatExportJobId] = useState<string | null>(null);
    const [flatExportState, setFlatExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [flatExportProgress, setFlatExportProgress] = useState<number>(0);

    // PDF Export Queue States
    const [pdfJobId, setPdfJobId] = useState<string | null>(null);
    const [pdfExportState, setPdfExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [pdfExportProgress, setPdfExportProgress] = useState<number>(0);

    const summaryOnly = !groupingLevels.variant;

    // Fetch Outlets/Locations on mount
    useEffect(() => {
        async function fetchLocationsList() {
            setIsLoadingLocations(true);
            try {
                const res = await getLocations();
                if (res && res.status && Array.isArray(res.data)) {
                    setLocations(res.data);
                }
            } catch (err) {
                console.error("Error fetching locations:", err);
                toast.error("Failed to load locations list");
            } finally {
                setIsLoadingLocations(false);
            }
        }
        fetchLocationsList();
    }, []);

    // Fetch Warehouses on mount
    useEffect(() => {
        async function fetchWarehousesList() {
            try {
                const data = await getWarehouses();
                if (Array.isArray(data)) {
                    setWarehouses(data);
                }
            } catch (err) {
                console.error("Error fetching warehouses:", err);
            }
        }
        fetchWarehousesList();
    }, []);

    // Format location options for MultiSelect
    const locationOptions: MultiSelectOption[] = useMemo(() => {
        return locations.map((loc) => ({
            value: loc.id,
            label: loc.name,
            description: loc.code ? `Code: ${loc.code}` : undefined,
        }));
    }, [locations]);

    // Format warehouse options for MultiSelect
    const warehouseOptions: MultiSelectOption[] = useMemo(() => {
        return warehouses.map((wh) => ({
            value: wh.id,
            label: wh.name,
            description: wh.code ? `Code: ${wh.code}` : undefined,
        }));
    }, [warehouses]);

    const locationParam = useMemo(() => {
        return selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined;
    }, [selectedLocationIds]);

    const warehouseParam = useMemo(() => {
        return selectedWarehouseIds.length > 0 ? selectedWarehouseIds.join(",") : undefined;
    }, [selectedWarehouseIds]);

    const [previewJobId, setPreviewJobId] = useState<string | null>(null);
    const [isQueueingJob, setIsQueueingJob] = useState(false);
    const [isFetchingResult, setIsFetchingResult] = useState(false);
    const activeJobIdRef = useRef<string | null>(null);

    const sseState = useReportSse(previewJobId);

    const fetchReport = useCallback(() => {
        if (!dateRange.from || !dateRange.to) return;
        setIsQueueingJob(true);
        setIsFetchingResult(false);
        setPreviewJobId(null);

        startTransition(async () => {
            const queueRes = await queueAvailableStockSummaryPreview({
                locationId: locationParam,
                warehouseId: warehouseParam,
                startDate: dateRange.from?.toISOString(),
                endDate: dateRange.to?.toISOString(),
                reportType,
                summaryOnly: false,
                showBrand: true,
                showDivision: true,
                showCategory: true,
                showGender: true,
                showSilhouette: true,
                showArticle: true,
                showVariant: true,
            });

            setIsQueueingJob(false);

            if (queueRes && queueRes.status && queueRes.data?.jobId) {
                const newJobId = queueRes.data.jobId;
                activeJobIdRef.current = newJobId;
                setPreviewJobId(newJobId);
            } else {
                toast.error("Failed to queue report preview");
            }
        });
    }, [locationParam, warehouseParam, dateRange, reportType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReport();
        }, 400);
        return () => clearTimeout(timer);
    }, [dateRange, reportType]);

    // Handle SSE completion to fetch GZIP report result with loading state & silent filter change handling
    useEffect(() => {
        if (sseState.status === "completed" && previewJobId && activeJobIdRef.current === previewJobId) {
            setIsFetchingResult(true);
            const targetJobId = previewJobId;

            getAvailableStockSummaryResult(targetJobId)
                .then((res) => {
                    if (activeJobIdRef.current !== targetJobId) return;
                    setIsFetchingResult(false);

                    if (res && res.status !== false && res.data) {
                        const rootData = Array.isArray(res.data?.root)
                            ? res.data.root
                            : (Array.isArray(res.data) ? res.data : []);
                        setReportData(rootData);
                    } else {
                        if (activeJobIdRef.current === targetJobId) {
                            setReportData([]);
                            toast.error("Failed to load completed report preview data");
                        }
                    }
                })
                .catch(() => {
                    if (activeJobIdRef.current === targetJobId) {
                        setIsFetchingResult(false);
                    }
                });
        }
    }, [sseState.status, previewJobId]);

    // Poll Hierarchy Excel Export Job Status
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
                        toast.success("Hierarchy Excel Export processed successfully! Ready to download.");
                        clearInterval(interval);
                    } else if (state === "failed") {
                        setExportState("failed");
                        toast.error("Background Hierarchy Excel export processing failed.");
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

    // Poll Flat Excel Export Job Status
    useEffect(() => {
        if (flatExportState !== "queueing" && flatExportState !== "processing") return;
        if (!flatExportJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getAvailableStockSummaryReportExportStatus(flatExportJobId);
                if (res && res.status) {
                    const { state, progress } = res.data || {};
                    setFlatExportProgress(progress || 0);

                    if (state === "completed") {
                        setFlatExportState("completed");
                        toast.success("Flat Excel Export processed successfully! Ready to download.");
                        clearInterval(interval);
                    } else if (state === "failed") {
                        setFlatExportState("failed");
                        toast.error("Background Flat Excel export processing failed.");
                        clearInterval(interval);
                    } else {
                        setFlatExportState("processing");
                    }
                }
            } catch (err) {
                console.error("Error polling flat job status:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [flatExportState, flatExportJobId]);

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

    const handleExportExcelClick = async (exportType: "hierarchical" | "flat" = "hierarchical") => {
        if (!dateRange.from || !dateRange.to) return;

        if (exportType === "flat") {
            if (flatExportState === "completed" && flatExportJobId) {
                const base = getApiBaseUrl();
                const url = `${base}/stock-ledger/available-stock-summary/export/${flatExportJobId}/download`;
                window.open(url, "_blank");

                setFlatExportState("idle");
                setFlatExportJobId(null);
                setFlatExportProgress(0);
                return;
            }

            setFlatExportState("queueing");
            try {
                const res = await queueAvailableStockSummaryReportExport({
                    locationId: locationParam,
                    warehouseId: warehouseParam,
                    startDate: dateRange.from.toISOString(),
                    endDate: dateRange.to.toISOString(),
                    format: "xlsx",
                    exportType: "flat",
                    reportType,
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
                    setFlatExportJobId(res.data.jobId);
                    setFlatExportState("processing");
                    setFlatExportProgress(5);
                    toast.info("Background Flat Excel generation queued.");
                } else {
                    setFlatExportState("failed");
                    toast.error(res.message || "Failed to queue export job.");
                }
            } catch (err) {
                setFlatExportState("failed");
                console.error(err);
                toast.error("Failed to queue export job.");
            }
            return;
        }

        if (exportState === "completed" && exportJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/stock-ledger/available-stock-summary/export/${exportJobId}/download`;
            window.open(url, "_blank");

            setExportState("idle");
            setExportJobId(null);
            setExportProgress(0);
            return;
        }

        setExportState("queueing");
        try {
            const res = await queueAvailableStockSummaryReportExport({
                locationId: locationParam,
                warehouseId: warehouseParam,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
                format: "xlsx",
                exportType: "hierarchical",
                reportType,
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
                toast.info("Background Hierarchy Excel generation queued.");
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
        if (!dateRange.from || !dateRange.to) return;

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
                locationId: locationParam,
                warehouseId: warehouseParam,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
                format: "pdf",
                reportType,
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

    // Parse search text into tokens (supporting spaces, commas, newlines copied from Excel)
    const searchTokens = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchQuery
            .split(/[\r\n,;\s]+/)
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);
    }, [searchQuery]);

    // Extract filter options dynamically from reportData tree
    const filterOptions = useMemo(() => {
        const brands = new Set<string>();
        const divisions = new Set<string>();
        const categories = new Set<string>();
        const genders = new Set<string>();
        const silhouettes = new Set<string>();
        const sizes = new Set<string>();
        const colors = new Set<string>();

        const walk = (node: any) => {
            if (!node) return;
            if (node.level === 'brand' && node.value) brands.add(String(node.value));
            if (node.level === 'division' && node.value) divisions.add(String(node.value));
            if (node.level === 'category' && node.value) categories.add(String(node.value));
            if (node.level === 'gender' && node.value) genders.add(String(node.value));
            if (node.level === 'silhouette' && node.value) silhouettes.add(String(node.value));
            if (node.size && node.size !== 'Default') sizes.add(String(node.size));
            if (node.color && node.color !== 'Default') colors.add(String(node.color));

            if (Array.isArray(node.children)) {
                for (const child of node.children) walk(child);
            }
        };

        if (Array.isArray(reportData)) {
            for (const node of reportData) walk(node);
        }

        return {
            brands: Array.from(brands).sort(),
            divisions: Array.from(divisions).sort(),
            categories: Array.from(categories).sort(),
            genders: Array.from(genders).sort(),
            silhouettes: Array.from(silhouettes).sort(),
            sizes: Array.from(sizes).sort(),
            colors: Array.from(colors).sort(),
        };
    }, [reportData]);

    const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) => {
        setter(prev => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val); else next.add(val);
            return next;
        });
    };

    const hasActiveFilters =
        searchTokens.length > 0 ||
        filterBrands.size > 0 ||
        filterDivisions.size > 0 ||
        filterGenders.size > 0 ||
        filterSilhouettes.size > 0 ||
        filterCategories.size > 0 ||
        filterSizes.size > 0 ||
        filterColors.size > 0;

    const clearAllFilters = () => {
        setSearchQuery("");
        setFilterBrands(new Set());
        setFilterDivisions(new Set());
        setFilterGenders(new Set());
        setFilterSilhouettes(new Set());
        setFilterCategories(new Set());
        setFilterSizes(new Set());
        setFilterColors(new Set());
    };

    // Advanced Hierarchical Client-Side Filtration Engine (Zero API hits on filter change!)
    const filteredReportData = useMemo(() => {
        if (!Array.isArray(reportData)) return [];

        const hasTokens = searchTokens.length > 0;

        const filterNode = (node: any, currentContext: {
            brand?: string;
            division?: string;
            category?: string;
            gender?: string;
            silhouette?: string;
        }): any => {
            if (!node) return null;

            const ctx = { ...currentContext };
            if (node.level === 'brand' && node.value) ctx.brand = String(node.value);
            if (node.level === 'division' && node.value) ctx.division = String(node.value);
            if (node.level === 'category' && node.value) ctx.category = String(node.value);
            if (node.level === 'gender' && node.value) ctx.gender = String(node.value);
            if (node.level === 'silhouette' && node.value) ctx.silhouette = String(node.value);

            // Filter checks by dropdown selection
            if (ctx.brand && filterBrands.size > 0 && !filterBrands.has(ctx.brand)) return null;
            if (ctx.division && filterDivisions.size > 0 && !filterDivisions.has(ctx.division)) return null;
            if (ctx.category && filterCategories.size > 0 && !filterCategories.has(ctx.category)) return null;
            if (ctx.gender && filterGenders.size > 0 && !filterGenders.has(ctx.gender)) return null;
            if (ctx.silhouette && filterSilhouettes.size > 0 && !filterSilhouettes.has(ctx.silhouette)) return null;

            if (node.level === 'variant' || node.size || node.color) {
                if (node.size && filterSizes.size > 0 && !filterSizes.has(node.size)) return null;
                if (node.color && filterColors.size > 0 && !filterColors.has(node.color)) return null;
            }

            // Check search text tokens
            let tokenMatched = !hasTokens;
            if (hasTokens) {
                const targetText = [
                    node.value, node.sku, node.articleName, node.color, node.size, node.barCode,
                    ctx.brand, ctx.division, ctx.category, ctx.gender, ctx.silhouette
                ].filter(Boolean).join(" ").toLowerCase();

                tokenMatched = searchTokens.some(token => targetText.includes(token));
            }

            // Recursive check on children
            let filteredChildren: any[] = [];
            if (Array.isArray(node.children) && node.children.length > 0) {
                filteredChildren = node.children
                    .map((child: any) => filterNode(child, ctx))
                    .filter(Boolean);
            }

            if (tokenMatched || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children,
                };
            }

            return null;
        };

        return reportData.map(node => filterNode(node, {})).filter(Boolean);
    }, [
        reportData, searchTokens, filterBrands, filterDivisions, filterCategories,
        filterGenders, filterSilhouettes, filterSizes, filterColors
    ]);

    // Calculate Grand Totals (based on filtered data!)
    const grandTotals = useMemo(() => {
        const t = {
            totalArticles: 0,
            quantity: 0,
            transit: 0,
            reserved: 0,
            total: 0,
            value: 0,
        };

        if (!Array.isArray(filteredReportData)) return t;

        for (const node of filteredReportData) {
            if (!node || !node.totals) continue;
            t.quantity += node.totals.quantity || 0;
            t.transit += node.totals.transit || 0;
            t.reserved += node.totals.reserved || 0;
            t.total += node.totals.total || 0;
            t.value += node.totals.value || 0;
        }

        const countArticles = (node: any) => {
            if (!node) return;
            if (node.level === 'article') {
                t.totalArticles += 1;
            }
            if (Array.isArray(node.children) && node.children.length > 0) {
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
                if (groupingLevels.article) {
                    rows.push({
                        id: `art-${node.sku}`,
                        type: 'article',
                        label: node.articleName,
                        sku: node.sku,
                        totals: node.totals,
                    });
                }
            } else if (node.level === 'variant') {
                if (groupingLevels.variant) {
                    rows.push({
                        id: `var-${currentPath}`,
                        type: 'variant',
                        color: node.color,
                        size: node.size,
                        barCode: node.barCode || node.barcode || node.sku || '',
                        totals: node.totals,
                    });
                }
            } else {
                const levelKey = node.level as keyof typeof groupingLevels;
                if (levelKey in groupingLevels ? groupingLevels[levelKey] : true) {
                    rows.push({
                        id: `${node.level}-${currentPath}`,
                        type: node.level,
                        label: `${node.value ? String(node.value).toUpperCase() : ''}`,
                        totals: node.totals,
                    });
                }
            }

            if (Array.isArray(node.children) && node.children.length > 0) {
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
            case "completed": return "Download Excel (Hierarchy)";
            case "failed": return "Retry Excel (Hierarchy)";
            case "idle":
            default: return "Export Excel (Hierarchy)";
        }
    };

    const getFlatExportButtonText = () => {
        switch (flatExportState) {
            case "queueing": return "Queueing...";
            case "processing": return `Generating ${flatExportProgress}%`;
            case "completed": return "Download Excel (Flat)";
            case "failed": return "Retry Excel (Flat)";
            case "idle":
            default: return "Export Excel (Flat)";
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

    const getSelectedLocationText = () => {
        const parts: string[] = [];
        if (selectedWarehouseIds.length === 1) {
            const match = warehouses.find(w => w.id === selectedWarehouseIds[0]);
            parts.push(match ? match.name : "1 Warehouse");
        } else if (selectedWarehouseIds.length > 1) {
            parts.push(`${selectedWarehouseIds.length} Warehouses`);
        }
        if (selectedLocationIds.length === 1) {
            const match = locations.find(l => l.id === selectedLocationIds[0]);
            parts.push(match ? match.name : "1 Outlet");
        } else if (selectedLocationIds.length > 1) {
            parts.push(`${selectedLocationIds.length} Outlets`);
        }
        return parts.length > 0 ? parts.join(" | ") : "All Warehouses & Outlets";
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        ERP Available Stock Summary
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                        <Store className="h-4 w-4 text-primary/70" />
                        Stock Balance & Valuation report for <span className="text-foreground font-semibold">{getSelectedLocationText()}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant={pdfExportState === "completed" ? "default" : "outline"}
                        onClick={handleExportPdfClick}
                        disabled={pdfExportState === "queueing" || pdfExportState === "processing"}
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
                        onClick={() => handleExportExcelClick("hierarchical")}
                        disabled={exportState === "queueing" || exportState === "processing"}
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
                    <Button
                        variant={flatExportState === "completed" ? "default" : "outline"}
                        onClick={() => handleExportExcelClick("flat")}
                        disabled={flatExportState === "queueing" || flatExportState === "processing"}
                        className={cn(
                            "gap-2 font-semibold transition-all",
                            flatExportState === "completed"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-none"
                                : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        )}
                    >
                        {flatExportState === "queueing" || flatExportState === "processing" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        {getFlatExportButtonText()}
                    </Button>
                </div>
            </div>

            <ReportQueueProgress
                jobId={previewJobId || (isQueueingJob ? "queueing-temp-id" : null)}
                status={isQueueingJob ? "queued" : isFetchingResult ? "processing" : sseState.status}
                progressPercent={
                    isQueueingJob
                        ? 5
                        : isFetchingResult
                        ? 95
                        : sseState.progressPercent
                }
                message={
                    isQueueingJob
                        ? "Submitting report calculation job to background queue..."
                        : isFetchingResult
                        ? "Downloading and rendering report table..."
                        : sseState.message
                }
                queuePosition={sseState.queuePosition}
                waitingCount={sseState.waitingCount}
                failedReason={sseState.failedReason}
                title="POS Available Stock Summary Report"
            />

            {/* Print Header */}
            <div className="hidden print:block mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-center text-slate-900">Available Stock Summary</h1>
                <p className="text-sm text-center text-slate-600 mt-1">Locations: {getSelectedLocationText()}</p>
                <p className="text-xs text-center text-slate-500">
                    As of: {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "Today"}
                </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-end justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 border p-4 rounded-xl shadow-sm no-print">
                <div className="flex flex-wrap items-end gap-4 flex-1">
                    {/* Warehouse selector (MultiSelect in ERP) */}
                    <div className="flex flex-col gap-1.5 min-w-[240px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Package className="h-3.5 w-3.5 text-primary" />
                            Select Warehouses
                        </span>
                        <MultiSelect
                            options={warehouseOptions}
                            value={selectedWarehouseIds}
                            onValueChange={setSelectedWarehouseIds}
                            placeholder="All Warehouses"
                            className="bg-background"
                        />
                    </div>

                    {/* Location selector (MultiSelect in ERP) */}
                    <div className="flex flex-col gap-1.5 min-w-[240px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Store className="h-3.5 w-3.5 text-primary" />
                            Select Outlets / Stores
                        </span>
                        <MultiSelect
                            options={locationOptions}
                            value={selectedLocationIds}
                            onValueChange={setSelectedLocationIds}
                            placeholder="All Outlets"
                            className="bg-background"
                        />
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

                    {/* Report Mode Toggle: Merged vs Separate */}
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            Stock View Mode
                        </span>
                        <div className="flex items-center p-1 bg-background border border-slate-200 dark:border-slate-800 rounded-lg h-10">
                            <Button
                                type="button"
                                variant={reportType === "merged" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setReportType("merged")}
                                className="flex-1 h-8 text-xs font-semibold"
                            >
                                Merged
                            </Button>
                            <Button
                                type="button"
                                variant={reportType === "separate" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setReportType("separate")}
                                className="flex-1 h-8 text-xs font-semibold"
                            >
                                Separate
                            </Button>
                        </div>
                    </div>

                    {/* Multi-Item Search Bar */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[280px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <Search className="h-3.5 w-3.5 text-primary" />
                            Multi-Item Search / Paste Barcodes
                        </span>
                        <div className="relative">
                            <textarea
                                rows={searchTokens.length > 1 ? 2 : 1}
                                placeholder="Search or paste multiple Barcodes/SKUs (space, comma, or newline)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-xs pl-8 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background outline-none focus:border-primary transition-all resize-none font-mono"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center pointer-events-none text-muted-foreground">
                                <Search className="h-3.5 w-3.5" />
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute top-2.5 right-2.5 flex items-center text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        {searchTokens.length > 1 && (
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-1">
                                <span className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                                    {searchTokens.length} Barcodes / SKUs pasted
                                </span>
                                <span>Multi-item search active</span>
                            </div>
                        )}
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

            {/* ── Client-Side Multi-Attribute Autocomplete Filters ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 no-print">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                        Quick Filters:
                    </span>

                    {/* Autocomplete dropdowns */}
                    {filterOptions.brands.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Brand"
                            options={filterOptions.brands}
                            selected={filterBrands}
                            onToggle={v => toggleFilter(setFilterBrands, v)}
                        />
                    )}
                    {filterOptions.divisions.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Division"
                            options={filterOptions.divisions}
                            selected={filterDivisions}
                            onToggle={v => toggleFilter(setFilterDivisions, v)}
                        />
                    )}
                    {filterOptions.categories.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Category"
                            options={filterOptions.categories}
                            selected={filterCategories}
                            onToggle={v => toggleFilter(setFilterCategories, v)}
                        />
                    )}
                    {filterOptions.genders.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Gender"
                            options={filterOptions.genders}
                            selected={filterGenders}
                            onToggle={v => toggleFilter(setFilterGenders, v)}
                        />
                    )}
                    {filterOptions.silhouettes.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Silhouette"
                            options={filterOptions.silhouettes}
                            selected={filterSilhouettes}
                            onToggle={v => toggleFilter(setFilterSilhouettes, v)}
                        />
                    )}
                    {filterOptions.sizes.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Size"
                            options={filterOptions.sizes}
                            selected={filterSizes}
                            onToggle={v => toggleFilter(setFilterSizes, v)}
                        />
                    )}
                    {filterOptions.colors.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Color"
                            options={filterOptions.colors}
                            selected={filterColors}
                            onToggle={v => toggleFilter(setFilterColors, v)}
                        />
                    )}

                    {hasActiveFilters && (
                        <>
                            <div className="h-5 w-px bg-border hidden sm:block" />
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center gap-1 text-[11px] font-bold text-destructive hover:text-destructive/80 transition-colors"
                            >
                                <X className="h-3 w-3" />
                                Clear Filters
                            </button>
                        </>
                    )}

                    <div className="ml-auto text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        {hasActiveFilters ? (
                            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                                {filteredReportData.length} / {reportData.length} nodes active
                            </span>
                        ) : (
                            <span>{flatRows.filter(r => r.type === 'article').length} articles loaded</span>
                        )}
                    </div>
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                        {searchTokens.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                                {searchTokens.length === 1 
                                    ? `Search: "${searchTokens[0]}"` 
                                    : `Multi Search (${searchTokens.length} tokens)`}
                                <button onClick={() => setSearchQuery("")} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        )}
                        {Array.from(filterBrands).map(b => (
                            <span key={`b-${b}`} className="inline-flex items-center gap-1 text-[11px] bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                                Brand: {b}
                                <button onClick={() => toggleFilter(setFilterBrands, b)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                        {Array.from(filterDivisions).map(d => (
                            <span key={`d-${d}`} className="inline-flex items-center gap-1 text-[11px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                                Division: {d}
                                <button onClick={() => toggleFilter(setFilterDivisions, d)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                        {Array.from(filterCategories).map(c => (
                            <span key={`c-${c}`} className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                                Category: {c}
                                <button onClick={() => toggleFilter(setFilterCategories, c)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                        {Array.from(filterGenders).map(g => (
                            <span key={`g-${g}`} className="inline-flex items-center gap-1 text-[11px] bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-semibold">
                                Gender: {g}
                                <button onClick={() => toggleFilter(setFilterGenders, g)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                        {Array.from(filterSilhouettes).map(s => (
                            <span key={`s-${s}`} className="inline-flex items-center gap-1 text-[11px] bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                                Silhouette: {s}
                                <button onClick={() => toggleFilter(setFilterSilhouettes, s)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                        {Array.from(filterSizes).map(s => (
                            <span key={`sz-${s}`} className="inline-flex items-center gap-1 text-[11px] bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-700 dark:text-fuchsia-300 px-2 py-0.5 rounded-full font-semibold">
                                Size: {s}
                                <button onClick={() => toggleFilter(setFilterSizes, s)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                        {Array.from(filterColors).map(cl => (
                            <span key={`cl-${cl}`} className="inline-flex items-center gap-1 text-[11px] bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                                Color: {cl}
                                <button onClick={() => toggleFilter(setFilterColors, cl)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                            </span>
                        ))}
                    </div>
                )}
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5 no-print">
                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Products</p>
                            <h3 className="text-lg font-bold mt-0.5 text-slate-800 dark:text-slate-100">{grandTotals.totalArticles}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                            <Layers className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Available Qty</p>
                            <h3 className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{formatVal(grandTotals.quantity)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                            <Inbox className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">In Transit</p>
                            <h3 className="text-lg font-bold mt-0.5 text-amber-600 dark:text-amber-500">{formatVal(grandTotals.transit)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                            <Truck className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Stock Reserved</p>
                            <h3 className="text-lg font-bold mt-0.5 text-purple-600 dark:text-purple-400">{formatVal(grandTotals.reserved)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
                            <Folder className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Qty</p>
                            <h3 className="text-lg font-bold mt-0.5 text-slate-800 dark:text-slate-100">{formatVal(grandTotals.total)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-slate-100 dark:bg-slate-800 text-slate-600">
                            <ShoppingCart className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Valuation</p>
                            <h3 className="text-lg font-bold mt-0.5 text-indigo-600 dark:text-indigo-400">{formatPriceVal(grandTotals.value)}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                            <Coins className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Virtualized Report Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-card overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center no-print">
                    <div className="text-xs font-semibold text-muted-foreground">
                        Showing <span className="font-bold text-foreground">{flatRows.length}</span> aggregated rows
                    </div>
                </div>

                <div ref={parentRef} className="h-[600px] overflow-auto relative">
                    <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                        <thead className="bg-slate-800 text-slate-100 sticky top-0 z-10 shadow-xs">
                            <tr>
                                <th className="p-2.5 font-bold uppercase tracking-wider w-[28%]">GPC / Category / Product</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-center w-[7%]">Size</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-center w-[9%]">Color</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-right w-[10%]">Quantity</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-right w-[8%]">In Transit</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-right w-[9%] text-purple-300">Stock Reserved</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-right w-[9%]">Total</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-right w-[8%]">Selling Price</th>
                                <th className="p-2.5 font-bold uppercase tracking-wider text-right w-[12%]">Value (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isPending ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>Loading Available Stock Summary Report...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : flatRows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-muted-foreground font-medium">
                                        No available stock records found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {paddingTop > 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ height: `${paddingTop}px` }} />
                                        </tr>
                                    )}
                                    {virtualItems.map((virtualRow) => {
                                        const row = flatRows[virtualRow.index];
                                        const val = row.totals || {};

                                        if (row.type === 'location') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-amber-950 text-amber-100 font-extrabold text-[13px] border-b-2 border-amber-800">
                                                    <td colSpan={3} className="p-3 pl-3 text-amber-300 uppercase tracking-wider">
                                                        <div className="flex items-center gap-2">
                                                            <Store className="h-4 w-4 text-amber-400 shrink-0" />
                                                            <span>LOCATION: {row.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right text-emerald-400 font-black">{formatVal(val.quantity)}</td>
                                                    <td className="p-3 text-right text-amber-400 font-black">{formatVal(val.transit)}</td>
                                                    <td className="p-3 text-right text-purple-300 font-black">{formatVal(val.reserved)}</td>
                                                    <td className="p-3 text-right text-white font-black">{formatVal(val.total)}</td>
                                                    <td className="p-3 text-right text-slate-400">-</td>
                                                    <td className="p-3 text-right text-indigo-300 font-black">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'brand') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-900 text-slate-100 font-extrabold text-[12px] border-b border-slate-800">
                                                    <td colSpan={3} className="p-2.5 pl-3 text-indigo-300">
                                                        BRAND: {row.label}
                                                    </td>
                                                    <td className="p-2.5 text-right">{formatVal(val.quantity)}</td>
                                                    <td className="p-2.5 text-right">{formatVal(val.transit)}</td>
                                                    <td className="p-2.5 text-right text-purple-300">{formatVal(val.reserved)}</td>
                                                    <td className="p-2.5 text-right text-emerald-400 font-black">{formatVal(val.total)}</td>
                                                    <td className="p-2.5 text-right text-slate-400">-</td>
                                                    <td className="p-2.5 text-right text-indigo-300 font-black">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'division') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-800 text-slate-100 font-bold text-[11px] border-b border-slate-700">
                                                    <td colSpan={3} className="p-2 pl-6 text-blue-300">
                                                        DIVISION: {row.label}
                                                    </td>
                                                    <td className="p-2 text-right">{formatVal(val.quantity)}</td>
                                                    <td className="p-2 text-right">{formatVal(val.transit)}</td>
                                                    <td className="p-2 text-right text-purple-300">{formatVal(val.reserved)}</td>
                                                    <td className="p-2 text-right font-extrabold">{formatVal(val.total)}</td>
                                                    <td className="p-2 text-right text-slate-400">-</td>
                                                    <td className="p-2 text-right font-extrabold">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'category') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-700 text-slate-100 font-semibold text-[11px] border-b border-slate-600">
                                                    <td colSpan={3} className="p-2 pl-9 text-emerald-300">
                                                        CATEGORY: {row.label}
                                                    </td>
                                                    <td className="p-2 text-right">{formatVal(val.quantity)}</td>
                                                    <td className="p-2 text-right">{formatVal(val.transit)}</td>
                                                    <td className="p-2 text-right text-purple-300">{formatVal(val.reserved)}</td>
                                                    <td className="p-2 text-right font-bold">{formatVal(val.total)}</td>
                                                    <td className="p-2 text-right text-slate-400">-</td>
                                                    <td className="p-2 text-right font-bold">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'gender') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-600 text-slate-100 font-medium text-[11px] border-b border-slate-500">
                                                    <td colSpan={3} className="p-2 pl-12 text-rose-200">
                                                        GENDER: {row.label}
                                                    </td>
                                                    <td className="p-2 text-right">{formatVal(val.quantity)}</td>
                                                    <td className="p-2 text-right">{formatVal(val.transit)}</td>
                                                    <td className="p-2 text-right text-purple-300">{formatVal(val.reserved)}</td>
                                                    <td className="p-2 text-right font-bold">{formatVal(val.total)}</td>
                                                    <td className="p-2 text-right text-slate-400">-</td>
                                                    <td className="p-2 text-right font-bold">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'silhouette') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-500 text-slate-100 font-medium text-[11px] border-b border-slate-400">
                                                    <td colSpan={3} className="p-2 pl-16 text-amber-200">
                                                        SILHOUETTE: {row.label}
                                                    </td>
                                                    <td className="p-2 text-right">{formatVal(val.quantity)}</td>
                                                    <td className="p-2 text-right">{formatVal(val.transit)}</td>
                                                    <td className="p-2 text-right text-purple-300">{formatVal(val.reserved)}</td>
                                                    <td className="p-2 text-right font-bold">{formatVal(val.total)}</td>
                                                    <td className="p-2 text-right text-slate-400">-</td>
                                                    <td className="p-2 text-right font-bold">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'article') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700/60">
                                                    <td className="p-2 pl-20 font-mono text-xs">
                                                        SKU: <span className="text-primary">{row.sku}</span> ({row.label})
                                                    </td>
                                                    <td className="p-2 text-center text-muted-foreground font-normal">ALL SIZES</td>
                                                    <td className="p-2 text-center text-muted-foreground font-normal">ALL COLORS</td>
                                                    <td className="p-2 text-right">{formatVal(val.quantity)}</td>
                                                    <td className="p-2 text-right">{formatVal(val.transit)}</td>
                                                    <td className="p-2 text-right text-purple-600 dark:text-purple-400">{formatVal(val.reserved)}</td>
                                                    <td className="p-2 text-right text-primary font-bold">{formatVal(val.total)}</td>
                                                    <td className="p-2 text-right text-slate-700 dark:text-slate-350 font-medium">{formatPriceVal(val.unitPrice)}</td>
                                                    <td className="p-2 text-right font-extrabold text-indigo-600 dark:text-indigo-400">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        if (row.type === 'variant') {
                                            return (
                                                <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-background hover:bg-slate-50 dark:hover:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                    <td className="p-2 pl-24 flex flex-col gap-0.5">
                                                        <span className="italic text-muted-foreground">&mdash; Variant Detail</span>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            Barcode: <span className="font-bold text-foreground">{row.barCode || '—'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-center font-bold text-foreground">{row.size}</td>
                                                    <td className="p-2 text-center font-medium">{row.color}</td>
                                                    <td className="p-2 text-right text-foreground">{formatVal(val.quantity)}</td>
                                                    <td className="p-2 text-right text-amber-600 dark:text-amber-500 font-medium">{formatVal(val.transit)}</td>
                                                    <td className="p-2 text-right text-purple-600 dark:text-purple-400 font-medium">{formatVal(val.reserved)}</td>
                                                    <td className="p-2 text-right font-bold text-foreground">{formatVal(val.total)}</td>
                                                    <td className="p-2 text-right text-muted-foreground">-</td>
                                                    <td className="p-2 text-right font-semibold text-foreground">{formatPriceVal(val.value)}</td>
                                                </tr>
                                            );
                                        }

                                        return null;
                                    })}
                                    {paddingBottom > 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ height: `${paddingBottom}px` }} />
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                        {flatRows.length > 0 && (
                            <tfoot className="bg-slate-900 text-slate-100 font-extrabold text-xs sticky bottom-0 z-10 border-t-2 border-slate-900 shadow-md">
                                <tr>
                                    <td colSpan={3} className="p-3 pl-4 text-emerald-400 uppercase tracking-wide">GRAND TOTALS</td>
                                    <td className="p-3 text-right text-emerald-400 text-sm">{formatVal(grandTotals.quantity)}</td>
                                    <td className="p-3 text-right text-amber-400 text-sm">{formatVal(grandTotals.transit)}</td>
                                    <td className="p-3 text-right text-purple-300 text-sm">{formatVal(grandTotals.reserved)}</td>
                                    <td className="p-3 text-right text-white text-sm font-black">{formatVal(grandTotals.total)}</td>
                                    <td className="p-3 text-right text-slate-400">-</td>
                                    <td className="p-3 text-right text-indigo-300 text-sm font-black">{formatPriceVal(grandTotals.value)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
