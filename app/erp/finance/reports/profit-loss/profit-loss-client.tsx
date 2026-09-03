"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { format, parseISO, subYears, subMonths } from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ChevronDown,
  Search,
  Folder,
  Tag,
  FileText,
  SlidersHorizontal,
  X,
  UnfoldVertical,
  FoldVertical,
  Filter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getIncomeStatement,
  IncomeStatementResult,
  IncomeStatementAccount,
} from "@/lib/actions/finance-reports";
import { exportProfitLossToExcel } from "./profit-loss-excel-export";

import { ProfitLossPrint } from "./profit-loss-print";

const fmt = (n?: number) =>
  (n ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (val?: number) =>
  val !== undefined ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%` : "0.00%";

export type DisplayRowItem =
  | {
      kind: "section_header";
      id: string;
      title: string;
      count: number;
    }
  | {
      kind: "account";
      id: string;
      account: IncomeStatementAccount;
    }
  | {
      kind: "section_total";
      id: string;
      title: string;
      total: number;
      compareTotal?: number;
    }
  | {
      kind: "grand_total";
      id: string;
      netProfit: number;
      compareNetProfit?: number;
      varianceNetProfit?: number;
      percentageNetProfit?: number;
    };

export function ProfitLossClient({
  initialData,
  defaultFrom,
  defaultTo,
}: {
  initialData?: IncomeStatementResult;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [data, setData] = useState<IncomeStatementResult | undefined>(initialData);

  // Filter States
  const [fromDate, setFromDate] = useState<Date | undefined>(
    defaultFrom ? parseISO(defaultFrom) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    defaultTo ? parseISO(defaultTo) : undefined
  );

  const [enableCompare, setEnableCompare] = useState<boolean>(false);
  const [compareFromDate, setCompareFromDate] = useState<Date | undefined>(undefined);
  const [compareToDate, setCompareToDate] = useState<Date | undefined>(undefined);

  const [includeTagAccounts, setIncludeTagAccounts] = useState<boolean>(true);
  const [showZeroBalances, setShowZeroBalances] = useState<boolean>(false);
  const [maxLevelFilter, setMaxLevelFilter] = useState<string>("all"); // "all" | "0" | "1" | "2"
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hierarchy expand / collapse state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  const [isPending, startTransition] = useTransition();

  const loadData = (
    from?: Date,
    to?: Date,
    compFrom?: Date,
    compTo?: Date,
    tags: boolean = includeTagAccounts,
    zeros: boolean = showZeroBalances
  ) => {
    startTransition(async () => {
      const res = await getIncomeStatement({
        from: from ? format(from, "yyyy-MM-dd") : undefined,
        to: to ? format(to, "yyyy-MM-dd") : undefined,
        compareFrom: compFrom ? format(compFrom, "yyyy-MM-dd") : undefined,
        compareTo: compTo ? format(compTo, "yyyy-MM-dd") : undefined,
        includeTagAccounts: tags,
        showZeroBalances: zeros,
      });
      if (res.status && res.data) {
        setData(res.data);
      }
    });
  };

  // Quick Preset for Compare Period
  const applyComparePreset = (preset: "prev_year" | "prev_month") => {
    if (!fromDate || !toDate) return;
    if (preset === "prev_year") {
      setCompareFromDate(subYears(fromDate, 1));
      setCompareToDate(subYears(toDate, 1));
    } else if (preset === "prev_month") {
      setCompareFromDate(subMonths(fromDate, 1));
      setCompareToDate(subMonths(toDate, 1));
    }
  };

  // Toggle single node fold/unfold
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: prev[nodeId] === undefined ? false : !prev[nodeId],
    }));
  };

  // Expand / Collapse All
  const toggleExpandAll = (expand: boolean) => {
    setAllExpanded(expand);
    const newMap: Record<string, boolean> = {};
    if (data) {
      [...data.income, ...data.expense].forEach((row) => {
        newMap[row.id] = expand;
      });
    }
    setExpandedNodes(newMap);
  };

  // Filter accounts by search query, max level, and parent collapsed state
  const computeVisibleAccounts = (accounts?: IncomeStatementAccount[]) => {
    if (!accounts || accounts.length === 0) return [];

    const q = searchQuery.toLowerCase().trim();
    const maxLvl = maxLevelFilter === "all" ? 99 : parseInt(maxLevelFilter, 10);

    // 1. Direct Search Matching
    const matchingIds = new Set<string>();
    if (q) {
      accounts.forEach((acc) => {
        if (
          acc.code.toLowerCase().includes(q) ||
          acc.name.toLowerCase().includes(q)
        ) {
          matchingIds.add(acc.id);
          // Include parent hierarchy up to root so search result isn't orphaned
          let currParentId = acc.parentId;
          while (currParentId) {
            matchingIds.add(currParentId);
            const parentAcc = accounts.find((a) => a.id === currParentId);
            currParentId = parentAcc?.parentId;
          }
        }
      });
    }

    // 2. Filter rows based on search, level depth, and parent fold state
    return accounts.filter((acc) => {
      // Level depth filter
      if ((acc.level || 0) > maxLvl) return false;

      // Search query filter
      if (q && !matchingIds.has(acc.id)) return false;

      // Parent collapsed state (if search active, auto-expand parents to show match)
      if (!q && acc.parentId) {
        let currParentId: string | null | undefined = acc.parentId;
        while (currParentId) {
          if (expandedNodes[currParentId] === false) return false;
          const parentRow = accounts.find((r) => r.id === currParentId);
          currParentId = parentRow?.parentId;
        }
      }

      return true;
    });
  };

  const visibleIncome = useMemo(
    () => computeVisibleAccounts(data?.income),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.income, searchQuery, maxLevelFilter, expandedNodes]
  );

  const visibleExpense = useMemo(
    () => computeVisibleAccounts(data?.expense),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.expense, searchQuery, maxLevelFilter, expandedNodes]
  );

  // Construct unified Virtual Display List
  const displayRows = useMemo<DisplayRowItem[]>(() => {
    if (!data) return [];
    const list: DisplayRowItem[] = [];

    // Income Section Header
    list.push({
      kind: "section_header",
      id: "hdr_income",
      title: "REVENUE & OPERATING INCOME",
      count: visibleIncome.length,
    });

    // Income Account Rows
    visibleIncome.forEach((acc) => {
      list.push({
        kind: "account",
        id: `acc_${acc.id}`,
        account: acc,
      });
    });

    // Income Section Total
    list.push({
      kind: "section_total",
      id: "tot_income",
      title: "TOTAL REVENUE / OPERATING INCOME",
      total: data.totalIncome,
      compareTotal: data.compareTotalIncome,
    });

    // Expense Section Header
    list.push({
      kind: "section_header",
      id: "hdr_expense",
      title: "EXPENSES & OPERATING COSTS",
      count: visibleExpense.length,
    });

    // Expense Account Rows
    visibleExpense.forEach((acc) => {
      list.push({
        kind: "account",
        id: `acc_${acc.id}`,
        account: acc,
      });
    });

    // Expense Section Total
    list.push({
      kind: "section_total",
      id: "tot_expense",
      title: "TOTAL EXPENSES & OPERATING COSTS",
      total: data.totalExpense,
      compareTotal: data.compareTotalExpense,
    });

    // Summary Grand Total Net Profit / Loss
    list.push({
      kind: "grand_total",
      id: "grand_total_net",
      netProfit: data.netProfit,
      compareNetProfit: data.compareNetProfit,
      varianceNetProfit: data.varianceNetProfit,
      percentageNetProfit: data.percentageNetProfit,
    });

    return list;
  }, [data, visibleIncome, visibleExpense]);

  // TanStack Virtualizer Hook
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = displayRows[index];
      if (item?.kind === "section_header") return 42;
      if (item?.kind === "section_total") return 44;
      if (item?.kind === "grand_total") return 56;
      return 36;
    },
    overscan: 15,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  // KPI Financial Calculations
  const netProfit = data?.netProfit ?? 0;
  const totalRevenue = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const grossProfit = data?.grossProfit ?? totalRevenue;
  const grossMarginPct = totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMarginPct = totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;

  const hasCompare = !!(
    data?.compareFrom ||
    data?.compareTo ||
    data?.compareTotalIncome !== undefined
  );
  const NetIcon = netProfit > 0 ? TrendingUp : netProfit < 0 ? TrendingDown : Minus;
  const netColor =
    netProfit > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : netProfit < 0
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";

  return (
    <>
      {data && (
        <ProfitLossPrint
          data={data}
          fromDate={fromDate}
          toDate={toDate}
          compareFromDate={enableCompare ? compareFromDate : undefined}
          compareToDate={enableCompare ? compareToDate : undefined}
        />
      )}
      <div className="space-y-6 print:hidden">
        <Card className="border-0 shadow-md">
        {/* Page Header */}
        <CardHeader className="border-b flex flex-row items-center justify-between flex-wrap gap-4 bg-muted/10">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Profit &amp; Loss Statement
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {fromDate && toDate ? (
                <>
                  <span className="font-semibold text-foreground">
                    {format(fromDate, "dd MMM yyyy")}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-foreground">
                    {format(toDate, "dd MMM yyyy")}
                  </span>
                </>
              ) : (
                "All Transactions"
              )}
              {hasCompare && compareFromDate && compareToDate && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                  (Vs {format(compareFromDate, "dd MMM yyyy")} –{" "}
                  {format(compareToDate, "dd MMM yyyy")})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => data && exportProfitLossToExcel(data)}
              disabled={!data}
            >
              <Download className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" /> Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Controls & Filtration Toolbar */}
          <div className="rounded-xl border dark:border-border bg-card p-4 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-end gap-4">
              {/* Primary Period */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                  Primary Date Range
                </Label>
                <DateRangePicker
                  initialDateFrom={fromDate}
                  initialDateTo={toDate}
                  onUpdate={(v) => {
                    setFromDate(v.range.from);
                    setToDate(v.range.to);
                  }}
                  align="start"
                  locale="en-GB"
                  showCompare={false}
                />
              </div>

              {/* Comparison Period Toggle & Controls */}
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={enableCompare}
                  onCheckedChange={(checked) => {
                    setEnableCompare(checked);
                    if (!checked) {
                      setCompareFromDate(undefined);
                      setCompareToDate(undefined);
                    }
                  }}
                  id="compare-switch"
                />
                <Label htmlFor="compare-switch" className="text-xs font-semibold cursor-pointer">
                  Compare Period
                </Label>
              </div>

              {enableCompare && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                      Comparison Date Range
                    </Label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        onClick={() => applyComparePreset("prev_year")}
                        className="text-primary underline font-medium hover:opacity-80"
                      >
                        Prev Year
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => applyComparePreset("prev_month")}
                        className="text-primary underline font-medium hover:opacity-80"
                      >
                        Prev Month
                      </button>
                    </div>
                  </div>
                  <DateRangePicker
                    initialDateFrom={compareFromDate}
                    initialDateTo={compareToDate}
                    onUpdate={(v) => {
                      setCompareFromDate(v.range.from);
                      setCompareToDate(v.range.to);
                    }}
                    align="start"
                    locale="en-GB"
                    showCompare={false}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  onClick={() =>
                    loadData(
                      fromDate,
                      toDate,
                      enableCompare ? compareFromDate : undefined,
                      enableCompare ? compareToDate : undefined
                    )
                  }
                  disabled={isPending}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
                  {isPending ? "Calculating…" : "Apply Filters"}
                </Button>
              </div>
            </div>

            {/* Sub-Filters & Search Bar */}
            <div className="pt-3 border-t dark:border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={includeTagAccounts}
                    onCheckedChange={setIncludeTagAccounts}
                    id="tag-switch"
                  />
                  <Label htmlFor="tag-switch" className="text-xs cursor-pointer">
                    Include Sub-Ledger Tags
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={showZeroBalances}
                    onCheckedChange={setShowZeroBalances}
                    id="zero-switch"
                  />
                  <Label htmlFor="zero-switch" className="text-xs cursor-pointer">
                    Show Zero Balances
                  </Label>
                </div>

                {/* Level Breakdown Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Detail Level:
                  </Label>
                  <Select value={maxLevelFilter} onValueChange={setMaxLevelFilter}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels (Full)</SelectItem>
                      <SelectItem value="0">Level 1 (Main Groups)</SelectItem>
                      <SelectItem value="1">Level 2 (Control Accs)</SelectItem>
                      <SelectItem value="2">Level 3 (Sub Accs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expand / Collapse All */}
                <div className="flex items-center gap-1.5 border-l pl-4 dark:border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpandAll(true)}
                    className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                    title="Expand All Groups"
                  >
                    <UnfoldVertical className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpandAll(false)}
                    className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                    title="Collapse All Groups"
                  >
                    <FoldVertical className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                    Collapse All
                  </Button>
                </div>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Instant account / tag search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KPI Cards Summary */}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Revenue */}
              <div className="rounded-xl border dark:border-border p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
                <p className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400">
                  Total Operating Revenue
                </p>
                <p className="text-2xl font-bold mt-1 font-mono text-emerald-700 dark:text-emerald-300">
                  {fmt(totalRevenue)}
                </p>
                {hasCompare && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Vs {fmt(data.compareTotalIncome)}
                  </p>
                )}
              </div>

              {/* Gross Profit */}
              <div className="rounded-xl border dark:border-border p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-2xs">
                <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-400">
                  Gross Profit
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
                    {fmt(grossProfit)}
                  </p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono">
                    {grossMarginPct.toFixed(1)}% Margin
                  </span>
                </div>
                {hasCompare && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Vs {fmt(data.compareGrossProfit)}
                  </p>
                )}
              </div>

              {/* Total Expenses */}
              <div className="rounded-xl border dark:border-border p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-2xs">
                <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">
                  Total Operating Expenses
                </p>
                <p className="text-2xl font-bold mt-1 font-mono text-amber-700 dark:text-amber-300">
                  {fmt(totalExpense)}
                </p>
                {hasCompare && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Vs {fmt(data.compareTotalExpense)}
                  </p>
                )}
              </div>

              {/* Net Profit / Loss */}
              <div
                className={cn(
                  "rounded-xl border p-4 shadow-2xs",
                  netProfit >= 0
                    ? "bg-emerald-100/60 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                    : "bg-rose-100/60 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700"
                )}
              >
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Net Profit / (Loss)
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className={cn("text-2xl font-bold font-mono flex items-center gap-1.5", netColor)}>
                    <NetIcon className="h-5 w-5" />
                    {fmt(Math.abs(netProfit))}
                  </p>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full font-mono",
                      netProfit >= 0
                        ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100"
                        : "bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100"
                    )}
                  >
                    {netMarginPct.toFixed(1)}% Margin
                  </span>
                </div>
                {hasCompare && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Variance: {fmt(data.varianceNetProfit)} ({fmtPct(data.percentageNetProfit)})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 60 FPS TanStack Virtualized Table */}
          {data && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>
                  Showing <span className="font-bold text-foreground">{displayRows.length}</span> visible tree items
                  {searchQuery && (
                    <span className="ml-1 text-primary font-medium">(filtered by &quot;{searchQuery}&quot;)</span>
                  )}
                </span>
                <span className="font-mono text-[11px]">60 FPS Virtualized Renderer</span>
              </div>

              <div className="rounded-xl border dark:border-border overflow-hidden bg-card shadow-xs no-print">
                <div
                  ref={parentRef}
                  className="overflow-auto max-h-[650px] relative scrollbar-thin scrollbar-thumb-muted-foreground/20"
                >
                  <table className="w-full text-sm border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-20 bg-slate-900 text-slate-100 uppercase text-[11px] font-mono tracking-wider border-b dark:border-border shadow-xs">
                      <tr>
                        <th className="px-4 py-3 text-left w-36">Code</th>
                        <th className="px-4 py-3 text-left">Account Name / Hierarchy</th>
                        <th className="px-4 py-3 text-center w-24">Type</th>
                        <th className="px-4 py-3 text-right w-44">Current Period</th>
                        {hasCompare && <th className="px-4 py-3 text-right w-44">Compare Period</th>}
                        {hasCompare && <th className="px-4 py-3 text-right w-36">Variance ($)</th>}
                        {hasCompare && <th className="px-4 py-3 text-right w-28">Variance (%)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paddingTop > 0 && (
                        <tr>
                          <td colSpan={hasCompare ? 7 : 4} style={{ height: `${paddingTop}px` }} />
                        </tr>
                      )}

                      {virtualItems.map((virtualRow) => {
                        const item = displayRows[virtualRow.index];
                        if (!item) return null;

                        // 1. SECTION HEADER
                        if (item.kind === "section_header") {
                          return (
                            <tr key={item.id} className="bg-muted/60 font-bold text-xs uppercase tracking-wider border-b dark:border-border text-foreground">
                              <td colSpan={hasCompare ? 7 : 4} className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Folder className="h-4 w-4 text-primary" />
                                  <span>{item.title}</span>
                                  <span className="font-mono text-[11px] font-normal text-muted-foreground">
                                    ({item.count} items)
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        // 2. ACCOUNT / TAG ROW
                        if (item.kind === "account") {
                          const row = item.account;
                          const isExpanded = expandedNodes[row.id] !== false;
                          const levelIndent = (row.level || 0) * 1.5;

                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                "border-b dark:border-border/50 transition-colors hover:bg-accent/40",
                                row.isGroup && "bg-muted/25 font-semibold",
                                row.isTagAccount && "italic text-muted-foreground bg-muted/10"
                              )}
                            >
                              <td className="px-4 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {row.code}
                              </td>
                              <td className="px-4 py-2">
                                <div
                                  className="flex items-center gap-1.5"
                                  style={{ paddingLeft: `${levelIndent}rem` }}
                                >
                                  {row.isGroup ? (
                                    <button
                                      onClick={() => toggleNode(row.id)}
                                      className="p-0.5 rounded-sm hover:bg-accent focus:outline-none"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </button>
                                  ) : row.isTagAccount ? (
                                    <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                  )}
                                  <span className={cn(row.isGroup && "font-bold text-foreground")}>
                                    {row.name}
                                  </span>
                                  {row.isGroup && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-mono ml-1 font-normal">
                                      {row.level === 0 ? "L1 Group" : "L2 Control"}
                                    </span>
                                  )}
                                  {row.isTagAccount && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono ml-1 font-normal">
                                      L4 Sub-Tag
                                    </span>
                                  )}
                                  {!row.isGroup && !row.isTagAccount && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-500/10 text-slate-600 dark:text-slate-400 font-mono ml-1 font-normal">
                                      L3 Account
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center text-xs font-mono text-muted-foreground">
                                {row.type}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-medium">
                                {fmt(row.amount)}
                              </td>
                              {hasCompare && (
                                <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                                  {fmt(row.compareAmount)}
                                </td>
                              )}
                              {hasCompare && (
                                <td
                                  className={cn(
                                    "px-4 py-2 text-right font-mono text-xs font-medium",
                                    (row.variance ?? 0) > 0
                                      ? row.type === "INCOME"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                      : (row.variance ?? 0) < 0
                                      ? row.type === "INCOME"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {fmt(row.variance)}
                                </td>
                              )}
                              {hasCompare && (
                                <td
                                  className={cn(
                                    "px-4 py-2 text-right font-mono text-xs",
                                    (row.percentageChange ?? 0) > 0
                                      ? row.type === "INCOME"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                      : (row.percentageChange ?? 0) < 0
                                      ? row.type === "INCOME"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {fmtPct(row.percentageChange)}
                                </td>
                              )}
                            </tr>
                          );
                        }

                        // 3. SECTION TOTAL
                        if (item.kind === "section_total") {
                          return (
                            <tr key={item.id} className="bg-muted/40 font-bold border-t-2 border-b dark:border-border text-foreground">
                              <td colSpan={3} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                                {item.title}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-base">{fmt(item.total)}</td>
                              {hasCompare && (
                                <td className="px-4 py-3 text-right font-mono text-base text-muted-foreground">
                                  {fmt(item.compareTotal)}
                                </td>
                              )}
                              {hasCompare && (
                                <td className="px-4 py-3 text-right font-mono text-sm">
                                  {fmt((item.total || 0) - (item.compareTotal || 0))}
                                </td>
                              )}
                              {hasCompare && <td className="px-4 py-3"></td>}
                            </tr>
                          );
                        }

                        // 4. GRAND TOTAL NET PROFIT
                        if (item.kind === "grand_total") {
                          const netTitle = item.netProfit >= 0 ? "SUMMARY NET PROFIT" : "SUMMARY NET LOSS";
                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                "font-bold text-base border-t-4 text-foreground",
                                item.netProfit >= 0
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200"
                              )}
                            >
                              <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-wider">
                                <span className="flex items-center justify-end gap-2">
                                  <NetIcon className="h-5 w-5" />
                                  {netTitle}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-xl">{fmt(Math.abs(item.netProfit))}</td>
                              {hasCompare && (
                                <td className="px-4 py-4 text-right font-mono text-base opacity-80">
                                  {fmt(item.compareNetProfit)}
                                </td>
                              )}
                              {hasCompare && (
                                <td className="px-4 py-4 text-right font-mono text-sm">
                                  {fmt(item.varianceNetProfit)}
                                </td>
                              )}
                              {hasCompare && (
                                <td className="px-4 py-4 text-right font-mono text-sm">
                                  {fmtPct(item.percentageNetProfit)}
                                </td>
                              )}
                            </tr>
                          );
                        }

                        return null;
                      })}

                      {paddingBottom > 0 && (
                        <tr>
                          <td colSpan={hasCompare ? 7 : 4} style={{ height: `${paddingBottom}px` }} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </>
  );
}
