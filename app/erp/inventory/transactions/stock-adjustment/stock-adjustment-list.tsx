"use client";

import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import DataTable from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, Plus, Printer, Repeat, ClipboardList, ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getStockAdjustments } from "@/lib/actions/stock-adjustment";
import { getLocations } from "@/lib/actions/location";
import { printStockAdjustmentNote } from "@/lib/utils/print-stock-adjustment";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface StockAdjustmentRow {
    id: string;
    adjustmentNo: string;
    warehouseId: string;
    adjustmentDate: string;
    status: "DRAFT" | "PENDING_APPROVAL" | "SUBMITTED" | "REJECTED" | "CANCELLED";
    adjustmentType?: "STANDARD" | "SWAP";
    reason: string | null;
    notes: string | null;
    createdAt: string;
    warehouse?: {
        name: string;
        code: string;
    };
    items: any[];
}

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
    DRAFT: {
        label: "Draft",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300",
    },
    SUBMITTED: {
        label: "Submitted / Approved",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    REJECTED: {
        label: "Rejected",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300",
    },
    CANCELLED: {
        label: "Cancelled",
        badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300",
    },
};

const columns: ColumnDef<StockAdjustmentRow>[] = [
    {
        accessorKey: "adjustmentDate",
        header: "Date",
        cell: ({ row }) => {
            const dateVal = row.original.adjustmentDate || row.original.createdAt;
            return (
                <div className="flex flex-col">
                    <span className="text-sm font-medium whitespace-nowrap">
                        {dateVal ? format(new Date(dateVal), "dd MMM yyyy") : "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {dateVal ? format(new Date(dateVal), "HH:mm") : ""}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "adjustmentNo",
        header: "Adjustment No",
        cell: ({ row }) => (
            <span className="font-semibold font-mono text-sm">
                {row.original.adjustmentNo}
            </span>
        ),
    },
    {
        accessorKey: "adjustmentType",
        header: "Type",
        cell: ({ row }) => {
            const isSwap = row.original.adjustmentType === "SWAP";
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1 w-fit",
                        isSwap
                            ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300"
                    )}
                >
                    {isSwap ? <Repeat className="h-3 w-3" /> : <ClipboardList className="h-3 w-3" />}
                    {isSwap ? "Stock Swap" : "Standard Count"}
                </Badge>
            );
        },
    },
    {
        id: "location",
        header: "Location / Outlet",
        cell: ({ row }) => {
            const locationName =
                row.original.items?.find((i) => i.location?.name)?.location?.name;
            return (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                        {locationName || row.original.warehouse?.name || "Head Office / Warehouse"}
                    </span>
                    {locationName && row.original.warehouse?.name && (
                        <span className="text-xs text-muted-foreground">
                            Warehouse: {row.original.warehouse.name}
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground truncate max-w-56 block" title={row.original.reason || ""}>
                {row.original.reason || "—"}
            </span>
        ),
    },
    {
        accessorKey: "items",
        header: "Items Count",
        cell: ({ row }) => (
            <span className="text-sm font-semibold">
                {row.original.items?.length || 0} items
            </span>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const meta = STATUS_META[row.original.status] ?? {
                label: row.original.status,
                badgeClass: "bg-muted text-muted-foreground",
            };
            return (
                <Badge variant="outline" className={cn("text-xs font-semibold px-2 py-0.5", meta.badgeClass)}>
                    {meta.label}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
            <div className="flex items-center gap-1.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Print Adjustment Note"
                    onClick={() => printStockAdjustmentNote(row.original)}
                >
                    <Printer className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
                <Link href={`/erp/inventory/transactions/stock-adjustment/${row.original.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Details">
                        <Eye className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        ),
    },
];

function FilterDropdown({
    label,
    options,
    selected,
    onToggle,
}: {
    label: string;
    options: string[];
    selected: Set<string>;
    onToggle: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = useMemo(
        () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
        [options, search]
    );

    const count = selected.size;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap cursor-pointer",
                        count > 0
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                >
                    <span>{label}</span>
                    {count > 0 && (
                        <span className="bg-white/20 text-inherit px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
                            {count}
                        </span>
                    )}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[240px] p-0 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50"
            >
                <div className="p-2 border-b border-border">
                    <input
                        autoFocus
                        type="text"
                        placeholder={`Search ${label}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 outline-none focus:border-primary"
                    />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-2 text-center">No options</p>
                    ) : (
                        filtered.map((opt) => {
                            const isChecked = selected.has(opt);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => onToggle(opt)}
                                    className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-muted/60 transition-colors"
                                >
                                    <span className="truncate pr-2">{opt}</span>
                                    {isChecked && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>
                {count > 0 && (
                    <div className="p-1.5 border-t border-border bg-muted/30 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                options.forEach((o) => {
                                    if (selected.has(o)) onToggle(o);
                                });
                            }}
                            className="text-[11px] text-destructive hover:underline px-2 py-0.5"
                        >
                            Clear Selection
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

interface StockAdjustmentListProps {
    initialEntries: StockAdjustmentRow[];
    initialMeta?: { total: number; page: number; limit: number; totalPages: number };
}

export function StockAdjustmentList({ initialEntries, initialMeta }: StockAdjustmentListProps) {
    const [entries, setEntries] = useState<StockAdjustmentRow[]>(initialEntries);
    const [meta, setMeta] = useState(
        initialMeta ?? { total: initialEntries.length, page: 1, limit: 50, totalPages: 1 }
    );
    const [isPending, startTransition] = useTransition();
    const [activeStatus, setActiveStatus] = useState<string>("");

    const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
    const [filterDivisions, setFilterDivisions] = useState<Set<string>>(new Set());
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
    const [filterGenders, setFilterGenders] = useState<Set<string>>(new Set());
    const [filterSilhouettes, setFilterSilhouettes] = useState<Set<string>>(new Set());
    const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
    const [filterColors, setFilterColors] = useState<Set<string>>(new Set());
    const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set());

    const [stockLocations, setStockLocations] = useState<string[]>([]);

    useEffect(() => {
        async function fetchLocs() {
            try {
                const res = await getLocations(true);
                let locs = [];
                if (Array.isArray(res)) {
                    locs = res.map(r => r.name);
                } else if (res && res.status && res.data) {
                    locs = res.data.map(r => r.name);
                }
                setStockLocations(locs.sort());
            } catch (e) {
                console.error(e);
            }
        }
        fetchLocs();
    }, []);

    const fetchPage = useCallback(
        (pagination: PaginationState, status?: string) => {
            startTransition(async () => {
                const result = await getStockAdjustments({
                    page: pagination.pageIndex + 1,
                    limit: pagination.pageSize,
                    status: status && status !== "all" ? status : undefined,
                });
                if (result?.status !== false) {
                    setEntries(result.data ?? []);
                    setMeta(result.meta ?? meta);
                }
            });
        },
        [meta]
    );

    const handlePaginationChange = useCallback(
        (pagination: PaginationState) => {
            fetchPage(pagination, activeStatus);
        },
        [activeStatus, fetchPage]
    );

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const newStatus = key === "status" ? value : activeStatus;
            if (key === "status") setActiveStatus(value);

            fetchPage({ pageIndex: 0, pageSize: meta.limit }, newStatus);
        },
        [activeStatus, meta.limit, fetchPage]
    );

    const attributeOptions = useMemo(() => {
        const locations = new Set<string>();
        const brands = new Set<string>();
        const divisions = new Set<string>();
        const categories = new Set<string>();
        const genders = new Set<string>();
        const silhouettes = new Set<string>();
        const sizes = new Set<string>();
        const colors = new Set<string>();

        entries.forEach(adj => {
            const locName = adj.items?.find((i: any) => i.location?.name)?.location?.name;
            const finalLoc = locName || adj.warehouse?.name || "Head Office / Warehouse";
            locations.add(finalLoc);

            adj.items?.forEach((i: any) => {
                const item = i.item || i.swapItem || {};
                
                const b = item.brand?.name || item.brand;
                if (b && typeof b === "string") brands.add(b);

                const d = item.division?.name || item.division;
                if (d && typeof d === "string") divisions.add(d);

                const c = item.category?.name || item.category;
                if (c && typeof c === "string") categories.add(c);

                const g = item.gender?.name || item.gender;
                if (g && typeof g === "string") genders.add(g);

                const sil = item.silhouette?.name || item.silhouette;
                if (sil && typeof sil === "string") silhouettes.add(sil);

                const sz = item.size?.name || item.size;
                if (sz && typeof sz === "string") sizes.add(sz);

                const col = item.color?.name || item.color;
                if (col && typeof col === "string") colors.add(col);
            });
        });

        return {
            locations: stockLocations.length > 0 ? stockLocations : Array.from(locations).sort(),
            brands: Array.from(brands).sort(),
            divisions: Array.from(divisions).sort(),
            categories: Array.from(categories).sort(),
            genders: Array.from(genders).sort(),
            silhouettes: Array.from(silhouettes).sort(),
            sizes: Array.from(sizes).sort(),
            colors: Array.from(colors).sort(),
        };
    }, [entries, stockLocations]);

    const toggleFilter = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
        const next = new Set(set);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        setter(next);
    };

    const clearAllFilters = () => {
        setFilterLocations(new Set());
        setFilterBrands(new Set());
        setFilterDivisions(new Set());
        setFilterCategories(new Set());
        setFilterGenders(new Set());
        setFilterSilhouettes(new Set());
        setFilterSizes(new Set());
        setFilterColors(new Set());
    };

    const hasActiveAttributeFilters =
        filterLocations.size > 0 ||
        filterBrands.size > 0 ||
        filterDivisions.size > 0 ||
        filterCategories.size > 0 ||
        filterGenders.size > 0 ||
        filterSilhouettes.size > 0 ||
        filterSizes.size > 0 ||
        filterColors.size > 0;

    const filteredEntries = useMemo(() => {
        if (!hasActiveAttributeFilters) return entries;
        
        return entries.filter(adj => {
            const locName = adj.items?.find((i: any) => i.location?.name)?.location?.name;
            const finalLoc = locName || adj.warehouse?.name || "Head Office / Warehouse";
            const matchLoc = filterLocations.size === 0 || filterLocations.has(finalLoc);
            
            if (!matchLoc) return false;

            // If only location is filtered, and it matches, and there are no other active filters
            const hasItemFilters = filterBrands.size > 0 || filterDivisions.size > 0 || filterCategories.size > 0 || filterGenders.size > 0 || filterSilhouettes.size > 0 || filterSizes.size > 0 || filterColors.size > 0;
            if (!hasItemFilters) return true;

            return adj.items?.some((i: any) => {
                const item = i.item || i.swapItem || {};
                const b = item.brand?.name || item.brand;
                const d = item.division?.name || item.division;
                const c = item.category?.name || item.category;
                const g = item.gender?.name || item.gender;
                const sil = item.silhouette?.name || item.silhouette;
                const sz = item.size?.name || item.size;
                const col = item.color?.name || item.color;

                const matchBrand = filterBrands.size === 0 || (b && filterBrands.has(b));
                const matchDiv = filterDivisions.size === 0 || (d && filterDivisions.has(d));
                const matchCat = filterCategories.size === 0 || (c && filterCategories.has(c));
                const matchGen = filterGenders.size === 0 || (g && filterGenders.has(g));
                const matchSil = filterSilhouettes.size === 0 || (sil && filterSilhouettes.has(sil));
                const matchSize = filterSizes.size === 0 || (sz && filterSizes.has(sz));
                const matchColor = filterColors.size === 0 || (col && filterColors.has(col));

                return matchBrand && matchDiv && matchCat && matchGen && matchSil && matchSize && matchColor;
            });
        });
    }, [entries, filterLocations, filterBrands, filterDivisions, filterCategories, filterGenders, filterSilhouettes, filterSizes, filterColors, hasActiveAttributeFilters]);

    const toolbarSlot = (
        <div className="flex items-center gap-2">
            <Link href="/erp/inventory/transactions/stock-adjustment/new">
                <Button className="gap-2 bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all">
                    <Plus className="h-4 w-4" />
                    New Adjustment
                </Button>
            </Link>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-muted/20 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">Smart Filters</span>
                    </div>
                    <FilterDropdown
                        label="Outlet / Location"
                        options={attributeOptions.locations}
                        selected={filterLocations}
                        onToggle={(v) => toggleFilter(filterLocations, setFilterLocations, v)}
                    />
                    <FilterDropdown
                        label="Brand"
                        options={attributeOptions.brands}
                        selected={filterBrands}
                        onToggle={(v) => toggleFilter(filterBrands, setFilterBrands, v)}
                    />
                    <FilterDropdown
                        label="Division"
                        options={attributeOptions.divisions}
                        selected={filterDivisions}
                        onToggle={(v) => toggleFilter(filterDivisions, setFilterDivisions, v)}
                    />
                    <FilterDropdown
                        label="Category"
                        options={attributeOptions.categories}
                        selected={filterCategories}
                        onToggle={(v) => toggleFilter(filterCategories, setFilterCategories, v)}
                    />
                    <FilterDropdown
                        label="Gender"
                        options={attributeOptions.genders}
                        selected={filterGenders}
                        onToggle={(v) => toggleFilter(filterGenders, setFilterGenders, v)}
                    />
                    <FilterDropdown
                        label="Silhouette"
                        options={attributeOptions.silhouettes}
                        selected={filterSilhouettes}
                        onToggle={(v) => toggleFilter(filterSilhouettes, setFilterSilhouettes, v)}
                    />
                    <FilterDropdown
                        label="Size"
                        options={attributeOptions.sizes}
                        selected={filterSizes}
                        onToggle={(v) => toggleFilter(filterSizes, setFilterSizes, v)}
                    />
                    <FilterDropdown
                        label="Color"
                        options={attributeOptions.colors}
                        selected={filterColors}
                        onToggle={(v) => toggleFilter(filterColors, setFilterColors, v)}
                    />

                    {hasActiveAttributeFilters && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-xs text-destructive hover:underline font-medium px-2"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            <DataTable
                tableId="stock-adjustment-list"
                title="Stock Adjustments"
                columns={columns}
                data={filteredEntries}
                isLoading={isPending}
                searchFields={[
                    { key: "adjustmentNo", label: "Adjustment No" },
                    { key: "reason", label: "Reason" },
                ]}
                filters={[
                    {
                        key: "status",
                        label: "Status",
                        options: [
                            { label: "Draft", value: "DRAFT" },
                            { label: "Pending Approval", value: "PENDING_APPROVAL" },
                            { label: "Submitted / Approved", value: "SUBMITTED" },
                            { label: "Rejected", value: "REJECTED" },
                            { label: "Cancelled", value: "CANCELLED" },
                        ],
                    },
                ]}
                filterSlot={toolbarSlot}
                onFilterChange={handleFilterChange}
                manualPagination
                rowCount={meta.total}
                pageCount={meta.totalPages}
                onPaginationChange={handlePaginationChange}
            />
        </div>
    );
}
