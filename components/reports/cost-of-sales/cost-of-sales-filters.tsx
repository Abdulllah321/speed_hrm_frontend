import React from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { ReportQueueProgress } from "@/components/reports/ReportQueueProgress";
import { ReportSseState } from "@/hooks/use-report-sse";
import {
  Download,
  Printer,
  Loader2,
  Calendar,
  Store,
  RefreshCw,
  Search,
  X,
  SlidersHorizontal,
  Layers,
  Folder,
  ShoppingCart,
  Inbox,
  Tag,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GroupingLevels } from "./types";

interface CostOfSalesFiltersProps {
  locationOptions: MultiSelectOption[];
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  groupingLevels: GroupingLevels;
  onToggleLevel: (level: keyof GroupingLevels, checked: boolean) => void;
  onRefresh: () => void;
  isPending: boolean;
  
  // SSE Queue Progress
  previewJobId: string | null;
  sseState: ReportSseState;
  isQueueingJob: boolean;
  isFetchingResult: boolean;

  // Export handlers
  onExportExcelFlat: () => void;
  onExportExcelHierarchy: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
  exportProgressPercent: number;
}

export function CostOfSalesFilters({
  locationOptions,
  selectedLocationIds,
  onLocationChange,
  dateRange,
  onDateRangeChange,
  searchQuery,
  onSearchQueryChange,
  groupingLevels,
  onToggleLevel,
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
  return (
    <div className="space-y-4 no-print">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 border p-4 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-end gap-4 flex-1">
          {/* Store & Warehouse Multi-Select */}
          <div className="flex flex-col gap-1.5 min-w-[280px]">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              Stores & Warehouses
            </span>
            <MultiSelect
              options={locationOptions}
              value={selectedLocationIds}
              onValueChange={onLocationChange}
              placeholder="All Outlets & Warehouses"
              className="bg-background"
            />
          </div>

          {/* Date Period Picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              Period Range
            </span>
            <DateRangePicker
              initialDateFrom={dateRange.from}
              initialDateTo={dateRange.to}
              onUpdate={({ range }: { range: DateRange }) => {
                if (range) onDateRangeChange(range);
              }}
            />
          </div>

          {/* Quick Search */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[260px]">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Search className="h-3.5 w-3.5 text-emerald-600" />
              Quick Search
            </span>
            <div className="relative">
              <Input
                placeholder="Search SKU, Description, Barcode, Category, Brand..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="h-10 pl-9 pr-9 text-sm bg-background border-slate-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="h-4 w-4" />
              </div>
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onRefresh} disabled={isPending} className="h-10 px-4 font-bold gap-1.5">
            <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
            Apply / Refresh
          </Button>

          <Button
            variant="outline"
            onClick={onExportExcelFlat}
            disabled={isExportingExcel}
            className="h-10 gap-1.5 font-semibold border-emerald-500/40 text-emerald-750 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            {isExportingExcel ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            Excel (Flat Data)
          </Button>

          <Button
            variant="outline"
            onClick={onExportExcelHierarchy}
            disabled={isExportingExcel}
            className="h-10 gap-1.5 font-semibold border-emerald-500/40 text-emerald-750 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Excel (Hierarchy)
          </Button>

          <Button
            variant="outline"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="h-10 gap-1.5 font-semibold border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            ) : (
              <Printer className="h-4 w-4 text-red-600" />
            )}
            Print / PDF
          </Button>
        </div>
      </div>

      {/* SSE Realtime Queue Progress Bar */}
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
            ? "Downloading and rendering report table..."
            : sseState.message || ""
        }
        queuePosition={sseState.queuePosition}
        waitingCount={sseState.waitingCount}
        failedReason={sseState.failedReason}
        title="Cost of Sales Report"
      />

      {/* Hierarchy Level Checkboxes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
            Report Grouping Hierarchy (Brand &rarr; Division &rarr; Gender &rarr; Category &rarr; Article &rarr; Variant)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="checkbox"
              id="group-brand"
              checked={groupingLevels.brand}
              onChange={(e) => onToggleLevel("brand", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label htmlFor="group-brand" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Brand
            </label>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="checkbox"
              id="group-division"
              checked={groupingLevels.division}
              onChange={(e) => onToggleLevel("division", e.target.checked)}
              disabled={groupingLevels.brand}
              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer disabled:opacity-50"
            />
            <label
              htmlFor="group-division"
              className={cn(
                "text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5",
                groupingLevels.brand && "opacity-60 cursor-not-allowed",
              )}
            >
              <Folder className="h-3.5 w-3.5 text-blue-500" />
              Division
            </label>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="checkbox"
              id="group-category"
              checked={groupingLevels.category}
              onChange={(e) => onToggleLevel("category", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label htmlFor="group-category" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-teal-500" />
              Category
            </label>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="checkbox"
              id="group-gender"
              checked={groupingLevels.gender}
              onChange={(e) => onToggleLevel("gender", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label htmlFor="group-gender" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-rose-500" />
              Gender
            </label>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="checkbox"
              id="group-article"
              checked={groupingLevels.article}
              onChange={(e) => onToggleLevel("article", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label htmlFor="group-article" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
              <Inbox className="h-3.5 w-3.5 text-cyan-500" />
              Product SKU
            </label>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="checkbox"
              id="group-variant"
              checked={groupingLevels.variant}
              onChange={(e) => onToggleLevel("variant", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label htmlFor="group-variant" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-amber-500" />
              Variant Details
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
