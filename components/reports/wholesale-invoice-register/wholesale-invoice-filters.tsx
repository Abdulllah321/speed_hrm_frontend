import React, { useState, useMemo } from "react";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { GroupingLevels } from "./types";
import { ReportSseState } from "@/hooks/use-report-sse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Search,
  Layers,
  Info,
  X,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WholesaleInvoiceFiltersProps {
  reportType: "merged" | "separate";
  onReportTypeChange: (type: "merged" | "separate") => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  customers: any[];
  selectedCustomerIds: string[];
  onCustomerChange: (ids: string[]) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  groupingLevels: GroupingLevels;
  onToggleLevel: (level: keyof GroupingLevels, checked: boolean) => void;

  periodPreset?: string;
  onPeriodPresetChange?: (preset: string) => void;

  onRefresh: () => void;
  isPending: boolean;

  previewJobId: string | null;
  sseState: ReportSseState;
  isQueueingJob: boolean;
  isFetchingResult: boolean;

  onExportExcelFlat: () => void;
  onExportExcelHierarchy: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
}

export function WholesaleInvoiceFilters({
  reportType,
  onReportTypeChange,
  dateRange,
  onDateRangeChange,
  customers,
  selectedCustomerIds,
  onCustomerChange,
  searchQuery,
  onSearchQueryChange,
  groupingLevels,
  onToggleLevel,
  periodPreset,
  onPeriodPresetChange,
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
}: WholesaleInvoiceFiltersProps) {
  const [showLevelPanel, setShowLevelPanel] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(true);

  const currentFyLabel = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = now.getMonth();
    const startY = m >= 6 ? year : year - 1;
    return `FY ${startY}-${String(startY + 1).slice(2)} (Current)`;
  }, []);

  const previousFyLabel = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = now.getMonth();
    const startY = (m >= 6 ? year : year - 1) - 1;
    return `FY ${startY}-${String(startY + 1).slice(2)} (Previous)`;
  }, []);

  const customerOptions: MultiSelectOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name || c.email || "Unknown",
    }));
  }, [customers]);

  return (
    <div className="space-y-3 mb-4 no-print">
      {/* Information Container Card: Formula Guidance */}
      {showFormulaInfo && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Wholesale Invoice Formula Equation
              </p>
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Net Amount</span> = Gross Amount &minus; Discounts + Taxes
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

      {/* Top Toolbar Row */}
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
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
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
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground",
              )}
            >
              Separate (By Customer)
            </button>
          </div>

          {/* Customers Multi-Select */}
          <div className="w-44 sm:w-52">
            <MultiSelect
              options={customerOptions}
              value={selectedCustomerIds}
              onValueChange={onCustomerChange}
              placeholder="All Customers"
              className="bg-background h-9 rounded-xl"
            />
          </div>

          {/* Fiscal Year / Calendar Year Preset Selector */}
          {periodPreset && onPeriodPresetChange && (
            <div className="w-44 sm:w-48">
              <Select value={periodPreset} onValueChange={onPeriodPresetChange}>
                <SelectTrigger className="h-9 rounded-xl text-xs font-semibold bg-background border-emerald-300/80 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <SelectValue placeholder="Select Period" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fy-current" className="text-xs font-medium">
                    {currentFyLabel}
                  </SelectItem>
                  <SelectItem value="fy-previous" className="text-xs font-medium">
                    {previousFyLabel}
                  </SelectItem>
                  <SelectItem value="year-current" className="text-xs font-medium">
                    {new Date().getFullYear()} (Calendar Year)
                  </SelectItem>
                  <SelectItem value="year-previous" className="text-xs font-medium">
                    {new Date().getFullYear() - 1} (Calendar Year)
                  </SelectItem>
                  <SelectItem value="custom" className="text-xs font-medium">
                    Custom Period
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Picker */}
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }: { range: DateRange }) => {
              if (range) onDateRangeChange(range);
            }}
          />
        </div>

        {/* Action Controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grouping Drawer Control */}
          <Popover open={showLevelPanel} onOpenChange={setShowLevelPanel}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800"
              >
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Levels & Grouping
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-72 p-4 space-y-3 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold">Display Grouping Hierarchy</span>
                <Button variant="ghost" size="sm" onClick={() => setShowLevelPanel(false)} className="h-6 w-6 p-0">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2.5 text-xs">
                {reportType === "separate" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-customer"
                      checked={!!groupingLevels.customer}
                      onCheckedChange={(c) => onToggleLevel("customer", !!c)}
                    />
                    <Label htmlFor="lvl-customer" className="font-semibold">Customer</Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-month-sum"
                    checked={!!groupingLevels.month}
                    onCheckedChange={(c) => onToggleLevel("month", !!c)}
                  />
                  <Label htmlFor="lvl-month-sum" className="font-semibold text-emerald-600 dark:text-emerald-400">Month Wise (e.g. July 2026)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-date-sum"
                    checked={!!groupingLevels.date}
                    onCheckedChange={(c) => onToggleLevel("date", !!c)}
                  />
                  <Label htmlFor="lvl-date-sum" className="font-semibold text-emerald-600 dark:text-emerald-400">Date Wise (Exact Date)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-doc-sum"
                    checked={!!groupingLevels.document}
                    onCheckedChange={(c) => onToggleLevel("document", !!c)}
                  />
                  <Label htmlFor="lvl-doc-sum" className="font-semibold text-emerald-600 dark:text-emerald-400">Document / CashMemo Wise</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-sp-sum"
                    checked={!!groupingLevels.salesPerson}
                    onCheckedChange={(c) => onToggleLevel("salesPerson", !!c)}
                  />
                  <Label htmlFor="lvl-sp-sum" className="font-semibold text-indigo-600 dark:text-indigo-400">Sales Person / Cashier Wise</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-tax-sum"
                    checked={!!groupingLevels.taxRate}
                    onCheckedChange={(c) => onToggleLevel("taxRate", !!c)}
                  />
                  <Label htmlFor="lvl-tax-sum" className="font-semibold text-amber-600 dark:text-amber-400">Sales Tax Rate Wise (18%, 25%)</Label>
                </div>
                <div className="border-t pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-brand-sum"
                      checked={groupingLevels.brand}
                      onCheckedChange={(c) => onToggleLevel("brand", !!c)}
                    />
                    <Label htmlFor="lvl-brand-sum">Brand</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-div-sum"
                      checked={groupingLevels.division}
                      onCheckedChange={(c) => onToggleLevel("division", !!c)}
                    />
                    <Label htmlFor="lvl-div-sum">Division</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-cat-sum"
                      checked={groupingLevels.category}
                      onCheckedChange={(c) => onToggleLevel("category", !!c)}
                    />
                    <Label htmlFor="lvl-cat-sum">Category</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-gen-sum"
                      checked={groupingLevels.gender}
                      onCheckedChange={(c) => onToggleLevel("gender", !!c)}
                    />
                    <Label htmlFor="lvl-gen-sum">Gender</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-sil-sum"
                      checked={groupingLevels.silhouette}
                      onCheckedChange={(c) => onToggleLevel("silhouette", !!c)}
                    />
                    <Label htmlFor="lvl-sil-sum">Silhouette</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-art-sum"
                      checked={groupingLevels.product}
                      onCheckedChange={(c) => onToggleLevel("product", !!c)}
                    />
                    <Label htmlFor="lvl-art-sum">Article (SKU)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lvl-var-sum"
                      checked={groupingLevels.variant}
                      onCheckedChange={(c) => onToggleLevel("variant", !!c)}
                    />
                    <Label htmlFor="lvl-var-sum">Variant (Size / Color)</Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isPending || isQueueingJob}
            className="h-9 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isPending || isQueueingJob) && "animate-spin")} />
            Refresh
          </Button>

          {/* Export Excel */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingExcel}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {isExportingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                )}
                Excel Export
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2 space-y-1 rounded-2xl shadow-xl text-xs">
              <button
                type="button"
                onClick={onExportExcelFlat}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Export Line Items (Flat)
              </button>
              <button
                type="button"
                onClick={onExportExcelHierarchy}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Export Matrix
              </button>
            </PopoverContent>
          </Popover>

          {/* Export PDF / Print */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            {isExportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5 text-indigo-600" />
            )}
            PDF / Print
          </Button>
        </div>
      </div>

      {/* Real-time SSE Progress Notification Banner */}
      {(isQueueingJob || sseState.status === "processing" || sseState.status === "queued" || isFetchingResult) && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200 text-xs shadow-2xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold flex items-center gap-2">
                Generating Wholesale Invoice Matrix
                <span className="font-mono text-[11px] font-semibold bg-emerald-200/60 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-full text-emerald-800 dark:text-emerald-200">
                  {sseState.progressPercent || 10}%
                </span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {sseState.message || "Querying wholesale invoices & computing totals..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {sseState.status === "failed" && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 text-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <p className="font-semibold">
            Calculation job failed: {sseState.error || "Server processing timeout"}. Please click Refresh to retry.
          </p>
        </div>
      )}

      {/* Secondary Toolbar: Search Input */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search category, brand, SKU, invoice No, or description..."
              className="pl-9 h-8 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
