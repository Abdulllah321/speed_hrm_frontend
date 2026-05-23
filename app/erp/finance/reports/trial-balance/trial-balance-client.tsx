"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Download, Printer, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { getTrialBalance, TrialBalanceResult, queueTrialBalanceExport } from "@/lib/actions/finance-reports";
import { TrialBalancePrint } from "./trial-balance-print";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fmt = (n: number) =>
  n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ReportType = "OPENING" | "CLOSING" | "DETAILED";

export function TrialBalanceClient({ initialData }: { initialData?: TrialBalanceResult }) {
  const [data, setData] = useState<TrialBalanceResult | undefined>(initialData);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  
  const [reportType, setReportType] = useState<ReportType>("DETAILED");
  const [includeTagAccounts, setIncludeTagAccounts] = useState(false);

  const handleExcelExport = async () => {
    if (!data) return;
    setIsExporting(true);
    toast.loading("Queuing Excel export job...");
    try {
      const res = await queueTrialBalanceExport({
        from: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        includeTagAccounts,
        reportType,
      });

      toast.dismiss();
      if (res.status && res.data) {
        toast.success("Excel export job successfully queued! Check your notification bell in a moment to download.");
      } else {
        toast.error(res.message || "Failed to queue Excel export job.");
      }
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to queue export job.");
    } finally {
      setIsExporting(false);
    }
  };

  const load = (from?: Date, to?: Date, includeTags?: boolean) => {
    startTransition(async () => {
      const res = await getTrialBalance(
        from ? format(from, "yyyy-MM-dd") : undefined,
        to   ? format(to,   "yyyy-MM-dd") : undefined,
        includeTags
      );
      if (res.status) setData(res.data);
    });
  };

  const rows = data?.rows || [];
  
  const showOpening = reportType === "OPENING" || reportType === "DETAILED";
  const showTransactions = reportType === "DETAILED";
  const showClosing = reportType === "CLOSING" || reportType === "DETAILED";

  const exportToCSV = () => {
    if (!data || rows.length === 0) return;
    
    const headers = ["Sr.No", "ACC.CODE", "ACCOUNT"];
    if (showOpening) { headers.push("OPENING DR", "OPENING CR"); }
    if (showTransactions) { headers.push("TX DR", "TX CR"); }
    if (showClosing) { headers.push("CLOSING DR", "CLOSING CR"); }
    
    const csvRows = [headers.join(",")];
    
    rows.forEach((row, i) => {
      const isTag = row.isTagAccount;
      const accountName = isTag ? `  -> ${row.name}` : row.name;
      const cleanName = `"${accountName.replace(/"/g, '""')}"`;
      const code = `"${row.code}"`;
      
      const r = [i + 1, code, cleanName];
      if (showOpening) { r.push(row.openingDebit, row.openingCredit); }
      if (showTransactions) { r.push(row.transactionDebit, row.transactionCredit); }
      if (showClosing) { r.push(row.closingDebit, row.closingCredit); }
      
      csvRows.push(r.join(","));
    });
    
    // Add totals row
    const totals = ["", "", "GRAND TOTAL"];
    if (showOpening) { totals.push(data.totalOpeningDebit || 0, data.totalOpeningCredit || 0); }
    if (showTransactions) { totals.push(data.totalTransactionDebit || 0, data.totalTransactionCredit || 0); }
    if (showClosing) { totals.push(data.totalClosingDebit ?? data.totalDebit ?? 0, data.totalClosingCredit ?? data.totalCredit ?? 0); }
    csvRows.push(totals.join(","));
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Trial_Balance_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate the colSpan for the header "ACCOUNT"
  const totalCols = 3 
    + (showOpening ? 2 : 0) 
    + (showTransactions ? 2 : 0) 
    + (showClosing ? 2 : 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Trial Balance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {fromDate && toDate
                ? `Period: ${format(fromDate, "dd MMM yyyy")} – ${format(toDate, "dd MMM yyyy")}`
                : "All time (running balances)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  Immediate CSV Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExcelExport} disabled={isExporting}>
                  Background Excel Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Filters */}
          <div className="space-y-4 p-4 rounded-lg border dark:border-border">
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date Range</Label>
                <DateRangePicker
                  initialDateFrom={fromDate}
                  initialDateTo={toDate}
                  onUpdate={(v) => { setFromDate(v.range.from); setToDate(v.range.to); }}
                  align="start"
                  locale="en-GB"
                  showCompare={false}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Report Type</Label>
                <RadioGroup 
                  value={reportType} 
                  onValueChange={(val) => setReportType(val as ReportType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="OPENING" id="r-opening" />
                    <Label htmlFor="r-opening" className="cursor-pointer">Only Opening</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CLOSING" id="r-closing" />
                    <Label htmlFor="r-closing" className="cursor-pointer">Only Closing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DETAILED" id="r-detailed" />
                    <Label htmlFor="r-detailed" className="cursor-pointer">All (Opening, Activity, Closing)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    checked={includeTagAccounts}
                    onCheckedChange={(checked) => setIncludeTagAccounts(checked as boolean)}
                  />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Include Sub-Accounts (Tags)</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => load(fromDate, toDate, includeTagAccounts)} disabled={isPending}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
                  {isPending ? "Loading…" : "Apply"}
                </Button>
                <Button variant="ghost" onClick={() => { setFromDate(undefined); setToDate(undefined); setIncludeTagAccounts(false); setReportType("DETAILED"); load(undefined, undefined, false); }}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Balance check banner */}
          {data && (
            <div className={cn(
              "flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium",
              data.balanced
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
            )}>
              <span>{data.balanced ? "✓ Books are balanced" : "⚠ Books are NOT balanced — check for missing entries"}</span>
              <span>Difference: {fmt(Math.abs((data.totalDebit ?? 0) - (data.totalCredit ?? 0)))}</span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border dark:border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b dark:border-border">
                  <th rowSpan={2} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r">Sr.No</th>
                  <th rowSpan={2} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r">ACC.CODE</th>
                  <th rowSpan={2} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r">ACCOUNT</th>
                  {showOpening && <th colSpan={2} className="text-center px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r border-b">Opening Balance</th>}
                  {showTransactions && <th colSpan={2} className="text-center px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r border-b">Transactions</th>}
                  {showClosing && <th colSpan={2} className="text-center px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Closing Balance</th>}
                </tr>
                <tr className="bg-muted/40 border-b dark:border-border">
                  {showOpening && <>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider">DR</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r">CR</th>
                  </>}
                  {showTransactions && <>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider">DR</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r">CR</th>
                  </>}
                  {showClosing && <>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider">DR</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider">CR</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} className="text-center py-8 text-muted-foreground">
                      No accounts to display
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => {
                    const isGroup = 'isGroup' in row && row.isGroup;
                    const isTag = row.isTagAccount;
                    const level = row.level || 0;
                    
                    return (
                      <tr 
                        key={row.id} 
                        className={cn(
                          "border-b dark:border-border/50 hover:bg-accent/30", 
                          isGroup && "font-semibold bg-muted/20",
                          isTag && "text-muted-foreground bg-muted/5",
                          !isGroup && !isTag && i % 2 === 1 && "bg-muted/10"
                        )}
                      >
                        <td className="px-4 py-2 text-center font-mono text-xs border-r">{i + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs border-r">{row.code}</td>
                        <td className="px-4 py-2 border-r">
                          <div 
                            className={cn("flex items-center", isTag && "italic")} 
                            style={{ paddingLeft: `${level * 1.5}rem` }}
                          >
                            {isTag ? `↳ ${row.name}` : row.name}
                          </div>
                        </td>
                        {showOpening && <>
                          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                            {row.openingDebit > 0 ? fmt(row.openingDebit) : ""}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground border-r">
                            {row.openingCredit > 0 ? fmt(row.openingCredit) : ""}
                          </td>
                        </>}
                        {showTransactions && <>
                          <td className="px-4 py-2 text-right font-mono text-xs">
                            {row.transactionDebit > 0 ? fmt(row.transactionDebit) : ""}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs border-r">
                            {row.transactionCredit > 0 ? fmt(row.transactionCredit) : ""}
                          </td>
                        </>}
                        {showClosing && <>
                          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                            {row.closingDebit > 0 ? fmt(row.closingDebit) : ""}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                            {row.closingCredit > 0 ? fmt(row.closingCredit) : ""}
                          </td>
                        </>}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 border-t-2 dark:border-border font-bold text-sm">
                  <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider border-r">Grand Total</td>
                  {showOpening && <>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data?.totalOpeningDebit ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-mono border-r">{fmt(data?.totalOpeningCredit ?? 0)}</td>
                  </>}
                  {showTransactions && <>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data?.totalTransactionDebit ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-mono border-r">{fmt(data?.totalTransactionCredit ?? 0)}</td>
                  </>}
                  {showClosing && <>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data?.totalClosingDebit ?? data?.totalDebit ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data?.totalClosingCredit ?? data?.totalCredit ?? 0)}</td>
                  </>}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Print styles ── */}
      <style jsx global>{`
        @media print {
          body { visibility: hidden; }
          #tb-print-section {
            visibility: visible;
            position: fixed;
            top: 0; left: 0;
            width: 100vw;
            margin: 0; padding: 0;
            background: white;
            z-index: 9999;
          }
          #tb-print-section * { visibility: visible; }
          @page { margin: 15mm; size: A4 ${reportType === "DETAILED" ? "landscape" : "portrait"}; }
          header, nav, footer, aside, .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* ── Printable Report Layout ── */}
      {data && (
        <div id="tb-print-section" className="hidden print:block">
          <TrialBalancePrint 
            data={data} 
            reportType={reportType} 
            includeTagAccounts={includeTagAccounts} 
          />
        </div>
      )}
    </div>
  );
}
