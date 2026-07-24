"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Banknote,
  Building2,
  Calendar,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { authFetch } from "@/lib/auth";

export default function CashCompareReportPage() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Fetch available locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await authFetch("/inventory/locations");
        if (res.ok && res.data) {
          const locList = Array.isArray(res.data) ? res.data : res.data.data || [];
          setLocations(locList);
        }
      } catch (err) {
        console.error("Failed loading locations", err);
      }
    }
    fetchLocations();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/pos-session/cash-compare", {
        params: {
          startDate,
          endDate,
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
  }, [startDate, endDate, selectedLocation]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        locationId: selectedLocation,
      });

      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/pos-session/cash-compare/excel?${queryParams.toString()}`;
      window.open(url, "_blank");
      toast.success("Excel export initiated");
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  const setPresetRange = (preset: "today" | "thisMonth" | "thisYear") => {
    const today = new Date();
    const todayFormatted = today.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayFormatted);
      setEndDate(todayFormatted);
    } else if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(start);
      setEndDate(todayFormatted);
    } else if (preset === "thisYear") {
      const start = new Date(today.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
      setStartDate(start);
      setEndDate(todayFormatted);
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
              Cash Audit
            </Badge>
            <span className="text-xs text-muted-foreground">Variance & Bank Deposits Report</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight pt-1">Cash Compare Report</h1>
          <p className="text-sm text-muted-foreground">
            Track daily/shift expected cash, actual counted cash, short/excess variances, and bank deposits across any date range.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px] rounded-full">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Outlets" />
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

          {/* DATE RANGE INPUTS */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-full border border-border">
            <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[130px] h-8 text-xs rounded-full border-none bg-transparent focus-visible:ring-0"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[130px] h-8 text-xs rounded-full border-none bg-transparent focus-visible:ring-0 mr-1"
            />
          </div>

          <Select onValueChange={(v) => setPresetRange(v as any)}>
            <SelectTrigger className="w-[120px] rounded-full">
              <SelectValue placeholder="Presets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchReport} className="rounded-full">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={exporting || rows.length === 0}
            className="rounded-full px-5 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-[24px] border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Cash</CardTitle>
            <Wallet className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpected)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sum of float + cash sales</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actual Counted Cash</CardTitle>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total physical cash counted</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-border">
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

        <Card className="rounded-[24px] border border-border">
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

      {/* TABLE */}
      <Card className="rounded-[28px] border border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="text-lg font-bold">
            Cash Comparison Matrix ({startDate} to {endDate})
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
