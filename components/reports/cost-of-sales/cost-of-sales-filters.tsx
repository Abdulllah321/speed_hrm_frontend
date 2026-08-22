"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { ReportQueueProgress } from "@/components/reports/ReportQueueProgress";
import { ReportSseState } from "@/hooks/use-report-sse";
import { Location } from "@/lib/actions/location";
import { GroupingLevels } from "./types";
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
  Folder,
  ShoppingCart,
  Inbox,
  Tag,
  FileSpreadsheet,
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

// ─── Attribute Filter Dropover Component ─────────────────────────────────────
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );

  const selectedCount = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all",
          selectedCount > 0
            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
            : "bg-background border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-500/50 hover:text-foreground",
        )}
      >
        <span>{label}</span>
        {selectedCount > 0 && (
          <span className="bg-white/20 text-inherit px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
            {selectedCount}
          </span>
        )}
        <svg
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[200px] max-w-[280px] bg-background border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              autoFocus
              type="text"
              placeholder={`Search ${label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2 text-center">No results</p>
            )}
            {filtered.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt)}
                  onChange={() => onToggle(opt)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {opt}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CostOfSalesFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  locations: Location[];
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  groupingLevels: GroupingLevels;
  onToggleLevel: (level: keyof GroupingLevels, checked: boolean) => void;
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

  onRefresh: () => void;
  isPending: boolean;

  // SSE Queue Progress
  previewJobId: string | null;
  sseState: ReportSseState;
  isQueueingJob: boolean;
  isFetchingResult: boolean;

  // Export Handlers
  onExportExcelFlat: () => void;
  onExportExcelHierarchy: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
  exportProgressPercent: number;
}

export function CostOfSalesFilters({
  dateRange,
  onDateRangeChange,
  locations,
  selectedLocationIds,
  onLocationChange,
  searchQuery,
  onSearchQueryChange,
  groupingLevels,
  onToggleLevel,
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
  onRefresh,
  isPending,
  previewJobId,
  sseState,
  isQueueingJob,
  isFetchingResult,
  onExportExcelFlat,
  onExportExcelHierarchy,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  exportProgressPercent,
}: CostOfSalesFiltersProps) {
  const [showLevelPanel, setShowLevelPanel] = useState(false);

  const locationOptions: MultiSelectOption[] = useMemo(() => {
    return locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
      description: loc.code ? `Code: ${loc.code}` : undefined,
    }));
  }, [locations]);

  const toggleSetItem = (
    set: Set<string>,
    setFn: React.Dispatch<React.SetStateAction<Set<string>>>,
    item: string,
  ) => {
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
    onSearchQueryChange("");
  };

  return (
    <div className="space-y-3 mb-4 no-print">
      {/* Top Toolbar Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stores & Warehouses Multi-Select */}
          <div className="w-56 sm:w-64">
            <MultiSelect
              options={locationOptions}
              value={selectedLocationIds}
              onValueChange={onLocationChange}
              placeholder="All Outlets & Warehouses"
              className="bg-background h-9 rounded-xl"
            />
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }: { range: DateRange }) => {
              if (range) onDateRangeChange(range);
            }}
          />

          {/* Apply / Refresh Button */}
          <Button
            variant="default"
            size="sm"
            onClick={onRefresh}
            disabled={isPending || isQueueingJob || isFetchingResult}
            className="h-9 px-4 gap-1.5 font-bold text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isPending || isQueueingJob || isFetchingResult) && "animate-spin")} />
            Apply / Refresh
          </Button>
        </div>

        {/* Export Actions with Dropdown Options */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingExcel || isPending}
                className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl border-emerald-500/40 text-emerald-750 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                {isExportingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                )}
                Export Excel
                <ChevronDownIcon className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase">
                Excel Export Layouts
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onExportExcelFlat}
                className="cursor-pointer text-xs font-semibold flex items-center gap-2"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Flat Detail View (Color-Coded)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportExcelHierarchy}
                className="cursor-pointer text-xs font-semibold flex items-center gap-2"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                Hierarchy View (Brand &rarr; Variant)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf || isPending}
            className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {isExportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
            ) : (
              <Printer className="h-3.5 w-3.5 text-red-600" />
            )}
            PDF / Print
          </Button>
        </div>
      </div>

      {/* SSE Realtime Queue Progress Banner */}
      <ReportQueueProgress
        jobId={previewJobId || (isQueueingJob ? "queueing-temp-id" : null)}
        status={isQueueingJob ? "queued" : isFetchingResult ? "processing" : sseState.status}
        progressPercent={
          isQueueingJob ? 5 : isFetchingResult ? 95 : sseState.progressPercent
        }
        message={
          isQueueingJob
            ? "Submitting Cost of Sales calculation job to background queue..."
            : isFetchingResult
            ? "Downloading and rendering report matrix table..."
            : sseState.message || ""
        }
        queuePosition={sseState.queuePosition}
        waitingCount={sseState.waitingCount}
        failedReason={sseState.failedReason}
        title="Cost of Sales Report"
      />

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search SKU, barcode, description..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs rounded-lg bg-background border-slate-200 dark:border-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg gap-1"
            >
              <X className="h-3 w-3" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Group Levels Customization Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLevelPanel((p) => !p)}
          className={cn(
            "h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 transition-all border-slate-200 dark:border-slate-800",
            showLevelPanel && "bg-slate-100 dark:bg-slate-800 text-foreground border-emerald-500",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
          Group Levels
          <ChevronDownIcon className={cn("h-3 w-3 transition-transform", showLevelPanel && "rotate-180")} />
        </Button>
      </div>

      {/* Expandable Grouping Levels Panel */}
      {showLevelPanel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-2.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
              Hierarchy Level Customization (Brand &rarr; Division &rarr; Gender &rarr; Category &rarr; Product SKU &rarr; Variant)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="checkbox"
                id="group-brand"
                checked={groupingLevels.brand}
                onChange={(e) => onToggleLevel("brand", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="group-brand" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Brand
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="checkbox"
                id="group-division"
                checked={groupingLevels.division}
                onChange={(e) => onToggleLevel("division", e.target.checked)}
                disabled={groupingLevels.brand}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer disabled:opacity-50"
              />
              <label
                htmlFor="group-division"
                className={cn(
                  "text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center gap-1.5",
                  groupingLevels.brand && "opacity-60 cursor-not-allowed",
                )}
              >
                <Folder className="h-3.5 w-3.5 text-blue-500" />
                Division
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="checkbox"
                id="group-category"
                checked={groupingLevels.category}
                onChange={(e) => onToggleLevel("category", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="group-category" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5 text-teal-500" />
                Category
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="checkbox"
                id="group-gender"
                checked={groupingLevels.gender}
                onChange={(e) => onToggleLevel("gender", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="group-gender" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-rose-500" />
                Gender
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="checkbox"
                id="group-article"
                checked={groupingLevels.article}
                onChange={(e) => onToggleLevel("article", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="group-article" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5 text-cyan-500" />
                Product SKU
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="checkbox"
                id="group-variant"
                checked={groupingLevels.variant}
                onChange={(e) => onToggleLevel("variant", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <label htmlFor="group-variant" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-amber-500" />
                Variant Details
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
