"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Download,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Filter,
  Calendar,
  ExternalLink,
  Info,
  Tag,
  Layers,
  CheckSquare,
  Building2,
  CheckIcon,
  ChevronDownIcon,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  ChartOfAccountSelect,
  getSharedTree,
  fetchSharedTree,
} from "@/components/ui/chart-of-account-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import {
  getGeneralLedger,
  GeneralLedgerResult,
  GeneralLedgerHeadGroup,
  SingleAccountLedger,
  queueGeneralLedgerExport,
} from "@/lib/actions/finance-reports";
import { numberToWords } from "../../journal-voucher/components/journal-voucher-print";
import Link from "next/link";
import { toast } from "sonner";

const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  const rounded = Math.round(n);
  if (rounded < 0) {
    const absVal = Math.abs(rounded).toLocaleString("en-PK", {
      maximumFractionDigits: 0,
    });
    return `(${absVal})`;
  }
  return rounded.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  });
};

const getLocalStartOfDayISO = (d: Date) => {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

const getLocalEndOfDayISO = (d: Date) => {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
};

/**
 * Formats voucher number for compact print layout (e.g. BPV-26-27-0001 -> BPV-0001, JV-26-27-0003 -> JV-0003).
 * Strips out fiscal year/year component only in print to reduce column width.
 */
const formatVoucherNoForPrint = (vohNo?: string | null): string => {
  if (!vohNo) return "—";
  const match = vohNo.match(/^([A-Za-z]+)-\d{2,4}(?:-\d{2})?-(.+)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return vohNo;
};

const SOURCE_LABELS: Record<string, string> = {
  PURCHASE_INVOICE: "PI",
  PAYMENT_VOUCHER: "PV",
  RECEIPT_VOUCHER: "RV",
  JOURNAL_VOUCHER: "JV",
  ADVANCE_APPLICATION: "Advance Application",
  SALES_INVOICE: "SI",
};

const SOURCE_BADGES: Record<string, string> = {
  PURCHASE_INVOICE:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30",
  PAYMENT_VOUCHER:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30",
  RECEIPT_VOUCHER:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30",
  JOURNAL_VOUCHER:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30",
  ADVANCE_APPLICATION:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30",
  SALES_INVOICE:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/30",
};

const getSourceLink = (sourceType: string, sourceId: string) => {
  switch (sourceType) {
    case "JOURNAL_VOUCHER":
      return `/erp/finance/journal-voucher/${sourceId}`;
    case "PAYMENT_VOUCHER":
      return `/erp/finance/payment-voucher/${sourceId}`;
    case "RECEIPT_VOUCHER":
      return `/erp/finance/receipt-voucher/${sourceId}`;
    case "SALES_INVOICE":
      return `/erp/sales/invoices/${sourceId}`;
    case "PURCHASE_INVOICE":
      return `/erp/procurement/purchase-invoice/${sourceId}`;
    default:
      return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findInTree(
  nodes: ChartOfAccount[],
  id: string,
): ChartOfAccount | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── Tag account selector (Hierarchy sub-account dropdown with Multi-Select & Head Grouping) ──
export interface TagSubAccountGroup {
  head: {
    id: string;
    code: string;
    name: string;
    type?: string;
  };
  accounts: ChartOfAccount[];
}

interface TagAccountSelectProps {
  groups?: TagSubAccountGroup[];
  children?: ChartOfAccount[];
  value?: string[];
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

function TagAccountSelect({
  groups = [],
  children = [],
  value = [],
  onValueChange,
  disabled,
  id,
  placeholder,
}: TagAccountSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setSearch(e.key);
      setOpen(true);
    } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  // Harmonize groups with fallback to flat children if groups are empty
  const effectiveGroups: TagSubAccountGroup[] = React.useMemo(() => {
    if (groups && groups.length > 0) return groups;
    if (children && children.length > 0) {
      return [
        {
          head: { id: "all", code: "", name: "All Sub-Accounts" },
          accounts: children,
        },
      ];
    }
    return [];
  }, [groups, children]);

  // All flat accounts from effective groups
  const allAccounts = React.useMemo(() => {
    const map = new Map<string, ChartOfAccount>();
    for (const g of effectiveGroups) {
      for (const a of g.accounts) {
        map.set(a.id, a);
      }
    }
    return Array.from(map.values());
  }, [effectiveGroups]);

  const selectedAccounts = React.useMemo(() => {
    return allAccounts.filter((c) => value.includes(c.id));
  }, [allAccounts, value]);

  // Distinct heads represented in current selection
  const selectedHeadsCount = React.useMemo(() => {
    const headIds = new Set<string>();
    for (const g of effectiveGroups) {
      if (g.accounts.some((a) => value.includes(a.id))) {
        headIds.add(g.head.id);
      }
    }
    return headIds.size;
  }, [effectiveGroups, value]);

  const isAllSelected =
    allAccounts.length > 0 && selectedAccounts.length === allAccounts.length;

  const handleToggle = (childId: string) => {
    if (value.includes(childId)) {
      onValueChange(value.filter((id) => id !== childId));
    } else {
      onValueChange([...value, childId]);
    }
  };

  const handleSelectAll = () => {
    onValueChange(allAccounts.map((c) => c.id));
  };

  const handleClearAll = () => {
    onValueChange([]);
  };

  // Find parent head for a single selected account
  const singleSelectedHead = React.useMemo(() => {
    if (value.length !== 1 || !selectedAccounts[0]) return null;
    return (
      effectiveGroups.find((g) =>
        g.accounts.some((a) => a.id === selectedAccounts[0].id),
      )?.head ?? null
    );
  }, [value, selectedAccounts, effectiveGroups]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex items-center w-full h-10 px-3 rounded-md border border-input bg-background text-sm cursor-pointer select-none text-left shadow-sm",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
            open && "ring-1 ring-ring/20",
            disabled &&
              "pointer-events-none opacity-50 bg-muted/30 cursor-not-allowed",
          )}
        >
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-2" />
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
            {value.length === 0 ? (
              <span className="truncate text-muted-foreground">
                {placeholder ??
                  (allAccounts.length === 0
                    ? "No sub-accounts"
                    : effectiveGroups.length > 1
                      ? `All Sub-accounts across ${effectiveGroups.length} Heads`
                      : "All Sub-accounts (Default)")}
              </span>
            ) : value.length === 1 && selectedAccounts[0] ? (
              <span className="truncate font-medium flex items-center gap-1.5">
                <span className="font-mono text-xs">{selectedAccounts[0].code}</span>
                <span className="truncate">{selectedAccounts[0].name}</span>
                {singleSelectedHead && singleSelectedHead.code && effectiveGroups.length > 1 && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">
                    {singleSelectedHead.code}
                  </span>
                )}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[11px] font-semibold shrink-0 bg-primary/15 text-primary border-primary/20"
                >
                  {value.length} selected
                </Badge>
                {effectiveGroups.length > 1 && selectedHeadsCount > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                    ({selectedHeadsCount} {selectedHeadsCount === 1 ? "Head" : "Heads"})
                  </span>
                )}
                <span className="truncate text-xs text-muted-foreground">
                  {selectedAccounts.map((c) => c.name).join(", ")}
                </span>
              </div>
            )}
          </div>
          {value.length === 1 && selectedAccounts[0] && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigator.clipboard.writeText(selectedAccounts[0].name);
                toast.success(
                  `Copied tag name: "${selectedAccounts[0].name}"`,
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  navigator.clipboard.writeText(selectedAccounts[0].name);
                  toast.success(
                    `Copied tag name: "${selectedAccounts[0].name}"`,
                  );
                }
              }}
              className="p-1 ml-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Copy tag account name"
            >
              <Copy className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDownIcon
            className={cn(
              "ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-88 sm:w-[440px] p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput
            placeholder={
              effectiveGroups.length > 1
                ? "Search sub-account or head name/code..."
                : "Search sub-account..."
            }
            className="h-9 text-xs"
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          {allAccounts.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b text-[11px] bg-muted/20">
              <span className="text-muted-foreground font-medium">
                {value.length > 0
                  ? `${value.length} of ${allAccounts.length} selected`
                  : `${allAccounts.length} available sub-accounts`}
                {effectiveGroups.length > 1 && (
                  <span className="text-muted-foreground/70 ml-1">
                    ({effectiveGroups.length} Heads)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isAllSelected}
                  className={cn(
                    "text-primary hover:underline font-medium cursor-pointer",
                    isAllSelected && "opacity-50 pointer-events-none",
                  )}
                >
                  Select All
                </button>
                <span className="text-muted-foreground/40">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={value.length === 0}
                  className={cn(
                    "text-muted-foreground hover:text-foreground font-medium cursor-pointer",
                    value.length === 0 && "opacity-50 pointer-events-none",
                  )}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No sub-accounts found.
            </CommandEmpty>
            {effectiveGroups.map((grp) => {
              const groupIds = grp.accounts.map((a) => a.id);
              const selectedInGroupCount = groupIds.filter((id) =>
                value.includes(id),
              ).length;
              const isGroupAllSelected =
                grp.accounts.length > 0 &&
                selectedInGroupCount === grp.accounts.length;

              const handleToggleGroup = (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                if (isGroupAllSelected) {
                  onValueChange(value.filter((id) => !groupIds.includes(id)));
                } else {
                  onValueChange(Array.from(new Set([...value, ...groupIds])));
                }
              };

              return (
                <CommandGroup
                  key={grp.head.id}
                  heading={
                    effectiveGroups.length > 1 || grp.head.code ? (
                      <div className="flex items-center justify-between w-full py-1 text-xs font-semibold text-foreground/90 border-b border-border/50 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {grp.head.code && (
                            <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                              {grp.head.code}
                            </span>
                          )}
                          <span className="truncate font-semibold text-foreground">
                            {grp.head.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono font-normal shrink-0">
                            ({grp.accounts.length})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleGroup}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer",
                            isGroupAllSelected
                              ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                              : "bg-primary/10 text-primary hover:bg-primary/20",
                          )}
                        >
                          {isGroupAllSelected
                            ? "Deselect Head"
                            : selectedInGroupCount > 0
                              ? `Select Rest (${grp.accounts.length - selectedInGroupCount})`
                              : `Select Head (${grp.accounts.length})`}
                        </button>
                      </div>
                    ) : undefined
                  }
                >
                  {grp.accounts.map((child) => {
                    const isSelected = value.includes(child.id);
                    return (
                      <CommandItem
                        key={child.id}
                        value={`${grp.head.code} ${grp.head.name} ${child.code} ${child.name}`}
                        onSelect={() => handleToggle(child.id)}
                        className={cn(
                          "flex items-center gap-2.5 text-xs py-2 px-3 cursor-pointer aria-selected:bg-accent/60 transition-colors",
                          effectiveGroups.length > 1 && "pl-4",
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          className="h-4 w-4 pointer-events-none shrink-0"
                        />
                        <span className="font-mono text-muted-foreground shrink-0 text-[11px]">
                          {child.code}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {child.name}
                        </span>
                        {effectiveGroups.length > 1 && grp.head.code && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground/70 shrink-0"
                            title={`Head: ${grp.head.code} - ${grp.head.name}`}
                          >
                            {grp.head.code}
                          </span>
                        )}
                        {isSelected && (
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
          <div className="flex items-center justify-between p-2 border-t bg-muted/10">
            <span className="text-[11px] text-muted-foreground px-1">
              {value.length === 0
                ? effectiveGroups.length > 1
                  ? `All sub-accounts across ${effectiveGroups.length} Heads included`
                  : "All sub-accounts included"
                : `${value.length} selected`}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function GeneralLedgerClient({
  accounts,
}: {
  accounts: ChartOfAccount[];
}) {
  // ─── Tree State ─────────────────────────────────────────────────────────────
  const [tree, setTree] = React.useState<ChartOfAccount[]>(accounts ?? []);

  React.useEffect(() => {
    if (accounts && accounts.length > 0) {
      setTree(accounts);
      return;
    }
    fetchSharedTree().then((t) => {
      if (t && t.length > 0) setTree(t);
    });
  }, [accounts]);

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
  const [selectedTagAccountIds, setSelectedTagAccountIds] = React.useState<string[]>([]);
  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1),
  );
  const [toDate, setToDate] = React.useState<Date | undefined>(new Date());
  const [sourceType, setSourceType] = React.useState<string>("all");

  // ─── Data & View States ─────────────────────────────────────────────────────
  const [data, setData] = React.useState<GeneralLedgerResult | undefined>();
  const [activeHeadFilter, setActiveHeadFilter] = React.useState<string>("all");
  const [activeLedgerIdx, setActiveLedgerIdx] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<"all" | "single" | "consolidated">("all");
  const [isPending, startTransition] = React.useTransition();
  const [isExporting, setIsExporting] = React.useState(false);

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);

  // ─── Sub-Accounts Grouped by Account Head ──────────────────────────────────
  const activeSubAccountGroups: TagSubAccountGroup[] = React.useMemo(() => {
    const sourceNodes =
      tree.length > 0
        ? tree
        : getSharedTree().length > 0
          ? getSharedTree()
          : accounts;
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

      // Deduplicate within this head's group
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
  }, [selectedAccountIds, tree, accounts]);

  // Flattened deduplicated sub-accounts for backward compatibility & filtering
  const activeSubAccounts = React.useMemo(() => {
    const map = new Map<string, ChartOfAccount>();
    for (const grp of activeSubAccountGroups) {
      for (const acc of grp.accounts) {
        map.set(acc.id, acc);
      }
    }
    return Array.from(map.values());
  }, [activeSubAccountGroups]);

  // Reset tag selection if selected head changes or active sub-accounts change
  React.useEffect(() => {
    if (selectedTagAccountIds.length > 0) {
      const valid = selectedTagAccountIds.filter((id) =>
        activeSubAccounts.some((c) => c.id === id),
      );
      if (valid.length !== selectedTagAccountIds.length) {
        setSelectedTagAccountIds(valid);
      }
    }
  }, [selectedAccountIds, activeSubAccounts, selectedTagAccountIds]);

  // ─── Target Account ID ─────────────────────────────────────────────────────
  const targetAccountId = React.useMemo(() => {
    if (selectedTagAccountIds.length > 0) {
      return selectedTagAccountIds.join(",");
    }
    if (selectedAccountIds.length > 0) {
      const ids = [...selectedAccountIds, ...activeSubAccounts.map((a) => a.id)];
      return Array.from(new Set(ids)).join(",");
    }
    return "";
  }, [selectedTagAccountIds, selectedAccountIds, activeSubAccounts]);

  // ─── Query & Load Ledger ───────────────────────────────────────────────────
  const load = (targetPage = page, targetLimit = limit) => {
    if (!targetAccountId) {
      toast.warning("Please select an Account Head or Sub-Account first.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await getGeneralLedger(targetAccountId, {
          from: fromDate ? getLocalStartOfDayISO(fromDate) : undefined,
          to: toDate ? getLocalEndOfDayISO(toDate) : undefined,
          page: targetPage,
          limit: targetLimit,
          sourceType: sourceType === "all" ? undefined : sourceType,
        });
        if (res?.status && res?.data) {
          setData(res.data);
          if (res.data.ledgers && res.data.ledgers.length > 1) {
            setViewMode("all");
          }
        } else {
          toast.error(res?.message || "Failed to load general ledger data");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load general ledger data");
      }
    });
  };

  React.useEffect(() => {
    if (data) {
      load(page, limit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleLoadClick = () => {
    setPage(1);
    setActiveLedgerIdx(0);
    setActiveHeadFilter("all");
    if (selectedTagAccountIds.length > 1 || selectedAccountIds.length > 1) {
      setViewMode("all");
    }
    load(1, limit);
  };

  // ─── 5. Hierarchical Data Grouping (Heads & Ledgers) ───────────────────────
  const groupedHeads: GeneralLedgerHeadGroup[] = React.useMemo(() => {
    if (!data) return [];
    if (data.heads && data.heads.length > 0) return data.heads;

    const ledgersList: SingleAccountLedger[] =
      data.ledgers && data.ledgers.length > 0
        ? data.ledgers
        : [
            {
              account: data.account,
              openingBalance: data.openingBalance,
              rows: data.rows,
              closingBalance: data.closingBalance,
              rangeTotalDebit: data.rangeTotalDebit,
              rangeTotalCredit: data.rangeTotalCredit,
              rangeClosingBalance: data.rangeClosingBalance,
              pagination: data.pagination,
            },
          ];

    const map = new Map<string, GeneralLedgerHeadGroup>();
    for (const lg of ledgersList) {
      const h = lg.head ?? {
        id: lg.account.id,
        code: lg.account.code,
        name: lg.account.name,
      };
      if (!map.has(h.id)) {
        map.set(h.id, {
          head: h,
          openingBalance: 0,
          rangeTotalDebit: 0,
          rangeTotalCredit: 0,
          rangeClosingBalance: 0,
          ledgerCount: 0,
          transactionCount: 0,
          ledgers: [],
        });
      }
      const grp = map.get(h.id)!;
      grp.openingBalance += lg.openingBalance;
      grp.rangeTotalDebit += lg.rangeTotalDebit;
      grp.rangeTotalCredit += lg.rangeTotalCredit;
      grp.rangeClosingBalance += lg.rangeClosingBalance;
      grp.ledgerCount += 1;
      grp.transactionCount += (lg.pagination?.total ?? lg.rows.length);
      grp.ledgers.push(lg);
    }
    return Array.from(map.values());
  }, [data]);

  // All flat ledgers for navigation
  const allLedgers: SingleAccountLedger[] = React.useMemo(() => {
    if (groupedHeads.length === 0) return [];
    if (activeHeadFilter === "all") {
      return groupedHeads.flatMap((h) => h.ledgers);
    }
    const found = groupedHeads.find((h) => h.head.id === activeHeadFilter);
    return found ? found.ledgers : [];
  }, [groupedHeads, activeHeadFilter]);

  // Safe active ledger for single view
  const safeActiveLedger = allLedgers[
    Math.min(activeLedgerIdx, Math.max(0, allLedgers.length - 1))
  ] ?? allLedgers[0];

  // Consolidated ledger combining all accounts
  const consolidatedLedger: SingleAccountLedger | null = React.useMemo(() => {
    if (!data || allLedgers.length <= 1) return null;
    return {
      account: data.account,
      openingBalance: data.openingBalance,
      rows: data.rows,
      closingBalance: data.closingBalance,
      rangeTotalDebit: data.rangeTotalDebit,
      rangeTotalCredit: data.rangeTotalCredit,
      rangeClosingBalance: data.rangeClosingBalance,
      pagination: data.pagination,
      head: { id: "consolidated", code: "ALL", name: `${allLedgers.length} Accounts Consolidated` },
    };
  }, [data, allLedgers]);

  // ─── 6. Multi-Account CSV Export ───────────────────────────────────────────
  const exportToCSV = () => {
    if (!data || groupedHeads.length === 0) return;

    const headers = [
      "Date",
      "VOH No.",
      "VOH TYPE",
      "Cheque No",
      "Ref 1",
      "Ref 2",
      "Narration",
      "Debit",
      "Credit",
      "Running Balance",
    ];

    const csvLines: string[][] = [
      ["GENERAL LEDGER REPORT — MULTI-ACCOUNT & SUB-ACCOUNT STATEMENT"],
      [
        `Period: ${fromDate ? format(fromDate, "dd-MMM-yyyy") : "Beginning"} to ${toDate ? format(toDate, "dd-MMM-yyyy") : "Present"}`,
      ],
      [`Export Date: ${new Date().toLocaleString("en-PK")}`],
      [`Document Filter: ${sourceType === "all" ? "All Documents" : (SOURCE_LABELS[sourceType] ?? sourceType)}`],
      [`Scope: ${groupedHeads.length} Heads, ${allLedgers.length} Sub-Accounts`],
      [],
    ];

    for (const hGroup of groupedHeads) {
      csvLines.push([`=== HEAD: ${hGroup.head.code} — ${hGroup.head.name} ===`]);
      csvLines.push([]);

      for (const lg of hGroup.ledgers) {
        csvLines.push([
          `Account: ${lg.account.code} — ${lg.account.name} (${lg.account.type})`,
        ]);
        csvLines.push(headers);
        csvLines.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "Balance brought forward",
          "",
          "",
          lg.openingBalance.toFixed(2),
        ]);

        for (const r of lg.rows) {
          csvLines.push([
            format(new Date(r.transactionDate), "yyyy-MM-dd"),
            r.sourceRef,
            SOURCE_LABELS[r.sourceType] ?? r.sourceType,
            r.chequeNo ?? "",
            r.refBillNo ?? "",
            r.refBillNo2 ?? "",
            r.narration || r.description || "",
            r.debit > 0 ? r.debit.toFixed(2) : "0.00",
            r.credit > 0 ? r.credit.toFixed(2) : "0.00",
            r.runningBalance.toFixed(2),
          ]);
        }

        csvLines.push([
          "",
          "",
          `Closing Balance (${lg.account.code})`,
          "",
          "",
          "",
          "",
          lg.rangeTotalDebit.toFixed(2),
          lg.rangeTotalCredit.toFixed(2),
          lg.rangeClosingBalance.toFixed(2),
        ]);
        csvLines.push([]);
      }

      if (hGroup.ledgers.length > 1) {
        csvLines.push([
          `HEAD TOTAL (${hGroup.head.code})`,
          "",
          "",
          "",
          "",
          "",
          "",
          hGroup.rangeTotalDebit.toFixed(2),
          hGroup.rangeTotalCredit.toFixed(2),
          hGroup.rangeClosingBalance.toFixed(2),
        ]);
        csvLines.push([]);
      }
    }

    const csvContent = csvLines
      .map((row) =>
        row
          .map((val) => {
            const strVal = val ? val.toString() : "";
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `general-ledger-multi-${format(new Date(), "yyyyMMdd-HHmm")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── 7. Dispatch Background Multi-Sheet Excel Export ───────────────────────
  const handleQueueExport = () => {
    if (!targetAccountId) return;
    setIsExporting(true);

    toast.promise(
      queueGeneralLedgerExport(targetAccountId, {
        from: fromDate ? getLocalStartOfDayISO(fromDate) : undefined,
        to: toDate ? getLocalEndOfDayISO(toDate) : undefined,
        sourceType: sourceType === "all" ? undefined : sourceType,
      }),
      {
        loading: "Queueing multi-sheet Excel export job...",
        success: (res) => {
          setIsExporting(false);
          if (res && res.status) {
            return "Export queued! Your multi-sheet workbook distributed by Head will notify you upon completion.";
          } else {
            throw new Error(res?.message || "Failed to queue export");
          }
        },
        error: (err) => {
          setIsExporting(false);
          return err.message || "Failed to trigger background export.";
        },
      },
    );
  };

  return (
    <>
      {/* ─── SCREEN VIEW (HIDDEN ON PRINT) ─── */}
      <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
        <Card className="border-border/50 shadow-lg dark:bg-card/45 dark:backdrop-blur-md">
          <CardHeader className="border-b dark:border-border/50 flex flex-row items-center justify-between flex-wrap gap-4 py-5 bg-muted/20">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> General Ledger
              </CardTitle>
              {data && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                    {groupedHeads.length} Head{groupedHeads.length === 1 ? "" : "s"} • {allLedgers.length} Sub-Account{allLedgers.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fromDate && toDate
                      ? `${format(fromDate, "dd MMM yyyy")} – ${format(toDate, "dd MMM yyyy")}`
                      : "All Time"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={!data}
                className="h-9 hover:bg-accent border-border/70 text-xs"
              >
                <Printer className="h-3.5 w-3.5 mr-2 text-muted-foreground" />{" "}
                Print / PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={!data}
                className="h-9 hover:bg-accent border-border/70 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />{" "}
                Export (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQueueExport}
                disabled={!data || isExporting}
                className="h-9 hover:bg-accent border-border/70 text-xs"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5 mr-2 text-muted-foreground",
                    isExporting && "animate-spin",
                  )}
                />{" "}
                Queue Excel
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Account Head & Tag Sub-Account Hierarchy Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-5 rounded-xl border border-border bg-muted/10 dark:bg-muted/5 shadow-sm">
              {/* Account Head Selector */}
              <div className="space-y-2 md:col-span-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-primary/70" /> Account Head(s) *
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
                  accounts={accounts}
                  value={selectedAccountIds}
                  onValueChange={(val: string[]) => {
                    setSelectedAccountIds(val);
                    setSelectedTagAccountIds([]);
                  }}
                  placeholder="Select Account Head(s)..."
                  allowGroups={true}
                  excludeTags={true}
                  multiple={true}
                  mode="popover"
                  className="h-10 text-sm shadow-sm"
                />
              </div>

              {/* Tag Sub-Account Selector */}
              <div className="space-y-2 md:col-span-3">
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
                  onValueChange={setSelectedTagAccountIds}
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

              {/* Date Range Picker */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-primary/70" /> Date Range
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
                  triggerClassName="h-10 text-sm w-full shadow-sm"
                />
              </div>

              {/* Document Filter */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-primary/70" /> Document Type
                </Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger className="h-10 text-sm shadow-sm">
                    <SelectValue placeholder="All Documents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    {Object.entries(SOURCE_LABELS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Load Ledger Action */}
              <div className="md:col-span-2">
                <Button
                  onClick={handleLoadClick}
                  disabled={isPending || selectedAccountIds.length === 0}
                  className="h-10 w-full font-medium text-sm shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[0px] hover:shadow-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 cursor-pointer"
                >
                  <RefreshCw
                    className={cn("h-4 w-4 mr-2", isPending && "animate-spin")}
                  />
                  {isPending ? "Loading..." : "Load Ledger"}
                </Button>
              </div>
            </div>

            {/* Empty placeholder */}
            {!data && (
              <div className="flex flex-col items-center justify-center h-56 text-muted-foreground border border-dashed rounded-xl p-8 bg-muted/5">
                <BookOpen className="h-12 w-12 text-muted-foreground/35 mb-3 stroke-[1.5]" />
                <p className="text-sm font-semibold text-foreground/80">
                  No Account Head Selected
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[360px] text-center">
                  Select one or more Account Heads and optional Tag Sub-Accounts above,
                  specify the reporting period, and click &quot;Load Ledger&quot;
                  to inspect detailed transaction ledgers.
                </p>
              </div>
            )}

            {/* Render Data with Hierarchical Navigation */}
            {data && (() => {
              const ledgersToRender =
                viewMode === "consolidated"
                  ? (consolidatedLedger ? [consolidatedLedger] : allLedgers)
                  : viewMode === "single"
                    ? (safeActiveLedger ? [safeActiveLedger] : [])
                    : allLedgers;

              return (
                <div className="space-y-6">
                  {/* Master Hierarchy Navigation Bar */}
                  <div className="flex flex-col gap-3 bg-muted/30 p-3.5 rounded-2xl border dark:border-border/60 shadow-xs">
                    {/* Head Filter Tabs */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/80 flex items-center gap-1 mr-1 shrink-0">
                          <Layers className="h-3 w-3 text-primary" /> Heads:
                        </span>

                        <button
                          onClick={() => {
                            setActiveHeadFilter("all");
                            setActiveLedgerIdx(0);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
                            activeHeadFilter === "all"
                              ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 font-bold"
                              : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border/50",
                          )}
                        >
                          All Heads ({groupedHeads.length})
                        </button>

                        {groupedHeads.map((hg) => {
                          const isActive = activeHeadFilter === hg.head.id;
                          return (
                            <button
                              key={hg.head.id}
                              onClick={() => {
                                setActiveHeadFilter(hg.head.id);
                                setActiveLedgerIdx(0);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 font-bold"
                                  : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border/50",
                              )}
                            >
                              <span className="font-mono text-[11px] opacity-85">
                                {hg.head.code}
                              </span>
                              <span className="truncate max-w-[140px]">
                                {hg.head.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted/60 text-muted-foreground font-mono">
                                {hg.ledgers.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Controls: Next/Prev & View Mode Toggle */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {viewMode === "single" && allLedgers.length > 1 && (
                          <>
                            <span className="text-xs font-bold font-mono text-muted-foreground px-2.5 py-1 bg-background rounded-lg border">
                              {activeLedgerIdx + 1} / {allLedgers.length}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                                onClick={() => {
                                  setActiveLedgerIdx((prev) =>
                                    prev > 0 ? prev - 1 : allLedgers.length - 1,
                                  );
                                }}
                                title="Previous Account"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                                onClick={() => {
                                  setActiveLedgerIdx((prev) =>
                                    prev < allLedgers.length - 1 ? prev + 1 : 0,
                                  );
                                }}
                                title="Next Account"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}

                        {allLedgers.length > 1 && (
                          <div className="flex items-center p-0.5 bg-background border border-border/60 rounded-xl shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setViewMode("all")}
                              className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                                viewMode === "all"
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              All ({allLedgers.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewMode("single")}
                              className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                                viewMode === "single"
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              Single View
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewMode("consolidated")}
                              className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                                viewMode === "consolidated"
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              title="Combined chronological ledger across all selected accounts"
                            >
                              Consolidated
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-Account Pills for Fast Jumping */}
                    {allLedgers.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pt-1.5 border-t border-border/40 no-scrollbar">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/80 flex items-center gap-1 mr-1 shrink-0">
                          <Tag className="h-3 w-3 text-primary" /> Accounts:
                        </span>
                        {allLedgers.map((lg, idx) => {
                          const isSelected = activeLedgerIdx === idx;
                          return (
                            <button
                              key={lg.account.id || idx}
                              onClick={() => {
                                setActiveLedgerIdx(idx);
                                setViewMode("single");
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
                                isSelected && viewMode === "single"
                                  ? "bg-indigo-600 text-white font-bold shadow-xs"
                                  : "bg-background hover:bg-accent text-muted-foreground hover:text-foreground border border-border/40",
                              )}
                            >
                              <span className="font-mono text-[10px]">
                                {lg.account.code}
                              </span>
                              <span className="truncate max-w-[120px]">
                                {lg.account.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Render Ledgers */}
                  {ledgersToRender.map((ledgerItem, ledgerIdx) => {
                    const itemIsDebitNormal =
                      ledgerItem.account.type === "ASSET" ||
                      ledgerItem.account.type === "EXPENSE";

                    const headName = ledgerItem.head
                      ? `${ledgerItem.head.code} — ${ledgerItem.head.name}`
                      : "Main Account Head";

                    return (
                      <div
                        key={ledgerItem.account.id || ledgerIdx}
                        className="space-y-4 pt-4 first:pt-0 border-t border-border/40 first:border-0"
                      >
                        {/* Sub-Account Section Header Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {ledgerItem.account.code}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {ledgerItem.account.name}
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                              {ledgerItem.account.type}
                            </span>
                            <span className="text-xs text-muted-foreground/80 font-medium">
                              (Head: {headName})
                            </span>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {viewMode === "consolidated"
                              ? "Consolidated Statement"
                              : `Account ${allLedgers.indexOf(ledgerItem) + 1} of ${allLedgers.length}`}
                          </div>
                        </div>

                        {/* KPI Summary Blocks */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            {
                              label: "Opening Balance",
                              value: ledgerItem.openingBalance,
                              desc: itemIsDebitNormal ? "Debit normal" : "Credit normal",
                              color: "text-foreground",
                              badge: ledgerItem.openingBalance >= 0 ? "Dr" : "Cr",
                              gradient:
                                "from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20 border-slate-200/60 dark:border-slate-800/40",
                            },
                            {
                              label: "Period Debit",
                              value: ledgerItem.rangeTotalDebit,
                              desc: "Total period volume",
                              color: "text-indigo-600 dark:text-indigo-400",
                              badge: "Dr",
                              gradient:
                                "from-blue-50/70 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-indigo-100/50 dark:border-indigo-950/20",
                            },
                            {
                              label: "Period Credit",
                              value: ledgerItem.rangeTotalCredit,
                              desc: "Total period volume",
                              color: "text-rose-600 dark:text-rose-400",
                              badge: "Cr",
                              gradient:
                                "from-amber-50/70 to-rose-50/50 dark:from-amber-950/10 dark:to-rose-950/10 border-rose-100/50 dark:border-rose-950/20",
                            },
                            {
                              label: "Closing Balance",
                              value: ledgerItem.rangeClosingBalance,
                              desc: `Net ${itemIsDebitNormal ? "Dr" : "Cr"} normal`,
                              color:
                                (itemIsDebitNormal
                                  ? ledgerItem.rangeClosingBalance >= 0
                                  : ledgerItem.rangeClosingBalance <= 0)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400",
                              badge:
                                ledgerItem.rangeClosingBalance >= 0 ? "Dr" : "Cr",
                              gradient:
                                (itemIsDebitNormal
                                  ? ledgerItem.rangeClosingBalance >= 0
                                  : ledgerItem.rangeClosingBalance <= 0)
                                  ? "from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10 border-emerald-100/50 dark:border-emerald-950/20"
                                  : "from-amber-50/70 to-rose-50/50 dark:from-amber-950/10 dark:to-rose-950/10 border-rose-100/50 dark:border-rose-950/20",
                            },
                          ].map((c) => (
                            <div
                              key={c.label}
                              className={cn(
                                "rounded-xl border p-4 shadow-sm relative overflow-hidden bg-gradient-to-br transition-all hover:shadow-md",
                                c.gradient,
                              )}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                                  {c.label}
                                </p>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted/80 border dark:border-border/30 text-muted-foreground select-none">
                                  {c.badge}
                                </span>
                              </div>
                              <p
                                className={cn(
                                  "text-lg sm:text-xl font-bold mt-1.5 font-mono tracking-tight",
                                  c.color,
                                )}
                              >
                                {fmt(c.value)}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1 italic">
                                <Info className="h-2.5 w-2.5 shrink-0" />
                                {c.desc}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Transactions Table Layout */}
                        <div className="overflow-x-auto rounded-xl border dark:border-border/60 shadow-sm bg-card">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-muted/30 border-b border-border text-muted-foreground/90 font-medium">
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-28">
                                  Date
                                </th>
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-36">
                                  VOH No.
                                </th>
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-28">
                                  VOH TYPE
                                </th>
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-28">
                                  Cheque No.
                                </th>
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-28">
                                  Ref 1
                                </th>
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-28">
                                  Ref 2
                                </th>
                                <th className="text-left px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50">
                                  Narration
                                </th>
                                <th className="text-right px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-32">
                                  Debit
                                </th>
                                <th className="text-right px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider border-r dark:border-border/50 w-32">
                                  Credit
                                </th>
                                <th className="text-right px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider w-36">
                                  Running Balance
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Opening Balance Row */}
                              <tr className="bg-muted/10 border-b dark:border-border/40 font-medium text-xs text-muted-foreground">
                                <td className="px-4 py-2.5 border-r dark:border-border/40 font-mono italic">
                                  —
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-border/40 font-mono italic">
                                  —
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-border/40 font-mono italic">
                                  —
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-border/40 font-mono italic">
                                  —
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-border/40 font-mono italic">
                                  —
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-border/40 font-mono italic">
                                  —
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-border/40 text-xs italic">
                                  Balance brought forward
                                </td>
                                <td className="px-4 py-2.5 text-right border-r dark:border-border/40 font-mono">
                                  —
                                </td>
                                <td className="px-4 py-2.5 text-right border-r dark:border-border/40 font-mono">
                                  —
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground/80 bg-muted/5">
                                  {fmt(ledgerItem.openingBalance)}
                                </td>
                              </tr>

                              {ledgerItem.rows.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={10}
                                    className="px-4 py-12 text-center text-muted-foreground font-medium bg-muted/5 border-b"
                                  >
                                    No accounting transactions recorded in this period.
                                  </td>
                                </tr>
                              )}

                              {ledgerItem.rows.map((row, i) => {
                                const drillDownLink = getSourceLink(
                                  row.sourceType,
                                  row.sourceId,
                                );
                                return (
                                  <tr
                                    key={row.id}
                                    className={cn(
                                      "border-b border-border/50 hover:bg-accent/40 transition-colors text-xs",
                                      i % 2 === 1 && "bg-muted/5",
                                    )}
                                  >
                                    <td className="px-4 py-3 border-r dark:border-border/40 whitespace-nowrap text-muted-foreground font-mono">
                                      {format(
                                        new Date(row.transactionDate),
                                        "dd-MMM-yyyy",
                                      )}
                                    </td>
                                    <td className="px-4 py-3 border-r dark:border-border/40 font-mono font-semibold text-xs">
                                      {drillDownLink ? (
                                        <Link
                                          href={drillDownLink}
                                          className="text-primary hover:underline inline-flex items-center gap-1"
                                          target="_blank"
                                        >
                                          {row.sourceRef}
                                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                        </Link>
                                      ) : (
                                        row.sourceRef
                                      )}
                                    </td>
                                    <td className="px-4 py-3 border-r dark:border-border/40 whitespace-nowrap">
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-semibold border",
                                          SOURCE_BADGES[row.sourceType] ??
                                            "bg-muted text-muted-foreground border-border",
                                        )}
                                      >
                                        {SOURCE_LABELS[row.sourceType] ??
                                          row.sourceType}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 border-r dark:border-border/40 font-mono text-muted-foreground">
                                      {row.chequeNo || "—"}
                                    </td>
                                    <td className="px-4 py-3 border-r dark:border-border/40 font-mono text-muted-foreground">
                                      {row.refBillNo || "—"}
                                    </td>
                                    <td className="px-4 py-3 border-r dark:border-border/40 font-mono text-muted-foreground">
                                      {row.refBillNo2 || "—"}
                                    </td>
                                    <td className="px-4 py-3 border-r dark:border-border/40 text-foreground/90">
                                      <div>{row.narration || row.description || "—"}</div>
                                      {row.tagAccount && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                          <Tag className="h-3 w-3 text-primary shrink-0" />
                                          <span className="font-mono">
                                            {row.tagAccount.code}
                                          </span>
                                          <span>—</span>
                                          <span>{row.tagAccount.name}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right border-r dark:border-border/40 font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                                      {row.debit > 0 ? fmt(row.debit) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right border-r dark:border-border/40 font-mono text-rose-600 dark:text-rose-400 font-medium">
                                      {row.credit > 0 ? fmt(row.credit) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                                      {fmt(row.runningBalance)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-muted/20 border-t-2 border-border font-bold">
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-3.5 text-right uppercase text-[10px] tracking-wider text-muted-foreground border-r dark:border-border/50"
                                >
                                  Account Summary ({ledgerItem.account.code})
                                </td>
                                <td className="px-4 py-3.5 text-right border-r dark:border-border/40 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                                  {fmt(ledgerItem.rangeTotalDebit)}
                                </td>
                                <td className="px-4 py-3.5 text-right border-r dark:border-border/40 font-mono text-xs text-rose-600 dark:text-rose-400">
                                  {fmt(ledgerItem.rangeTotalCredit)}
                                </td>
                                <td
                                  className={cn(
                                    "px-4 py-3.5 text-right font-mono text-xs font-extrabold bg-muted/10",
                                    ledgerItem.rangeClosingBalance >= 0
                                      ? "text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500/50"
                                      : "text-rose-700 dark:text-rose-400 border-l-2 border-rose-500/50",
                                  )}
                                >
                                  {fmt(ledgerItem.rangeClosingBalance)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ─── GORGEOUS PRINT/PDF VIEW CONTAINER (HIDDEN ON SCREEN, SHOWN IN PRINT) ─── */}
      {data && (
        <div
          id="general-ledger-print-section"
          className="hidden print:block font-sans text-black p-4 bg-white min-h-screen leading-normal w-full max-w-[1000px] mx-auto box-border"
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #general-ledger-print-section,
              #general-ledger-print-section * {
                visibility: visible !important;
              }
              #general-ledger-print-section {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                box-sizing: border-box !important;
              }
              .print-ledger-block {
                page-break-after: always !important;
                break-after: page !important;
              }
              .print-ledger-block:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              #general-ledger-print-section tfoot {
                display: table-row-group !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
            }}
          />
          {allLedgers.map((ledgerItem, pIdx) => (
            <div key={ledgerItem.account.id || pIdx} className="print-ledger-block mb-8">
              {/* Header */}
              <div className="flex justify-between mb-3 gap-4 items-start border-b pb-2 border-gray-300">
                <div className="w-[15%] flex flex-col items-start justify-center">
                  <img
                    src="/image.png"
                    alt="Logo"
                    className="w-20 object-contain"
                  />
                </div>

                <div className="w-[55%] flex flex-col justify-center text-center">
                  <div className="bg-[#eef2f6] text-black w-full text-center py-1.5 text-md font-bold print:bg-[#eef2f6] [-webkit-print-color-adjust:exact] [color-adjust:exact] uppercase tracking-wider rounded">
                    General Ledger Report
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-1">
                    Account: {ledgerItem.account.code} — {ledgerItem.account.name}
                    {ledgerItem.head && ` (Head: ${ledgerItem.head.code} - ${ledgerItem.head.name})`}
                  </p>
                </div>

                <div className="w-[30%] bg-[#f8fafc] text-[8px] sm:text-[9px] p-1.5 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] [color-adjust:exact] flex flex-col gap-0.5 rounded">
                  <div className="flex justify-between">
                    <span className="font-bold">Period From:</span>
                    <span>
                      {fromDate ? format(fromDate, "dd/MM/yyyy") : "Beginning"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Period To:</span>
                    <span>{toDate ? format(toDate, "dd/MM/yyyy") : "Present"}</span>
                  </div>

                  <div className="flex justify-between border-t pt-0.5 mt-0.5 border-gray-200">
                    <span className="font-bold">Printed:</span>
                    <span>{format(new Date(), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-[9px] mb-2 border-collapse table-fixed">
                <thead>
                  <tr className="border-y border-black font-bold text-left">
                    <th className="py-1 pr-1 w-[7%] text-[8.5px]">Date</th>
                    <th className="py-1 pr-1 w-[10%] text-[8.5px]">VOH No.</th>
                    <th className="py-1 pr-1 w-[6%] text-[8.5px]">VOH TYPE</th>
                    <th className="py-1 pr-1 w-[6%] text-[8.5px]">Cheque No.</th>
                    <th className="py-1 pr-1 w-[8%] text-[8.5px]">Ref. 1</th>
                    <th className="py-1 pr-1 w-[6%] text-[8.5px]">Ref. 2</th>
                    <th className="py-1 pr-1 w-[33%] text-[8.5px]">Narration</th>
                    <th className="py-1 pr-1 text-right w-[8%] text-[8.5px]">
                      Debit
                    </th>
                    <th className="py-1 pr-1 text-right w-[8%] text-[8.5px]">
                      Credit
                    </th>
                    <th className="py-1 text-right w-[8%] text-[8.5px]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="border-b border-gray-300 align-top italic text-gray-600 font-medium bg-gray-50/50">
                    <td className="py-1 pr-1">—</td>
                    <td className="py-1 pr-1">—</td>
                    <td className="py-1 pr-1">—</td>
                    <td className="py-1 pr-1">—</td>
                    <td className="py-1 pr-1">—</td>
                    <td className="py-1 pr-1">—</td>
                    <td className="py-1 pr-1">Balance brought forward</td>
                    <td className="py-1 pr-1 text-right">—</td>
                    <td className="py-1 pr-1 text-right">—</td>
                    <td className="py-1 text-right font-mono font-semibold">
                      {fmt(ledgerItem.openingBalance)}
                    </td>
                  </tr>

                  {ledgerItem.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-4 text-center text-gray-500 border-b"
                      >
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  )}

                  {ledgerItem.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-200 align-top">
                      <td className="py-1 pr-1 font-mono text-[8px] whitespace-nowrap">
                        {format(new Date(row.transactionDate), "dd/MM/yyyy")}
                      </td>
                      <td className="py-1 pr-1 font-mono font-semibold text-[8px] whitespace-nowrap">
                        {formatVoucherNoForPrint(row.sourceRef)}
                      </td>
                      <td
                        className="py-1 pr-1 text-[8px] whitespace-nowrap truncate max-w-0"
                        title={SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                      >
                        {SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                      </td>
                      <td
                        className="py-1 pr-1 text-[8px] font-mono whitespace-nowrap truncate max-w-0"
                        title={row.chequeNo || undefined}
                      >
                        {row.chequeNo || "—"}
                      </td>
                      <td
                        className="py-1 pr-1 text-[8px] font-mono whitespace-nowrap truncate max-w-0"
                        title={row.refBillNo || undefined}
                      >
                        {row.refBillNo || "—"}
                      </td>
                      <td
                        className="py-1 pr-1 text-[8px] font-mono whitespace-nowrap truncate max-w-0"
                        title={row.refBillNo2 || undefined}
                      >
                        {row.refBillNo2 || "—"}
                      </td>
                      <td className="py-1 pr-1 text-[8.5px] leading-tight break-words">
                        <div>{row.narration || row.description || "—"}</div>
                      </td>
                      <td className="py-1 pr-1 text-right font-mono text-[8px] whitespace-nowrap">
                        {row.debit > 0 ? fmt(row.debit) : ""}
                      </td>
                      <td className="py-1 pr-1 text-right font-mono text-[8px] whitespace-nowrap">
                        {row.credit > 0 ? fmt(row.credit) : ""}
                      </td>
                      <td className="py-1 text-right font-mono font-semibold text-[8px] whitespace-nowrap">
                        {fmt(row.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="print:table-row-group">
                  <tr>
                    <td
                      colSpan={7}
                      className="py-2 px-0 align-bottom border-b border-black"
                    >
                      <div className="flex gap-2 font-bold text-[9px] leading-tight flex-wrap">
                        <span className="whitespace-nowrap">
                          Closing Balance in Words:
                        </span>
                        <span className="underline decoration-dashed decoration-gray-400 underline-offset-2 break-words">
                          {numberToWords(Math.abs(ledgerItem.rangeClosingBalance))}{" "}
                          {ledgerItem.rangeClosingBalance >= 0 ? "(Debit)" : "(Credit)"}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 pr-1 text-right align-bottom border-b border-black">
                      <div
                        className="ml-auto border-t border-black pb-0.5"
                        style={{ borderBottom: "2px double black" }}
                      >
                        <span className="tabular-nums font-mono text-[8px] block pt-0.5">
                          {fmt(ledgerItem.rangeTotalDebit)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 pr-1 text-right align-bottom border-b border-black">
                      <div
                        className="ml-auto border-t border-black pb-0.5"
                        style={{ borderBottom: "2px double black" }}
                      >
                        <span className="tabular-nums font-mono text-[8px] block pt-0.5">
                          {fmt(ledgerItem.rangeTotalCredit)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 text-right align-bottom border-b border-black">
                      <div
                        className="ml-auto border-t border-black pb-0.5"
                        style={{ borderBottom: "2px double black" }}
                      >
                        <span className="tabular-nums font-mono font-bold text-[8px] block pt-0.5">
                          {fmt(ledgerItem.rangeClosingBalance)}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Remarks */}
              <div className="mt-2 mb-4">
                <div className="font-bold text-[10px]">
                  General Ledger Summary Remarks
                </div>
                <p className="text-[9px] mt-0.5 text-gray-700 leading-tight">
                  This statement represents verified transaction ledger history for
                  Account {ledgerItem.account.code} ({ledgerItem.account.name}). The
                  opening balance of {fmt(ledgerItem.openingBalance)} is compiled from
                  postings preceding{" "}
                  {fromDate ? format(fromDate, "dd-MM-yyyy") : "inception"}. Net
                  closing balance is {fmt(ledgerItem.rangeClosingBalance)}.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
