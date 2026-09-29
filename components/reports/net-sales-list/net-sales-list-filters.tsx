"use client";

import React from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Location } from "@/lib/actions/location";
import { User } from "@/lib/actions/users";
import { NetSalesFilterDocType } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  UnfoldVertical,
  FoldVertical,
  SlidersHorizontal,
  X,
  Scale,
  ShoppingBag,
  Undo2,
} from "lucide-react";

interface NetSalesListFiltersProps {
  locations: Location[];
  cashiers: User[];
  isPosLevel?: boolean;

  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;

  locationId: string;
  onLocationChange: (val: string) => void;

  docTypeFilter: NetSalesFilterDocType;
  onDocTypeFilterChange: (val: NetSalesFilterDocType) => void;

  cashierUserId: string;
  onCashierChange: (val: string) => void;

  search: string;
  onSearchChange: (val: string) => void;

  isLoading: boolean;
  onRunReport: () => void;

  onExportExcel: () => void;
  onExportPdf: () => void;
  isExportingExcel?: boolean;
  isExportingPdf?: boolean;

  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function NetSalesListFilters({
  locations,
  cashiers,
  isPosLevel,
  dateRange,
  onDateRangeChange,
  locationId,
  onLocationChange,
  docTypeFilter,
  onDocTypeFilterChange,
  cashierUserId,
  onCashierChange,
  search,
  onSearchChange,
  isLoading,
  onRunReport,
  onExportExcel,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  onExpandAll,
  onCollapseAll,
}: NetSalesListFiltersProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs space-y-3 no-print">
      {/* Top Filter Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date Range Picker */}
        <div className="w-full sm:w-auto min-w-[240px]">
          <DateRangePicker
            date={dateRange}
            onDateChange={onDateRangeChange}
            className="w-full"
          />
        </div>

        {/* Store / Location Filter */}
        {!isPosLevel && (
          <div className="w-full sm:w-48">
            <Select value={locationId} onValueChange={onLocationChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores (Merged)</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Document Type Filter Toggle */}
        <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => onDocTypeFilterChange("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              docTypeFilter === "ALL"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Scale className="h-3.5 w-3.5 text-emerald-600" />
            All (Net)
          </button>
          <button
            type="button"
            onClick={() => onDocTypeFilterChange("SALES_ONLY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              docTypeFilter === "SALES_ONLY"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
            Sales Only
          </button>
          <button
            type="button"
            onClick={() => onDocTypeFilterChange("RETURNS_ONLY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              docTypeFilter === "RETURNS_ONLY"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Undo2 className="h-3.5 w-3.5 text-rose-500" />
            Returns Only
          </button>
        </div>

        {/* Cashier Filter */}
        {cashiers.length > 0 && (
          <div className="w-full sm:w-44">
            <Select value={cashierUserId} onValueChange={onCashierChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Cashiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quick Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoice#, return#, customer, barcode, SKU..."
            className="h-9 pl-8 pr-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Run / Refresh Button */}
        <Button
          onClick={onRunReport}
          disabled={isLoading}
          className="h-9 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Calculating..." : "Run Report"}
        </Button>
      </div>

      {/* Bottom Bar: Expand / Collapse and Export actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {onExpandAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExpandAll}
              className="h-7 px-2.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            >
              <UnfoldVertical className="h-3.5 w-3.5 mr-1" /> Expand All
            </Button>
          )}
          {onCollapseAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCollapseAll}
              className="h-7 px-2.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            >
              <FoldVertical className="h-3.5 w-3.5 mr-1" /> Collapse All
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            disabled={isExportingExcel || isLoading}
            className="h-7 px-3 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            {isExportingExcel ? "Exporting XLSX..." : "Export Excel"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf || isLoading}
            className="h-7 px-3 text-xs font-medium rounded-lg text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
            {isExportingPdf ? "Generating PDF..." : "Export PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
