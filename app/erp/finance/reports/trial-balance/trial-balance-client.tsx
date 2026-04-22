"use client";

import { useState, useMemo, useTransition } from "react";
import { format } from "date-fns";
import { Download, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTrialBalance, TrialBalanceResult, TrialBalanceRow } from "@/lib/actions/finance-reports";

const fmt = (n: number) =>
  n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_COLORS: Record<string, string> = {
  ASSET:     "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  EQUITY:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  INCOME:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  EXPENSE:   "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function TrialBalanceClient({ initialData }: { initialData?: TrialBalanceResult }) {
  const [data, setData] = useState<TrialBalanceResult | undefined>(initialData);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const load = (from?: Date, to?: Date) => {
    startTransition(async () => {
      const res = await getTrialBalance(
        from ? format(from, "yyyy-MM-dd") : undefined,
        to   ? format(to,   "yyyy-MM-dd") : undefined,
      );
      if (res.status) setData(res.data);
    });
  };

  // Group rows by account type
  const grouped = useMemo(() => {
    if (!data?.rows) return {} as Record<string, TrialBalanceRow[]>;
    return data.rows.reduce<Record<string, TrialBalanceRow[]>>((acc, row) => {
      (acc[row.type] ??= []).push(row);
      return acc;
    }, {});
  }, [data]);

  const typeOrder = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

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
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border dark:border-border">
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
            <Button onClick={() => load(fromDate, toDate)} disabled={isPending}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
              {isPending ? "Loading…" : "Apply"}
            </Button>
            <Button variant="ghost" onClick={() => { setFromDate(undefined); setToDate(undefined); load(); }}>
              Reset
            </Button>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Account Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Debit</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody>
                {typeOrder.map(type => {
                  const rows = grouped[type];
                  if (!rows?.length) return null;
                  const subtotalDebit  = rows.reduce((s, r) => s + r.debit,  0);
                  const subtotalCredit = rows.reduce((s, r) => s + r.credit, 0);
                  return (
                    <>
                      <tr key={`${type}-header`} className="bg-muted/20 border-t dark:border-border">
                        <td colSpan={5} className="px-4 py-2 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                          {type}
                        </td>
                      </tr>
                      {rows.map((row, i) => (
                        <tr key={row.id} className={cn("border-b dark:border-border/50 hover:bg-accent/30", i % 2 === 1 && "bg-muted/10")}>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{row.code}</td>
                          <td className="px-4 py-2">
                            <div>{row.name}</div>
                            {row.parent && <div className="text-xs text-muted-foreground">{row.parent.name}</div>}
                          </td>
                          <td className="px-4 py-2">
                            <Badge className={cn("text-[10px]", TYPE_COLORS[row.type])} variant="secondary">{row.type}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{row.debit  > 0 ? fmt(row.debit)  : "-"}</td>
                          <td className="px-4 py-2 text-right font-mono">{row.credit > 0 ? fmt(row.credit) : "-"}</td>
                        </tr>
                      ))}
                      <tr key={`${type}-subtotal`} className="bg-muted/30 font-semibold border-t dark:border-border">
                        <td colSpan={3} className="px-4 py-2 text-right text-xs uppercase text-muted-foreground">Subtotal {type}</td>
                        <td className="px-4 py-2 text-right font-mono">{subtotalDebit  > 0 ? fmt(subtotalDebit)  : "-"}</td>
                        <td className="px-4 py-2 text-right font-mono">{subtotalCredit > 0 ? fmt(subtotalCredit) : "-"}</td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 border-t-2 dark:border-border font-bold text-sm">
                  <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider">Grand Total</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(data?.totalDebit  ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(data?.totalCredit ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
