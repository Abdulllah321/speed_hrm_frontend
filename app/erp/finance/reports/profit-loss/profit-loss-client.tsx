"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
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
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  ChartOfAccountSelect,
  fetchSharedTree,
  getSharedTree,
} from "@/components/ui/chart-of-account-select";
import {
  TagAccountSelect,
  TagSubAccountGroup,
  findInTree,
} from "@/components/ui/tag-account-select";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
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
  accounts: accountsProp,
}: {
  initialData?: IncomeStatementResult;
  defaultFrom?: string;
  defaultTo?: string;
  accounts?: ChartOfAccount[];
}) {
  const [data, setData] = useState<IncomeStatementResult | undefined>(initialData);

  // Tree state for Chart of Accounts
  const [tree, setTree] = useState<ChartOfAccount[]>(accountsProp ?? []);

  useEffect(() => {
    if (accountsProp && accountsProp.length > 0) {
      setTree(accountsProp);
      return;
    }
    fetchSharedTree().then((t) => {
      if (t && t.length > 0) setTree(t);
    });
  }, [accountsProp]);

  // Account Head & Tag Sub-Account filter states
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedTagAccountIds, setSelectedTagAccountIds] = useState<string[]>([]);

  // Sub-accounts grouped by Account Head
  const activeSubAccountGroups: TagSubAccountGroup[] = useMemo(() => {
    const sourceNodes =
      tree.length > 0
        ? tree
        : getSharedTree().length > 0
          ? getSharedTree()
          : accountsProp ?? [];
    if (selectedAccountIds.length === 0 || sourceNodes.length === 0) return [];

    const collectLeafs = (items: ChartOfAccount[]): ChartOfAccount[] => {
      const result: ChartOfAccount[] = [];
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          result.push(...collectLeafs(item.children));
        } else {
          result.push(item);
        }
      }
      return result;
    };

    const groups: TagSubAccountGroup[] = [];
    for (const accId of selectedAccountIds) {
      const node = findInTree(sourceNodes, accId);
      if (!node) continue;

      let subAccs: ChartOfAccount[] = [];
      if (node.children && node.children.length > 0) {
        subAccs = collectLeafs(node.children);
      } else {
        subAccs = [node];
      }

      const uniqueMap = new Map<string, ChartOfAccount>();
      for (const acc of subAccs) {
        uniqueMap.set(acc.id, acc);
      }

      const uniqueAccs = Array.from(uniqueMap.values());
      if (uniqueAccs.length > 0) {
        groups.push({
          head: {
            id: node.id,
            code: node.code,
            name: node.name,
            type: node.type,
          },
          accounts: uniqueAccs,
        });
      }
    }
    return groups;
  }, [selectedAccountIds, tree, accountsProp]);

  // Flattened deduplicated sub-accounts for backward compatibility & filtering
  const activeSubAccounts = useMemo(() => {
    const map = new Map<string, ChartOfAccount>();
    for (const grp of activeSubAccountGroups) {
      for (const acc of grp.accounts) {
        map.set(acc.id, acc);
      }
    }
    return Array.from(map.values());
  }, [activeSubAccountGroups]);

  const selectedAccountNodes = useMemo(() => {
    const sourceNodes =
      tree.length > 0
        ? tree
        : getSharedTree().length > 0
          ? getSharedTree()
          : accountsProp ?? [];
    if (selectedAccountIds.length === 0 || sourceNodes.length === 0) return [];
    return selectedAccountIds
      .map((id) => findInTree(sourceNodes, id))
      .filter((n): n is ChartOfAccount => Boolean(n));
  }, [selectedAccountIds, tree, accountsProp]);

  const selectedTagAccountNodes = useMemo(() => {
    if (selectedTagAccountIds.length === 0) return [];
    return activeSubAccounts.filter((a) =>
      selectedTagAccountIds.includes(a.id),
    );
  }, [selectedTagAccountIds, activeSubAccounts]);

  // Reset tag selection if selected head changes or sub-account list changes
  useEffect(() => {
    if (selectedTagAccountIds.length > 0) {
      const valid = selectedTagAccountIds.filter((id) =>
        activeSubAccounts.some((c) => c.id === id),
      );
      if (valid.length !== selectedTagAccountIds.length) {
        setSelectedTagAccountIds(valid);
      }
    }
  }, [selectedAccountIds, activeSubAccounts, selectedTagAccountIds]);

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

  // Helper to filter accounts by selected account heads & tag sub-accounts
  const applyAccountFilter = (
    accounts: IncomeStatementAccount[] | undefined,
    headIds: string[],
    tagIds: string[],
  ): IncomeStatementAccount[] => {
    if (!accounts || accounts.length === 0) return [];
    if (headIds.length === 0 && tagIds.length === 0) return accounts;

    const parentMap = new Map<string, string>();
    accounts.forEach((a) => {
      if (a.parentId) parentMap.set(a.id, a.parentId);
    });

    if (tagIds.length > 0) {
      const ids = new Set<string>();
      tagIds.forEach((tagId) => {
        ids.add(tagId);
        let curr = parentMap.get(tagId);
        while (curr) {
          ids.add(curr);
          curr = parentMap.get(curr);
        }
      });
      headIds.forEach((accId) => {
        ids.add(accId);
        let curr = parentMap.get(accId);
        while (curr) {
          ids.add(curr);
          curr = parentMap.get(curr);
        }
      });
      return accounts.filter((a) => ids.has(a.id));
    }

    if (headIds.length > 0) {
      const targetIds = new Set<string>(headIds);
      let changed = true;
      while (changed) {
        changed = false;
        accounts.forEach((a) => {
          if (a.parentId && targetIds.has(a.parentId) && !targetIds.has(a.id)) {
            targetIds.add(a.id);
            changed = true;
          }
        });
      }
      headIds.forEach((accId) => {
        let curr = parentMap.get(accId);
        while (curr) {
          targetIds.add(curr);
          curr = parentMap.get(curr);
        }
      });
      return accounts.filter((a) => targetIds.has(a.id));
    }

    return accounts;
  };

  // Filter accounts by search query, max level, and parent collapsed state
  const computeVisibleAccounts = (accounts?: IncomeStatementAccount[]) => {
    if (!accounts || accounts.length === 0) return [];

    let filtered = applyAccountFilter(
      accounts,
      selectedAccountIds,
      selectedTagAccountIds,
    );

    const q = searchQuery.toLowerCase().trim();
    const maxLvl = maxLevelFilter === "all" ? 99 : parseInt(maxLevelFilter, 10);

    // 1. Direct Search Matching
    const matchingIds = new Set<string>();
    if (q) {
      filtered.forEach((acc) => {
        if (
          acc.code.toLowerCase().includes(q) ||
          acc.name.toLowerCase().includes(q)
        ) {
          matchingIds.add(acc.id);
          // Include parent hierarchy up to root so search result isn't orphaned
          let currParentId = acc.parentId;
          while (currParentId) {
            matchingIds.add(currParentId);
            const parentAcc = filtered.find((a) => a.id === currParentId);
            currParentId = parentAcc?.parentId;
          }
        }
      });
    }

    // 2. Filter rows based on search, level depth, and parent fold state
    return filtered.filter((acc) => {
      // Level depth filter
      if ((acc.level || 0) > maxLvl) return false;

      // Search query filter
      if (q && !matchingIds.has(acc.id)) return false;

      // Parent collapsed state (if search active or head filter active, auto-expand)
      if (!q && selectedAccountIds.length === 0 && selectedTagAccountIds.length === 0 && acc.parentId) {
        let currParentId: string | null | undefined = acc.parentId;
        while (currParentId) {
          if (expandedNodes[currParentId] === false) return false;
          const parentRow = filtered.find((r) => r.id === currParentId);
          currParentId = parentRow?.parentId;
        }
      }

      return true;
    });
  };

  const visibleIncome = useMemo(
    () => computeVisibleAccounts(data?.income),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.income, selectedAccountIds, selectedTagAccountIds, searchQuery, maxLevelFilter, expandedNodes]
  );

  const visibleExpense = useMemo(
    () => computeVisibleAccounts(data?.expense),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.expense, selectedAccountIds, selectedTagAccountIds, searchQuery, maxLevelFilter, expandedNodes]
  );

  const totalIncomeValue = useMemo(() => {
    if (selectedAccountIds.length === 0 && selectedTagAccountIds.length === 0) {
      return data?.totalIncome ?? 0;
    }
    const parentIds = new Set(visibleIncome.map((a) => a.parentId).filter(Boolean));
    return visibleIncome
      .filter((a) => !parentIds.has(a.id))
      .reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [visibleIncome, selectedAccountIds, selectedTagAccountIds, data?.totalIncome]);

  const totalExpenseValue = useMemo(() => {
    if (selectedAccountIds.length === 0 && selectedTagAccountIds.length === 0) {
      return data?.totalExpense ?? 0;
    }
    const parentIds = new Set(visibleExpense.map((a) => a.parentId).filter(Boolean));
    return visibleExpense
      .filter((a) => !parentIds.has(a.id))
      .reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [visibleExpense, selectedAccountIds, selectedTagAccountIds, data?.totalExpense]);

  const netProfitValue = useMemo(() => {
    if (selectedAccountIds.length === 0 && selectedTagAccountIds.length === 0) {
      return data?.netProfit ?? 0;
    }
    return totalIncomeValue - totalExpenseValue;
  }, [totalIncomeValue, totalExpenseValue, selectedAccountIds, selectedTagAccountIds, data?.netProfit]);

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
      total: totalIncomeValue,
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
      total: totalExpenseValue,
      compareTotal: data.compareTotalExpense,
    });

    // Summary Grand Total Net Profit / Loss
    list.push({
      kind: "grand_total",
      id: "grand_total_net",
      netProfit: netProfitValue,
      compareNetProfit: data.compareNetProfit,
      varianceNetProfit: data.varianceNetProfit,
      percentageNetProfit: data.percentageNetProfit,
    });

    return list;
  }, [data, visibleIncome, visibleExpense, totalIncomeValue, totalExpenseValue, netProfitValue]);

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
  const netProfit = netProfitValue;
  const totalRevenue = totalIncomeValue;
  const totalExpense = totalExpenseValue;
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
            {/* Account Head and Tag Sub-Account Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pb-3 border-b border-border/60">
              {/* Account Head */}
              <div className="space-y-1.5 md:col-span-6">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-primary/70" /> Account Head(s)
                    {selectedAccountIds.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/70 font-normal">
                        ({selectedAccountIds.length})
                      </span>
                    )}
                  </Label>
                  {selectedAccountIds.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedAccountIds([]);
                        setSelectedTagAccountIds([]);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Clear ({selectedAccountIds.length})
                    </button>
                  )}
                </div>
                <ChartOfAccountSelect
                  accounts={accountsProp}
                  value={selectedAccountIds}
                  onValueChange={(val: string[]) => {
                    setSelectedAccountIds(val);
                    setSelectedTagAccountIds([]);
                  }}
                  placeholder="All Account Heads (Default)"
                  allowGroups={true}
                  excludeTags={true}
                  multiple={true}
                  mode="popover"
                  className="h-10 text-sm shadow-sm"
                />
              </div>

              {/* Tag Sub-Account */}
              <div className="space-y-1.5 md:col-span-6">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-primary/70" /> Tag Sub-Account(s)
                    {activeSubAccounts.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/70 font-normal">
                        ({activeSubAccounts.length}
                        {activeSubAccountGroups.length > 1
                          ? ` in ${activeSubAccountGroups.length} Heads`
                          : ""}
                        )
                      </span>
                    )}
                  </Label>
                  {selectedTagAccountIds.length > 0 && (
                    <button
                      onClick={() => setSelectedTagAccountIds([])}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Clear ({selectedTagAccountIds.length})
                    </button>
                  )}
                </div>
                <TagAccountSelect
                  groups={activeSubAccountGroups}
                  children={activeSubAccounts}
                  value={selectedTagAccountIds}
                  onValueChange={(val) => {
                    setSelectedTagAccountIds(val);
                    if (val.length > 0 && !includeTagAccounts) {
                      setIncludeTagAccounts(true);
                      loadData(fromDate, toDate, enableCompare ? compareFromDate : undefined, enableCompare ? compareToDate : undefined, true);
                    }
                  }}
                  disabled={selectedAccountIds.length === 0 || activeSubAccounts.length === 0}
                  placeholder={
                    selectedAccountIds.length === 0
                      ? "Select Account Head first"
                      : activeSubAccounts.length === 0
                        ? "No sub-accounts under selected head(s)"
                        : activeSubAccountGroups.length > 1
                          ? `All Sub-accounts across ${activeSubAccountGroups.length} Heads (Default)`
                          : "All Sub-accounts (Default)"
                  }
                />
              </div>
            </div>

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
                  variant="outline"
                  onClick={() => {
                    setSelectedAccountIds([]);
                    setSelectedTagAccountIds([]);
                    setSearchQuery("");
                    setMaxLevelFilter("all");
                    setEnableCompare(false);
                    setCompareFromDate(undefined);
                    setCompareToDate(undefined);
                    setIncludeTagAccounts(true);
                    setShowZeroBalances(false);
                    loadData(fromDate, toDate, undefined, undefined, true, false);
                  }}
                >
                  Reset
                </Button>
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

          {/* Filter Banner */}
          {data && (selectedAccountIds.length > 0 || selectedTagAccountIds.length > 0) && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20">
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>
                  Filtered by Account Head{selectedAccountNodes.length === 1 ? "" : "s"}:{" "}
                  <strong>
                    {selectedAccountNodes.map((n) => `${n.code} — ${n.name}`).join(", ")}
                  </strong>
                </span>
                {selectedTagAccountNodes.length > 0 && (
                  <span className="flex items-center gap-1.5 ml-1 font-normal text-primary/90 flex-wrap">
                    <span>(Tags:</span>
                    {selectedTagAccountNodes.map((tagNode) => (
                      <Badge
                        key={tagNode.id}
                        variant="outline"
                        className="text-xs bg-primary/15 border-primary/30 text-primary py-0 px-1.5"
                      >
                        {tagNode.code} — {tagNode.name}
                      </Badge>
                    ))}
                    <span>)</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedAccountIds([]);
                  setSelectedTagAccountIds([]);
                }}
                className="text-xs font-semibold underline hover:opacity-80 transition-opacity shrink-0 ml-4 cursor-pointer"
              >
                Clear Filter (View All)
              </button>
            </div>
          )}

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
