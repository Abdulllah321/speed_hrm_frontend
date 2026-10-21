"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { ReportQueueProgress } from "@/components/reports/ReportQueueProgress";
import { ReportSseState } from "@/hooks/use-report-sse";
import { Location } from "@/lib/actions/location";
import { Warehouse } from "@/lib/actions/warehouse";
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
  FileSpreadsheet,
  Table,
  Network,
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

// Attribute Filter Popover Component
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
        <div className="absolute left-0 mt-1.5 w-60 z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 text-xs animate-in fade-in-0 zoom-in-95">
          <div className="mb-2">
            <Input
              type="text"
              placeholder={`Search ${label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs rounded-lg"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-3 text-xs">No options found</p>
            ) : (
              filtered.map((opt) => {
                const isChecked = selected.has(opt);
                return (
                  <label
                    key={opt}
                    onClick={() => onToggle(opt)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium",
                      isChecked
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded accent-emerald-600 h-3.5 w-3.5"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface StockPositionFiltersProps {
  locations: Location[];
  warehouses: Warehouse[];
  selectedLocationIds: string[];
  setSelectedLocationIds: (ids: string[]) => void;
  selectedWarehouseIds: string[];
  setSelectedWarehouseIds: (ids: string[]) => void;
  previewJobId?: string | null;
  isFetchingResult?: boolean;
  dateRange: DateRange;
  setDateRange: (dr: DateRange) => void;
  isQueueingJob: boolean;
  onRefresh: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
  sseState: ReportSseState;
  viewMode: "tree" | "flat";
  setViewMode: (vm: "tree" | "flat") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  groupingLevels: GroupingLevels;
  setGroupingLevels: React.Dispatch<React.SetStateAction<GroupingLevels>>;
  filterOptions: {
    brands: string[];
    divisions: string[];
    categories: string[];
    genders: string[];
    silhouettes: string[];
    sizes: string[];
    colors: string[];
    seasons: string[];
  };
  filterBrands: Set<string>;
  filterDivisions: Set<string>;
  filterCategories: Set<string>;
  filterGenders: Set<string>;
  filterSilhouettes: Set<string>;
  filterSizes: Set<string>;
  filterColors: Set<string>;
  filterSeasons: Set<string>;
  toggleBrand: (b: string) => void;
  toggleDivision: (d: string) => void;
  toggleCategory: (c: string) => void;
  toggleGender: (g: string) => void;
  toggleSilhouette: (s: string) => void;
  toggleSize: (s: string) => void;
  toggleColor: (c: string) => void;
  toggleSeason: (s: string) => void;
  clearAllFilters: () => void;
  activeFiltersCount: number;
}

export function StockPositionFilters({
  locations,
  warehouses,
  selectedLocationIds,
  setSelectedLocationIds,
  selectedWarehouseIds,
  setSelectedWarehouseIds,
  previewJobId,
  isFetchingResult = false,
  dateRange,
  setDateRange,
  isQueueingJob,
  onRefresh,
  onExportExcel,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  sseState,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  groupingLevels,
  setGroupingLevels,
  filterOptions,
  filterBrands,
  filterDivisions,
  filterCategories,
  filterGenders,
  filterSilhouettes,
  filterSizes,
  filterColors,
  filterSeasons,
  toggleBrand,
  toggleDivision,
  toggleCategory,
  toggleGender,
  toggleSilhouette,
  toggleSize,
  toggleColor,
  toggleSeason,
  clearAllFilters,
  activeFiltersCount,
}: StockPositionFiltersProps) {
  const [showHierarchyMenu, setShowHierarchyMenu] = useState(false);
  const hierarchyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (hierarchyRef.current && !hierarchyRef.current.contains(e.target as Node)) {
        setShowHierarchyMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const locationOptions: MultiSelectOption[] = useMemo(
    () =>
      locations.map((loc) => ({
        label: loc.name,
        value: loc.id,
      })),
    [locations],
  );

  const warehouseOptions: MultiSelectOption[] = useMemo(
    () =>
      warehouses.map((wh) => ({
        label: wh.name,
        value: wh.id,
      })),
    [warehouses],
  );

  return (
    <div className="space-y-3.5 no-print">
      {/* Background SSE Queue Calculation Progress Bar */}
      <ReportQueueProgress
        jobId={previewJobId || (isQueueingJob ? "queueing-temp-id" : null)}
        status={isQueueingJob ? "queued" : isFetchingResult ? "processing" : sseState.status}
        progressPercent={
          isQueueingJob ? 5 : isFetchingResult ? 95 : sseState.progressPercent
        }
        message={
          isQueueingJob
            ? "Submitting Stock Position calculation job to background queue..."
            : isFetchingResult
            ? "Downloading and rendering report table..."
            : sseState.message || ""
        }
        queuePosition={sseState.queuePosition}
        waitingCount={sseState.waitingCount}
        failedReason={sseState.failedReason}
        title="Stock Position Report"
      />

      {/* Primary Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Group: Date Range & Locations */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Fiscal-Aware Date Range Picker */}
            <DateRangePicker
              initialDateFrom={dateRange.from}
              initialDateTo={dateRange.to}
              onUpdate={({ range }: { range: DateRange }) => {
                if (range) setDateRange(range);
              }}
            />

            {/* Warehouse Selector */}
            <div className="w-48">
              <MultiSelect
                options={warehouseOptions}
                selected={selectedWarehouseIds}
                onChange={setSelectedWarehouseIds}
                placeholder="All Warehouses"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Retail Store Outlet Selector */}
            <div className="w-48">
              <MultiSelect
                options={locationOptions}
                selected={selectedLocationIds}
                onChange={setSelectedLocationIds}
                placeholder="All Outlets"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* View Mode Toggle (Flat Table vs Hierarchical Tree) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("flat")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  viewMode === "flat"
                    ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                    : "text-slate-500 hover:text-foreground",
                )}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Flat View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  viewMode === "tree"
                    ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                    : "text-slate-500 hover:text-foreground",
                )}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Tree View</span>
              </button>
            </div>
          </div>

          {/* Right Group: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Hierarchy Level Visibility (Visible in Tree View) */}
            {viewMode === "tree" && (
              <div ref={hierarchyRef} className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHierarchyMenu((v) => !v)}
                  className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800"
                >
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Levels</span>
                </Button>

                {showHierarchyMenu && (
                  <div className="absolute right-0 mt-1.5 w-52 z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 text-xs space-y-1">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-400 px-2 py-1">
                      Hierarchy Grouping
                    </p>
                    {[
                      { key: "brand", label: "1. Brand" },
                      { key: "division", label: "2. Division" },
                      { key: "gender", label: "3. Gender" },
                      { key: "category", label: "4. Category" },
                      { key: "article", label: "5. Article / SKU" },
                      { key: "variant", label: "6. Variant (Size/Color)" },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={groupingLevels[key as keyof GroupingLevels]}
                          onChange={(e) =>
                            setGroupingLevels((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="rounded accent-emerald-600 h-3.5 w-3.5"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Run / Recalculate Report Button */}
            <Button
              size="sm"
              onClick={onRefresh}
              disabled={isQueueingJob || sseState.status === "processing"}
              className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
            >
              {isQueueingJob || sseState.status === "processing" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Computing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Calculate Report</span>
                </>
              )}
            </Button>

            {/* Non-Blocking Client Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExportingExcel || isExportingPdf}
                  className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isExportingExcel || isExportingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                <DropdownMenuLabel className="text-[10px] font-mono uppercase text-slate-400">
                  Export Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onExportExcel}
                  disabled={isExportingExcel}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export to Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onExportPdf}
                  disabled={isExportingPdf}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-rose-600" />
                  <span>Print / PDF Document</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Secondary Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {/* Search Box */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search SKU, barcode, name, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8.5 pr-7 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Attribute Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {filterOptions.brands.length > 0 && (
              <FilterDropdown
                label="Brand"
                options={filterOptions.brands}
                selected={filterBrands}
                onToggle={toggleBrand}
              />
            )}
            {filterOptions.divisions.length > 0 && (
              <FilterDropdown
                label="Division"
                options={filterOptions.divisions}
                selected={filterDivisions}
                onToggle={toggleDivision}
              />
            )}
            {filterOptions.categories.length > 0 && (
              <FilterDropdown
                label="Category"
                options={filterOptions.categories}
                selected={filterCategories}
                onToggle={toggleCategory}
              />
            )}
            {filterOptions.genders.length > 0 && (
              <FilterDropdown
                label="Gender"
                options={filterOptions.genders}
                selected={filterGenders}
                onToggle={toggleGender}
              />
            )}
            {filterOptions.seasons.length > 0 && (
              <FilterDropdown
                label="Season"
                options={filterOptions.seasons}
                selected={filterSeasons}
                onToggle={toggleSeason}
              />
            )}
            {filterOptions.silhouettes.length > 0 && (
              <FilterDropdown
                label="Silhouette"
                options={filterOptions.silhouettes}
                selected={filterSilhouettes}
                onToggle={toggleSilhouette}
              />
            )}
            {filterOptions.sizes.length > 0 && (
              <FilterDropdown
                label="Size"
                options={filterOptions.sizes}
                selected={filterSizes}
                onToggle={toggleSize}
              />
            )}
            {filterOptions.colors.length > 0 && (
              <FilterDropdown
                label="Color"
                options={filterOptions.colors}
                selected={filterColors}
                onToggle={toggleColor}
              />
            )}

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg gap-1"
              >
                <X className="h-3 w-3" />
                <span>Reset ({activeFiltersCount})</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
