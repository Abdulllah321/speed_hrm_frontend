"use client";

import React, { useState, useMemo } from "react";
import { Location } from "@/lib/actions/location";
import { Warehouse } from "@/lib/actions/warehouse";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { AttributeOptions } from "./types";
import {
    Search,
    RefreshCw,
    FileSpreadsheet,
    Printer,
    ChevronDown,
    Check,
    X,
    Store,
    Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface FiltersProps {
    isPosLevel?: boolean;
    posLocationName?: string;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    locations: Location[];
    warehouses: Warehouse[];
    selectedSourceIds: string[];
    setSelectedSourceIds: (ids: string[]) => void;
    selectedDestIds: string[];
    setSelectedDestIds: (ids: string[]) => void;
    filterTransferTypes: Set<string>;
    setFilterTransferTypes: (types: Set<string>) => void;
    filterStatuses: Set<string>;
    setFilterStatuses: (statuses: Set<string>) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    attributeOptions: AttributeOptions;
    filterBrands: Set<string>;
    setFilterBrands: (brands: Set<string>) => void;
    filterDivisions: Set<string>;
    setFilterDivisions: (divisions: Set<string>) => void;
    filterCategories: Set<string>;
    setFilterCategories: (categories: Set<string>) => void;
    filterGenders: Set<string>;
    setFilterGenders: (genders: Set<string>) => void;
    filterSilhouettes: Set<string>;
    setFilterSilhouettes: (silhouettes: Set<string>) => void;
    filterSizes: Set<string>;
    setFilterSizes: (sizes: Set<string>) => void;
    filterColors: Set<string>;
    setFilterColors: (colors: Set<string>) => void;

    isLoading: boolean;
    onRefresh: () => void;
    onExcelExport: () => void;
    onPdfExport: () => void;
    isExporting: boolean;
}

// ─── Standard Multi-Select Popover Filter (Exact match to other reports) ───────
function FilterDropdown({
    label,
    options,
    selected,
    onToggle,
}: {
    label: string;
    options: string[];
    selected: Set<string>;
    onToggle: (val: string) => void;
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
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap",
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
                                    className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-muted/60 transition-colors cursor-pointer"
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
                            className="text-[11px] text-destructive hover:underline px-2 py-0.5 cursor-pointer"
                        >
                            Clear Selection
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

export function StockTransferFilters({
    isPosLevel = false,
    posLocationName = "Current Store",
    dateRange,
    setDateRange,
    locations,
    warehouses,
    selectedSourceIds,
    setSelectedSourceIds,
    selectedDestIds,
    setSelectedDestIds,
    filterTransferTypes,
    setFilterTransferTypes,
    filterStatuses,
    setFilterStatuses,
    searchQuery,
    setSearchQuery,
    attributeOptions,
    filterBrands,
    setFilterBrands,
    filterDivisions,
    setFilterDivisions,
    filterCategories,
    setFilterCategories,
    filterGenders,
    setFilterGenders,
    filterSilhouettes,
    setFilterSilhouettes,
    filterSizes,
    setFilterSizes,
    filterColors,
    setFilterColors,
    isLoading,
    onRefresh,
    onExcelExport,
    onPdfExport,
    isExporting,
}: FiltersProps) {
    // Source & Destination MultiSelect options (Locations & Warehouses combined with icons/descriptions)
    const sourceOptions: MultiSelectOption[] = useMemo(() => [
        ...warehouses.map((wh) => ({
            value: wh.id,
            label: `WH: ${wh.name}`,
            description: wh.code || "Warehouse",
        })),
        ...locations.map((loc) => ({
            value: loc.id,
            label: `Store: ${loc.name}`,
            description: loc.code || "Outlet",
        })),
    ], [warehouses, locations]);

    const destOptions: MultiSelectOption[] = useMemo(() => [
        ...warehouses.map((wh) => ({
            value: wh.id,
            label: `WH: ${wh.name}`,
            description: wh.code || "Warehouse",
        })),
        ...locations.map((loc) => ({
            value: loc.id,
            label: `Store: ${loc.name}`,
            description: loc.code || "Outlet",
        })),
    ], [warehouses, locations]);

    // Route & Status options for FilterDropdown
    const routeOptions = [
        "Warehouse → Outlet",
        "Outlet → Warehouse (Return)",
        "Outlet → Outlet",
        "Warehouse → Warehouse",
    ];

    const statusOptions = ["Completed", "Pending", "In-Transit", "Cancelled"];

    const toggleFilter = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
        const next = new Set(set);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        setter(next);
    };

    const hasActiveFilters =
        selectedSourceIds.length > 0 ||
        selectedDestIds.length > 0 ||
        filterTransferTypes.size > 0 ||
        filterStatuses.size > 0 ||
        filterBrands.size > 0 ||
        filterDivisions.size > 0 ||
        filterCategories.size > 0 ||
        filterGenders.size > 0 ||
        filterSilhouettes.size > 0 ||
        filterSizes.size > 0 ||
        filterColors.size > 0 ||
        !!searchQuery;

    const clearAllFilters = () => {
        setSelectedSourceIds([]);
        setSelectedDestIds([]);
        setFilterTransferTypes(new Set());
        setFilterStatuses(new Set());
        setFilterBrands(new Set());
        setFilterDivisions(new Set());
        setFilterCategories(new Set());
        setFilterGenders(new Set());
        setFilterSilhouettes(new Set());
        setFilterSizes(new Set());
        setFilterColors(new Set());
        setSearchQuery("");
    };

    return (
        <div className="space-y-2.5">
            {/* Control Bar: Sources, Destinations, Date Range & Actions */}
            <div className="p-3 rounded-2xl border border-border bg-card shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Outlets & Warehouses Multi-Selects */}
                    {isPosLevel ? (
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs">
                            <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Current Store: {posLocationName}</span>
                        </div>
                    ) : (
                        <>
                            {/* Source Multi-Select */}
                            <div className="w-48 sm:w-56">
                                <MultiSelect
                                    options={sourceOptions}
                                    selected={selectedSourceIds}
                                    onChange={setSelectedSourceIds}
                                    placeholder="All Sources (From)"
                                />
                            </div>

                            {/* Destination Multi-Select */}
                            <div className="w-48 sm:w-56">
                                <MultiSelect
                                    options={destOptions}
                                    selected={selectedDestIds}
                                    onChange={setSelectedDestIds}
                                    placeholder="All Destinations (To)"
                                />
                            </div>
                        </>
                    )}

                    {/* Date Range Picker */}
                    <DateRangePicker
                        initialDateFrom={dateRange?.from}
                        initialDateTo={dateRange?.to}
                        onUpdate={({ range }: { range: DateRange }) => {
                            if (range) setDateRange(range);
                        }}
                    />

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-primary")} />
                        Refresh
                    </Button>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        onClick={onExcelExport}
                        disabled={isLoading || isExporting}
                        className="h-9 px-3.5 rounded-xl gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Excel
                    </Button>

                    <Button
                        onClick={onPdfExport}
                        disabled={isLoading || isExporting}
                        variant="outline"
                        className="h-9 px-3.5 rounded-xl gap-2 text-xs font-semibold border-border hover:bg-muted shadow-sm transition-all cursor-pointer"
                    >
                        <Printer className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        PDF / Print
                    </Button>
                </div>
            </div>

            {/* Filter Attributes & Live Search Bar */}
            <div className="p-3 rounded-2xl border border-border bg-card shadow-sm space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search STN #, tracking #, rider, courier, route, user, SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-border bg-muted/40 outline-none focus:border-primary focus:bg-background transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Transfer Route Popover Filter */}
                    <FilterDropdown
                        label="Transfer Route"
                        options={routeOptions}
                        selected={filterTransferTypes}
                        onToggle={(v) => toggleFilter(filterTransferTypes, setFilterTransferTypes, v)}
                    />

                    {/* Status Popover Filter */}
                    <FilterDropdown
                        label="Status"
                        options={statusOptions}
                        selected={filterStatuses}
                        onToggle={(v) => toggleFilter(filterStatuses, setFilterStatuses, v)}
                    />

                    {/* Brand Filter */}
                    <FilterDropdown
                        label="Brand"
                        options={attributeOptions.brands}
                        selected={filterBrands}
                        onToggle={(v) => toggleFilter(filterBrands, setFilterBrands, v)}
                    />

                    {/* Category Filter */}
                    <FilterDropdown
                        label="Category"
                        options={attributeOptions.categories}
                        selected={filterCategories}
                        onToggle={(v) => toggleFilter(filterCategories, setFilterCategories, v)}
                    />

                    {/* Gender Filter */}
                    <FilterDropdown
                        label="Gender"
                        options={attributeOptions.genders}
                        selected={filterGenders}
                        onToggle={(v) => toggleFilter(filterGenders, setFilterGenders, v)}
                    />

                    {/* Size Filter */}
                    <FilterDropdown
                        label="Size"
                        options={attributeOptions.sizes}
                        selected={filterSizes}
                        onToggle={(v) => toggleFilter(filterSizes, setFilterSizes, v)}
                    />

                    {/* Color Filter */}
                    <FilterDropdown
                        label="Color"
                        options={attributeOptions.colors}
                        selected={filterColors}
                        onToggle={(v) => toggleFilter(filterColors, setFilterColors, v)}
                    />

                    {/* Clear All Active Filters */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                        >
                            <X className="h-3 w-3" />
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
