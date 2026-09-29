"use client";

import React from "react";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { Location } from "@/lib/actions/location";
import { User } from "@/lib/actions/users";
import { ReturnSubType } from "./types";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Layers,
  Store,
  UserCheck,
  Tag,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { ReportQueueProgress } from "../ReportQueueProgress";

interface SalesReturnListFiltersProps {
  isPosLevel?: boolean;
  posLocationName?: string;
  reportType?: "merged" | "separate";
  onReportTypeChange?: (type: "merged" | "separate") => void;
  periodPreset?: string;
  onPeriodPresetChange?: (preset: string) => void;
  matchingCount?: number;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  locations?: Location[];
  cashiers?: User[];
  selectedLocationIds?: string[];
  onLocationChange?: (ids: string[]) => void;
  selectedCashierId?: string;
  onCashierChange?: (id?: string) => void;
  subTypeFilter?: ReturnSubType;
  onSubTypeFilterChange?: (type: ReturnSubType) => void;
  onSubTypeChange?: (type: ReturnSubType) => void;
  refundModeFilter?: string;
  onRefundModeFilterChange?: (mode: string) => void;
  onRefundModeChange?: (mode: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSearchChange?: (query: string) => void;
  groupingLevels?: { bySubType: boolean; byLocation: boolean };
  onToggleLevel?: (level: "bySubType" | "byLocation") => void;
  onRefresh?: () => void;
  isPending?: boolean;
  isCalculating?: boolean;
  previewJobId?: string | null;
  sseState?: {
    status?: "idle" | "queued" | "active" | "processing" | "completed" | "failed";
    progressPercent?: number;
    message?: string;
    queuePosition?: number;
    waitingCount?: number;
    error?: string | null;
  };
  isQueueingJob?: boolean;
  isFetchingResult?: boolean;
  onExportExcelFlat?: () => void;
  onExportExcelHierarchy?: () => void;
  onExportExcel?: (type: "flat" | "hierarchical") => void;
  onExportPdf?: () => void;
  isExportingExcel?: boolean;
  isExportingPdf?: boolean;
  exportProgress?: number;
  exportStatusMessage?: string;
}

export function SalesReturnListFilters(props: SalesReturnListFiltersProps) {
  const {
    isPosLevel = false,
    posLocationName,
    reportType = "merged",
    onReportTypeChange,
    periodPreset = "fy-current",
    onPeriodPresetChange,
    matchingCount = 0,
    dateRange,
    onDateRangeChange,
    locations = [],
    cashiers = [],
    selectedLocationIds = [],
    onLocationChange,
    selectedCashierId,
    onCashierChange,
    subTypeFilter = "ALL",
    onSubTypeFilterChange,
    onSubTypeChange,
    refundModeFilter = "ALL",
    onRefundModeFilterChange,
    onRefundModeChange,
    searchQuery = "",
    onSearchQueryChange,
    onSearchChange,
    groupingLevels = { bySubType: false, byLocation: false },
    onToggleLevel,
    onRefresh,
    isPending = false,
    isCalculating = false,
    previewJobId = null,
    sseState,
    isQueueingJob = false,
    isFetchingResult = false,
    onExportExcelFlat,
    onExportExcelHierarchy,
    onExportExcel,
    onExportPdf,
    isExportingExcel = false,
    isExportingPdf = false,
  } = props;

  const handleSubTypeChange = onSubTypeFilterChange || onSubTypeChange;
  const handleRefundModeChange = onRefundModeFilterChange || onRefundModeChange;
  const handleSearchChange = onSearchQueryChange || onSearchChange;

  const handleExcelFlat = () => {
    if (onExportExcelFlat) onExportExcelFlat();
    else if (onExportExcel) onExportExcel("flat");
  };

  const handleExcelHierarchy = () => {
    if (onExportExcelHierarchy) onExportExcelHierarchy();
    else if (onExportExcel) onExportExcel("hierarchical");
  };

  const isLoading = Boolean(
    isPending ||
    isCalculating ||
    isQueueingJob ||
    isFetchingResult ||
    sseState?.status === "queued" ||
    sseState?.status === "processing"
  );

  const subTypePills: { id: ReturnSubType; label: string; countBadge?: string; color: string }[] = [
    { id: "ALL", label: "All Return Types", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
    { id: "EXCHANGE_SR", label: "Exchange (_SR)", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    { id: "REFUND_RF", label: "Refund (RF)", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
    { id: "CLAIM_CLM", label: "Claim (_CLM)", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  ];

  return (
    <div className="space-y-3">
      {/* Realtime Calculation Progress Card */}
      {previewJobId && sseState && (
        <ReportQueueProgress
          jobId={previewJobId}
          status={(sseState.status as any) || "idle"}
          progressPercent={sseState.progressPercent || 0}
          queuePosition={sseState.queuePosition || 0}
          waitingCount={sseState.waitingCount || 0}
          message={sseState.message}
          failedReason={sseState.error || undefined}
          title="Calculating Sales Return Register"
        />
      )}

      {/* Primary Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Row 1: Fiscal Year Period Presets, Sub Type Selector & Outlets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Fiscal Year Preset Selector */}
            <Select value={periodPreset} onValueChange={onPeriodPresetChange}>
              <SelectTrigger className="h-9 w-[190px] text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fy-current" className="text-xs font-medium">
                  Current Fiscal Year (2026-2027)
                </SelectItem>
                <SelectItem value="year-current" className="text-xs font-medium">
                  Current Calendar Year (2026)
                </SelectItem>
                <SelectItem value="all-time" className="text-xs font-medium">
                  All Time / Full Period
                </SelectItem>
                <SelectItem value="fy-previous" className="text-xs font-medium">
                  Previous Fiscal Year (2025-2026)
                </SelectItem>
                <SelectItem value="year-previous" className="text-xs font-medium">
                  Previous Calendar Year (2025)
                </SelectItem>
                <SelectItem value="custom" className="text-xs font-medium">
                  Custom Date Range
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            {dateRange && onDateRangeChange && (
              <div className="w-[240px]">
                <DateRangePicker
                  range={dateRange}
                  initialDateFrom={dateRange?.from}
                  initialDateTo={dateRange?.to}
                  onUpdate={({ range }) => {
                    if (range && onDateRangeChange) onDateRangeChange(range);
                  }}
                />
              </div>
            )}

            {/* Sub Type Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              {subTypePills.map((pill) => {
                const isActive = subTypeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => handleSubTypeChange?.(pill.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      isActive
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Refresh, Exports & Print */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-rose-500" : ""}`} />
              Refresh
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || isExportingExcel}
                  className="h-9 px-3 gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export Excel
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuItem
                  onClick={handleExcelFlat}
                  className="text-xs font-semibold cursor-pointer py-2 rounded-lg"
                >
                  Export Flat Line Items (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExcelHierarchy}
                  className="text-xs font-semibold cursor-pointer py-2 rounded-lg"
                >
                  Export Returns Matrix (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Print PDF View */}
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPdf}
              disabled={isLoading || isExportingPdf}
              className="h-9 px-3 gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
            >
              <Printer className="h-3.5 w-3.5" />
              Print View
            </Button>
          </div>
        </div>

        {/* Row 2: Location, Cashier, Refund Mode, Search Bar, Grouping Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Location Selector */}
            {!isPosLevel ? (
              <Select
                value={selectedLocationIds.length === 1 ? selectedLocationIds[0] : "all"}
                onValueChange={(val) => onLocationChange?.(val === "all" ? [] : [val])}
              >
                <SelectTrigger className="h-8 w-[170px] text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center gap-1.5 truncate">
                    <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <SelectValue placeholder="All Outlets" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-medium">All Outlets</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} className="text-xs">
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Store className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>{posLocationName || "Current Store"}</span>
              </div>
            )}

            {/* Cashier Selector */}
            <Select
              value={selectedCashierId || "all"}
              onValueChange={(val) => onCashierChange?.(val === "all" ? undefined : val)}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="All Cashiers" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">All Cashiers</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.firstName || ""} {c.lastName || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refund Mode Selector */}
            <Select
              value={refundModeFilter}
              onValueChange={onRefundModeFilterChange}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Refund Mode" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">All Refund Modes</SelectItem>
                <SelectItem value="VOUCHER" className="text-xs font-medium">Store Voucher</SelectItem>
                <SelectItem value="CASH" className="text-xs font-medium">Cash Refund</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative w-[260px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search Return #, Inv #, Customer, Voucher..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange?.(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-rose-500"
              />
            </div>
          </div>

          {/* Grouping & Level Toggles */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              Matching: <strong className="text-slate-800 dark:text-slate-200">{matchingCount.toLocaleString()}</strong> returns
            </span>

            <Button
              variant={groupingLevels.bySubType ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleLevel?.("bySubType")}
              className={`h-7 px-2.5 text-[11px] font-bold rounded-lg ${
                groupingLevels.bySubType
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "text-slate-600 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Layers className="h-3 w-3 mr-1" />
              Group by SubType
            </Button>

            <Button
              variant={groupingLevels.byLocation ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleLevel?.("byLocation")}
              className={`h-7 px-2.5 text-[11px] font-bold rounded-lg ${
                groupingLevels.byLocation
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "text-slate-600 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Store className="h-3 w-3 mr-1" />
              Group by Outlet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
