"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { GroupingLevels } from "./types";
import { Location } from "@/lib/actions/location";
import { Warehouse } from "@/lib/actions/warehouse";
import {
    Search,
    RefreshCw,
    Download,
    Printer,
    SlidersHorizontal,
    Layers,
    X,
    Loader2,
    Calendar,
    ChevronDownIcon,
    Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Multi-select Popover ───────────────────────────────────────────────────
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

    const filtered = useMemo(() =>
        options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
        [options, search]
    );

    const selectedCount = selected.size;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                        selectedCount > 0
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                >
                    <span>{label}</span>
                    {selectedCount > 0 && (
                        <span className="bg-white/20 text-inherit px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
                            {selectedCount}
                        </span>
                    )}
                    <svg className={cn("h-3 w-3 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
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
                    {filtered.length === 0 && (
                        <p className="text-xs text-muted-foreground px-3 py-2 text-center">No results</p>
                    )}
                    {filtered.map((opt) => (
                        <label
                            key={opt}
                            className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={selected.has(opt)}
                                onChange={() => onToggle(opt)}
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className="text-xs font-medium text-foreground truncate">{opt}</span>
                        </label>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

interface FiltersProps {
    isPosLevel?: boolean;
    posLocationName?: string;
    dateRange: DateRange;
    setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
    locations: Location[];
    warehouses: Warehouse[];
    selectedLocationIds: string[];
    setSelectedLocationIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectedWarehouseIds: string[];
    setSelectedWarehouseIds: React.Dispatch<React.SetStateAction<string[]>>;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    reportType: "merged" | "separate";
    setReportType: (v: "merged" | "separate") => void;
    groupingLevels: GroupingLevels;
    setGroupingLevels: React.Dispatch<React.SetStateAction<GroupingLevels>>;
    attributeOptions: {
        brands: string[];
        divisions: string[];
        categories: string[];
        genders: string[];
        silhouettes: string[];
        sizes: string[];
        colors: string[];
    };
    filterBrands: Set<string>;
    setFilterBrands: React.Dispatch<React.SetStateAction<Set<string>>>;
    filterDivisions: Set<string>;
    setFilterDivisions: React.Dispatch<React.SetStateAction<Set<string>>>;
    filterCategories: Set<string>;
    setFilterCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
    filterGenders: Set<string>;
    setFilterGenders: React.Dispatch<React.SetStateAction<Set<string>>>;
    filterSilhouettes: Set<string>;
    setFilterSilhouettes: React.Dispatch<React.SetStateAction<Set<string>>>;
    filterSizes: Set<string>;
    setFilterSizes: React.Dispatch<React.SetStateAction<Set<string>>>;
    filterColors: Set<string>;
    setFilterColors: React.Dispatch<React.SetStateAction<Set<string>>>;
    isLoading: boolean;
    fetchProgressPercent?: number;
    fetchProgressMessage?: string;
    onRefresh: () => void;
    onExcelExport: (mode: "hierarchy" | "flat" | "both") => void;
    onPdfExport: (mode: "hierarchy" | "flat") => void;
    exportProgressPercent: number;
    exportProgressMessage: string;
    isExporting: boolean;
}

export function AvailableStockFilters({
    isPosLevel = false,
    posLocationName = "Current Store",
    dateRange,
    setDateRange,
    locations,
    warehouses,
    selectedLocationIds,
    setSelectedLocationIds,
    selectedWarehouseIds,
    setSelectedWarehouseIds,
    searchQuery,
    setSearchQuery,
    reportType,
    setReportType,
    groupingLevels,
    setGroupingLevels,
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
    fetchProgressPercent = 0,
    fetchProgressMessage = "",
    onRefresh,
    onExcelExport,
    onPdfExport,
    exportProgressPercent,
    exportProgressMessage,
    isExporting,
}: FiltersProps) {
    const [showLevelPanel, setShowLevelPanel] = useState(false);

    const locationOptions: MultiSelectOption[] = useMemo(() => {
        return locations.map((loc) => ({
            value: loc.id,
            label: loc.name,
            description: loc.code ? `Code: ${loc.code}` : undefined,
        }));
    }, [locations]);

    const warehouseOptions: MultiSelectOption[] = useMemo(() => {
        return warehouses.map((wh) => ({
            value: wh.id,
            label: wh.name,
            description: wh.code ? `Code: ${wh.code}` : undefined,
        }));
    }, [warehouses]);

    const toggleSetItem = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, item: string) => {
        setFn((prev) => {
            const next = new Set(prev);
            if (next.has(item)) next.delete(item);
            else next.add(item);
            return next;
        });
    };

    const hasActiveFilters =
        filterBrands.size > 0 ||
        filterDivisions.size > 0 ||
        filterCategories.size > 0 ||
        filterGenders.size > 0 ||
        filterSilhouettes.size > 0 ||
        filterSizes.size > 0 ||
        filterColors.size > 0 ||
        searchQuery.trim() !== "";

    const clearAllFilters = () => {
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
        <div className="space-y-3 mb-4 no-print">
            {/* Top Toolbar Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Outlets & Warehouses Selectors */}
                    {isPosLevel ? (
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs">
                            <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Current Store: {posLocationName}</span>
                        </div>
                    ) : (
                        <>
                            {/* Outlets Multi-Select */}
                            <div className="w-48 sm:w-56">
                                <MultiSelect
                                    options={locationOptions}
                                    selected={selectedLocationIds}
                                    onChange={setSelectedLocationIds}
                                    placeholder="All Outlets (Stores)"
                                />
                            </div>

                            {/* Warehouses Multi-Select */}
                            <div className="w-48 sm:w-56">
                                <MultiSelect
                                    options={warehouseOptions}
                                    selected={selectedWarehouseIds}
                                    onChange={setSelectedWarehouseIds}
                                    placeholder="All Warehouses"
                                />
                            </div>
                        </>
                    )}

                    {/* Date Range Picker */}
                    <DateRangePicker value={dateRange} onChange={setDateRange} />

                    {/* Manual Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Merged vs Separate Toggle */}
                    <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border">
                        <button
                            type="button"
                            onClick={() => setReportType("merged")}
                            className={cn(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                                reportType === "merged"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Merged
                        </button>
                        <button
                            type="button"
                            onClick={() => setReportType("separate")}
                            className={cn(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                                reportType === "separate"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Separate
                        </button>
                    </div>

                    {/* Export Actions with Dropdown Choices */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="default"
                                size="sm"
                                disabled={isExporting || isLoading}
                                className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl"
                            >
                                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                Export Excel
                                <ChevronDownIcon className="h-3 w-3 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase">Excel Export Formats</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onExcelExport("hierarchy")} className="cursor-pointer text-xs font-medium">
                                Hierarchy View (Color-Coded)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExcelExport("flat")} className="cursor-pointer text-xs font-medium">
                                Flat Detail View (Color-Coded)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onExcelExport("both")} className="cursor-pointer text-xs font-bold text-primary">
                                Combined Workbook (Both Views)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isExporting || isLoading}
                                className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                PDF / Print
                                <ChevronDownIcon className="h-3 w-3 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase">PDF / Print Layouts</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onPdfExport("hierarchy")} className="cursor-pointer text-xs font-medium">
                                Hierarchy Print Layout
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPdfExport("flat")} className="cursor-pointer text-xs font-medium">
                                Flat Detail Print Layout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl border border-border bg-card/60">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search SKU, barcode, brand..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs rounded-lg bg-background border-border"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Attribute Filter Dropdowns */}
                    <FilterDropdown
                        label="Brand"
                        options={attributeOptions.brands}
                        selected={filterBrands}
                        onToggle={(v) => toggleSetItem(filterBrands, setFilterBrands, v)}
                    />
                    <FilterDropdown
                        label="Division"
                        options={attributeOptions.divisions}
                        selected={filterDivisions}
                        onToggle={(v) => toggleSetItem(filterDivisions, setFilterDivisions, v)}
                    />
                    <FilterDropdown
                        label="Category"
                        options={attributeOptions.categories}
                        selected={filterCategories}
                        onToggle={(v) => toggleSetItem(filterCategories, setFilterCategories, v)}
                    />
                    <FilterDropdown
                        label="Gender"
                        options={attributeOptions.genders}
                        selected={filterGenders}
                        onToggle={(v) => toggleSetItem(filterGenders, setFilterGenders, v)}
                    />
                    <FilterDropdown
                        label="Silhouette"
                        options={attributeOptions.silhouettes}
                        selected={filterSilhouettes}
                        onToggle={(v) => toggleSetItem(filterSilhouettes, setFilterSilhouettes, v)}
                    />
                    <FilterDropdown
                        label="Size"
                        options={attributeOptions.sizes}
                        selected={filterSizes}
                        onToggle={(v) => toggleSetItem(filterSizes, setFilterSizes, v)}
                    />
                    <FilterDropdown
                        label="Color"
                        options={attributeOptions.colors}
                        selected={filterColors}
                        onToggle={(v) => toggleSetItem(filterColors, setFilterColors, v)}
                    />

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 flex items-center gap-1"
                        >
                            <X className="h-3 w-3" /> Clear
                        </button>
                    )}
                </div>

                {/* Column Grouping Levels Panel Toggle */}
                <button
                    type="button"
                    onClick={() => setShowLevelPanel((p) => !p)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-muted/50 transition-colors"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Hierarchy Levels</span>
                </button>
            </div>

            {/* Hierarchy Levels Selection Panel */}
            {showLevelPanel && (
                <div className="p-3 rounded-xl border border-border bg-muted/30 flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold">Columns Hierarchy:</span>
                    {Object.keys(groupingLevels).map((levelKey) => (
                        <label key={levelKey} className="flex items-center gap-1.5 cursor-pointer capitalize">
                            <input
                                type="checkbox"
                                checked={(groupingLevels as any)[levelKey]}
                                onChange={(e) =>
                                    setGroupingLevels((prev) => ({
                                        ...prev,
                                        [levelKey]: e.target.checked,
                                    }))
                                }
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span>{levelKey}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Realtime Data Calculation / Export Progress Bar */}
            {(isLoading || isExporting) && (
                <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {isExporting
                                ? exportProgressMessage || "Processing Excel Export..."
                                : fetchProgressMessage || "Calculating Available Stock Summary..."}
                        </span>
                        <span>{isExporting ? exportProgressPercent : fetchProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all duration-300 rounded-full"
                            style={{ width: `${isExporting ? exportProgressPercent : fetchProgressPercent}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
