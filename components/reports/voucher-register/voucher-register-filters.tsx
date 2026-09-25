import React from "react";
import { VoucherReportMode } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  Store,
  Layers,
  Building2,
  Gift,
  ArrowLeftRight,
  Ticket,
  Receipt,
  RotateCcw,
  CalendarRange,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export const VOUCHER_TYPE_TABS = [
  { id: "ALL", label: "All Vouchers", icon: Layers },
  { id: "CORPORATE", label: "Corporate", icon: Building2 },
  { id: "REFUND", label: "Refund", icon: Ticket },
  { id: "GIFT", label: "Gift Vouchers", icon: Gift },
  { id: "EXCHANGE", label: "Exchange", icon: ArrowLeftRight },
  { id: "CLAIM", label: "Claims", icon: Receipt },
  { id: "CREDIT", label: "Credit Notes", icon: Layers },
];

interface VoucherRegisterFiltersProps {
  mode: VoucherReportMode;
  setMode: (mode: VoucherReportMode) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  locationOptions: MultiSelectOption[];
  selectedLocationIds: string[];
  setSelectedLocationIds: (ids: string[]) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  asOfDate: Date;
  setAsOfDate: (date: Date) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isPending: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
  typeBreakdown?: Record<string, number>;
  totalCount: number;
}

export function VoucherRegisterFilters({
  mode,
  setMode,
  activeTab,
  setActiveTab,
  statusFilter,
  setStatusFilter,
  locationOptions,
  selectedLocationIds,
  setSelectedLocationIds,
  dateRange,
  setDateRange,
  asOfDate,
  setAsOfDate,
  searchQuery,
  setSearchQuery,
  isPending,
  onRefresh,
  onReset,
  onExportExcel,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  typeBreakdown = {},
  totalCount,
}: VoucherRegisterFiltersProps) {
  const isOutstanding = mode === "outstanding";

  const applyPreset = (preset: "today" | "week" | "month" | "last30" | "year") => {
    const now = new Date();
    if (preset === "today") {
      setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    } else if (preset === "week") {
      setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    } else if (preset === "month") {
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    } else if (preset === "last30") {
      setDateRange({ from: subDays(now, 30), to: endOfDay(now) });
    } else if (preset === "year") {
      setDateRange({ from: startOfYear(now), to: endOfYear(now) });
    }
  };

  return (
    <div className="space-y-3 no-print">
      {/* Top Header Control Bar: Clean Tabs & Segmented Mode Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-2xs">
        {/* Voucher Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {VOUCHER_TYPE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "ALL"
                ? Math.max(
                    totalCount,
                    Object.values(typeBreakdown).reduce(
                      (s, c) => s + (typeof c === "number" ? c : 0),
                      0,
                    ),
                  )
                : (typeBreakdown[tab.id] || 0) +
                  (tab.id === "GIFT" ? typeBreakdown["OUTLET_GIFT"] || 0 : 0);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-70" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono",
                    isActive
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : "bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
                  )}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Segmented Mode Switcher */}
        <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => setMode("period")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              !isOutstanding
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Date Range Register</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("outstanding")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              isOutstanding
                ? "bg-amber-500 text-white dark:bg-amber-600 shadow-xs font-bold"
                : "text-amber-700 dark:text-amber-400 hover:text-amber-800 font-semibold",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Outstanding (As-Of Date)</span>
          </button>
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3 bg-card p-3.5 rounded-xl border shadow-2xs">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          {/* Outlet Multi-Select */}
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Store className="h-3 w-3" /> Outlet / Store
            </label>
            <MultiSelect
              options={locationOptions}
              value={selectedLocationIds}
              onValueChange={setSelectedLocationIds}
              placeholder="All Outlets"
              className="bg-background h-9 text-xs"
            />
          </div>

          {/* Status Dropdown (hidden in outstanding mode) */}
          {!isOutstanding && (
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active / Unredeemed</SelectItem>
                  <SelectItem value="REDEEMED">Redeemed</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Picker Component */}
          {isOutstanding ? (
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> As-Of Date
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={asOfDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setAsOfDate(new Date(e.target.value));
                    }
                  }}
                  className="h-9 px-2.5 rounded-md border border-input bg-background text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAsOfDate(new Date())}
                  className="h-9 px-2 text-xs font-semibold"
                >
                  Today
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Period Range
                </label>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => applyPreset("today")}
                    className="hover:text-foreground font-medium"
                  >
                    Today
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => applyPreset("week")}
                    className="hover:text-foreground font-medium"
                  >
                    Week
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => applyPreset("month")}
                    className="hover:text-foreground font-medium"
                  >
                    Month
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => applyPreset("last30")}
                    className="hover:text-foreground font-medium"
                  >
                    30d
                  </button>
                </div>
              </div>
              <DateRangePicker
                initialDateFrom={dateRange.from}
                initialDateTo={dateRange.to}
                onUpdate={({ range }: { range: DateRange }) => {
                  if (range) {
                    setDateRange(range);
                  }
                }}
              />
            </div>
          )}

          {/* Search Box */}
          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Search className="h-3 w-3" /> Search
            </label>
            <div className="relative">
              <Input
                placeholder="Search Voucher #, Company, Customer, Slip #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-7 text-xs bg-background"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="h-9 px-3 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            disabled={isExportingExcel}
            className="h-9 px-3 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Excel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onRefresh}
            disabled={isPending}
            className="h-9 px-3.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isPending && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
