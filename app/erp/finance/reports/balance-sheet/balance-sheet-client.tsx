"use client";

import { useState, useTransition, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Download,
  Printer,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  Scale,
  TrendingUp,
  Landmark,
  Building2,
  PieChart,
  Layers,
  Columns,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  getBalanceSheet,
  BalanceSheetResult,
  BalanceSheetAccount,
} from "@/lib/actions/finance-reports";

const fmt = (n: number) =>
  n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export function BalanceSheetClient({
  initialData,
}: {
  initialData?: BalanceSheetResult;
}) {
  const [data, setData] = useState<BalanceSheetResult | undefined>(initialData);

  // Filter States
  const [asOf, setAsOf] = useState<string>(initialData?.asOf || "");
  const [compareAsOf, setCompareAsOf] = useState<string>(
    initialData?.compareAsOf || "",
  );
  const [enableCompare, setEnableCompare] = useState<boolean>(
    !!initialData?.compareAsOf,
  );
  const [includeTagAccounts, setIncludeTagAccounts] = useState<boolean>(
    initialData?.includeTagAccounts ?? true,
  );
  const [showZeroBalances, setShowZeroBalances] = useState<boolean>(
    initialData?.showZeroBalances ?? false,
  );
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [layoutMode, setLayoutMode] = useState<"stacked" | "t-account">(
    "t-account",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Expand / Collapse State
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (initialData) {
      [
        ...initialData.assets,
        ...initialData.liabilities,
        ...initialData.equity,
      ].forEach((row) => {
        if (row.isGroup || row.level === 0) set.add(row.id);
      });
    }
    return set;
  });

  const [isPending, startTransition] = useTransition();

  const loadReport = () => {
    startTransition(async () => {
      const res = await getBalanceSheet({
        asOf: asOf || undefined,
        compareAsOf: enableCompare && compareAsOf ? compareAsOf : undefined,
        includeTagAccounts,
        showZeroBalances,
      });
      if (res.status && res.data) {
        setData(res.data);
        // Expand root groups by default
        const newExpanded = new Set<string>();
        [
          ...res.data.assets,
          ...res.data.liabilities,
          ...res.data.equity,
        ].forEach((row) => {
          if (row.isGroup || row.level === 0) newExpanded.add(row.id);
        });
        setExpandedNodes(newExpanded);
      }
    });
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    const allIds = new Set<string>();
    [...data.assets, ...data.liabilities, ...data.equity].forEach((r) =>
      allIds.add(r.id),
    );
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filter rows by level, search, and collapse hierarchy
  const filterRows = (rows: BalanceSheetAccount[]) => {
    if (!rows) return [];

    let filtered = rows;

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
      );
    }

    // 2. Level Filter
    if (levelFilter !== "all") {
      const maxLvl = parseInt(levelFilter, 10);
      filtered = filtered.filter((r) => (r.level ?? 0) < maxLvl);
    }

    // 3. Parent Collapse Filter (unless search is active)
    if (!searchQuery.trim()) {
      const visibleRows: BalanceSheetAccount[] = [];
      const parentVisible = (parentId?: string | null): boolean => {
        if (!parentId) return true;
        if (!expandedNodes.has(parentId)) return false;
        const parentRow = rows.find((r) => r.id === parentId);
        return parentRow ? parentVisible(parentRow.parentId) : true;
      };

      for (const row of filtered) {
        if (parentVisible(row.parentId)) {
          visibleRows.push(row);
        }
      }
      return visibleRows;
    }

    return filtered;
  };

  const filteredAssets = useMemo(
    () => filterRows(data?.assets || []),
    [data?.assets, searchQuery, levelFilter, expandedNodes],
  );
  const filteredLiabilities = useMemo(
    () => filterRows(data?.liabilities || []),
    [data?.liabilities, searchQuery, levelFilter, expandedNodes],
  );
  const filteredEquity = useMemo(
    () => filterRows(data?.equity || []),
    [data?.equity, searchQuery, levelFilter, expandedNodes],
  );

  const asOfDisplay = asOf
    ? format(parseISO(asOf), "dd MMM yyyy")
    : "Current (Live Balances)";
  const compareDisplay =
    enableCompare && compareAsOf
      ? format(parseISO(compareAsOf), "dd MMM yyyy")
      : null;

  // Export to CSV
  const exportCSV = () => {
    if (!data) return;
    const header = [
      "Type",
      "Account Code",
      "Account Name",
      "Level",
      "Is Tag Account",
      `As of (${asOfDisplay})`,
      ...(compareDisplay
        ? [`Compare (${compareDisplay})`, "Variance", "Change %"]
        : []),
    ];

    const formatRow = (r: BalanceSheetAccount, category: string) => [
      category,
      `"${r.code}"`,
      `"${r.name}"`,
      r.level ?? 0,
      r.isTagAccount ? "Yes" : "No",
      r.amount.toFixed(2),
      ...(compareDisplay
        ? [
            (r.compareAmount || 0).toFixed(2),
            (r.variance || 0).toFixed(2),
            `${(r.percentageChange || 0).toFixed(1)}%`,
          ]
        : []),
    ];

    const lines = [
      header.join(","),
      ...data.assets.map((r) => formatRow(r, "ASSET").join(",")),
      ...data.liabilities.map((r) => formatRow(r, "LIABILITY").join(",")),
      ...data.equity.map((r) => formatRow(r, "EQUITY").join(",")),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Balance_Sheet_${asOf || "current"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reusable Tree Table Component
  const RenderTreeSection = ({
    title,
    rows,
    totalAmount,
    compareTotalAmount,
    headerBgClass,
    accentColorClass,
  }: {
    title: string;
    rows: BalanceSheetAccount[];
    totalAmount: number;
    compareTotalAmount?: number;
    headerBgClass: string;
    accentColorClass: string;
  }) => {
    return (
      <div className="rounded-xl border dark:border-border overflow-hidden bg-card shadow-sm">
        {/* Section Header */}
        <div
          className={cn(
            "px-4 py-3 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between border-b dark:border-border",
            headerBgClass,
          )}
        >
          <span className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", accentColorClass)} />
            {title} ({rows.length})
          </span>
          <span className="font-mono text-sm font-bold">
            {fmt(totalAmount)}
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b dark:border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="px-3 py-2 text-left w-24">Code</th>
                <th className="px-3 py-2 text-left">Account Name</th>
                <th className="px-3 py-2 text-right">Balance</th>
                {enableCompare && (
                  <>
                    <th className="px-3 py-2 text-right">Compare</th>
                    <th className="px-3 py-2 text-right">Variance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-border/40">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={enableCompare ? 5 : 3}
                    className="px-4 py-6 text-center text-muted-foreground italic"
                  >
                    No account records match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isExpanded = expandedNodes.has(row.id);
                  const isGroup = row.isGroup;
                  const isTag = row.isTagAccount;
                  const isVirtual = row.isVirtual;
                  const indentPx = (row.level || 0) * 16;

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        isGroup && "bg-muted/15 font-semibold text-foreground",
                        isTag && "text-muted-foreground bg-accent/10 italic",
                        isVirtual &&
                          "bg-purple-500/10 font-bold text-purple-700 dark:text-purple-300",
                      )}
                    >
                      {/* Code */}
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground shrink-0 align-middle">
                        {row.code}
                      </td>

                      {/* Account Name with Indentation & Expander */}
                      <td className="px-3 py-2 align-middle">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${indentPx}px` }}
                        >
                          {isGroup ? (
                            <button
                              onClick={() => toggleNode(row.id)}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3.5 inline-block" />
                          )}

                          {isTag && (
                            <Tag className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          {isVirtual && (
                            <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0 animate-pulse" />
                          )}

                          <span
                            className={cn(
                              isGroup
                                ? "font-bold text-xs uppercase tracking-tight"
                                : "font-medium text-xs",
                              isTag && "text-[11px]",
                            )}
                          >
                            {row.name}
                          </span>

                          {isTag && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 dark:text-amber-400"
                            >
                              Sub-Account
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Balance (As Of) */}
                      <td className="px-3 py-2 text-right font-mono font-semibold align-middle text-xs">
                        {fmt(row.amount)}
                      </td>

                      {/* Comparative Columns */}
                      {enableCompare && (
                        <>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground align-middle text-xs">
                            {fmt(row.compareAmount || 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono align-middle text-xs">
                            <div className="flex items-center justify-end gap-1">
                              <span
                                className={cn(
                                  "font-semibold",
                                  (row.variance || 0) > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : (row.variance || 0) < 0
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-muted-foreground",
                                )}
                              >
                                {fmt(row.variance || 0)}
                              </span>
                              {(row.percentageChange || 0) !== 0 && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-1 rounded",
                                    (row.percentageChange || 0) > 0
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                                  )}
                                >
                                  {fmtPct(row.percentageChange || 0)}
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-extrabold border-t border-border text-foreground">
                <td
                  colSpan={2}
                  className="px-4 py-3 text-right uppercase text-xs tracking-wider"
                >
                  Total {title}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm">
                  {fmt(totalAmount)}
                </td>
                {enableCompare && (
                  <>
                    <td className="px-3 py-3 text-right font-mono text-sm text-muted-foreground">
                      {fmt(compareTotalAmount || 0)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">
                      {fmt(totalAmount - (compareTotalAmount || 0))}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #balance-sheet-print-container, #balance-sheet-print-container * {
              visibility: visible;
            }
            #balance-sheet-print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
              background: white !important;
              color: black !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
          }
        `,
        }}
      />

      <div className="space-y-6 max-w-7xl mx-auto print:hidden">
        {/* ── Top Header & Actions ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Scale className="h-7 w-7 text-primary" />
              Financial Balance Sheet
            </h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span>
                As of:{" "}
                <strong className="text-foreground">{asOfDisplay}</strong>
              </span>
              {compareDisplay && (
                <>
                  <span>•</span>
                  <span>
                    Compared with:{" "}
                    <strong className="text-foreground">
                      {compareDisplay}
                    </strong>
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Layout Toggle */}
            <div className="border rounded-lg p-0.5 flex bg-muted/30">
              <Button
                variant={layoutMode === "t-account" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setLayoutMode("t-account")}
                className="h-8 text-xs font-semibold px-2.5"
                title="Two-Column T-Account View"
              >
                <Columns className="h-3.5 w-3.5 mr-1.5" />
                T-Account
              </Button>
              <Button
                variant={layoutMode === "stacked" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setLayoutMode("stacked")}
                className="h-8 text-xs font-semibold px-2.5"
                title="Stacked Statement View"
              >
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Stacked
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Assets */}
            <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">
                    Total Assets
                  </span>
                  <Landmark className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black font-mono mt-2 text-foreground">
                  {fmt(data.totalAssets)}
                </div>
                {enableCompare && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span>Prev: {fmt(data.compareTotalAssets || 0)}</span>
                    <span
                      className={cn(
                        "font-bold",
                        data.totalAssets - (data.compareTotalAssets || 0) >= 0
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      (
                      {fmtPct(
                        data.compareTotalAssets
                          ? ((data.totalAssets - data.compareTotalAssets) /
                              Math.abs(data.compareTotalAssets)) *
                              100
                          : 0,
                      )}
                      )
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Total Liabilities */}
            <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">
                    Total Liabilities
                  </span>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black font-mono mt-2 text-foreground">
                  {fmt(data.totalLiabilities)}
                </div>
                {enableCompare && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Prev: {fmt(data.compareTotalLiabilities || 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Total Equity */}
            <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">
                    Total Equity
                  </span>
                  <PieChart className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black font-mono mt-2 text-foreground">
                  {fmt(data.totalEquity)}
                </div>
                <p className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold mt-1 flex items-center gap-1">
                  <span>Net Profit:</span>
                  <span className="font-mono font-bold">
                    {fmt(data.currentNetIncome || 0)}
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Working Capital */}
            <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">
                    Working Capital
                  </span>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black font-mono mt-2 text-foreground">
                  {fmt(data.workingCapital || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Assets minus Liabilities
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Balance Equation Status Strip ── */}
        {data && (
          <div
            className={cn(
              "flex flex-col sm:flex-row items-center justify-between px-5 py-3 rounded-xl border text-xs font-bold gap-3 shadow-sm",
              data.balanced
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
            )}
          >
            <div className="flex items-center gap-2">
              {data.balanced ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
              )}
              <span className="uppercase tracking-wide text-xs font-extrabold">
                {data.balanced
                  ? "Fundamental Accounting Equation Balanced: Assets = Liabilities + Equity"
                  : "Attention: Balance Sheet Imbalance Detected!"}
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <span>
                Assets: <strong>{fmt(data.totalAssets)}</strong>
              </span>
              <span>=</span>
              <span>
                L + E: <strong>{fmt(data.totalLiabilitiesAndEquity)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* ── Filter Toolbar ── */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ListFilter className="h-4 w-4" /> Report Filters & Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              {/* As Of Date */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  As of Date
                </Label>
                <DatePicker
                  value={asOf}
                  onChange={setAsOf}
                  placeholder="Current live balances"
                />
              </div>

              {/* Compare As Of Date */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Compare Date
                  </Label>
                  <div className="flex items-center space-x-1.5">
                    <Checkbox
                      id="enableCompare"
                      checked={enableCompare}
                      onCheckedChange={(c) => setEnableCompare(!!c)}
                    />
                    <label
                      htmlFor="enableCompare"
                      className="text-[10px] font-semibold cursor-pointer select-none"
                    >
                      Enable
                    </label>
                  </div>
                </div>
                <DatePicker
                  value={compareAsOf}
                  onChange={setCompareAsOf}
                  disabled={!enableCompare}
                  placeholder="Select compare date"
                />
              </div>

              {/* Level Depth Filter */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Hierarchy Level Depth
                </Label>
                <div className="flex items-center rounded-md border p-1 bg-muted/20 gap-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "1", label: "L1" },
                    { id: "2", label: "L2" },
                    { id: "3", label: "L3" },
                    { id: "4", label: "L4 Tags" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setLevelFilter(lvl.id)}
                      className={cn(
                        "flex-1 py-1 text-[10px] font-bold rounded transition-colors",
                        levelFilter === lvl.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Search Account
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox Toggles & Apply Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tagToggle"
                    checked={includeTagAccounts}
                    onCheckedChange={(c) => setIncludeTagAccounts(!!c)}
                  />
                  <label
                    htmlFor="tagToggle"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Include Sub-Accounts (Tag Accounts Breakdown)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="zeroToggle"
                    checked={showZeroBalances}
                    onCheckedChange={(c) => setShowZeroBalances(!!c)}
                  />
                  <label
                    htmlFor="zeroToggle"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Show Zero Balances
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="h-8 text-xs"
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="h-8 text-xs"
                >
                  Collapse All
                </Button>
                <Button
                  onClick={loadReport}
                  disabled={isPending}
                  size="sm"
                  className="h-8 text-xs font-bold"
                >
                  <RefreshCw
                    className={cn(
                      "h-3.5 w-3.5 mr-1.5",
                      isPending && "animate-spin",
                    )}
                  />
                  {isPending ? "Loading..." : "Apply Filters"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main Report Content (Dual Layout Modes) ── */}
        {data && (
          <>
            {layoutMode === "t-account" ? (
              /* Two-Column T-Account View */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column: Assets */}
                <RenderTreeSection
                  title="Assets"
                  rows={filteredAssets}
                  totalAmount={data.totalAssets}
                  compareTotalAmount={data.compareTotalAssets}
                  headerBgClass="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                  accentColorClass="bg-blue-500"
                />

                {/* Right Column: Liabilities & Equity */}
                <div className="space-y-6">
                  <RenderTreeSection
                    title="Liabilities"
                    rows={filteredLiabilities}
                    totalAmount={data.totalLiabilities}
                    compareTotalAmount={data.compareTotalLiabilities}
                    headerBgClass="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                    accentColorClass="bg-amber-500"
                  />

                  <RenderTreeSection
                    title="Equity"
                    rows={filteredEquity}
                    totalAmount={data.totalEquity}
                    compareTotalAmount={data.compareTotalEquity}
                    headerBgClass="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900"
                    accentColorClass="bg-purple-500"
                  />

                  {/* Combined Liabilities + Equity Total Banner */}
                  <div className="flex items-center justify-between px-6 py-4 rounded-xl border dark:border-border font-extrabold bg-muted/40 text-foreground shadow-sm">
                    <span className="uppercase text-xs tracking-wider">
                      Total Liabilities + Equity
                    </span>
                    <span className="font-mono text-lg text-primary">
                      {fmt(data.totalLiabilitiesAndEquity)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Stacked Statement View */
              <div className="space-y-6">
                <RenderTreeSection
                  title="Assets"
                  rows={filteredAssets}
                  totalAmount={data.totalAssets}
                  compareTotalAmount={data.compareTotalAssets}
                  headerBgClass="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                  accentColorClass="bg-blue-500"
                />

                <RenderTreeSection
                  title="Liabilities"
                  rows={filteredLiabilities}
                  totalAmount={data.totalLiabilities}
                  compareTotalAmount={data.compareTotalLiabilities}
                  headerBgClass="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                  accentColorClass="bg-amber-500"
                />

                <RenderTreeSection
                  title="Equity"
                  rows={filteredEquity}
                  totalAmount={data.totalEquity}
                  compareTotalAmount={data.compareTotalEquity}
                  headerBgClass="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900"
                  accentColorClass="bg-purple-500"
                />

                {/* Combined Total */}
                <div className="flex items-center justify-between px-6 py-4 rounded-xl border dark:border-border font-extrabold bg-muted/40 text-foreground shadow-sm">
                  <span className="uppercase text-xs tracking-wider">
                    Total Liabilities + Equity
                  </span>
                  <span className="font-mono text-lg text-primary">
                    {fmt(data.totalLiabilitiesAndEquity)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Printable A4 Template ── */}
      {data && (
        <div
          id="balance-sheet-print-container"
          className="hidden print:block font-sans text-black"
        >
          {/* Company Header */}
          <div className="text-center border-b pb-4 mb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider">
              Speed (pvt.) Limited ERP
            </h1>
            <h2 className="text-lg font-semibold uppercase mt-1">
              Financial Balance Sheet Statement
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">As of: {asOfDisplay}</p>
          </div>

          {/* KPI Summary Strip for Print */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4 border p-2 rounded bg-gray-50">
            <div>
              <span className="block text-[10px] text-gray-500 uppercase">
                Total Assets
              </span>
              <span className="font-mono font-bold text-sm">
                {fmt(data.totalAssets)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-gray-500 uppercase">
                Total Liabilities
              </span>
              <span className="font-mono font-bold text-sm">
                {fmt(data.totalLiabilities)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-gray-500 uppercase">
                Total Equity
              </span>
              <span className="font-mono font-bold text-sm">
                {fmt(data.totalEquity)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-gray-500 uppercase">
                Net Income
              </span>
              <span className="font-mono font-bold text-sm">
                {fmt(data.currentNetIncome || 0)}
              </span>
            </div>
          </div>

          {/* Assets Section */}
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1">
              Assets
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b font-bold text-left">
                  <th className="py-1 w-20">Code</th>
                  <th className="py-1">Account Name</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-0.5 font-mono text-[10px]">{r.code}</td>
                    <td
                      className="py-0.5"
                      style={{ paddingLeft: `${(r.level || 0) * 12}px` }}
                    >
                      <span
                        className={
                          r.isGroup ? "font-bold uppercase" : "font-normal"
                        }
                      >
                        {r.name}
                      </span>
                    </td>
                    <td className="py-0.5 text-right font-mono font-semibold">
                      {fmt(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-bold">
                  <td
                    colSpan={2}
                    className="py-1 text-right uppercase text-[10px]"
                  >
                    Total Assets
                  </td>
                  <td className="py-1 text-right font-mono">
                    {fmt(data.totalAssets)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Liabilities Section */}
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1">
              Liabilities
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b font-bold text-left">
                  <th className="py-1 w-20">Code</th>
                  <th className="py-1">Account Name</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.liabilities.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-0.5 font-mono text-[10px]">{r.code}</td>
                    <td
                      className="py-0.5"
                      style={{ paddingLeft: `${(r.level || 0) * 12}px` }}
                    >
                      <span
                        className={
                          r.isGroup ? "font-bold uppercase" : "font-normal"
                        }
                      >
                        {r.name}
                      </span>
                    </td>
                    <td className="py-0.5 text-right font-mono font-semibold">
                      {fmt(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black font-bold">
                  <td
                    colSpan={2}
                    className="py-1 text-right uppercase text-[10px]"
                  >
                    Total Liabilities
                  </td>
                  <td className="py-1 text-right font-mono">
                    {fmt(data.totalLiabilities)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Equity Section */}
          <div className="mb-6">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1">
              Equity
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b font-bold text-left">
                  <th className="py-1 w-20">Code</th>
                  <th className="py-1">Account Name</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.equity.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-0.5 font-mono text-[10px]">{r.code}</td>
                    <td
                      className="py-0.5"
                      style={{ paddingLeft: `${(r.level || 0) * 12}px` }}
                    >
                      <span
                        className={
                          r.isGroup ? "font-bold uppercase" : "font-normal"
                        }
                      >
                        {r.name}
                      </span>
                    </td>
                    <td className="py-0.5 text-right font-mono font-semibold">
                      {fmt(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black font-bold">
                  <td
                    colSpan={2}
                    className="py-1 text-right uppercase text-[10px]"
                  >
                    Total Equity
                  </td>
                  <td className="py-1 text-right font-mono">
                    {fmt(data.totalEquity)}
                  </td>
                </tr>
                <tr className="border-t-2 border-black font-black bg-gray-100">
                  <td
                    colSpan={2}
                    className="py-1.5 text-right uppercase text-[10px]"
                  >
                    Total Liabilities + Equity
                  </td>
                  <td className="py-1.5 text-right font-mono text-sm">
                    {fmt(data.totalLiabilitiesAndEquity)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Sign-off Footer */}
          <div className="mt-12 pt-6 border-t flex justify-between text-xs text-gray-600">
            <div className="text-center w-40">
              <div className="border-b border-black mb-1 h-8" />
              <span>Prepared By</span>
            </div>
            <div className="text-center w-40">
              <div className="border-b border-black mb-1 h-8" />
              <span>Checked By</span>
            </div>
            <div className="text-center w-40">
              <div className="border-b border-black mb-1 h-8" />
              <span>Approved By</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
