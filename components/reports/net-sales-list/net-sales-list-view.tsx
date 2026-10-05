"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { DateRange } from "@/components/ui/date-range-picker";
import { getLocations, Location } from "@/lib/actions/location";
import { getUsers, User } from "@/lib/actions/users";
import {
  queueNetSalesListPreview,
  getNetSalesListResult,
  queueNetSalesListReportExport,
  getNetSalesListReportExportStatus,
  registerClientNetSalesListExport,
} from "@/lib/actions/pos-sales";
import { useReportSse } from "@/hooks/use-report-sse";
import {
  NetSalesListReportData,
  NetSalesFilterDocType,
  NetSalesListFilterState,
} from "./types";
import { useNetSalesListData } from "./use-net-sales-list-data";
import { NetSalesListHeader } from "./net-sales-list-header";
import { NetSalesListFilters } from "./net-sales-list-filters";
import { NetSalesListTable } from "./net-sales-list-table";
import { generateNetSalesListExcel } from "./excel-export";
import { generateNetSalesListPdf } from "./pdf-export";
import { useAuth } from "@/components/providers/auth-provider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Scale } from "lucide-react";

interface NetSalesListViewProps {
  isPosLevel?: boolean;
}

export function NetSalesListView({ isPosLevel = false }: NetSalesListViewProps) {
  const { user } = useAuth();
  const posLocationId = user?.terminal?.location?.id || user?.locationId || (user as any)?.location?.id;

  const [locations, setLocations] = useState<Location[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);

  // Filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  });

  const [locationId, setLocationId] = useState<string>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<NetSalesFilterDocType>("ALL");
  const [cashierUserId, setCashierUserId] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (isPosLevel && posLocationId) {
      setLocationId(posLocationId);
    }
  }, [isPosLevel, posLocationId]);

  // Report & SSE state
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [data, setData] = useState<NetSalesListReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const sse = useReportSse(previewJobId, "net-sales-list");

  // Load stores & cashiers
  useEffect(() => {
    let mounted = true;
    getLocations().then((res) => {
      if (mounted && res.status && res.data) {
        setLocations(res.data);
      }
    });
    getUsers({ role: "CASHIER" } as any).then((res) => {
      if (mounted && res?.status && Array.isArray(res.data)) {
        setCashiers(res.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Filter state object for data manager hook
  const filterState: NetSalesListFilterState = useMemo(
    () => ({
      locationId,
      docTypeFilter,
      search,
      reportType: "merged",
    }),
    [locationId, docTypeFilter, search]
  );

  const {
    rows,
    grandTotals,
    filteredLocations,
    allDocuments,
    toggleLocation,
    toggleDoc,
    expandAll,
    collapseAll,
  } = useNetSalesListData(data, filterState);

  // Trigger preview job calculation
  const runReport = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select a valid date range");
      return;
    }

    setIsLoading(true);
    setData(null);

    const fromIso = dateRange.from.toISOString();
    const toIso = dateRange.to.toISOString();

    const res = await queueNetSalesListPreview({
      locationId: locationId === "all" ? undefined : locationId,
      startDate: fromIso,
      endDate: toIso,
      cashierUserId: cashierUserId === "all" ? undefined : cashierUserId,
      docTypeFilter,
      reportType: "merged",
      search: search.trim() || undefined,
    });

    if (res.status && res.data?.jobId) {
      setPreviewJobId(res.data.jobId);
    } else {
      setIsLoading(false);
      toast.error(res.message || "Failed to start net sales calculation");
    }
  }, [dateRange, locationId, cashierUserId, docTypeFilter, search]);

  // Initial load
  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll SSE status for completion
  useEffect(() => {
    if (!previewJobId) return;

    if (sse.status === "completed") {
      getNetSalesListResult(previewJobId)
        .then((res) => {
          if (res.status && res.data) {
            setData(res.data);
            toast.success("Net Sales List report loaded successfully");
          } else {
            toast.error(res.message || "Failed to fetch report data");
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (sse.status === "failed") {
      setIsLoading(false);
      toast.error(sse.failedReason || "Net Sales List computation failed in background");
    }
  }, [sse.status, previewJobId, sse.failedReason]);

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (!data && allDocuments.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      setIsExportingExcel(true);
      const res = await generateNetSalesListExcel({
        documents: allDocuments,
        grandTotals,
        dateRange: { from: dateRange?.from, to: dateRange?.to },
        locationNames:
          locationId === "all"
            ? "All Stores (Merged)"
            : locations.find((l) => l.id === locationId)?.name || "Selected Store",
        onProgress: (p, msg) => {
          // progress tracking
        },
      });

      // Direct client download
      const blob = new Blob([res.excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Excel spreadsheet exported successfully");
    } catch (err: any) {
      toast.error("Failed to generate Excel: " + (err.message || "Unknown error"));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!data && allDocuments.length === 0) {
      toast.error("No data available to print");
      return;
    }

    try {
      setIsExportingPdf(true);
      await generateNetSalesListPdf({
        documents: allDocuments,
        grandTotals,
        dateRange: { from: dateRange?.from, to: dateRange?.to },
        locationNames:
          locationId === "all"
            ? "All Stores (Merged)"
            : locations.find((l) => l.id === locationId)?.name || "Selected Store",
      });
    } catch (err: any) {
      toast.error("Failed to open print preview: " + (err.message || "Unknown error"));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Title & Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Net Sales List Report
              </h1>
              <p className="text-xs text-slate-500">
                Integrated Sales & Returns register with item-level audit and full tender reconciliation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Header Cards */}
      <NetSalesListHeader totals={grandTotals} />

      {/* Filters Toolbar */}
      <NetSalesListFilters
        locations={locations}
        cashiers={cashiers}
        isPosLevel={isPosLevel}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        locationId={locationId}
        onLocationChange={setLocationId}
        docTypeFilter={docTypeFilter}
        onDocTypeFilterChange={setDocTypeFilter}
        cashierUserId={cashierUserId}
        onCashierChange={setCashierUserId}
        search={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        onRunReport={runReport}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {/* SSE Progress Banner */}
      {isLoading && (
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            <span>{sse.message || "Crunching sales and return data..."}</span>
            <span className="font-mono">{sse.progressPercent || 15}%</span>
          </div>
          <Progress value={sse.progressPercent || 15} className="h-2 bg-emerald-200/50" />
        </div>
      )}

      {/* Virtualized Document Matrix Table */}
      <NetSalesListTable
        rows={rows}
        grandTotals={grandTotals}
        onToggleLocation={toggleLocation}
        onToggleDoc={toggleDoc}
      />
    </div>
  );
}
