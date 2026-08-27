import React, { useState, useMemo } from "react";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { LocationHeader, WarehouseHeader } from "./types";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { ReportSseState } from "@/hooks/use-report-sse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Search,
  Store,
  Warehouse,
  Info,
  X,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryAgingFiltersProps {
  isPosLevel?: boolean;
  posLocationName?: string;
  reportType: "merged" | "separate";
  onReportTypeChange: (type: "merged" | "separate") => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  selectedWarehouseIds: string[];
  onWarehouseChange: (ids: string[]) => void;
  selectedBrandId?: string;
  onBrandChange: (id?: string) => void;
  selectedCategoryId?: string;
  onCategoryChange: (id?: string) => void;
  selectedAgeBucket: string;
  onAgeBucketChange: (bucket: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;

  onRefresh: () => void;
  isPending: boolean;

  // SSE Queue Progress
  previewJobId: string | null;
  sseState: ReportSseState;
  isQueueingJob: boolean;
  isFetchingResult: boolean;

  // Export Handlers & Progress
  onExportExcelFlat: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
  exportProgressPercent?: number;
  exportProgressMessage?: string;
}

export function InventoryAgingFilters({
  isPosLevel = false,
  posLocationName = "Current Store",
  reportType,
  onReportTypeChange,
  dateRange,
  onDateRangeChange,
  locations,
  warehouses,
  selectedLocationIds,
  onLocationChange,
  selectedWarehouseIds,
  onWarehouseChange,
  selectedBrandId,
  onBrandChange,
  selectedCategoryId,
  onCategoryChange,
  selectedAgeBucket,
  onAgeBucketChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  isPending,
  previewJobId,
  sseState,
  isQueueingJob,
  isFetchingResult,
  onExportExcelFlat,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  exportProgressPercent = 0,
  exportProgressMessage = "",
}: InventoryAgingFiltersProps) {
  const [showFormulaInfo, setShowFormulaInfo] = useState(true);

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

  return (
    <div className="space-y-3 mb-4 no-print">
      {/* Guidance Alert Banner */}
      {showFormulaInfo && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Inventory Aging Metric Equation ({isPosLevel ? "POS Level - Retail Valuation" : "ERP Level - Cost Valuation"})
              </p>
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Stock Age</span> = As-of Date - Inbound Receipt Date &bull; <span className="font-bold text-rose-600 dark:text-rose-400">Aged Brackets</span>: 0–6M, 6–9M, 9–12M, 12–15M, 15–18M, &gt;18M
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFormulaInfo(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Merged vs Separate Mode Selector */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onReportTypeChange("merged")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all text-xs font-bold",
                reportType === "merged"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground",
              )}
            >
              Merged (All)
            </button>
            <button
              type="button"
              onClick={() => onReportTypeChange("separate")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all text-xs font-bold",
                reportType === "separate"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground",
              )}
            >
              Separate (By Location)
            </button>
          </div>

          {/* Outlets Selector / POS Store Badge */}
          {isPosLevel ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs">
              <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Current Store: {posLocationName}</span>
            </div>
          ) : (
            <>
              <div className="w-44 sm:w-52">
                <MultiSelect
                  options={locationOptions}
                  value={selectedLocationIds}
                  onValueChange={onLocationChange}
                  placeholder="All Outlets (Stores)"
                  className="bg-background h-9 rounded-xl"
                />
              </div>

              <div className="w-44 sm:w-52">
                <MultiSelect
                  options={warehouseOptions}
                  value={selectedWarehouseIds}
                  onValueChange={onWarehouseChange}
                  placeholder="All Warehouses"
                  className="bg-background h-9 rounded-xl"
                />
              </div>
            </>
          )}

          {/* Age Bucket Filter */}
          <div className="w-36 sm:w-44">
            <Select value={selectedAgeBucket} onValueChange={onAgeBucketChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-slate-200 dark:border-slate-800 font-medium">
                <SelectValue placeholder="All Aging Brackets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aging Brackets</SelectItem>
                <SelectItem value="0-6m">0 – 6 Months (Fresh)</SelectItem>
                <SelectItem value="6-9m">6 – 9 Months</SelectItem>
                <SelectItem value="9-12m">9 – 12 Months</SelectItem>
                <SelectItem value="12-15m">12 – 15 Months</SelectItem>
                <SelectItem value="15-18m">15 – 18 Months (Slow)</SelectItem>
                <SelectItem value="18+m">&gt; 18 Months (Aged/Stale)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }: { range: DateRange }) => {
              if (range) onDateRangeChange(range);
            }}
          />
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Query */}
          <div className="relative min-w-[200px] sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search SKU, Barcode, Item..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-background border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isPending || isQueueingJob || isFetchingResult}
            className="h-9 rounded-xl gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isPending || isQueueingJob || isFetchingResult) && "animate-spin")} />
            Recalculate
          </Button>

          {/* Excel Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcelFlat}
            disabled={isExportingExcel || isExportingPdf}
            className="h-9 rounded-xl gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50"
          >
            {isExportingExcel ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Excel
          </Button>

          {/* PDF Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingExcel || isExportingPdf}
            className="h-9 rounded-xl gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50"
          >
            {isExportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Realtime Exporting Progress Bar Banner */}
      {(isExportingExcel || isExportingPdf || exportProgressPercent > 0) && (
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 text-xs shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-bold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{exportProgressMessage || (isExportingExcel ? "Generating Excel spreadsheet..." : "Formatting PDF document...")}</span>
            </div>
            <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
              {exportProgressPercent}%
            </span>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, exportProgressPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* SSE Progress Banner */}
      {previewJobId && sseState.status !== "completed" && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/20 text-sky-950 dark:text-sky-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {sseState.message || "Queueing inventory aging calculation..."}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Calculating aging brackets & FIFO stock movements across stores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sky-600 dark:text-sky-400 text-sm">
              {sseState.progressPercent}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
