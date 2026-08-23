"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { ReportQueueProgress } from "../ReportQueueProgress";
import {
  Search,
  RefreshCw,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LocationOption {
  id: string;
  name: string;
}

interface CashierOption {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

interface FiltersProps {
  isPosLevel?: boolean;
  posLocationName?: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  locations?: LocationOption[];
  cashiers?: CashierOption[];
  selectedLocationIds?: string[];
  onLocationChange?: (ids: string[]) => void;
  selectedCashierId?: string;
  onCashierChange: (id?: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onRefresh: () => void;
  isPending: boolean;
  previewJobId?: string | null;
  sseState?: any;
  isQueueingJob?: boolean;
  isFetchingResult?: boolean;
  onExportExcelFlat: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
}

export function AllianceRegisterFilters({
  isPosLevel = false,
  posLocationName = "Current Store",
  dateRange,
  onDateRangeChange,
  locations = [],
  cashiers = [],
  selectedLocationIds = [],
  onLocationChange,
  selectedCashierId,
  onCashierChange,
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
}: FiltersProps) {
  return (
    <div className="space-y-3 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/60 p-3.5 rounded-2xl shadow-sm">
        {/* Left Filter Options */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Store Badge on POS level */}
          {isPosLevel && (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs">
              <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Current Store: {posLocationName}</span>
            </div>
          )}

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Invoice, BIN, Auth ID..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-background border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Cashier Selector */}
          <div className="w-40 sm:w-48">
            <Select
              value={selectedCashierId || "all"}
              onValueChange={(v) => onCashierChange(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Salespersons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salespersons</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Salesperson'}
                  </SelectItem>
                ))}
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
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isPending || isQueueingJob || isFetchingResult}
            className="h-9 rounded-xl gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending || isQueueingJob || isFetchingResult ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          {/* Excel Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcelFlat}
            disabled={isExportingExcel}
            className="h-9 rounded-xl gap-1.5 text-xs font-bold border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel Export
          </Button>

          {/* PDF Print Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="h-9 rounded-xl gap-1.5 text-xs font-bold border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Printer className="h-3.5 w-3.5" />
            Print PDF
          </Button>
        </div>
      </div>

      {/* SSE Queue Progress Banner */}
      {previewJobId && sseState.status !== "completed" && sseState.status !== "failed" && (
        <ReportQueueProgress
          jobId={previewJobId}
          status={sseState.status}
          progressPercent={sseState.progressPercent}
          message={sseState.message}
          queuePosition={sseState.queuePosition || 0}
          waitingCount={sseState.waitingCount || 0}
        />
      )}
    </div>
  );
}
