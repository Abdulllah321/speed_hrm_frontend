"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import {
  Banknote,
  Building2,
  Calendar,
  Download,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, formatCurrency, getApiBaseUrl } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { getLocations, Location } from "@/lib/actions/location";

export default function CashCompareReportPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Excel Export Background Queue & Progress Controller States
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Fetch available stock locations on mount
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await getLocations(true);
        if (Array.isArray(res)) {
          setLocations(res);
        } else if (res?.status && Array.isArray(res?.data)) {
          setLocations(res.data);
        }
      } catch (error) {
        console.error("Failed to load locations", error);
        toast.error("Failed to load outlet locations");
      }
    }
    fetchLocations();
  }, []);

  const startDateStr = useMemo(() => {
    return dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");
  }, [dateRange.from]);

  const endDateStr = useMemo(() => {
    return dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(endOfMonth(new Date()), "yyyy-MM-dd");
  }, [dateRange.to]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/pos-session/cash-compare", {
        params: {
          startDate: startDateStr,
          endDate: endDateStr,
          locationId: selectedLocation,
        },
      });
      if (res.ok) {
        setReportData(res.data || null);
      } else {
        toast.error(res.data?.message || "Failed to load cash comparison report");
      }
    } catch {
      toast.error("Failed to fetch cash comparison data");
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr, selectedLocation]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Poll Excel Export Job Status
  useEffect(() => {
    if (exportState !== "queueing" && exportState !== "processing") return;
    if (!exportJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`/exports/status/${exportJobId}`);
        if (res.ok && res.data) {
          const { state, progress } = res.data;
          setExportProgress(progress || 0);

          if (state === "completed") {
            setExportState("completed");
            toast.success("Excel Export processed successfully! Click download.");
            clearInterval(interval);
          } else if (state === "failed") {
            setExportState("failed");
            toast.error("Background Excel export processing failed.");
            clearInterval(interval);
          } else {
            setExportState("processing");
          }
        }
      } catch (err) {
        console.error("Error polling export status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [exportState, exportJobId]);

  // Export button controller logic following Report Architecture Pattern
  const handleExportClick = async () => {
    if (exportState === "completed") {
      // Direct CORS-Safe Download via window.open
      const queryParams = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
        locationId: selectedLocation,
      });
      const downloadUrl = `${getApiBaseUrl()}/pos-session/cash-compare/excel?${queryParams.toString()}`;
      window.open(downloadUrl, "_blank");
      toast.success("Downloading Excel file...");
      return;
    }

    // Initiate Export Job
    setExportState("queueing");
    setExportProgress(0);

    try {
      const queryParams = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
        locationId: selectedLocation,
      });

      const url = `${getApiBaseUrl()}/pos-session/cash-compare/excel?${queryParams.toString()}`;
      window.open(url, "_blank");
      setExportState("completed");
      toast.success("Export generated and opened");
    } catch (err) {
      console.error(err);
      setExportState("failed");
      toast.error("Failed to initiate export");
    }
  };

  const rows = reportData?.rows || [];
  const totalExpected = reportData?.totalExpectedCash || 0;
  const totalActual = reportData?.totalActualCash || 0;
  const totalVariance = reportData?.totalVariance || 0;

  return (
    <div className="min-h-screen p-6 font-inter space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card rounded-[28px] p-6 border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-semibold">
              Cash Audit Report
            </Badge>
            <span className="text-xs text-muted-foreground">Variance & Bank Deposits Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight pt-1">Cash Compare Report</h1>
          <p className="text-sm text-muted-foreground">
            Session & day-end expected cash, physical counted cash, short/excess variances, and bank deposits.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px] rounded-full">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Stock Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Outlets</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* DATE RANGE PICKER */}
          <DateRangePicker
            onUpdate={(values) => setDateRange(values.range)}
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            className="rounded-full"
          />

          <Button variant="outline" size="icon" onClick={fetchReport} className="rounded-full">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>

          {/* PROGRESS CONTROLLER EXPORT BUTTON */}
          <Button
            onClick={handleExportClick}
            disabled={rows.length === 0 || exportState === "queueing"}
            className={cn(
              "rounded-full px-5 gap-2 font-medium transition-all",
              exportState === "completed"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : exportState === "failed"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            )}
          >
            {exportState === "queueing" || exportState === "processing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {exportState === "queueing" ? "Queueing..." : `Generating ${exportProgress}%`}
              </>
            ) : exportState === "completed" ? (
              <>
                <Download className="w-4 h-4" />
                Download Excel
              </>
            ) : exportState === "failed" ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry Export
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Excel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-[24px] border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Cash</CardTitle>
            <Wallet className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpected)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sum of float + cash sales</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actual Counted Cash</CardTitle>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total physical cash counted</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Variance</CardTitle>
            {totalVariance < 0 ? (
              <TrendingDown className="w-4 h-4 text-destructive" />
            ) : (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                totalVariance < 0 ? "text-destructive" : totalVariance > 0 ? "text-emerald-600" : "text-foreground"
              )}
            >
              {totalVariance > 0 ? "+" : ""}
              {formatCurrency(totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVariance < 0 ? "Cash Shortage (Deficit)" : totalVariance > 0 ? "Cash Surplus (Excess)" : "Balanced"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bank Deposits</CardTitle>
            <Building2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">Day-end counted cash for deposit</p>
          </CardContent>
        </Card>
      </div>

      {/* TABLE MATRIX */}
      <Card className="rounded-[28px] border border-border overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="text-lg font-bold">
            Cash Comparison Matrix ({startDateStr} to {endDateStr})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Loading cash comparison report...</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No shift/session records found for selected date range.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead className="text-right">Float</TableHead>
                    <TableHead className="text-right">Cash Sales</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Bank Deposit</TableHead>
                    <TableHead>Remarks / Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any, idx: number) => (
                    <TableRow key={r.sessionId || idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">{r.date}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.locationName}</div>
                        <div className="text-xs text-muted-foreground">Terminal: {r.posCode}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.cashierName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.openingFloat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.cashSales)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(r.expectedCash)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(r.actualCash)}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-bold text-sm",
                            r.variance < 0 ? "text-destructive" : r.variance > 0 ? "text-emerald-600" : "text-muted-foreground"
                          )}
                        >
                          {r.variance > 0 ? "+" : ""}
                          {formatCurrency(r.variance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.bankDepositAmount)}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                        {r.closingNote || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
