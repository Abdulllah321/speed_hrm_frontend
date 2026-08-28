import React, { useState, useMemo } from "react";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { Location } from "@/lib/actions/location";
import { User } from "@/lib/actions/users";
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
  Filter,
  Layers,
  Info,
  X,
  Loader2,
  AlertCircle,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GrossSalesReturnFiltersProps {
  isPosLevel?: boolean;
  posLocationName?: string;
  reportType: "merged" | "separate";
  onReportTypeChange: (type: "merged" | "separate") => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  locations: Location[];
  cashiers: User[];
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
  selectedCashierId?: string;
  onCashierChange: (id?: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  paymentModeFilter: string;
  onPaymentModeChange: (v: string) => void;
  fbrOnlyFilter: boolean;
  onFbrOnlyChange: (v: boolean) => void;
  groupingLevels: GroupingLevels;
  onToggleLevel: (level: keyof GroupingLevels, checked: boolean) => void;

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
}

export function GrossSalesReturnFilters({
  isPosLevel = false,
  posLocationName = "Current Store",
  reportType,
  onReportTypeChange,
  dateRange,
  onDateRangeChange,
  locations,
  cashiers,
  selectedLocationIds,
  onLocationChange,
  selectedCashierId,
  onCashierChange,
  searchQuery,
  onSearchQueryChange,
  paymentModeFilter,
  onPaymentModeChange,
  fbrOnlyFilter,
  onFbrOnlyChange,
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
}: GrossSalesReturnFiltersProps) {
  const [showLevelPanel, setShowLevelPanel] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(true);

  const locationOptions: MultiSelectOption[] = useMemo(() => {
    return locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
      description: loc.code ? `Code: ${loc.code}` : undefined,
    }));
  }, [locations]);

  return (
    <div className="space-y-3 mb-4 no-print">
      {/* Information Container Card: Gross Sales Return Guidance */}
      {showFormulaInfo && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Sales Return Register Equation
              </p>
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                <span className="font-bold text-rose-600 dark:text-rose-400">Total Return Value</span> = &sum; (Returned Qty &times; Unit Price) &bull; Credit Memos & Customer Refunds
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
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
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
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground",
              )}
            >
              Separate (By Location)
            </button>
          </div>

          {/* Outlets Multi-Select / Store Badge */}
          {isPosLevel ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs">
              <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Current Store: {posLocationName}</span>
            </div>
          ) : (
            <div className="w-44 sm:w-52">
              <MultiSelect
                options={locationOptions}
                value={selectedLocationIds}
                onValueChange={onLocationChange}
                placeholder="All Outlets (Stores)"
                className="bg-background h-9 rounded-xl"
              />
            </div>
          )}

          {/* Cashier Filter */}
          <div className="w-40 sm:w-48">
            <Select
              value={selectedCashierId || "all"}
              onValueChange={(v) => onCashierChange(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="All Cashiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Cashier'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Filter */}
          <div className="w-36">
            <Select value={paymentModeFilter} onValueChange={onPaymentModeChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Refund Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Refund Modes</SelectItem>
                <SelectItem value="CASH">Cash Refund</SelectItem>
                <SelectItem value="CARD">Card Refund</SelectItem>
                <SelectItem value="VOUCHER">Exchange Voucher</SelectItem>
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
                      id="lvl-loc-ret"
                      checked={!!groupingLevels.location}
                      onCheckedChange={(c) => onToggleLevel("location", !!c)}
                    />
                    <Label htmlFor="lvl-loc-ret" className="font-semibold">Store Location</Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-ret-no"
                    checked={!!groupingLevels.returnNote}
                    onCheckedChange={(c) => onToggleLevel("returnNote", !!c)}
                  />
                  <Label htmlFor="lvl-ret-no" className="font-semibold text-rose-600 dark:text-rose-400">Return Voucher / Note Wise</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lvl-item-ret"
                    checked={!!groupingLevels.item}
                    onCheckedChange={(c) => onToggleLevel("item", !!c)}
                  />
                  <Label htmlFor="lvl-item-ret" className="font-semibold text-emerald-600 dark:text-emerald-400">Returned Item Line Wise</Label>
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
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                {isExportingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-rose-600" />
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
                Export Return Items (Flat)
              </button>
              <button
                type="button"
                onClick={onExportExcelHierarchy}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Export Return Notes (Matrix)
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
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 text-xs shadow-2xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-rose-600 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold flex items-center gap-2">
                Generating Sales Return Register Matrix
                <span className="font-mono text-[11px] font-semibold bg-rose-200/60 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-full text-rose-800 dark:text-rose-200">
                  {sseState.progressPercent || 10}%
                </span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {sseState.message || "Querying POS sales return records & computing refund totals..."}
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

      {/* Secondary Toolbar: Search Input & FBR Filter Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search return #, order #, customer name, phone, cashier, or article..."
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="fbr-only-return"
              checked={fbrOnlyFilter}
              onCheckedChange={(c) => onFbrOnlyChange(!!c)}
            />
            <Label htmlFor="fbr-only-return" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              FBR Synced Only
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
