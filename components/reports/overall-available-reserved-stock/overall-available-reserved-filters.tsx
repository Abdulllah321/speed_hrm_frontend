"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const count = selected.size;

    return (
        <div ref={ref} className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-sm",
                    count > 0
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                )}
            >
                <span>{label}</span>
                {count > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {count}
                    </span>
                )}
                <ChevronDownIcon className="h-3 w-3 opacity-60" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1.5 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-2 max-h-60 overflow-y-auto animate-in fade-in duration-150">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider border-b border-border/50 mb-1">
                        Filter by {label}
                    </div>
                    {options.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2 text-center">No options available</div>
                    ) : (
                        options.map((opt) => {
                            const checked = selected.has(opt);
                            return (
                                <label
                                    key={opt}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-muted cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggle(opt)}
                                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <span className="truncate">{opt}</span>
                                </label>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

interface FiltersProps {
    asOfDate: string;
    setAsOfDate: (d: string) => void;
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

export function OverallAvailableReservedFilters({
    asOfDate,
    setAsOfDate,
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
        <div className="space-y-3 mb-4">
            {/* Top Toolbar Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
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

                    {/* As Of Date Picker */}
                    <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">As Of:</span>
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                            className="text-xs bg-transparent text-foreground border-0 focus:ring-0 p-0 font-medium cursor-pointer"
                        />
                    </div>

                    {/* Manual Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-primary")} />
                        Refresh
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Column Grouping Levels Toggle Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLevelPanel((p) => !p)}
                        className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                        Hierarchy Levels
                    </Button>

                    {/* Merged vs Separate Switch */}
                    <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border">
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

                    {/* Export Actions */}
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
                            <X className="h-3 w-3" /> Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable Hierarchy Level Selector */}
            {showLevelPanel && (
                <div className="p-3 rounded-xl border border-border bg-card/80 space-y-2 animate-in fade-in duration-200">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Toggle Hierarchy Columns
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-foreground">
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
                                : fetchProgressMessage || "Calculating Overall Available Reserved Stock..."}
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
