"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Plus,
    Upload,
    Loader2,
    Eye,
    Edit,
    Trash2,
    Sparkles,
    Filter,
    X,
    ChevronRight,
    Search,
    Download,
    ChevronDown,
    Check,
    ChevronsDown,
    ChevronsUp,
    List,
    Layers,
    Copy,
    ExternalLink,
    ScanBarcode,
    MoreHorizontal,
    Boxes,
    Tag,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteItem, getItems, queueItemsExport, getItemsExportStatus } from "@/lib/actions/items";
import { format } from "date-fns";
import { BulkUploadModal } from "@/components/items/bulk-upload-modal";
import { ItemUpdateBulkUploadModal } from "@/components/items/item-update-bulk-upload-modal";
import { useUploadProgress } from "@/hooks/use-upload-progress";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { brandApi, categoryApi, silhouetteApi, genderApi } from "@/lib/api";
import { BarcodePrintModal } from "@/components/items/barcode-print-modal";
import { ArticleDetailSheet } from "@/components/items/article-detail-sheet";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Item {
    id: string;
    itemId: string;
    sku: string;
    barCode: string | null;
    description: string | null;
    unitPrice: number;
    isActive: boolean;
    brand?: { name: string } | null;
    category?: { name: string } | null;
    division?: { name: string } | null;
    uniqueNo?: string | null;
    size?: { name: string } | null;
    color?: { name: string } | null;
    sizeId?: string | null;
    colorId?: string | null;
}

/**
 * One row in the list = one "unique SKU" (the user's mental model).
 * Its `variants` array holds every `Item` row that shares the SKU
 * (size × color × uniqueNo combinations).
 */
interface ItemGroup {
    sku: string;
    description: string | null;
    brand?: { name: string } | null;
    category?: { name: string } | null;
    division?: { name: string } | null;
    variantCount: number;
    activeCount: number;
    priceMin: number;
    priceMax: number;
    variants: Item[];
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

interface AppliedFilters {
    brandIds: string[];
    categoryIds: string[];
    silhouetteIds: string[];
    genderIds: string[];
}

interface FilterSheetProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    brands: any[];
    categories: any[];
    silhouettes: any[];
    genders: any[];
    pendingBrandIds: string[];
    pendingCategoryIds: string[];
    pendingSilhouetteIds: string[];
    pendingGenderIds: string[];
    setPendingBrandIds: (v: string[]) => void;
    setPendingCategoryIds: (v: string[]) => void;
    setPendingSilhouetteIds: (v: string[]) => void;
    setPendingGenderIds: (v: string[]) => void;
    onApply: (f: AppliedFilters) => void;
    onClear: () => void;
}

function FilterSheet({
    open, onOpenChange, brands = [], categories = [], silhouettes = [], genders = [],
    pendingBrandIds = [], pendingCategoryIds = [], pendingSilhouetteIds = [], pendingGenderIds = [],
    setPendingBrandIds, setPendingCategoryIds, setPendingSilhouetteIds, setPendingGenderIds,
    onApply, onClear,
}: FilterSheetProps) {
    const [filterSearch, setFilterSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const toggle = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

    const safeBrandIds = Array.isArray(pendingBrandIds) ? pendingBrandIds : [];
    const safeCategoryIds = Array.isArray(pendingCategoryIds) ? pendingCategoryIds : [];
    const safeSilhouetteIds = Array.isArray(pendingSilhouetteIds) ? pendingSilhouetteIds : [];
    const safeGenderIds = Array.isArray(pendingGenderIds) ? pendingGenderIds : [];

    const sections = [
        { key: "brand", label: "Brand", items: Array.isArray(brands) ? brands : [], ids: safeBrandIds, setIds: setPendingBrandIds },
        { key: "category", label: "Category", items: Array.isArray(categories) ? categories : [], ids: safeCategoryIds, setIds: setPendingCategoryIds },
        { key: "silhouette", label: "Silhouette", items: Array.isArray(silhouettes) ? silhouettes : [], ids: safeSilhouetteIds, setIds: setPendingSilhouetteIds },
        { key: "gender", label: "Gender", items: Array.isArray(genders) ? genders : [], ids: safeGenderIds, setIds: setPendingGenderIds },
    ];

    const toggleId = (setIds: (fn: (prev: string[]) => string[]) => void, id: string) => {
        setIds((prev = []) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[360px] sm:w-[420px] p-0 flex flex-col">
                <SheetHeader className="px-5 py-4 border-b">
                    <SheetTitle className="text-base font-semibold">Filter Items</SheetTitle>
                </SheetHeader>
                <div className="p-4 border-b">
                    <Input
                        placeholder="Search filters…"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="h-8 text-xs"
                    />
                </div>
                <ScrollArea className="flex-1 px-5 py-2">
                    <div className="space-y-4">
                        {sections.map(({ key, label, items, ids, setIds }) => {
                            const filtered = items.filter((it: any) =>
                                (it?.name || "").toLowerCase().includes(filterSearch.toLowerCase())
                            );
                            const isCollapsed = collapsed[key];
                            return (
                                <div key={key} className="border-b pb-3">
                                    <button
                                        type="button"
                                        onClick={() => toggle(key)}
                                        className="w-full flex items-center justify-between text-xs font-semibold py-1 hover:text-primary transition-colors"
                                    >
                                        <span>
                                            {label}
                                            {ids.length > 0 && (
                                                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground font-mono">
                                                    {ids.length}
                                                </span>
                                            )}
                                        </span>
                                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isCollapsed && "-rotate-90")} />
                                    </button>
                                    {!isCollapsed && (
                                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                                            {filtered.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground py-1">No options match</p>
                                            ) : (
                                                filtered.map((item: any) => {
                                                    const checked = ids.includes(item.id);
                                                    return (
                                                        <label
                                                            key={item.id}
                                                            className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-muted/60 cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleId(setIds as any, item.id)}
                                                                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                                            />
                                                            <span className="truncate">{item.name}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                <SheetFooter className="p-4 border-t flex gap-2">
                    <Button
                        className="flex-1"
                        onClick={() =>
                            onApply({
                                brandIds: safeBrandIds,
                                categoryIds: safeCategoryIds,
                                silhouetteIds: safeSilhouetteIds,
                                genderIds: safeGenderIds,
                            })
                        }
                    >
                        Apply Filters
                    </Button>
                    <Button variant="outline" onClick={onClear}>
                        <X className="h-3.5 w-3.5 mr-1" /> Clear
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// ─── SKU grouping helpers ─────────────────────────────────────────────────────

function groupItemsBySku(items: Item[]): ItemGroup[] {
    const map = new Map<string, ItemGroup>();
    for (const it of items) {
        const key = it.sku || it.id;
        let g = map.get(key);
        if (!g) {
            g = {
                sku: it.sku,
                description: it.description,
                brand: it.brand,
                category: it.category,
                division: it.division,
                variantCount: 0,
                activeCount: 0,
                priceMin: Infinity,
                priceMax: -Infinity,
                variants: [],
            };
            map.set(key, g);
        }
        g.variants.push(it);
        g.variantCount += 1;
        if (it.isActive) g.activeCount += 1;
        if (it.unitPrice < g.priceMin) g.priceMin = it.unitPrice;
        if (it.unitPrice > g.priceMax) g.priceMax = it.unitPrice;
    }
    return Array.from(map.values());
}

function priceRange(g: ItemGroup): string {
    if (!isFinite(g.priceMin)) return "—";
    const fmt = (n: number) =>
        Number(n).toLocaleString("en-US", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    return g.priceMin === g.priceMax ? fmt(g.priceMin) : `${fmt(g.priceMin)} – ${fmt(g.priceMax)}`;
}

function groupRowId(g: ItemGroup): string {
    return `sku:${g.sku}`;
}

function variantRowId(v: Item): string {
    return `var:${v.id}`;
}

// ─── ProCatalogTable Component ────────────────────────────────────────────────
// Renders the modern ERP catalog with:
// 1. Grouped Article View (with expandable variants, barcode highlight, and 1-click Article Sheet)
// 2. Flat Variant View (for power users who want classic flat sorting)
// 3. Quick controls: Expand All / Collapse All, View Switcher, Copy Barcode, Search Highlights

interface ProCatalogTableProps {
    groups: ItemGroup[];
    items: Item[];
    expandedSkus: Set<string>;
    onToggleSku: (sku: string) => void;
    onToggleExpandAll: () => void;
    allExpanded: boolean;
    viewMode: "grouped" | "flat";
    onViewModeChange: (mode: "grouped" | "flat") => void;
    onViewArticle: (sku: string) => void;
    onPrintArticleVariants: (variants: Item[]) => void;
    search: string;
    onSearchChange: (v: string) => void;
    filterSlot: React.ReactNode;
    rowCount: number;
    pageCount: number;
    pagination: PaginationState;
    onPaginationChange: (v: PaginationState) => void;
    sorting: SortingState;
    onSortingChange: (v: SortingState) => void;
    isLoading: boolean;
    canUpdate: boolean;
}

function ProCatalogTable({
    groups,
    items,
    expandedSkus,
    onToggleSku,
    onToggleExpandAll,
    allExpanded,
    viewMode,
    onViewModeChange,
    onViewArticle,
    onPrintArticleVariants,
    search,
    onSearchChange,
    filterSlot,
    rowCount,
    pageCount,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    isLoading,
    canUpdate,
}: ProCatalogTableProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success(`Copied "${text}" to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Flatten all display rows for grouped view
    interface DisplayRow {
        type: "group" | "variant";
        group?: ItemGroup;
        variant?: Item;
    }

    const displayRows = useMemo((): DisplayRow[] => {
        const rows: DisplayRow[] = [];
        for (const g of groups) {
            rows.push({ type: "group", group: g });
            if (expandedSkus.has(g.sku)) {
                for (const v of g.variants) {
                    rows.push({ type: "variant", variant: v, group: g });
                }
            }
        }
        return rows;
    }, [groups, expandedSkus]);

    // Check if a variant specifically matched the search term
    const isVariantMatched = useCallback((v: Item): boolean => {
        if (!search || !search.trim()) return false;
        const term = search.trim().toLowerCase();
        return Boolean(
            (v.barCode && v.barCode.toLowerCase().includes(term)) ||
            (v.uniqueNo && v.uniqueNo.toLowerCase().includes(term)) ||
            (v.itemId && v.itemId.toLowerCase().includes(term))
        );
    }, [search]);

    const formatPrice = (val: number) => {
        return Number(val).toLocaleString("en-US", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    if (isLoading && groups.length === 0 && items.length === 0) {
        return (
            <div className="space-y-3 p-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 animate-pulse bg-muted rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Pro Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-1">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {/* Search box with clear icon */}
                    <div className="relative max-w-xs w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by Barcode, SKU, Item ID, Name…"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-8 h-9 text-xs bg-background"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => onSearchChange("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Expand All / Collapse All (Grouped Mode) */}
                    {viewMode === "grouped" && groups.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onToggleExpandAll}
                            className="h-9 gap-1.5 text-xs border-dashed"
                            title={allExpanded ? "Collapse all SKU groups" : "Expand all SKU groups"}
                        >
                            {allExpanded ? (
                                <>
                                    <ChevronsUp className="h-3.5 w-3.5 text-primary" />
                                    <span>Collapse All</span>
                                </>
                            ) : (
                                <>
                                    <ChevronsDown className="h-3.5 w-3.5 text-primary" />
                                    <span>Expand All</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Right toolbar controls: View Mode Switcher + Filters */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* View Switcher Toggle */}
                    <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
                        <button
                            type="button"
                            onClick={() => onViewModeChange("grouped")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === "grouped"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Article View</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({groups.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange("flat")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === "flat"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <List className="h-3.5 w-3.5" />
                            <span>Flat Items</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({items.length})</span>
                        </button>
                    </div>

                    {/* Filter Slot */}
                    {filterSlot}
                </div>
            </div>

            {/* Active search guidance indicator */}
            {search.trim() && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            Showing results for <strong>&quot;{search}&quot;</strong>. Matched SKU groups have been auto-expanded with matching barcodes highlighted.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        className="text-amber-800 dark:text-amber-300 hover:underline font-semibold text-[11px]"
                    >
                        Clear Search
                    </button>
                </div>
            )}

            {/* Empty State */}
            {groups.length === 0 && !isLoading && (
                <div className="py-16 text-center border rounded-xl bg-card">
                    <Boxes className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <h3 className="font-semibold text-base">No Items Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                        No articles or items matched your current search and filters. Try clearing your query or adjusting the filters.
                    </p>
                </div>
            )}

            {/* View Mode 1: Grouped Article View */}
            {viewMode === "grouped" && groups.length > 0 && (
                <div className="rounded-xl border overflow-hidden shadow-xs bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 font-semibold text-xs text-muted-foreground text-left">
                                    <th className="h-10 px-3 w-10">#</th>
                                    <th className="h-10 px-3 min-w-[240px]">Article / Style SKU</th>
                                    <th className="h-10 px-3">Brand</th>
                                    <th className="h-10 px-3">Category & Division</th>
                                    <th className="h-10 px-3">Variants Matrix</th>
                                    <th className="h-10 px-3">Status</th>
                                    <th className="h-10 px-3 text-right">Price Range</th>
                                    <th className="h-10 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {displayRows.map((row, index) => {
                                    if (row.type === "group" && row.group) {
                                        const g = row.group;
                                        const isExpanded = expandedSkus.has(g.sku);
                                        const hasMatchedVariant = g.variants.some((v) => isVariantMatched(v));

                                        return (
                                            <tr
                                                key={groupRowId(g)}
                                                className={cn(
                                                    "border-t border-border/80 transition-colors",
                                                    isExpanded ? "bg-muted/30" : "hover:bg-muted/20",
                                                    hasMatchedVariant && "bg-amber-500/5"
                                                )}
                                            >
                                                <td className="px-3 py-3 text-muted-foreground font-mono text-xs">
                                                    {pagination.pageIndex * pagination.pageSize + index + 1}
                                                </td>

                                                {/* SKU & Description with View Article Link */}
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => onToggleSku(g.sku)}
                                                            className={cn(
                                                                "flex h-7 w-7 items-center justify-center rounded border transition-colors shrink-0",
                                                                isExpanded
                                                                    ? "border-primary/40 bg-primary/10 text-primary"
                                                                    : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            )}
                                                            aria-expanded={isExpanded}
                                                            title={isExpanded ? "Collapse variants" : "Expand variants"}
                                                        >
                                                            <ChevronDown
                                                                className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                                                            />
                                                        </button>

                                                        <div className="min-w-0 space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onViewArticle(g.sku)}
                                                                    className="font-mono text-sm font-bold text-foreground hover:text-primary transition-colors text-left flex items-center gap-1 group"
                                                                    title="Open Article Details Drawer"
                                                                >
                                                                    <span>{g.sku}</span>
                                                                    <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </button>
                                                                {hasMatchedVariant && (
                                                                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] py-0 px-1 font-mono font-bold">
                                                                        Matched
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {g.description && (
                                                                <span className="text-xs text-muted-foreground truncate block max-w-[280px]">
                                                                    {g.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3">
                                                    {g.brand?.name ? (
                                                        <Badge variant="secondary" className="text-xs font-medium">
                                                            {g.brand.name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </td>

                                                <td className="px-3 py-3">
                                                    <div className="flex flex-col gap-0.5 text-xs">
                                                        <span className="font-medium text-foreground">{g.category?.name || "—"}</span>
                                                        {g.division?.name && (
                                                            <span className="text-muted-foreground text-[11px]">{g.division.name}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className="font-mono text-xs font-semibold">
                                                            {g.variantCount} {g.variantCount === 1 ? "variant" : "variants"}
                                                        </Badge>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3">
                                                    <Badge
                                                        variant={g.activeCount > 0 ? "default" : "secondary"}
                                                        className="text-xs py-0.5"
                                                    >
                                                        {g.activeCount} / {g.variantCount} Active
                                                    </Badge>
                                                </td>

                                                <td className="px-3 py-3 text-right font-mono font-bold text-sm text-foreground">
                                                    {priceRange(g)}
                                                </td>

                                                <td className="px-3 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onViewArticle(g.sku)}
                                                            className="h-8 px-2.5 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                                                        >
                                                            <Layers className="h-3.5 w-3.5" />
                                                            <span>Article Details</span>
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Article Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => onViewArticle(g.sku)}>
                                                                    <Layers className="mr-2 h-4 w-4" /> Quick Overview
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link
                                                                        href={`/erp/items/article/${encodeURIComponent(g.sku)}`}
                                                                        transitionTypes={["nav-forward"]}
                                                                    >
                                                                        <ExternalLink className="mr-2 h-4 w-4" /> Full Article Page
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => onPrintArticleVariants(g.variants)}>
                                                                    <ScanBarcode className="mr-2 h-4 w-4" /> Print Barcodes ({g.variants.length})
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => onToggleSku(g.sku)}>
                                                                    {isExpanded ? (
                                                                        <>
                                                                            <ChevronsUp className="mr-2 h-4 w-4" /> Collapse Variants
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ChevronsDown className="mr-2 h-4 w-4" /> Expand Variants
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Variant Sub-Row (Expanded)
                                    if (row.type === "variant" && row.variant && row.group) {
                                        const v = row.variant;
                                        const isMatched = isVariantMatched(v);
                                        const isCopied = copiedKey === `bc-${v.id}`;

                                        return (
                                            <tr
                                                key={variantRowId(v)}
                                                className={cn(
                                                    "border-t border-border/40 transition-colors text-xs",
                                                    isMatched
                                                        ? "bg-amber-500/15 dark:bg-amber-500/20 border-l-4 border-l-amber-500"
                                                        : "bg-muted/15 hover:bg-muted/30"
                                                )}
                                                id={`variants-${row.group.sku}`}
                                            >
                                                <td className="px-3 py-2 text-muted-foreground pl-6 font-mono text-[11px]">
                                                    ↳
                                                </td>

                                                {/* Barcode & Unique No Column */}
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(v.barCode || v.itemId, `bc-${v.id}`)}
                                                            className={cn(
                                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-medium transition-colors border",
                                                                isMatched
                                                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-900 dark:text-amber-100 font-bold"
                                                                    : "bg-background border-border/70 hover:bg-muted text-foreground"
                                                            )}
                                                            title="Click to copy barcode"
                                                        >
                                                            <ScanBarcode className="h-3 w-3 text-muted-foreground" />
                                                            <span>{v.barCode || v.itemId}</span>
                                                            {isCopied ? (
                                                                <Check className="h-3 w-3 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3 w-3 text-muted-foreground opacity-60" />
                                                            )}
                                                        </button>

                                                        {isMatched && (
                                                            <Badge className="bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-500/40 text-[10px] py-0 px-1.5 gap-1 font-mono font-bold">
                                                                <Sparkles className="h-3 w-3" />
                                                                Barcode Match
                                                            </Badge>
                                                        )}

                                                        {v.uniqueNo && (
                                                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                                                UN: {v.uniqueNo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {v.brand?.name || "—"}
                                                </td>

                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {v.category?.name || "—"}
                                                </td>

                                                {/* Size & Color */}
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {v.size?.name ? (
                                                            <Badge variant="outline" className="text-xs font-semibold py-0">
                                                                Size: {v.size.name}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        )}
                                                        {v.color?.name && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium text-foreground">
                                                                {v.color.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-2">
                                                    <Badge
                                                        variant={v.isActive ? "default" : "secondary"}
                                                        className="text-[10px] py-0 px-1.5"
                                                    >
                                                        {v.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </td>

                                                <td className="px-3 py-2 text-right font-mono font-semibold text-xs text-foreground">
                                                    {formatPrice(v.unitPrice)}
                                                </td>

                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            href={`/erp/items/view/${v.id}`}
                                                            transitionTypes={["nav-forward"]}
                                                        >
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                                                <Eye className="h-3 w-3" /> View
                                                            </Button>
                                                        </Link>
                                                        {canUpdate && (
                                                            <Link
                                                                href={`/erp/items/edit/${v.id}`}
                                                                transitionTypes={["nav-forward"]}
                                                            >
                                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                                                    <Edit className="h-3 w-3" /> Edit
                                                                </Button>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return null;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Mode 2: Flat All Items View */}
            {viewMode === "flat" && items.length > 0 && (
                <div className="rounded-xl border overflow-hidden shadow-xs bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 font-semibold text-xs text-muted-foreground text-left">
                                    <th className="h-10 px-3 w-10">#</th>
                                    <th className="h-10 px-3">Barcode</th>
                                    <th className="h-10 px-3">SKU / Article Style</th>
                                    <th className="h-10 px-3">Size & Color</th>
                                    <th className="h-10 px-3">Brand & Category</th>
                                    <th className="h-10 px-3">Division</th>
                                    <th className="h-10 px-3 text-right">Price</th>
                                    <th className="h-10 px-3">Status</th>
                                    <th className="h-10 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {items.map((it, idx) => {
                                    const isMatched = isVariantMatched(it);
                                    const isCopied = copiedKey === `flat-bc-${it.id}`;

                                    return (
                                        <tr
                                            key={it.id}
                                            className={cn(
                                                "border-t border-border/60 transition-colors text-xs hover:bg-muted/30",
                                                isMatched && "bg-amber-500/15 dark:bg-amber-500/20 border-l-4 border-l-amber-500 font-medium"
                                            )}
                                        >
                                            <td className="px-3 py-3 text-muted-foreground font-mono">
                                                {pagination.pageIndex * pagination.pageSize + idx + 1}
                                            </td>

                                            {/* Barcode */}
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(it.barCode || it.itemId, `flat-bc-${it.id}`)}
                                                        className={cn(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-medium border transition-colors",
                                                            isMatched
                                                                ? "bg-amber-500/20 border-amber-500/40 text-amber-900 dark:text-amber-100 font-bold"
                                                                : "bg-background border-border/70 hover:bg-muted text-foreground"
                                                        )}
                                                        title="Click to copy barcode"
                                                    >
                                                        <ScanBarcode className="h-3 w-3 text-muted-foreground" />
                                                        <span>{it.barCode || it.itemId}</span>
                                                        {isCopied ? (
                                                            <Check className="h-3 w-3 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3 w-3 text-muted-foreground opacity-60" />
                                                        )}
                                                    </button>
                                                    {isMatched && (
                                                        <Badge className="bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-500/40 text-[10px] py-0 px-1.5 gap-1 font-mono font-bold">
                                                            <Sparkles className="h-3 w-3" /> Matched
                                                        </Badge>
                                                    )}
                                                </div>
                                                {it.uniqueNo && (
                                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block mt-0.5">
                                                        UN: {it.uniqueNo}
                                                    </span>
                                                )}
                                            </td>

                                            {/* SKU & Description */}
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => onViewArticle(it.sku)}
                                                        className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors text-left"
                                                        title="View Article Master"
                                                    >
                                                        {it.sku}
                                                    </button>
                                                    {it.description && (
                                                        <span className="text-muted-foreground text-[11px] truncate max-w-[200px]">
                                                            {it.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Size & Color */}
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {it.size?.name ? (
                                                        <Badge variant="outline" className="text-xs font-semibold py-0">
                                                            {it.size.name}
                                                        </Badge>
                                                    ) : "—"}
                                                    {it.color?.name && (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">
                                                            {it.color.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Brand & Category */}
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-foreground">{it.brand?.name || "—"}</span>
                                                    <span className="text-muted-foreground text-[11px]">{it.category?.name || "—"}</span>
                                                </div>
                                            </td>

                                            <td className="px-3 py-3 text-muted-foreground">
                                                {it.division?.name || "—"}
                                            </td>

                                            {/* Price */}
                                            <td className="px-3 py-3 text-right font-mono font-semibold text-xs text-foreground">
                                                {formatPrice(it.unitPrice)}
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-3">
                                                <Badge
                                                    variant={it.isActive ? "default" : "secondary"}
                                                    className="text-[10px] py-0 px-1.5"
                                                >
                                                    {it.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/erp/items/view/${it.id}`}
                                                        transitionTypes={["nav-forward"]}
                                                    >
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                                            <Eye className="h-3 w-3" /> View
                                                        </Button>
                                                    </Link>
                                                    {canUpdate && (
                                                        <Link
                                                            href={`/erp/items/edit/${it.id}`}
                                                            transitionTypes={["nav-forward"]}
                                                        >
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                                                <Edit className="h-3 w-3" /> Edit
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 border-t">
                <div className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">{pagination.pageIndex * pagination.pageSize + 1}</span>{" "}
                    to{" "}
                    <span className="font-semibold text-foreground">
                        {Math.min((pagination.pageIndex + 1) * pagination.pageSize, rowCount)}
                    </span>{" "}
                    of <span className="font-semibold text-foreground">{rowCount.toLocaleString()}</span> items
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                        disabled={pagination.pageIndex === 0}
                        className="h-8 gap-1 text-xs"
                    >
                        <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Previous
                    </Button>
                    <span className="text-xs font-mono px-2">
                        Page {pagination.pageIndex + 1} of {Math.max(1, pageCount)}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                        disabled={pagination.pageIndex >= pageCount - 1}
                        className="h-8 gap-1 text-xs"
                    >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Query Key Factory ────────────────────────────────────────────────────────

const itemsQueryKey = (
    page: number,
    pageSize: number,
    search: string,
    sortBy: string,
    sortOrder: "asc" | "desc",
    filters: AppliedFilters,
) => ["items", { page, pageSize, search, sortBy, sortOrder, filters }] as const;

// ─── Main ItemList Component ──────────────────────────────────────────────────

interface ItemListProps {
    initialItems: Item[];
    initialMeta?: any;
}

export function ItemList({ initialItems, initialMeta }: ItemListProps) {
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();

    const canCreate = hasPermission("erp.item.create");
    const canUpdate = hasPermission("erp.item.update");
    const canBulkUpload = hasPermission("erp.item.bulk-upload");

    // ── State ──────────────────────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 50,
    });
    const [sorting, setSorting] = useState<SortingState>([
        { id: "createdAt", desc: true },
    ]);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
    const [selectedArticleSku, setSelectedArticleSku] = useState<string | null>(null);

    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [activeUpdateUploadId, setActiveUpdateUploadId] = useState<string | null>(null);

    // Barcode printing state
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [printModalItems, setPrintModalItems] = useState<Item[]>([]);

    // SKU grouping state
    const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

    // Export state
    const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [exportJobId, setExportJobId] = useState<string | null>(null);
    const [exportProgress, setExportProgress] = useState<number>(0);
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    // ── Filter state ───────────────────────────────────────────────────────
    const [brands, setBrands] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [silhouettes, setSilhouettes] = useState<any[]>([]);
    const [genders, setGenders] = useState<any[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [pendingBrandIds, setPendingBrandIds] = useState<string[]>([]);
    const [pendingCategoryIds, setPendingCategoryIds] = useState<string[]>([]);
    const [pendingSilhouetteIds, setPendingSilhouetteIds] = useState<string[]>([]);
    const [pendingGenderIds, setPendingGenderIds] = useState<string[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        brandIds: [], categoryIds: [], silhouetteIds: [], genderIds: [],
    });

    const activeFilterCount =
        (appliedFilters?.brandIds?.length || 0) +
        (appliedFilters?.categoryIds?.length || 0) +
        (appliedFilters?.silhouetteIds?.length || 0) +
        (appliedFilters?.genderIds?.length || 0);

    // Persist and recover active uploadId
    useEffect(() => {
        const stored = localStorage.getItem("active_item_upload_id");
        if (stored) setActiveUploadId(stored);
        const storedUpdate = localStorage.getItem("active_item_update_upload_id");
        if (storedUpdate) setActiveUpdateUploadId(storedUpdate);
    }, []);

    // Load master data for filters
    useEffect(() => {
        Promise.allSettled([
            brandApi.getAll(),
            categoryApi.getAll(),
            silhouetteApi.getAll(),
            genderApi.getAll(),
        ]).then(([b, c, s, g]) => {
            if (b.status === "fulfilled" && b.value?.status && Array.isArray(b.value.data)) setBrands(b.value.data);
            if (c.status === "fulfilled" && c.value?.status && Array.isArray(c.value.data)) setCategories(c.value.data);
            if (s.status === "fulfilled" && s.value?.status && Array.isArray(s.value.data)) setSilhouettes(s.value.data);
            if (g.status === "fulfilled" && g.value?.status && Array.isArray(g.value.data)) setGenders(g.value.data);
        });
    }, []);

    const handleUploadIdChange = (id: string | null) => {
        setActiveUploadId(id);
        if (id) {
            localStorage.setItem("active_item_upload_id", id);
        } else {
            localStorage.removeItem("active_item_upload_id");
        }
    };

    const handleUpdateUploadIdChange = (id: string | null) => {
        setActiveUpdateUploadId(id);
        if (id) {
            localStorage.setItem("active_item_update_upload_id", id);
        } else {
            localStorage.removeItem("active_item_update_upload_id");
        }
    };

    const { data: uploadProgress } = useUploadProgress(activeUploadId);
    const { data: updateProgress } = useUploadProgress(activeUpdateUploadId, 'item-update');

    // Poll Items Export Job Status
    useEffect(() => {
        if (exportState !== "queueing" && exportState !== "processing") return;
        if (!exportJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getItemsExportStatus(exportJobId);
                if (res && res.status) {
                    const { state, progress } = res.data || {};
                    setExportProgress(progress || 0);

                    if (state === "completed") {
                        setExportState("completed");
                        toast.success("Items Export processed successfully! Ready to download.");
                        clearInterval(interval);
                    } else if (state === "failed") {
                        setExportState("failed");
                        toast.error("Background items export processing failed.");
                        clearInterval(interval);
                    } else {
                        setExportState("processing");
                    }
                }
            } catch (err) {
                console.error("Error polling export status:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [exportState, exportJobId]);

    const getExportButtonText = () => {
        switch (exportState) {
            case "queueing":
                return "Queueing...";
            case "processing":
                return `Generating ${exportProgress}%`;
            case "completed":
                return "Download Excel";
            case "failed":
                return "Retry Export";
            case "idle":
            default:
                return "Export";
        }
    };

    // Derived query params
    const currentPage = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;
    const sortColumn = sorting[0]?.id ?? "createdAt";
    const sortDir: "asc" | "desc" = sorting[0]?.desc === false ? "asc" : "desc";

    // Server-side fetch
    const { data, isLoading, isFetching } = useQuery({
        queryKey: itemsQueryKey(currentPage, pageSize, search, sortColumn, sortDir, appliedFilters),
        queryFn: () => getItems(currentPage, pageSize, search || undefined, sortColumn, sortDir, {
            brandIds: appliedFilters.brandIds.length ? appliedFilters.brandIds : undefined,
            categoryIds: appliedFilters.categoryIds.length ? appliedFilters.categoryIds : undefined,
            silhouetteIds: appliedFilters.silhouetteIds.length ? appliedFilters.silhouetteIds : undefined,
            genderIds: appliedFilters.genderIds.length ? appliedFilters.genderIds : undefined,
        }),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        initialData:
            currentPage === 1 &&
                pageSize === 50 &&
                !search &&
                sortColumn === "createdAt" &&
                sortDir === "desc" &&
                activeFilterCount === 0
                ? { status: true, data: initialItems, meta: initialMeta }
                : undefined,
    });

    const items: Item[] = data?.data ?? [];
    const meta = data?.meta ?? {
        total: 0,
        page: 1,
        limit: pageSize,
        totalPages: 0,
    };

    // Prefetch next page
    useEffect(() => {
        if (currentPage < meta.totalPages) {
            queryClient.prefetchQuery({
                queryKey: itemsQueryKey(currentPage + 1, pageSize, search, sortColumn, sortDir, appliedFilters),
                queryFn: () =>
                    getItems(currentPage + 1, pageSize, search || undefined, sortColumn, sortDir, {
                        brandIds: appliedFilters.brandIds.length ? appliedFilters.brandIds : undefined,
                        categoryIds: appliedFilters.categoryIds.length ? appliedFilters.categoryIds : undefined,
                        silhouetteIds: appliedFilters.silhouetteIds.length ? appliedFilters.silhouetteIds : undefined,
                        genderIds: appliedFilters.genderIds.length ? appliedFilters.genderIds : undefined,
                    }),
                staleTime: 30_000,
            });
        }
    }, [currentPage, pageSize, search, sortColumn, sortDir, appliedFilters, meta.totalPages, queryClient]);

    // Reset to page 1 on search/sort/filter change
    useEffect(() => {
        setPagination((prev) => {
            if (prev.pageIndex === 0) return prev;
            return { ...prev, pageIndex: 0 };
        });
    }, [search, sortColumn, sortDir, appliedFilters]);

    // Filter handlers
    const handleApplyFilters = (filters: AppliedFilters) => {
        setAppliedFilters(filters);
        setIsFilterOpen(false);
    };

    const handleClearFilters = () => {
        setPendingBrandIds([]);
        setPendingCategoryIds([]);
        setPendingSilhouetteIds([]);
        setPendingGenderIds([]);
        setAppliedFilters({ brandIds: [], categoryIds: [], silhouetteIds: [], genderIds: [] });
    };

    // Export handler
    const handleExport = useCallback(async () => {
        if (exportState === "completed" && exportJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/finance/items/export/${exportJobId}/download`;
            window.open(url, "_blank");
            
            // Reset
            setExportState("idle");
            setExportJobId(null);
            setExportProgress(0);
            return;
        }

        setExportState("queueing");
        try {
            const result = await queueItemsExport(
                search || undefined,
                sortColumn,
                sortDir,
                {
                    brandIds: appliedFilters.brandIds.length ? appliedFilters.brandIds : undefined,
                    categoryIds: appliedFilters.categoryIds.length ? appliedFilters.categoryIds : undefined,
                    silhouetteIds: appliedFilters.silhouetteIds.length ? appliedFilters.silhouetteIds : undefined,
                    genderIds: appliedFilters.genderIds.length ? appliedFilters.genderIds : undefined,
                },
            );
            if (result.status && result.data?.jobId) {
                setExportJobId(result.data.jobId);
                setExportState("processing");
                setExportProgress(5);
                toast.info("Background items export queued.");
            } else {
                setExportState("failed");
                toast.error(result.message || "Failed to queue export");
            }
        } catch (err: any) {
            setExportState("failed");
            toast.error(err?.message || "Export failed. Please try again.");
        }
    }, [exportState, exportJobId, search, sortColumn, sortDir, appliedFilters]);

    // Filter slot
    const filterSlot = (
        <div className="flex items-center gap-1.5">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative inline-flex">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() => {
                                setPendingBrandIds(appliedFilters.brandIds);
                                setPendingCategoryIds(appliedFilters.categoryIds);
                                setPendingSilhouetteIds(appliedFilters.silhouetteIds);
                                setPendingGenderIds(appliedFilters.genderIds);
                                setIsFilterOpen(true);
                            }}
                        >
                            <Filter className="h-3.5 w-3.5" /> Filter
                        </Button>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>Filter by brand, category, silhouette or gender</TooltipContent>
            </Tooltip>
            {activeFilterCount > 0 && (
                <button
                    type="button"
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-1"
                >
                    <X className="h-3 w-3" /> Clear
                </button>
            )}
        </div>
    );

    // SKU grouping
    const groups = useMemo(() => groupItemsBySku(items), [items]);

    const toggleSku = useCallback((sku: string) => {
        setExpandedSkus((prev) => {
            const next = new Set(prev);
            if (next.has(sku)) next.delete(sku);
            else next.add(sku);
            return next;
        });
    }, []);

    // ── Auto-Expand matching SKUs when searching by barcode / SKU / uniqueNo ────────
    useEffect(() => {
        if (!search || !search.trim()) return;
        const term = search.trim().toLowerCase();
        const matchingSkus = new Set<string>();

        for (const it of items) {
            const isMatch =
                (it.barCode && it.barCode.toLowerCase().includes(term)) ||
                (it.uniqueNo && it.uniqueNo.toLowerCase().includes(term)) ||
                (it.itemId && it.itemId.toLowerCase().includes(term)) ||
                (it.sku && it.sku.toLowerCase().includes(term)) ||
                (it.description && it.description.toLowerCase().includes(term));

            if (isMatch && it.sku) {
                matchingSkus.add(it.sku);
            }
        }

        if (matchingSkus.size > 0) {
            setExpandedSkus((prev) => {
                const next = new Set(prev);
                matchingSkus.forEach((sku) => next.add(sku));
                return next;
            });
        }
    }, [search, items]);

    // Expand All / Collapse All toggle
    const allExpanded = groups.length > 0 && groups.every((g) => expandedSkus.has(g.sku));
    const toggleExpandAll = useCallback(() => {
        if (allExpanded) {
            setExpandedSkus(new Set());
        } else {
            setExpandedSkus(new Set(groups.map((g) => g.sku)));
        }
    }, [allExpanded, groups]);

    const handlePrintArticleVariants = (variants: Item[]) => {
        setPrintModalItems(variants);
        setIsBarcodeModalOpen(true);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-0 pb-7 gap-4">
                <div>
                    <CardTitle className="text-2xl font-bold">Items Catalog</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        {meta.total > 0
                            ? `${meta.total.toLocaleString()} variant items · ${groups.length.toLocaleString()} unique styles on this page`
                            : "No items yet"}
                        {isFetching && !isLoading && (
                            <span className="ml-2 inline-flex items-center gap-1 text-primary">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Updating...
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {/* Background update upload progress button */}
                    {activeUpdateUploadId && !isBulkUpdateOpen && (
                        <Button
                            variant={updateProgress?.status === 'failed' || updateProgress?.status === 'cancelled' ? 'destructive' : updateProgress?.status === 'completed' ? 'default' : 'outline'}
                            className={`border-primary text-primary relative overflow-hidden min-w-[180px] ${updateProgress?.status === 'failed' || updateProgress?.status === 'cancelled' ? 'text-primary-foreground! bg-destructive!' : updateProgress?.status === 'completed' ? 'text-primary-foreground! bg-primary!' : ''}`}
                            onClick={() => setIsBulkUpdateOpen(true)}
                        >
                            <div
                                className="absolute inset-0 bg-primary/10 transition-all duration-500"
                                style={{ width: `${updateProgress?.progress ?? 0}%` }}
                            />
                            <div className="relative flex items-center gap-2">
                                {(updateProgress?.status === "validating" || updateProgress?.status === "processing" || updateProgress?.status === "pending") && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                <span className="font-bold">
                                    {updateProgress?.status === "failed"
                                        ? "Update Failed"
                                        : updateProgress?.status === "cancelled"
                                            ? "Job Cancelled"
                                            : updateProgress?.status === "completed"
                                                ? "Update Complete"
                                                : updateProgress?.status === "validated"
                                                    ? "Val. Complete"
                                                    : updateProgress?.status === "validating"
                                                        ? "Validating"
                                                        : "Updating"}
                                    {["failed", "completed", "validated", "cancelled"].includes(updateProgress?.status || "") ? "" : ` ${updateProgress?.progress ?? 0}%`}
                                </span>
                            </div>
                        </Button>
                    )}

                    {/* Background upload progress button */}
                    {activeUploadId && !isBulkUploadOpen && (
                        <Button
                            variant={uploadProgress?.status === 'failed' || uploadProgress?.status === 'cancelled' ? 'destructive' : uploadProgress?.status === 'completed' ? 'default' : 'outline'}
                            className={`border-primary text-primary relative overflow-hidden min-w-[180px] ${uploadProgress?.status === 'failed' || uploadProgress?.status === 'cancelled' ? 'text-destructive-foreground! bg-destructive!' : uploadProgress?.status === 'completed' ? 'text-primary-foreground! bg-primary!' : ''}`}
                            onClick={() => setIsBulkUploadOpen(true)}
                        >
                            <div
                                className="absolute inset-0 bg-primary/10 transition-all duration-500"
                                style={{ width: `${uploadProgress?.progress ?? 0}%` }}
                            />
                            <div className="relative flex items-center gap-2">
                                {(uploadProgress?.status === "validating" || uploadProgress?.status === "processing" || uploadProgress?.status === "pending") && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                <span className="font-bold">
                                    {uploadProgress?.status === "failed"
                                        ? "Import Failed"
                                        : uploadProgress?.status === "cancelled"
                                            ? "Job Cancelled"
                                            : uploadProgress?.status === "completed"
                                                ? "Import Complete"
                                                : uploadProgress?.status === "validated"
                                                    ? "Validation Complete"
                                                    : uploadProgress?.status === "validating"
                                                        ? "Validating"
                                                        : "Importing"}
                                    {["failed", "completed", "validated", "cancelled"].includes(uploadProgress?.status || "") ? "" : ` ${uploadProgress?.progress ?? 0}%`}
                                </span>
                            </div>
                        </Button>
                    )}

                    {/* Export Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={exportState === "completed" ? "default" : "outline"}
                                onClick={handleExport}
                                disabled={(exportState === "queueing" || exportState === "processing") || meta.total === 0}
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
                        </TooltipTrigger>
                        <TooltipContent>
                            Export {activeFilterCount > 0 || search ? "filtered" : "all"} items to Excel
                            {meta.total > 0 && ` (${meta.total.toLocaleString()} rows)`} — runs in background
                        </TooltipContent>
                    </Tooltip>

                    {canBulkUpload && (
                        <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                        </Button>
                    )}
                    {canUpdate && (
                        <Button variant="outline" onClick={() => setIsBulkUpdateOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" /> Bulk Update Prices
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => {
                            setPrintModalItems([]);
                            setIsBarcodeModalOpen(true);
                        }}
                        disabled={items.length === 0}
                    >
                        <ScanBarcode className="mr-2 h-4 w-4" /> Print Barcodes
                    </Button>
                    {canUpdate && (
                        <Link href="/erp/items/bulk-discount" transitionTypes={["nav-forward"]}>
                            <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/5">
                                <Sparkles className="mr-2 h-4 w-4" /> Bulk Discount
                            </Button>
                        </Link>
                    )}
                    {canCreate && (
                        <Link href="/erp/items/create" transitionTypes={["nav-forward"]}>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </Link>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <ProCatalogTable
                    groups={groups}
                    items={items}
                    expandedSkus={expandedSkus}
                    onToggleSku={toggleSku}
                    onToggleExpandAll={toggleExpandAll}
                    allExpanded={allExpanded}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onViewArticle={(sku) => setSelectedArticleSku(sku)}
                    onPrintArticleVariants={handlePrintArticleVariants}
                    search={search}
                    onSearchChange={setSearch}
                    filterSlot={filterSlot}
                    rowCount={meta.total}
                    pageCount={meta.totalPages}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    canUpdate={canUpdate}
                />
            </CardContent>

            <ArticleDetailSheet
                sku={selectedArticleSku}
                open={!!selectedArticleSku}
                onOpenChange={(open) => !open && setSelectedArticleSku(null)}
                onPrintBarcodes={(variants) => {
                    handlePrintArticleVariants(variants);
                }}
            />

            <BulkUploadModal
                open={isBulkUploadOpen}
                onOpenChange={setIsBulkUploadOpen}
                uploadId={activeUploadId}
                onUploadIdChange={handleUploadIdChange}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["items"] });
                    toast.success("Item list refreshed");
                    handleUploadIdChange(null);
                }}
            />

            <ItemUpdateBulkUploadModal
                open={isBulkUpdateOpen}
                onOpenChange={setIsBulkUpdateOpen}
                uploadId={activeUpdateUploadId}
                onUploadIdChange={handleUpdateUploadIdChange}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["items"] });
                    toast.success("Item list refreshed");
                    handleUpdateUploadIdChange(null);
                }}
            />

            <FilterSheet
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                brands={brands}
                categories={categories}
                silhouettes={silhouettes}
                genders={genders}
                pendingBrandIds={pendingBrandIds}
                pendingCategoryIds={pendingCategoryIds}
                pendingSilhouetteIds={pendingSilhouetteIds}
                pendingGenderIds={pendingGenderIds}
                setPendingBrandIds={setPendingBrandIds}
                setPendingCategoryIds={setPendingCategoryIds}
                setPendingSilhouetteIds={setPendingSilhouetteIds}
                setPendingGenderIds={setPendingGenderIds}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
            />

            <BarcodePrintModal
                open={isBarcodeModalOpen}
                onOpenChange={setIsBarcodeModalOpen}
                items={printModalItems.length > 0 ? printModalItems : items}
            />

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
        </Card>
    );
}
