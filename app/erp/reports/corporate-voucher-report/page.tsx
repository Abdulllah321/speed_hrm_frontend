"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocations, Location } from "@/lib/actions/location";
import {
  getGroupedCorporateVoucherReport,
  getCorporateClientVouchers,
  CorporateClientSummaryItem,
  GroupedCorporateVoucherReportResult,
  ClientVoucherDetailItem,
  getCorporateVoucherReport,
  queueCorporateVoucherExport,
  getCorporateVoucherExportStatus,
  CorporateVoucherReportData,
} from "@/lib/actions/corporate-voucher-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  Printer,
  Loader2,
  Calendar,
  Store,
  RefreshCw,
  Coins,
  Search,
  X,
  Building2,
  Ticket,
  Percent,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  Briefcase,
  Copy,
  Check,
  FileSpreadsheet,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { subYears, format } from "date-fns";
import { cn, formatCurrency, getApiBaseUrl } from "@/lib/utils";

type TimePreset = "thisYear" | "all" | "5years" | "2years" | "custom";

// Compute initial Pakistani Fiscal Year: starts July 1st
function getInitialFiscalYearRange(): { preset: TimePreset; range: DateRange } {
  const now = new Date();
  const currentYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const from = new Date(currentYear, 6, 1, 0, 0, 0, 0); // Jul 1
  const to = new Date(currentYear + 1, 5, 30, 23, 59, 59, 999); // Jun 30
  return {
    preset: "thisYear",
    range: { from, to },
  };
}

export default function CorporateVoucherReportPage() {
  const { user } = useAuth();
  const initialFy = useMemo(() => getInitialFiscalYearRange(), []);

  // View Mode: 'grouped' (Elite Grouping by Client) vs 'flat' (All Individual Vouchers)
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Filters
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAbbr, setSelectedAbbr] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OUTSTANDING" | "REDEEMED">("ALL");

  // Time Preset & Range (defaults to This Fiscal Year: Jul 1, 2026 – Jun 30, 2027)
  const [timePreset, setTimePreset] = useState<TimePreset>(initialFy.preset);
  const [dateRange, setDateRange] = useState<DateRange>(initialFy.range);

  // Grouped Master Data
  const [groupedData, setGroupedData] = useState<GroupedCorporateVoucherReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Flat Individual Data (secondary view mode)
  const [flatReportData, setFlatReportData] = useState<CorporateVoucherReportData | null>(null);

  // Client Row Expansion & Detailed Minutes state
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientVouchersMap, setClientVouchersMap] = useState<
    Record<
      string,
      {
        loading: boolean;
        items: ClientVoucherDetailItem[];
        total: number;
        page: number;
        statusFilter: "ALL" | "OUTSTANDING" | "REDEEMED";
        search: string;
      }
    >
  >({});

  // Copied Voucher Code state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Export States
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
  const [exportProgress, setExportProgress] = useState<number>(0);

  const [pdfJobId, setPdfJobId] = useState<string | null>(null);
  const [pdfExportState, setPdfExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
  const [pdfExportProgress, setPdfExportProgress] = useState<number>(0);

  // Load Locations
  useEffect(() => {
    async function fetchLocs() {
      try {
        const res = await getLocations();
        if (Array.isArray(res)) setLocations(res);
        else if (res?.status && Array.isArray(res.data)) setLocations(res.data);
      } catch (err) {
        console.error("Failed to load locations:", err);
      }
    }
    fetchLocs();
  }, []);

  // Handle Preset Changes
  const handlePresetChange = (preset: TimePreset) => {
    setTimePreset(preset);
    const now = new Date();
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset === "thisYear") {
      const currentYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      setDateRange({
        from: new Date(currentYear, 6, 1, 0, 0, 0, 0),
        to: new Date(currentYear + 1, 5, 30, 23, 59, 59, 999),
      });
    } else if (preset === "2years") {
      setDateRange({ from: subYears(now, 2), to: now });
    } else if (preset === "5years") {
      setDateRange({ from: subYears(now, 5), to: now });
    }
  };

  // Fetch Grouped Report Data
  const fetchGroupedReport = useCallback(() => {
    startTransition(async () => {
      const result = await getGroupedCorporateVoucherReport({
        locationId: selectedLocationId !== "all" ? selectedLocationId : undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
        search: searchQuery.trim() || undefined,
        abbr: selectedAbbr !== "all" ? selectedAbbr : undefined,
        status: statusFilter,
      });

      if (result && result.status && result.data) {
        setGroupedData(result.data);
      } else {
        setGroupedData(null);
        toast.error("Failed to load grouped Corporate Voucher report");
      }
    });
  }, [selectedLocationId, dateRange, searchQuery, selectedAbbr, statusFilter]);

  // Fetch Flat Report Data (when switched to flat view)
  const fetchFlatReport = useCallback(() => {
    startTransition(async () => {
      const result = await getCorporateVoucherReport({
        locationId: selectedLocationId !== "all" ? selectedLocationId : undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
        search: searchQuery.trim() || undefined,
      });
      if (result && result.status && result.data) {
        setFlatReportData(result.data);
      }
    });
  }, [selectedLocationId, dateRange, searchQuery]);

  // Trigger fetch on filter change
  useEffect(() => {
    if (viewMode === "grouped") {
      fetchGroupedReport();
    } else {
      fetchFlatReport();
    }
  }, [viewMode, fetchGroupedReport, fetchFlatReport]);

  // Toggle Client Expansion and Fetch Sub-records (Detailed Minutes)
  const toggleClientExpansion = async (clientKey: string, companyName: string, abbr: string) => {
    const nextSet = new Set(expandedClients);
    if (nextSet.has(clientKey)) {
      nextSet.delete(clientKey);
      setExpandedClients(nextSet);
      return;
    }

    nextSet.add(clientKey);
    setExpandedClients(nextSet);

    // If already loaded, do not re-fetch unless requested
    if (clientVouchersMap[clientKey]?.items?.length) return;

    await loadClientVouchers(clientKey, companyName, abbr, 1, "ALL", "");
  };

  const loadClientVouchers = async (
    clientKey: string,
    companyName: string,
    abbr: string,
    page: number = 1,
    subStatus: "ALL" | "OUTSTANDING" | "REDEEMED" = "ALL",
    subSearch: string = "",
  ) => {
    setClientVouchersMap((prev) => ({
      ...prev,
      [clientKey]: {
        loading: true,
        items: prev[clientKey]?.items || [],
        total: prev[clientKey]?.total || 0,
        page,
        statusFilter: subStatus,
        search: subSearch,
      },
    }));

    const res = await getCorporateClientVouchers({
      companyName,
      abbr: abbr !== "N/A" ? abbr : undefined,
      status: subStatus !== "ALL" ? subStatus : undefined,
      search: subSearch.trim() || undefined,
      startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
      endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
      locationId: selectedLocationId !== "all" ? selectedLocationId : undefined,
      page,
      limit: 50,
    });

    if (res.status && res.data) {
      setClientVouchersMap((prev) => ({
        ...prev,
        [clientKey]: {
          loading: false,
          items: res.data!.items,
          total: res.data!.meta.total,
          page,
          statusFilter: subStatus,
          search: subSearch,
        },
      }));
    } else {
      setClientVouchersMap((prev) => ({
        ...prev,
        [clientKey]: {
          ...(prev[clientKey] || { items: [], total: 0, page: 1, statusFilter: "ALL", search: "" }),
          loading: false,
        },
      }));
      toast.error(res.message || "Failed to load vouchers for this client");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied ${code} to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Excel Export Poll
  useEffect(() => {
    if (exportState !== "queueing" && exportState !== "processing") return;
    if (!exportJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getCorporateVoucherExportStatus(exportJobId);
        if (res && res.status && res.data) {
          const { state, progress } = res.data;
          setExportProgress(progress || 0);

          if (state === "completed") {
            setExportState("completed");
            toast.success("Excel export ready for download!");
            clearInterval(interval);
          } else if (state === "failed") {
            setExportState("failed");
            toast.error("Excel export failed.");
            clearInterval(interval);
          } else {
            setExportState("processing");
          }
        }
      } catch (err) {
        console.error("Error polling export job:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [exportState, exportJobId]);

  // PDF Export Poll
  useEffect(() => {
    if (pdfExportState !== "queueing" && pdfExportState !== "processing") return;
    if (!pdfJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getCorporateVoucherExportStatus(pdfJobId);
        if (res && res.status && res.data) {
          const { state, progress } = res.data;
          setPdfExportProgress(progress || 0);

          if (state === "completed") {
            setPdfExportState("completed");
            toast.success("PDF Report ready for download!");
            clearInterval(interval);
          } else if (state === "failed") {
            setPdfExportState("failed");
            toast.error("PDF export failed.");
            clearInterval(interval);
          } else {
            setPdfExportState("processing");
          }
        }
      } catch (err) {
        console.error("Error polling PDF job:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pdfExportState, pdfJobId]);

  const handleExportExcelClick = async () => {
    if (exportState === "completed" && exportJobId) {
      const base = getApiBaseUrl();
      const url = `${base}/api/pos-sales/reports/corporate-voucher/export-download/${exportJobId}`;
      window.open(url, "_blank");
      setExportState("idle");
      setExportJobId(null);
      setExportProgress(0);
      return;
    }

    setExportState("queueing");
    try {
      const res = await queueCorporateVoucherExport({
        locationId: selectedLocationId !== "all" ? selectedLocationId : undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
        format: "xlsx",
        search: searchQuery.trim() || undefined,
      });

      if (res && res.status && res.data?.jobId) {
        setExportJobId(res.data.jobId);
        setExportState("processing");
        setExportProgress(5);
        toast.info("Excel generation started in background.");
      } else {
        setExportState("failed");
        toast.error(res?.message || "Failed to start export.");
      }
    } catch (err) {
      setExportState("failed");
      toast.error("Failed to queue export.");
    }
  };

  const handleExportPdfClick = async () => {
    if (pdfExportState === "completed" && pdfJobId) {
      const base = getApiBaseUrl();
      const url = `${base}/api/pos-sales/reports/corporate-voucher/export-download/${pdfJobId}`;
      window.open(url, "_blank");
      setPdfExportState("idle");
      setPdfJobId(null);
      setPdfExportProgress(0);
      return;
    }

    setPdfExportState("queueing");
    try {
      const res = await queueCorporateVoucherExport({
        locationId: selectedLocationId !== "all" ? selectedLocationId : undefined,
        startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
        format: "pdf",
        search: searchQuery.trim() || undefined,
      });

      if (res && res.status && res.data?.jobId) {
        setPdfJobId(res.data.jobId);
        setPdfExportState("processing");
        setPdfExportProgress(5);
        toast.info("PDF generation started in background.");
      } else {
        setPdfExportState("failed");
        toast.error(res?.message || "Failed to start PDF export.");
      }
    } catch (err) {
      setPdfExportState("failed");
      toast.error("Failed to queue PDF export.");
    }
  };

  // Virtualizer for Flat View
  const parentRef = useRef<HTMLDivElement>(null);
  const flatItems = flatReportData?.items || [];
  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  const kpis = groupedData?.kpis || {
    totalClients: 0,
    totalVouchers: 0,
    totalFaceValue: 0,
    totalRedeemedCount: 0,
    totalRedeemedValue: 0,
    totalOutstandingCount: 0,
    totalOutstandingValue: 0,
  };

  // Format current period label for display
  const periodLabel = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return "All Time (Lifetime)";
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    return "Custom Date Range";
  }, [dateRange]);

  return (
    <div className="space-y-6 pb-20">
      {/* ─── TOP FILTER TOOLBAR (Matches & Elevates Screenshot Layout) ─── */}
      <Card className="border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            {/* 1. SELECT OUTLETS / STORES */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-indigo-500" />
                Select Outlets / Stores
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Outlets</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. PERIOD RANGE */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                Period Range
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={timePreset}
                  onChange={(e) => handlePresetChange(e.target.value as TimePreset)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="thisYear">Jul 1, 2026 – Jun 30, 2027 (This Fiscal Year)</option>
                  <option value="all">All Time (Lifetime History)</option>
                  <option value="2years">Previous 2 Years</option>
                  <option value="5years">Previous 5 Years</option>
                  <option value="custom">Custom Date Range...</option>
                </select>
                {timePreset === "custom" && (
                  <div className="shrink-0">
                    <DateRangePicker
                      date={dateRange}
                      onDateChange={(range) => {
                        if (range) setDateRange(range);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. QUICK SEARCH */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-indigo-500" />
                Quick Search
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search Company, GL Code, Voucher #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl text-xs pr-8 pl-3 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 4. REFRESH REPORT BUTTON */}
            <div className="md:col-span-2">
              <Button
                onClick={() => (viewMode === "grouped" ? fetchGroupedReport() : fetchFlatReport())}
                disabled={isPending}
                className="w-full h-11 rounded-xl font-bold text-xs gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm"
              >
                <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                Refresh Report
              </Button>
            </div>
          </div>

          {/* Sub-toolbar: Quick Filter Pills & Export Buttons */}
          <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Grouping Mode Switcher */}
              <div className="flex bg-muted p-1 rounded-xl border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                    viewMode === "grouped"
                      ? "bg-background text-indigo-700 dark:text-indigo-300 shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Elite Grouped by Client
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("flat")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                    viewMode === "flat"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Flat Voucher List
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-muted-foreground ml-1">Status:</span>
                {(["ALL", "OUTSTANDING", "REDEEMED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold border transition",
                      statusFilter === st
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-2xs"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {st === "ALL" ? "All" : st === "OUTSTANDING" ? "Outstanding" : "Redeemed"}
                  </button>
                ))}
              </div>

              {/* Abbr Filter dropdown */}
              {groupedData?.distinctAbbreviations && groupedData.distinctAbbreviations.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-muted-foreground">Abbr:</span>
                  <select
                    value={selectedAbbr}
                    onChange={(e) => setSelectedAbbr(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="all">All Abbr ({groupedData.distinctAbbreviations.length})</option>
                    {groupedData.distinctAbbreviations.map((ab) => (
                      <option key={ab} value={ab}>
                        [{ab}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcelClick}
                disabled={exportState === "queueing" || exportState === "processing"}
                className="gap-1.5 h-8 rounded-lg text-xs font-semibold"
              >
                {exportState === "processing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                )}
                {exportState === "completed"
                  ? "Download Excel"
                  : exportState === "processing"
                  ? `Excel (${exportProgress}%)`
                  : "Export Excel"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdfClick}
                disabled={pdfExportState === "queueing" || pdfExportState === "processing"}
                className="gap-1.5 h-8 rounded-lg text-xs font-semibold"
              >
                {pdfExportState === "processing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                ) : (
                  <Printer className="h-3.5 w-3.5 text-rose-600" />
                )}
                {pdfExportState === "completed"
                  ? "Download PDF"
                  : pdfExportState === "processing"
                  ? `PDF (${pdfExportProgress}%)`
                  : "Export PDF"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4 EXACT SCREENSHOT KPI CARDS + 2 EXECUTIVE METRICS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CORPORATE VOUCHERS */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Corporate Vouchers
              </p>
              <h3 className="text-3xl font-black text-foreground tracking-tight">
                {kpis.totalVouchers.toLocaleString()}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60 shadow-xs shrink-0">
              <Ticket className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: TOTAL FACE VALUE */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Total Face Value
              </p>
              <h3 className="text-3xl font-black text-foreground tracking-tight font-mono">
                {kpis.totalFaceValue.toLocaleString()}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center border border-sky-100 dark:border-sky-900/60 shadow-xs shrink-0">
              <Coins className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: TOTAL DISCOUNT */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Total Discount
              </p>
              <h3 className="text-3xl font-black text-foreground tracking-tight font-mono">
                —
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center border border-amber-100 dark:border-amber-900/60 shadow-xs shrink-0">
              <Percent className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: SETTLED VALUE */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Settled Value
              </p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                {kpis.totalRedeemedValue.toLocaleString()}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/60 shadow-xs shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extra Executive Summary Badges */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
            Corporate Accounts: <strong className="text-foreground">{kpis.totalClients}</strong>
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            Outstanding Liability:{" "}
            <strong className="text-amber-600 dark:text-amber-400 font-mono">
              PKR {kpis.totalOutstandingValue.toLocaleString()} ({kpis.totalOutstandingCount} vouchers)
            </strong>
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-sky-500" />
            Active Period: <strong className="text-foreground">{periodLabel}</strong>
          </span>
        </div>
      </div>

      {/* ─── ELITE GROUPING FACILITY: MASTER CLIENT REGISTER ─── */}
      {viewMode === "grouped" ? (
        <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden bg-card">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Corporate Client Accounts &amp; Abbreviation Portfolio
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consolidated client master list. Habib Metropolitan, Rebrand, Allied Bank and partners displayed <strong>all in one</strong> with complete financial minutes drill-down.
              </p>
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Showing <strong className="text-foreground">{groupedData?.clients?.length || 0}</strong> client accounts
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0a1024] text-slate-100 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                  <th className="p-3.5 w-10 text-center"></th>
                  <th className="p-3.5 w-24">Abbr</th>
                  <th className="p-3.5 min-w-[300px]">Corporate Client / Company</th>
                  <th className="p-3.5 text-right w-32">Total Vouchers</th>
                  <th className="p-3.5 text-right w-40">Total Face Value</th>
                  <th className="p-3.5 text-right w-40">Settled Value</th>
                  <th className="p-3.5 text-right w-44 font-black text-amber-300">Outstanding Liability</th>
                  <th className="p-3.5 min-w-[200px]">Denomination Mix</th>
                  <th className="p-3.5 w-32">Active Span</th>
                  <th className="p-3.5 w-36 text-center">Detailed Minutes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isPending ? (
                  <tr>
                    <td colSpan={10} className="p-14 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        <span className="font-semibold text-sm">Loading Consolidated Corporate Portfolio...</span>
                      </div>
                    </td>
                  </tr>
                ) : !groupedData?.clients || groupedData.clients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-14 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        <span className="font-bold text-sm">No corporate client records found</span>
                        <p className="text-xs text-muted-foreground">
                          Try switching to "All Time (Lifetime)" or adjusting search filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groupedData.clients.map((client) => {
                    const clientKey = `${client.companyName}:::${client.abbr}`;
                    const isExpanded = expandedClients.has(clientKey);
                    const subState = clientVouchersMap[clientKey];
                    const redemptionPct =
                      client.totalFaceValue > 0
                        ? Math.round((client.redeemedValue / client.totalFaceValue) * 100)
                        : 0;

                    return (
                      <React.Fragment key={clientKey}>
                        <tr
                          onClick={() => toggleClientExpansion(clientKey, client.companyName, client.abbr)}
                          className={cn(
                            "cursor-pointer transition-colors group",
                            isExpanded
                              ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-l-4 border-l-indigo-600"
                              : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          )}
                        >
                          {/* Chevron */}
                          <td className="p-3.5 text-center text-muted-foreground group-hover:text-indigo-600">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-indigo-600 transition-transform" />
                            ) : (
                              <ChevronRight className="h-4 w-4 transition-transform" />
                            )}
                          </td>

                          {/* Abbreviation Badge */}
                          <td className="p-3.5">
                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700/60 shadow-2xs">
                              {client.abbr}
                            </span>
                          </td>

                          {/* Company / Corporate Client */}
                          <td className="p-3.5">
                            <div className="font-extrabold text-foreground text-sm flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                              <span>{client.companyName}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                              GL Reference: [{client.abbr}] &bull; Corporate Contract
                            </span>
                          </td>

                          {/* Total Vouchers Issued */}
                          <td className="p-3.5 text-right font-mono font-bold text-foreground text-sm">
                            {client.totalVouchers.toLocaleString()}
                          </td>

                          {/* Total Face Value */}
                          <td className="p-3.5 text-right font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                            Rs. {client.totalFaceValue.toLocaleString()}
                          </td>

                          {/* Settled Value */}
                          <td className="p-3.5 text-right">
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              {client.redeemedCount.toLocaleString()} ({redemptionPct}%)
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              Rs. {client.redeemedValue.toLocaleString()}
                            </span>
                          </td>

                          {/* Outstanding Liability */}
                          <td className="p-3.5 text-right">
                            <div
                              className={cn(
                                "font-mono font-bold text-xs",
                                client.outstandingCount > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {client.outstandingCount.toLocaleString()} vouchers
                            </div>
                            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-mono font-black block">
                              Rs. {client.outstandingValue.toLocaleString()}
                            </span>
                          </td>

                          {/* Denominations */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {client.denominations.slice(0, 3).map((d) => (
                                <span
                                  key={d.value}
                                  className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded-md border border-border"
                                >
                                  {d.count.toLocaleString()} &times; {(d.value / 1000).toFixed(0)}k
                                </span>
                              ))}
                              {client.denominations.length > 3 && (
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  +{client.denominations.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Active Span */}
                          <td className="p-3.5 text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                            {client.firstIssuedDate && client.lastIssuedDate
                              ? `${format(new Date(client.firstIssuedDate), "yyyy")} – ${format(new Date(client.lastIssuedDate), "yyyy")}`
                              : "—"}
                          </td>

                          {/* Action Button: Detailed Minutes */}
                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleClientExpansion(clientKey, client.companyName, client.abbr)}
                              className={cn(
                                "h-8 text-xs font-bold gap-1.5 rounded-lg transition-all",
                                isExpanded
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-indigo-600 shadow-xs"
                                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              )}
                            >
                              {isExpanded ? "Close Minutes" : `Minutes (${client.totalVouchers})`}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>

                        {/* ─── DETAILED MINUTES (EXPANDED RECORD) ─── */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 dark:bg-slate-900/60 border-y-2 border-indigo-300 dark:border-indigo-800">
                            <td colSpan={10} className="p-4 sm:p-5 space-y-4">
                              {/* Detailed Minutes Banner */}
                              <div className="flex items-center justify-between flex-wrap gap-3 bg-card p-4 rounded-xl border shadow-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700 font-mono text-xs font-black">
                                      [{client.abbr}]
                                    </Badge>
                                    <h3 className="text-sm font-black text-foreground">
                                      Detailed Minutes &bull; {client.companyName}
                                    </h3>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground font-semibold">
                                    Total: <strong>{client.totalVouchers}</strong> vouchers &bull; Face Value:{" "}
                                    <strong className="text-indigo-600">Rs. {client.totalFaceValue.toLocaleString()}</strong> &bull; Outstanding:{" "}
                                    <strong className="text-amber-600">Rs. {client.outstandingValue.toLocaleString()}</strong> &bull; Settled:{" "}
                                    <strong className="text-emerald-600">Rs. {client.redeemedValue.toLocaleString()}</strong>
                                  </p>
                                </div>

                                {/* Minute Sub-Filters & Minute Search */}
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  {/* Filter tabs */}
                                  <div className="flex rounded-lg border bg-background p-0.5 text-xs font-semibold">
                                    {(["ALL", "OUTSTANDING", "REDEEMED"] as const).map((tab) => (
                                      <button
                                        key={tab}
                                        type="button"
                                        onClick={() =>
                                          loadClientVouchers(
                                            clientKey,
                                            client.companyName,
                                            client.abbr,
                                            1,
                                            tab,
                                            subState?.search || ""
                                          )
                                        }
                                        className={cn(
                                          "px-3 py-1 rounded-md text-[11px] transition font-bold",
                                          (subState?.statusFilter || "ALL") === tab
                                            ? "bg-indigo-600 text-white shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                        )}
                                      >
                                        {tab === "ALL" ? `All (${client.totalVouchers})` : tab === "OUTSTANDING" ? `Outstanding (${client.outstandingCount})` : `Settled (${client.redeemedCount})`}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Search within this client's minutes */}
                                  <div className="relative">
                                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      type="text"
                                      placeholder="Filter voucher # or invoice..."
                                      value={subState?.search || ""}
                                      onChange={(e) =>
                                        loadClientVouchers(
                                          clientKey,
                                          client.companyName,
                                          client.abbr,
                                          1,
                                          subState?.statusFilter || "ALL",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-xs w-48 pl-8 font-mono rounded-lg"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* The Detailed Minutes Table (Exact Columns From Screenshot) */}
                              {subState?.loading ? (
                                <div className="p-12 text-center text-muted-foreground text-xs">
                                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                                  Loading detailed voucher minutes for {client.companyName}...
                                </div>
                              ) : !subState?.items || subState.items.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground font-semibold bg-card rounded-xl border">
                                  No voucher minutes found matching this sub-filter.
                                </div>
                              ) : (
                                <div className="rounded-xl border overflow-x-auto bg-card shadow-xs">
                                  <table className="w-full text-xs text-left border-collapse min-w-[1400px]">
                                    <thead className="bg-[#0f172a] text-slate-100 uppercase text-[10px] font-extrabold border-b tracking-wider">
                                      <tr>
                                        <th className="p-3 w-12 text-center">#</th>
                                        <th className="p-3 min-w-[180px]">Corporate Voucher #</th>
                                        <th className="p-3 min-w-[160px]">Date Time</th>
                                        <th className="p-3 min-w-[220px]">Company Name</th>
                                        <th className="p-3 min-w-[120px]">Company GL Code</th>
                                        <th className="p-3 min-w-[200px]">Beneficiary / Customer</th>
                                        <th className="p-3 min-w-[130px]">Valid Till</th>
                                        <th className="p-3 min-w-[200px]">Issued Outlet</th>
                                        <th className="p-3 text-right min-w-[140px]">Discount Amount (Rs.)</th>
                                        <th className="p-3 text-right min-w-[150px] text-emerald-300 font-black">
                                          Face Value (Rs.)
                                        </th>
                                        <th className="p-3 text-center min-w-[120px]">Status</th>
                                        <th className="p-3 min-w-[180px]">Settled In Invoice</th>
                                        <th className="p-3 min-w-[180px]">Settled Outlet</th>
                                        <th className="p-3 min-w-[160px]">Settled Date Time</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y text-xs">
                                      {subState.items.map((item, idx) => {
                                        const minuteIndex = (subState.page - 1) * 50 + idx + 1;
                                        const isRedeemed = item.status === "REDEEMED";

                                        return (
                                          <tr
                                            key={item.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                                          >
                                            {/* Sequence # */}
                                            <td className="p-3 text-center font-mono font-bold text-muted-foreground">
                                              {minuteIndex}
                                            </td>

                                            {/* Corporate Voucher # */}
                                            <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">
                                              <div className="flex items-center gap-1.5">
                                                <span>{item.voucherNumber || item.code}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => copyToClipboard(item.voucherNumber || item.code)}
                                                  title="Copy Voucher Code"
                                                  className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded text-muted-foreground hover:text-indigo-600 transition"
                                                >
                                                  {copiedCode === (item.voucherNumber || item.code) ? (
                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                  ) : (
                                                    <Copy className="h-3 w-3" />
                                                  )}
                                                </button>
                                              </div>
                                            </td>

                                            {/* Date Time */}
                                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                                              {item.dateTime || item.issuedAt}
                                            </td>

                                            {/* Company Name */}
                                            <td className="p-3 font-bold text-foreground">
                                              <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                                <span>{item.companyName || client.companyName}</span>
                                              </div>
                                            </td>

                                            {/* Company GL Code */}
                                            <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                                              {item.companyGlCode || client.abbr}
                                            </td>

                                            {/* Beneficiary / Customer */}
                                            <td className="p-3 text-foreground font-medium">
                                              {item.customerDetail || "Unassigned Beneficiary"}
                                            </td>

                                            {/* Valid Till */}
                                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                                              {item.validTill || item.expiresAt}
                                            </td>

                                            {/* Issued Outlet */}
                                            <td className="p-3 text-foreground font-medium">
                                              {item.outletName || "Head Office / Corporate Store"}
                                            </td>

                                            {/* Discount Amount */}
                                            <td className="p-3 text-right font-mono text-muted-foreground">
                                              {item.discountAmount && item.discountAmount > 0
                                                ? item.discountAmount.toLocaleString()
                                                : "—"}
                                            </td>

                                            {/* Face Value (Rs.) */}
                                            <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                                              {item.faceValue.toLocaleString()}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-3 text-center">
                                              <span
                                                className={cn(
                                                  "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide",
                                                  isRedeemed
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300"
                                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300"
                                                )}
                                              >
                                                {item.status}
                                              </span>
                                            </td>

                                            {/* Settled In Invoice */}
                                            <td className="p-3 font-mono">
                                              {isRedeemed && item.settledInInvoice !== "Pending / Unsettled" ? (
                                                <span className="font-bold text-sky-600 dark:text-sky-400">
                                                  {item.settledInInvoice}
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground italic">
                                                  {item.settledInInvoice || "Pending / Unsettled"}
                                                </span>
                                              )}
                                            </td>

                                            {/* Settled Outlet */}
                                            <td className="p-3 text-muted-foreground">
                                              {item.settledOutlet || "—"}
                                            </td>

                                            {/* Settled Date Time */}
                                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                                              {item.settledDateTime || "—"}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {/* Sub-pagination for 50+ Vouchers */}
                                  {subState.total > 50 && (
                                    <div className="p-3 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
                                      <span>
                                        Showing {(subState.page - 1) * 50 + 1} -{" "}
                                        {Math.min(subState.page * 50, subState.total)} of {subState.total} vouchers
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={subState.page <= 1}
                                          onClick={() =>
                                            loadClientVouchers(
                                              clientKey,
                                              client.companyName,
                                              client.abbr,
                                              subState.page - 1,
                                              subState.statusFilter,
                                              subState.search
                                            )
                                          }
                                          className="h-7 text-xs px-2.5 rounded-lg"
                                        >
                                          Previous
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={subState.page * 50 >= subState.total}
                                          onClick={() =>
                                            loadClientVouchers(
                                              clientKey,
                                              client.companyName,
                                              client.abbr,
                                              subState.page + 1,
                                              subState.statusFilter,
                                              subState.search
                                            )
                                          }
                                          className="h-7 text-xs px-2.5 rounded-lg"
                                        >
                                          Next
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ─── FLAT VIRTUALIZED VIEW (ALL VOUCHERS LIST) ─── */
        <div className="border rounded-2xl shadow-xs bg-background overflow-x-auto">
          <div ref={parentRef} className="overflow-auto max-h-[700px] min-w-[1900px]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1900px]">
              <thead>
                <tr className="bg-[#0a1024] text-slate-100 border-b border-border/80 text-[10px] uppercase font-extrabold sticky top-0 z-10 shadow-sm">
                  <th className="p-3.5 w-[200px] border-r border-slate-800 bg-[#0a1024]">Corporate Voucher #</th>
                  <th className="p-3.5 w-[170px] border-r border-slate-800 bg-[#0a1024]">Date Time</th>
                  <th className="p-3.5 w-[250px] border-r border-slate-800 bg-[#0a1024]">Company Name</th>
                  <th className="p-3.5 w-[150px] border-r border-slate-800 bg-[#0a1024]">Client Abbr</th>
                  <th className="p-3.5 w-[220px] border-r border-slate-800 bg-[#0a1024]">Beneficiary / Customer</th>
                  <th className="p-3.5 w-[130px] border-r border-slate-800 bg-[#0a1024]">Valid Till</th>
                  <th className="p-3.5 w-[200px] border-r border-slate-800 bg-[#0a1024]">Issued Outlet</th>
                  <th className="p-3.5 w-[160px] border-r border-slate-800 text-right bg-[#0a1024] font-black text-emerald-300">
                    Face Value (Rs.)
                  </th>
                  <th className="p-3.5 w-[200px] border-r border-slate-800 bg-[#0a1024]">Settled In Invoice</th>
                  <th className="p-3.5 w-[170px] border-r border-slate-800 bg-[#0a1024]">Settled Date Time</th>
                  <th className="p-3.5 w-[120px] text-center bg-[#0a1024]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {isPending ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-muted-foreground font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                        Loading All Vouchers...
                      </div>
                    </td>
                  </tr>
                ) : flatItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-muted-foreground font-medium">
                      No corporate vouchers match the selected filters.
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={11} style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}
                    {virtualItems.map((virtualRow) => {
                      const item = flatItems[virtualRow.index];
                      const isSettled = item.settledInInvoice !== "Pending / Unsettled";

                      return (
                        <tr
                          key={virtualRow.key}
                          ref={rowVirtualizer.measureElement}
                          data-index={virtualRow.index}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors h-[48px]"
                        >
                          <td className="p-3.5 border-r font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {item.voucherNumber}
                          </td>
                          <td className="p-3.5 border-r text-slate-700 dark:text-slate-300">{item.dateTime}</td>
                          <td className="p-3.5 border-r font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            {item.companyName}
                          </td>
                          <td className="p-3.5 border-r font-mono font-bold text-indigo-600">
                            {item.companyGlCode}
                          </td>
                          <td className="p-3.5 border-r text-slate-800 dark:text-slate-200 font-medium">
                            {item.customerDetail}
                          </td>
                          <td className="p-3.5 border-r text-slate-600 dark:text-slate-400">{item.validTill}</td>
                          <td className="p-3.5 border-r font-medium text-slate-800 dark:text-slate-200">
                            {item.outletName}
                          </td>
                          <td className="p-3.5 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                            {item.faceValue.toLocaleString()}
                          </td>
                          <td className="p-3.5 border-r font-mono">
                            {isSettled ? (
                              <span className="font-semibold text-sky-600 dark:text-sky-400">{item.settledInInvoice}</span>
                            ) : (
                              <span className="text-muted-foreground italic">{item.settledInInvoice}</span>
                            )}
                          </td>
                          <td className="p-3.5 border-r text-slate-600 dark:text-slate-400">{item.settledDateTime}</td>
                          <td className="p-3.5 text-center">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide",
                                item.status === "REDEEMED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-300"
                              )}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr>
                        <td colSpan={11} style={{ height: `${paddingBottom}px` }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
