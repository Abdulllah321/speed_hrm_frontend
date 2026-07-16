"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
    getStockTransactionDetailReport,
    queueStockTransactionDetailReportExport,
    getStockTransactionDetailReportExportStatus
} from "@/lib/actions/stock-ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Download,
    Printer,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Store,
    Layers,
    ShoppingCart,
    Inbox,
    RefreshCw,
    Folder,
    Settings,
    Clock,
    Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, COMPANY_NAME, getApiBaseUrl } from "@/lib/utils";
import Link from "next/link";

// ─── Highlight helper ──────────────────────────────────────────────────────────
function highlight(text: string, query: string) {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
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

export default function StockTransactionDetailReportPage() {
    const { user } = useAuth();
    const locationId = user?.terminal?.location?.id || user?.locationId;
    const locationName = user?.terminal?.location?.name || "Store";

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
        variant: false,
    });

    const [reportData, setReportData] = useState<any[]>([]);
    const [grandTotals, setGrandTotals] = useState({ openingBalance: 0, closingBalance: 0, inTransitQty: 0 });
    const [isPending, startTransition] = useTransition();

    // Excel Export Queue States
    const [exportJobId, setExportJobId] = useState<string | null>(null);
    const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [exportProgress, setExportProgress] = useState<number>(0);

    // PDF Export Queue States
    const [pdfJobId, setPdfJobId] = useState<string | null>(null);
    const [pdfExportState, setPdfExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [pdfExportProgress, setPdfExportProgress] = useState<number>(0);

    const showVariant = groupingLevels.variant;

    // Frontend filters
    const [searchText, setSearchText] = useState("");
    const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
    const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
    const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
    const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());

    const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) => {
        setter(prev => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val); else next.add(val);
            return next;
        });
    };

    const hasActiveFilters =
        searchText.trim() !== "" ||
        filterBrands.size > 0 ||
        filterDivisions.size > 0 ||
        filterGenders.size > 0 ||
        filterSilhouettes.size > 0 ||
        filterCategories.size > 0;

    const clearAllFilters = () => {
        setSearchText("");
        setFilterBrands(new Set());
        setFilterDivisions(new Set());
        setFilterGenders(new Set());
        setFilterSilhouettes(new Set());
        setFilterCategories(new Set());
    };

    const fetchReport = useCallback(() => {
        if (!locationId || !dateRange.from || !dateRange.to) return;
        startTransition(async () => {
            const result = await getStockTransactionDetailReport({
                locationId,
                startDate: dateRange.from?.toISOString(),
                endDate: dateRange.to?.toISOString(),
                showBrand: groupingLevels.brand,
                showDivision: groupingLevels.division,
                showCategory: groupingLevels.category,
                showGender: groupingLevels.gender,
                showSilhouette: groupingLevels.silhouette,
                showArticle: groupingLevels.article,
                showVariant: groupingLevels.variant,
            });
            if (result && result.status !== false) {
                setReportData(result.data?.root || []);
                setGrandTotals(result.data?.grandTotals || { openingBalance: 0, closingBalance: 0, inTransitQty: 0 });
            } else {
                toast.error("Failed to load report data");
            }
        });
    }, [locationId, dateRange, groupingLevels]);

    useEffect(() => {
        fetchReport();
    }, [locationId, groupingLevels]);

    // Poll Excel Job Status
    useEffect(() => {
        if (exportState !== "queueing" && exportState !== "processing") return;
        if (!exportJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getStockTransactionDetailReportExportStatus(exportJobId);
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

    // Poll PDF Job Status
    useEffect(() => {
        if (pdfExportState !== "queueing" && pdfExportState !== "processing") return;
        if (!pdfJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getStockTransactionDetailReportExportStatus(pdfJobId);
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
        if (!locationId || !dateRange.from || !dateRange.to) return;

        if (exportState === "completed" && exportJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/stock-ledger/transaction-detail-report/export/${exportJobId}/download`;
            window.open(url, "_blank");
            
            // Reset
            setExportState("idle");
            setExportJobId(null);
            setExportProgress(0);
            return;
        }

        setExportState("queueing");
        try {
            const res = await queueStockTransactionDetailReportExport({
                locationId,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
                format: "xlsx",
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
        if (!locationId || !dateRange.from || !dateRange.to) return;

        if (pdfExportState === "completed" && pdfJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/stock-ledger/transaction-detail-report/export/${pdfJobId}/download`;
            window.open(url, "_blank");
            
            // Reset
            setPdfExportState("idle");
            setPdfJobId(null);
            setPdfExportProgress(0);
            return;
        }

        setPdfExportState("queueing");
        try {
            const res = await queueStockTransactionDetailReportExport({
                locationId,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
                format: "pdf",
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

    // Extract unique filters
    const filterOptions = useMemo(() => {
        const brands = new Set<string>();
        const divisions = new Set<string>();
        const genders = new Set<string>();
        const silhouettes = new Set<string>();
        const categories = new Set<string>();

        const walk = (node: any) => {
            if (!node) return;
            if (node.level === 'brand') brands.add(node.value);
            if (node.level === 'division') divisions.add(node.value);
            if (node.level === 'gender') genders.add(node.value);
            if (node.level === 'silhouette') silhouettes.add(node.value);
            if (node.level === 'category') categories.add(node.value);
            if (node.children) node.children.forEach(walk);
        };
        reportData.forEach(walk);

        return {
            brands: [...brands].sort(),
            divisions: [...divisions].sort(),
            genders: [...genders].sort(),
            silhouettes: [...silhouettes].sort(),
            categories: [...categories].sort(),
        };
    }, [reportData]);

    // Flatten nested tree for virtualization
    const flatRows = useMemo(() => {
        const rows: any[] = [];
        
        const visit = (node: any, path: string = "", ancestorBrand = "", ancestorDivision = "", ancestorGender = "", ancestorSilhouette = "", ancestorCategory = "") => {
            if (!node) return;
            const currentPath = path ? `${path}-${node.level}-${node.value}` : `${node.level}-${node.value}`;
            
            const brand = node.level === 'brand' ? node.value : ancestorBrand;
            const division = node.level === 'division' ? node.value : ancestorDivision;
            const gender = node.level === 'gender' ? node.value : ancestorGender;
            const silhouette = node.level === 'silhouette' ? node.value : ancestorSilhouette;
            const category = node.level === 'category' ? node.value : ancestorCategory;

            if (node.level === 'article') {
                rows.push({
                    id: `art-${node.sku}`,
                    type: 'article',
                    label: node.articleName,
                    sku: node.sku,
                    totals: node.totals,
                    brand, division, gender, silhouette, category,
                });
            } else if (node.level === 'variant') {
                rows.push({
                    id: `var-${currentPath}`,
                    type: 'variant',
                    color: node.color,
                    size: node.size,
                    totals: node.totals,
                    brand, division, gender, silhouette, category,
                });
            } else {
                rows.push({
                    id: `${node.level}-${currentPath}`,
                    type: node.level,
                    label: `${node.value.toUpperCase()}`,
                    totals: node.totals,
                    brand, division, gender, silhouette, category,
                });
            }

            if (node.transactions) {
                // Table header spacer
                rows.push({
                    id: `hdr-${currentPath}`,
                    type: 'ledger-header',
                    brand, division, gender, silhouette, category,
                });

                // Opening balance row
                rows.push({
                    id: `op-${currentPath}`,
                    type: 'opening-balance',
                    date: dateRange.from,
                    balance: node.openingBalance,
                    brand, division, gender, silhouette, category,
                });

                // Ledger transactions
                for (const t of node.transactions) {
                    rows.push({
                        id: `tx-${t.id}`,
                        type: 'transaction',
                        txId: t.id,
                        date: t.date,
                        docType: t.docType,
                        docRef: t.docRef,
                        docRefId: t.docRefId,
                        remarks: t.remarks,
                        inQty: t.inQty,
                        outQty: t.outQty,
                        balance: t.balance,
                        isInTransit: t.isInTransit,
                        brand, division, gender, silhouette, category,
                    });
                }

                // Closing balance row
                rows.push({
                    id: `cl-${currentPath}`,
                    type: 'closing-balance',
                    date: dateRange.to,
                    balance: node.closingBalance,
                    brand, division, gender, silhouette, category,
                });
            }
            
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    visit(child, currentPath, brand, division, gender, silhouette, category);
                }
            }
        };

        for (const rootNode of reportData) {
            visit(rootNode);
        }
        
        return rows;
    }, [reportData, dateRange]);

    // Apply frontend filters
    const filteredRows = useMemo(() => {
        if (!hasActiveFilters) return flatRows;

        const q = searchText.trim().toLowerCase();

        // 1. Gather all matching article IDs
        const matchingArticleIds = new Set<string>();
        for (const row of flatRows) {
            if (row.type !== 'article') continue;
            const textMatch = !q || (row.label || "").toLowerCase().includes(q) || (row.sku || "").toLowerCase().includes(q);
            const brandMatch = filterBrands.size === 0 || filterBrands.has(row.brand);
            const divMatch = filterDivisions.size === 0 || filterDivisions.has(row.division);
            const genderMatch = filterGenders.size === 0 || filterGenders.has(row.gender);
            const silMatch = filterSilhouettes.size === 0 || filterSilhouettes.has(row.silhouette);
            const catMatch = filterCategories.size === 0 || filterCategories.has(row.category);
            if (textMatch && brandMatch && divMatch && genderMatch && silMatch && catMatch) {
                matchingArticleIds.add(row.id);
            }
        }

        // 2. Filter rows, retaining groups, headers, and transaction details only for matching items
        const result: any[] = [];
        let keepDetails = false;
        for (const row of flatRows) {
            if (row.type === 'article') {
                keepDetails = matchingArticleIds.has(row.id);
                if (keepDetails) result.push({ ...row, _highlight: searchText.trim() });
            } else if (['variant', 'ledger-header', 'opening-balance', 'transaction', 'closing-balance'].includes(row.type)) {
                if (keepDetails) result.push(row);
            } else {
                // Group rows (brand, division, category, etc.)
                result.push({ ...row, _pendingGroup: true });
            }
        }

        // 3. Strip structural group headers that don't precede any matching article
        const final: any[] = [];
        for (let i = 0; i < result.length; i++) {
            if (!result[i]._pendingGroup) { final.push(result[i]); continue; }
            let hasDescendants = false;
            for (let j = i + 1; j < result.length; j++) {
                if (!result[j]._pendingGroup) { hasDescendants = true; break; }
            }
            if (hasDescendants) final.push(result[i]);
        }

        return final;
    }, [flatRows, hasActiveFilters, searchText, filterBrands, filterDivisions, filterGenders, filterSilhouettes, filterCategories]);

    const handleToggleLevel = (level: keyof typeof groupingLevels, checked: boolean) => {
        setGroupingLevels(prev => {
            const next = { ...prev, [level]: checked };
            if (level === 'division' && checked) next.brand = true;
            if (level === 'brand' && !checked) next.division = false;
            return next;
        });
    };

    // TanStack Virtualizer
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredRows.length,
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

    const formatQty = (val: number) => val === 0 ? "-" : val.toLocaleString();

    // Helper to generate routing links based on transaction type
    const getDocLink = (type: string, refId: string) => {
        if (!refId) return null;
        if (['Transfer In', 'Transfer Out', 'Transfer In (Transit)'].includes(type)) {
            return `/pos/inventory/ledger?id=${refId}`;
        }
        if (['Sale Retail', 'Sale exchanges', 'Sale Void'].includes(type)) {
            return `/pos/sales?id=${refId}`;
        }
        if (type === 'Claims') {
            return `/pos/claims?id=${refId}`;
        }
        if (type === 'Adjustment') {
            return `/pos/inventory/adjustments?id=${refId}`;
        }
        return null;
    };

    return (
        <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-850 dark:text-slate-100">
                        <Clock className="h-8 w-8 text-primary" />
                        Stock Transaction Details
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                        <Layers className="h-4 w-4 text-primary/70" />
                        Historical Card Ledger & In-Transit tracker for all Items - {locationName}
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
                                ? "bg-red-650 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 border-none"
                                : "border-red-500/40 text-red-750 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                                : "border-emerald-500/40 text-emerald-750 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
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
                <h1 className="text-2xl font-bold text-center text-slate-900">Stock Transaction Detail Report</h1>
                <p className="text-sm text-center text-slate-600 mt-1">{locationName}</p>
                <p className="text-xs text-center text-slate-500">
                    Period: {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : ""} to{" "}
                    {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : ""}
                </p>
            </div>

            {/* Date period filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 border p-4 rounded-xl shadow-sm no-print">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Date Period:
                    </span>
                    <DateRangePicker
                        initialDateFrom={dateRange.from}
                        initialDateTo={dateRange.to}
                        onUpdate={({ range }: { range: DateRange }) => {
                            if (range) setDateRange(range);
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchReport}
                        disabled={isPending}
                        className="text-primary hover:text-primary/95 text-xs font-bold"
                    >
                        Apply / Refresh
                    </Button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <Folder className="h-4 w-4 text-primary" />
                    <span>{COMPANY_NAME} &bull; Virtualized High-Performance Scroll</span>
                </div>
            </div>

            {/* Search & Autocomplete panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 no-print">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
                        <input
                            type="text"
                            placeholder="Search article name or SKU..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            className="w-full text-xs pl-7 pr-3 py-1.5 rounded-lg border border-border bg-muted/30 outline-none focus:border-primary transition-colors"
                        />
                        {searchText && (
                            <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        )}
                    </div>

                    <div className="h-5 w-px bg-border hidden sm:block" />

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
                    {filterOptions.categories.length > 0 && (
                        <AutocompleteMultiSelect
                            label="Category"
                            options={filterOptions.categories}
                            selected={filterCategories}
                            onToggle={v => toggleFilter(setFilterCategories, v)}
                        />
                    )}

                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1 text-[11px] font-bold text-destructive hover:text-destructive/80 transition-colors"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            Clear Filters
                        </button>
                    )}

                    <div className="ml-auto text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        {hasActiveFilters ? (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {filteredRows.filter(r => r.type === 'article').length} articles filtered
                            </span>
                        ) : (
                            <span>{flatRows.filter(r => r.type === 'article').length} articles loaded</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Hierarchy configuration */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Settings className="h-4 w-4 text-primary" />
                            Report Hierarchy Configuration
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Check the levels you report by. Tick **Variant (Sizes)** to see ledger records broken down by specific size/color.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 pt-2">
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
                            <Layers className="h-3.5 w-3.5 text-indigo-500" /> Brand
                        </label>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-division"
                            checked={groupingLevels.division}
                            onChange={(e) => handleToggleLevel('division', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-division" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5 text-blue-500" /> Division
                        </label>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-category"
                            checked={groupingLevels.category}
                            onChange={(e) => handleToggleLevel('category', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-category" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" /> Category
                        </label>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-gender"
                            checked={groupingLevels.gender}
                            onChange={(e) => handleToggleLevel('gender', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-gender" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-rose-500" /> Gender
                        </label>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-silhouette"
                            checked={groupingLevels.silhouette}
                            onChange={(e) => handleToggleLevel('silhouette', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-silhouette" className="text-xs font-bold text-slate-750 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Silhouette
                        </label>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-article"
                            checked={groupingLevels.article}
                            onChange={(e) => handleToggleLevel('article', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-article" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Inbox className="h-3.5 w-3.5 text-cyan-500" /> Article
                        </label>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <input
                            type="checkbox"
                            id="group-variant"
                            checked={groupingLevels.variant}
                            onChange={(e) => handleToggleLevel('variant', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <label htmlFor="group-variant" className="text-xs font-bold text-slate-750 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
                            <Printer className="h-3.5 w-3.5 text-fuchsia-500" /> Variant (Sizes)
                        </label>
                    </div>
                </div>
            </div>

            {/* KPI overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Opening Balance</p>
                            <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">{formatQty(grandTotals.openingBalance)} Units</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-slate-100 dark:bg-slate-800 text-slate-650">
                            <Inbox className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">In-Transit Qty</p>
                            <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{formatQty(grandTotals.inTransitQty)} Units</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Closing Balance</p>
                            <h3 className="text-2xl font-bold mt-1 text-primary">{formatQty(grandTotals.closingBalance)} Units</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/20 text-primary">
                            <Layers className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* virtualized table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-md">
                {isPending ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-sm font-semibold text-muted-foreground">Calculating running ledger details...</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Inbox className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Transactions Found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1">
                            No ledger details matched your chosen period or hierarchy filters.
                        </p>
                    </div>
                ) : (
                    <div ref={parentRef} className="overflow-auto max-h-[750px]">
                        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                            <colgroup>
                                <col style={{ width: "12%" }} />
                                <col style={{ width: "15%" }} />
                                <col style={{ width: "12%" }} />
                                <col style={{ width: "33%" }} />
                                <col style={{ width: "9%" }} />
                                <col style={{ width: "9%" }} />
                                <col style={{ width: "10%" }} />
                            </colgroup>
                            <tbody>
                                {paddingTop > 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ height: `${paddingTop}px` }} />
                                    </tr>
                                )}
                                {virtualItems.map((virtualRow) => {
                                    const row = filteredRows[virtualRow.index];
                                    const isGroup = ['brand', 'division', 'category', 'gender', 'silhouette', 'article', 'variant'].includes(row.type);

                                    if (isGroup) {
                                        const levelColors: Record<string, string> = {
                                            brand: "bg-slate-100 dark:bg-slate-950 font-black text-[12px] text-slate-800 dark:text-slate-200 border-t-2 border-slate-200 dark:border-slate-800",
                                            division: "bg-slate-50/80 dark:bg-slate-900/60 font-extrabold text-[11.5px] text-slate-750 dark:text-slate-300 border-t border-slate-200/50",
                                            category: "bg-slate-100/50 dark:bg-slate-950/40 font-bold text-[11px] text-slate-700 dark:text-slate-350",
                                            gender: "bg-slate-50/50 dark:bg-slate-900/30 font-bold text-[10.5px] text-slate-700 dark:text-slate-400",
                                            silhouette: "bg-slate-100/30 dark:bg-slate-950/20 font-bold text-[10px] text-slate-650 dark:text-slate-450",
                                            article: "bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-[11px] text-indigo-950 dark:text-indigo-300 border-t border-indigo-100 dark:border-indigo-950/40",
                                            variant: "bg-violet-50/20 dark:bg-violet-950/5 font-bold text-[10.5px] text-violet-900 dark:text-violet-300 border-t border-violet-100/50",
                                        };

                                        const labelText = row.type === 'article'
                                            ? `${row.sku} — ${row.label}`
                                            : row.type === 'variant'
                                                ? `Color: ${row.color}  |  Size: ${row.size}`
                                                : `${row.type.toUpperCase()}: ${row.label}`;

                                        return (
                                            <tr key={row.id} className={cn("h-9 select-none", levelColors[row.type])}>
                                                <td colSpan={5} className="pl-4 font-semibold">
                                                    {row._highlight ? highlight(labelText, row._highlight) : labelText}
                                                </td>
                                                <td colSpan={2} className="pr-4 text-right text-[10px] font-bold text-muted-foreground">
                                                    Open: {row.totals.openingBalance} &bull; Close: {row.totals.closingBalance} &bull; Transit: {row.totals.inTransitQty}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    if (row.type === 'ledger-header') {
                                        return (
                                            <tr key={row.id} className="bg-slate-800 text-slate-100 text-[10px] font-bold h-7 uppercase tracking-wider select-none">
                                                <th className="text-left pl-4">Date</th>
                                                <th className="text-left pl-2">Doc Type</th>
                                                <th className="text-left pl-2">Doc Ref</th>
                                                <th className="text-left pl-2">Narration</th>
                                                <th className="text-right pr-4">In</th>
                                                <th className="text-right pr-4">Out</th>
                                                <th className="text-right pr-4">Balance</th>
                                            </tr>
                                        );
                                    }

                                    if (row.type === 'opening-balance') {
                                        return (
                                            <tr key={row.id} className="bg-slate-50/40 dark:bg-slate-900/10 text-slate-500 text-[11px] h-8 border-b border-border/40 select-none">
                                                <td className="pl-4">{row.date ? format(new Date(row.date), "dd/MM/yyyy") : "-"}</td>
                                                <td className="pl-2 font-semibold text-slate-700 dark:text-slate-400">Opening Balance</td>
                                                <td className="pl-2">-</td>
                                                <td className="pl-2">Opening Balance B/F</td>
                                                <td className="text-right pr-4">-</td>
                                                <td className="text-right pr-4">-</td>
                                                <td className="text-right pr-4 font-bold text-slate-950 dark:text-slate-100">{row.balance}</td>
                                            </tr>
                                        );
                                    }

                                    if (row.type === 'closing-balance') {
                                        return (
                                            <tr key={row.id} className="bg-slate-50/80 dark:bg-slate-900/20 text-slate-800 dark:text-slate-200 text-[11px] font-bold h-8 border-b border-border/80 border-t border-border/50 select-none">
                                                <td className="pl-4">{row.date ? format(new Date(row.date), "dd/MM/yyyy") : "-"}</td>
                                                <td className="pl-2 uppercase">Closing Balance</td>
                                                <td className="pl-2">-</td>
                                                <td className="pl-2">Closing Balance C/F</td>
                                                <td className="text-right pr-4">-</td>
                                                <td className="text-right pr-4">-</td>
                                                <td className="text-right pr-4 text-primary font-black">{row.balance}</td>
                                            </tr>
                                        );
                                    }

                                    // Transaction row
                                    const docUrl = getDocLink(row.docType, row.docRefId);

                                    return (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                "text-[11.5px] border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 h-8.5 transition-colors",
                                                row.isInTransit && "bg-amber-500/5 hover:bg-amber-500/10 text-amber-850 dark:text-amber-400 font-medium"
                                            )}
                                        >
                                            <td className="pl-4 text-slate-550 dark:text-slate-450">
                                                {row.date ? format(new Date(row.date), "dd/MM/yyyy") : "-"}
                                            </td>
                                            <td className="pl-2 font-semibold">
                                                {row.docType}
                                                {row.isInTransit && <span className="ml-1 text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-1 py-0.2 rounded-full font-bold uppercase">Transit</span>}
                                            </td>
                                            <td className="pl-2">
                                                {docUrl ? (
                                                    <Link href={docUrl} className="text-primary hover:underline font-semibold flex items-center gap-0.5">
                                                        {row.docRef}
                                                        <LinkIcon className="h-2.5 w-2.5" />
                                                    </Link>
                                                ) : (
                                                    <span className="font-semibold">{row.docRef}</span>
                                                )}
                                            </td>
                                            <td className="pl-2 text-muted-foreground truncate" title={row.remarks}>{row.remarks}</td>
                                            <td className="text-right pr-4 text-emerald-650 dark:text-emerald-450 font-bold">{formatQty(row.inQty)}</td>
                                            <td className="text-right pr-4 text-rose-650 dark:text-rose-450 font-bold">{formatQty(row.outQty)}</td>
                                            <td className="text-right pr-4 font-black">{row.isInTransit ? "-" : row.balance}</td>
                                        </tr>
                                    );
                                })}
                                {paddingBottom > 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ height: `${paddingBottom}px` }} />
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
