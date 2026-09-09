"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  Tag,
  Calendar,
  CheckIcon,
  ChevronDownIcon,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import {
  getTrialBalance,
  TrialBalanceResult,
  queueTrialBalanceExport,
} from "@/lib/actions/finance-reports";
import { TrialBalancePrint } from "./trial-balance-print";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import React from "react";

const fmt = (n: number) =>
  n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TrialBalanceRow = React.memo(function TrialBalanceRow({
  row,
  index,
  showOpening,
  showTransactions,
  showClosing,
  onToggleCollapse,
  isCollapsed,
  hasChildren,
}: {
  row: any;
  index: number;
  showOpening: boolean;
  showTransactions: boolean;
  showClosing: boolean;
  onToggleCollapse?: (id: string) => void;
  isCollapsed?: boolean;
  hasChildren?: boolean;
}) {
  const isGroup = "isGroup" in row && row.isGroup;
  const isTag = row.isTagAccount;
  const level = row.level || 0;

  return (
    <tr
      className={cn(
        "border-b dark:border-border/50 hover:bg-accent/30 transition-colors",
        isGroup && "font-semibold bg-muted/20",
        isTag && "text-muted-foreground bg-muted/5",
        !isGroup && !isTag && index % 2 === 1 && "bg-muted/10",
      )}
    >
      <td className="px-4 py-2 text-center font-mono text-xs border-r">
        {index + 1}
      </td>
      <td className="px-4 py-2 font-mono text-xs border-r">{row.code}</td>
      <td className="px-4 py-2 border-r">
        <div
          className="flex items-center gap-1.5"
          style={{ paddingLeft: `${level * 1.2}rem` }}
        >
          {isGroup && hasChildren ? (
            <button
              onClick={() => onToggleCollapse?.(row.id)}
              className="p-1 hover:bg-muted rounded text-muted-foreground transition-transform duration-200 inline-flex items-center justify-center cursor-pointer"
              type="button"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isCollapsed && "-rotate-90",
                )}
              />
            </button>
          ) : (
            isGroup && <span className="w-[22px]" />
          )}
          {!isGroup && level > 0 && <span className="w-2" />}
          <span className={cn(isTag && "italic text-muted-foreground")}>
            {isTag ? `↳ ${row.name}` : row.name}
          </span>
        </div>
      </td>
      {showOpening && (
        <>
          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
            {row.openingDebit > 0 ? fmt(row.openingDebit) : ""}
          </td>
          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground border-r">
            {row.openingCredit > 0 ? fmt(row.openingCredit) : ""}
          </td>
        </>
      )}
      {showTransactions && (
        <>
          <td className="px-4 py-2 text-right font-mono text-xs">
            {row.transactionDebit > 0 ? fmt(row.transactionDebit) : ""}
          </td>
          <td className="px-4 py-2 text-right font-mono text-xs border-r">
            {row.transactionCredit > 0 ? fmt(row.transactionCredit) : ""}
          </td>
        </>
      )}
      {showClosing && (
        <>
          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
            {row.closingDebit > 0 ? fmt(row.closingDebit) : ""}
          </td>
          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
            {row.closingCredit > 0 ? fmt(row.closingCredit) : ""}
          </td>
        </>
      )}
    </tr>
  );
});

type ReportType = "OPENING" | "CLOSING" | "DETAILED";

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

export function TrialBalanceClient({
  initialData,
  accounts: accountsProp,
}: {
  initialData?: TrialBalanceResult;
  accounts?: ChartOfAccount[];
}) {
  const [data, setData] = useState<TrialBalanceResult | undefined>(initialData);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [reportType, setReportType] = useState<ReportType>("DETAILED");
  const [includeTagAccounts, setIncludeTagAccounts] = useState(false);

  // ─── Tree State ─────────────────────────────────────────────────────────────
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

  // ─── Account Head & Tag Sub-Account filter states ────────────────────────────
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedTagAccountIds, setSelectedTagAccountIds] = useState<string[]>(
    [],
  );

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

  // Search & Collapsible state
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const rawRows = data?.rows || [];

  // Collapse sub-groups (level >= 1) by default when data loads
  useEffect(() => {
    if (rawRows.length > 0) {
      const initialCollapsed: Record<string, boolean> = {};
      rawRows.forEach((r) => {
        const isGroup = "isGroup" in r && r.isGroup;
        if (isGroup && (r.level || 0) >= 1) {
          initialCollapsed[r.id] = true;
        }
      });
      setCollapsedGroups(initialCollapsed);
    }
  }, [data]);

  const toggleCollapse = (id: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    setCollapsedGroups({});
  };

  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    rawRows.forEach((r) => {
      const isGroup = "isGroup" in r && r.isGroup;
      if (isGroup) {
        collapsed[r.id] = true;
      }
    });
    setCollapsedGroups(collapsed);
  };

  // Filter rawRows based on selectedAccountIds and selectedTagAccountIds
  const filteredRawRows = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];

    const parentMap = new Map<string, string>();
    rawRows.forEach((r) => {
      if (r.parentId) parentMap.set(r.id, r.parentId);
    });

    // 1. If specific tag sub-accounts are selected:
    if (selectedTagAccountIds.length > 0) {
      const ids = new Set<string>();
      selectedTagAccountIds.forEach((tagId) => {
        ids.add(tagId);
        let curr = parentMap.get(tagId);
        while (curr) {
          ids.add(curr);
          curr = parentMap.get(curr);
        }
      });

      // Also ensure all selectedAccountIds and their ancestors are included
      selectedAccountIds.forEach((accId) => {
        ids.add(accId);
        let curr = parentMap.get(accId);
        while (curr) {
          ids.add(curr);
          curr = parentMap.get(curr);
        }
      });

      return rawRows.filter((r) => ids.has(r.id));
    }

    // 2. If one or more account heads are selected:
    if (selectedAccountIds.length > 0) {
      const targetIds = new Set<string>();
      selectedAccountIds.forEach((accId) => targetIds.add(accId));

      // Collect all descendants of selected heads
      let changed = true;
      while (changed) {
        changed = false;
        rawRows.forEach((r) => {
          if (r.parentId && targetIds.has(r.parentId) && !targetIds.has(r.id)) {
            targetIds.add(r.id);
            changed = true;
          }
        });
      }

      // Collect all ancestors of selected heads up to root
      selectedAccountIds.forEach((accId) => {
        let curr = parentMap.get(accId);
        while (curr) {
          targetIds.add(curr);
          curr = parentMap.get(curr);
        }
      });

      return rawRows.filter((r) => targetIds.has(r.id));
    }

    // 3. No account head filter -> all rows
    return rawRows;
  }, [rawRows, selectedAccountIds, selectedTagAccountIds]);

  // Compute visible rows based on search and collapsed state
  const visibleRows = useMemo(() => {
    if (!filteredRawRows || filteredRawRows.length === 0) return [];

    // 1. If search is active
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();

      const parentMap = new Map<string, string>(); // childId -> parentId
      filteredRawRows.forEach((r) => {
        if (r.parentId) {
          parentMap.set(r.id, r.parentId);
        }
      });

      const matches = new Set<string>();
      filteredRawRows.forEach((r) => {
        const codeMatch = r.code?.toLowerCase().includes(q);
        const nameMatch = r.name?.toLowerCase().includes(q);
        if (codeMatch || nameMatch) {
          matches.add(r.id);
          // Add all ancestors to the matches set so tree context is visible
          let currParent = r.parentId;
          while (currParent) {
            matches.add(currParent);
            currParent = parentMap.get(currParent);
          }
        }
      });

      return filteredRawRows.filter((r) => matches.has(r.id));
    }

    // 2. If no search, filter by collapsed state
    const visible: any[] = [];
    let hideBelowLevel = 999;

    filteredRawRows.forEach((row) => {
      const level = row.level || 0;

      if (level >= hideBelowLevel) {
        return;
      } else {
        hideBelowLevel = 999;
      }

      visible.push(row);

      const isGroup = "isGroup" in row && row.isGroup;
      if (isGroup && collapsedGroups[row.id]) {
        hideBelowLevel = level + 1;
      }
    });

    return visible;
  }, [filteredRawRows, searchQuery, collapsedGroups]);

  const parentIdsSet = useMemo(
    () => new Set(filteredRawRows.map((r) => r.parentId).filter(Boolean)),
    [filteredRawRows],
  );

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
        toast.success(
          "Excel export job successfully queued! Check your notification bell in a moment to download.",
        );
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

  // Direct Vector-based Background PDF Exporter
  const handlePDFExport = () => {
    if (!data || filteredRawRows.length === 0) {
      toast.error("No data matching current filters to export");
      return;
    }

    setIsGeneratingPDF(true);
    const toastId = toast.loading("Generating Trial Balance PDF...");

    try {
      const showOpening = reportType === "OPENING" || reportType === "DETAILED";
      const showTransactions = reportType === "DETAILED";
      const showClosing = reportType === "CLOSING" || reportType === "DETAILED";

      const isDetailed = reportType === "DETAILED";
      const doc = new jsPDF(isDetailed ? "l" : "p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      let pageNum = 1;

      // Table coordinates & columns
      const columns = isDetailed
        ? [
            { header: "Sr.", width: 12, align: "center" },
            { header: "Code", width: 23, align: "center" },
            { header: "Account Description", width: 92, align: "left" },
            { header: "Open DR", width: 25, align: "right" },
            { header: "Open CR", width: 25, align: "right" },
            { header: "Tx DR", width: 25, align: "right" },
            { header: "Tx CR", width: 25, align: "right" },
            { header: "Close DR", width: 25, align: "right" },
            { header: "Close CR", width: 25, align: "right" },
          ]
        : [
            { header: "Sr.", width: 12, align: "center" },
            { header: "Code", width: 25, align: "center" },
            { header: "Account Description", width: 73, align: "left" },
            {
              header: showOpening ? "Opening DR" : "Closing DR",
              width: 40,
              align: "right",
            },
            {
              header: showOpening ? "Opening CR" : "Closing CR",
              width: 40,
              align: "right",
            },
          ];

      // Compute column X starts
      const colX: number[] = [];
      let curX = margin;
      columns.forEach((col) => {
        colX.push(curX);
        curX += col.width;
      });

      const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Speed (pvt.) Limited", pageWidth / 2, 12, {
          align: "center",
        });

        doc.setFontSize(11);
        doc.text("TRIAL BALANCE REPORT", pageWidth / 2, 18, {
          align: "center",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const dateRangeStr =
          fromDate && toDate
            ? `Period: ${format(fromDate, "dd MMM yyyy")} - ${format(toDate, "dd MMM yyyy")}`
            : "All time (running balances)";
        doc.text(dateRangeStr, pageWidth / 2, 23, { align: "center" });

        // Meta Box
        doc.setFontSize(7.5);
        doc.text(
          `Printed: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`,
          margin,
          27,
        );
        doc.text(
          `Format: ${reportType} | Sub-Accounts: ${includeTagAccounts ? "Yes" : "No"}`,
          margin,
          31,
        );

        const statusText = `Status: ${data.balanced ? "BALANCED" : "UNBALANCED"}`;
        doc.setFont("helvetica", "bold");
        if (!data.balanced) {
          doc.setTextColor(180, 0, 0);
        } else {
          doc.setTextColor(0, 120, 0);
        }
        doc.text(statusText, pageWidth - margin, 27, { align: "right" });
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(`Page ${pageNum}`, pageWidth - margin, 31, { align: "right" });

        // Draw table header block
        const headerY = 35;
        const headerHeight = isDetailed ? 10 : 7;

        // Gray background for headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, headerY, contentWidth, headerHeight, "F");

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.25);
        doc.line(margin, headerY, pageWidth - margin, headerY);
        doc.line(
          margin,
          headerY + headerHeight,
          pageWidth - margin,
          headerY + headerHeight,
        );

        // Render column headers
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);

        if (isDetailed) {
          doc.text("Sr.", colX[0] + columns[0].width / 2, headerY + 6, {
            align: "center",
          });
          doc.text("Code", colX[1] + columns[1].width / 2, headerY + 6, {
            align: "center",
          });
          doc.text("Account Description", colX[2] + 2, headerY + 6);

          doc.text("Opening Balance", colX[3] + 25, headerY + 3.5, {
            align: "center",
          });
          doc.text("Transactions", colX[5] + 25, headerY + 3.5, {
            align: "center",
          });
          doc.text("Closing Balance", colX[7] + 25, headerY + 3.5, {
            align: "center",
          });

          // Line dividing sub-headers
          doc.line(colX[3], headerY + 4.5, pageWidth - margin, headerY + 4.5);

          doc.setFontSize(7);
          doc.text("DR", colX[3] + columns[3].width / 2, headerY + 8.5, {
            align: "center",
          });
          doc.text("CR", colX[4] + columns[4].width / 2, headerY + 8.5, {
            align: "center",
          });
          doc.text("DR", colX[5] + columns[5].width / 2, headerY + 8.5, {
            align: "center",
          });
          doc.text("CR", colX[6] + columns[6].width / 2, headerY + 8.5, {
            align: "center",
          });
          doc.text("DR", colX[7] + columns[7].width / 2, headerY + 8.5, {
            align: "center",
          });
          doc.text("CR", colX[8] + columns[8].width / 2, headerY + 8.5, {
            align: "center",
          });
        } else {
          columns.forEach((col, idx) => {
            const x =
              col.align === "center"
                ? colX[idx] + col.width / 2
                : col.align === "right"
                  ? colX[idx] + col.width - 2
                  : colX[idx] + 2;
            doc.text(col.header, x, headerY + 4.5, { align: col.align });
          });
        }

        doc.setTextColor(0, 0, 0);
        return headerY + headerHeight;
      };

      let y = drawHeader();
      const rowHeight = 5.5;
      const bottomLimit = pageHeight - 20;

      filteredRawRows.forEach((row, i) => {
        // Check for page break
        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          pageNum++;
          y = drawHeader();
        }

        const isGroup = row.isGroup;
        const isTag = row.isTagAccount;
        const level = row.level || 0;

        // Styling based on account nature
        if (isGroup) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setFillColor(252, 252, 252);
          doc.rect(margin, y, contentWidth, rowHeight, "F");
        } else if (isTag) {
          doc.setFont("helvetica", "oblique");
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0);
        }

        // Zebra striping
        if (!isGroup && !isTag && i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, rowHeight, "F");
        }

        // Draw horizontal separator line
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.15);
        doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

        // 1. Sr
        doc.text((i + 1).toString(), colX[0] + columns[0].width / 2, y + 4, {
          align: "center",
        });

        // 2. Code
        doc.text(row.code || "", colX[1] + columns[1].width / 2, y + 4, {
          align: "center",
        });

        // 3. Description (indented)
        const indent = level * 3;
        const descName = isTag ? `↳ ${row.name}` : row.name;
        doc.text(descName, colX[2] + 2 + indent, y + 4);

        const pdfFmt = (val: number) =>
          val > 0
            ? val.toLocaleString("en-PK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "";

        if (isDetailed) {
          doc.text(
            pdfFmt(row.openingDebit || 0),
            colX[3] + columns[3].width - 2,
            y + 4,
            { align: "right" },
          );
          doc.text(
            pdfFmt(row.openingCredit || 0),
            colX[4] + columns[4].width - 2,
            y + 4,
            { align: "right" },
          );
          doc.text(
            pdfFmt(row.transactionDebit || 0),
            colX[5] + columns[5].width - 2,
            y + 4,
            { align: "right" },
          );
          doc.text(
            pdfFmt(row.transactionCredit || 0),
            colX[6] + columns[6].width - 2,
            y + 4,
            { align: "right" },
          );
          doc.text(
            pdfFmt(row.closingDebit || 0),
            colX[7] + columns[7].width - 2,
            y + 4,
            { align: "right" },
          );
          doc.text(
            pdfFmt(row.closingCredit || 0),
            colX[8] + columns[8].width - 2,
            y + 4,
            { align: "right" },
          );
        } else {
          if (showOpening) {
            doc.text(
              pdfFmt(row.openingDebit || 0),
              colX[3] + columns[3].width - 2,
              y + 4,
              { align: "right" },
            );
            doc.text(
              pdfFmt(row.openingCredit || 0),
              colX[4] + columns[4].width - 2,
              y + 4,
              { align: "right" },
            );
          } else {
            doc.text(
              pdfFmt(row.closingDebit || 0),
              colX[3] + columns[3].width - 2,
              y + 4,
              { align: "right" },
            );
            doc.text(
              pdfFmt(row.closingCredit || 0),
              colX[4] + columns[4].width - 2,
              y + 4,
              { align: "right" },
            );
          }
        }

        y += rowHeight;
        doc.setTextColor(0, 0, 0);
      });

      // Check for footer page break
      if (y + 12 > bottomLimit) {
        doc.addPage();
        pageNum++;
        y = drawHeader();
      }

      // Draw Totals row
      doc.setFillColor(235, 235, 235);
      doc.rect(margin, y, contentWidth, 7, "F");

      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      doc.line(margin, y + 7, pageWidth - margin, y + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("GRAND TOTAL", colX[2] + 2, y + 4.5);

      const pdfFmtBold = (val: number) =>
        val.toLocaleString("en-PK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      if (isDetailed) {
        doc.text(
          pdfFmtBold(data.totalOpeningDebit ?? 0),
          colX[3] + columns[3].width - 2,
          y + 4.5,
          { align: "right" },
        );
        doc.text(
          pdfFmtBold(data.totalOpeningCredit ?? 0),
          colX[4] + columns[4].width - 2,
          y + 4.5,
          { align: "right" },
        );
        doc.text(
          pdfFmtBold(data.totalTransactionDebit ?? 0),
          colX[5] + columns[5].width - 2,
          y + 4.5,
          { align: "right" },
        );
        doc.text(
          pdfFmtBold(data.totalTransactionCredit ?? 0),
          colX[6] + columns[6].width - 2,
          y + 4.5,
          { align: "right" },
        );
        doc.text(
          pdfFmtBold(data.totalClosingDebit ?? 0),
          colX[7] + columns[7].width - 2,
          y + 4.5,
          { align: "right" },
        );
        doc.text(
          pdfFmtBold(data.totalClosingCredit ?? 0),
          colX[8] + columns[8].width - 2,
          y + 4.5,
          { align: "right" },
        );
      } else {
        if (showOpening) {
          doc.text(
            pdfFmtBold(data.totalOpeningDebit ?? 0),
            colX[3] + columns[3].width - 2,
            y + 4.5,
            { align: "right" },
          );
          doc.text(
            pdfFmtBold(data.totalOpeningCredit ?? 0),
            colX[4] + columns[4].width - 2,
            y + 4.5,
            { align: "right" },
          );
        } else {
          doc.text(
            pdfFmtBold(data.totalClosingDebit ?? data.totalDebit ?? 0),
            colX[3] + columns[3].width - 2,
            y + 4.5,
            { align: "right" },
          );
          doc.text(
            pdfFmtBold(data.totalClosingCredit ?? data.totalCredit ?? 0),
            colX[4] + columns[4].width - 2,
            y + 4.5,
            { align: "right" },
          );
        }
      }

      y += 12;

      // Signature Boxes
      if (y + 25 <= pageHeight - margin) {
        const boxWidth = contentWidth / 3.3;
        const gap = (contentWidth - boxWidth * 3) / 2;
        const boxHeight = 15;

        const drawSigBox = (title: string, startX: number) => {
          doc.rect(startX, y, boxWidth, boxHeight);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.text(title, startX + boxWidth / 2, y + 3.5, { align: "center" });
          doc.setDrawColor(200, 200, 200);
          doc.line(startX + 5, y + 11, startX + boxWidth - 5, y + 11);
        };

        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.2);
        drawSigBox("PREPARED BY", margin);
        drawSigBox("CHECKED BY", margin + boxWidth + gap);
        drawSigBox("APPROVED BY", margin + (boxWidth + gap) * 2);
      }

      doc.save(`Trial_Balance_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF report downloaded successfully!");
    } catch (err: any) {
      console.error("PDF Export error:", err);
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      toast.dismiss(toastId);
      setIsGeneratingPDF(false);
    }
  };

  const load = (from?: Date, to?: Date, includeTags?: boolean) => {
    startTransition(async () => {
      const res = await getTrialBalance(
        from ? format(from, "yyyy-MM-dd") : undefined,
        to ? format(to, "yyyy-MM-dd") : undefined,
        includeTags,
      );
      if (res.status) setData(res.data);
    });
  };

  const showOpening = reportType === "OPENING" || reportType === "DETAILED";
  const showTransactions = reportType === "DETAILED";
  const showClosing = reportType === "CLOSING" || reportType === "DETAILED";

  const exportToCSV = () => {
    if (!data || filteredRawRows.length === 0) return;

    const headers = ["Sr.No", "ACC.CODE", "ACCOUNT"];
    if (showOpening) {
      headers.push("OPENING DR", "OPENING CR");
    }
    if (showTransactions) {
      headers.push("TX DR", "TX CR");
    }
    if (showClosing) {
      headers.push("CLOSING DR", "CLOSING CR");
    }

    const csvRows = [headers.join(",")];

    filteredRawRows.forEach((row, i) => {
      const isTag = row.isTagAccount;
      const accountName = isTag ? `  -> ${row.name}` : row.name;
      const cleanName = `"${accountName.replace(/"/g, '""')}"`;
      const code = `"${row.code}"`;

      const r = [i + 1, code, cleanName];
      if (showOpening) {
        r.push(row.openingDebit, row.openingCredit);
      }
      if (showTransactions) {
        r.push(row.transactionDebit, row.transactionCredit);
      }
      if (showClosing) {
        r.push(row.closingDebit, row.closingCredit);
      }

      csvRows.push(r.join(","));
    });

    // Add totals row
    const totals = ["", "", "GRAND TOTAL"];
    if (showOpening) {
      totals.push(data.totalOpeningDebit || 0, data.totalOpeningCredit || 0);
    }
    if (showTransactions) {
      totals.push(
        data.totalTransactionDebit || 0,
        data.totalTransactionCredit || 0,
      );
    }
    if (showClosing) {
      totals.push(
        data.totalClosingDebit ?? data.totalDebit ?? 0,
        data.totalClosingCredit ?? data.totalCredit ?? 0,
      );
    }
    csvRows.push(totals.join(","));

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Trial_Balance_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate the colSpan for the header "ACCOUNT"
  const totalCols =
    3 +
    (showOpening ? 2 : 0) +
    (showTransactions ? 2 : 0) +
    (showClosing ? 2 : 0);

  // TanStack Virtualizer Hook for 60 FPS large table rendering
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 37,
    overscan: 25,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalVirtualSize - virtualRows[virtualRows.length - 1].end
      : 0;

  // Reset scroll to top when search query or filter changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [searchQuery, selectedAccountIds, selectedTagAccountIds]);

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
            <Button
              variant="outline"
              size="sm"
              onClick={handlePDFExport}
              disabled={isGeneratingPDF}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? "Generating..." : "Print PDF"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" /> Export{" "}
                  <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  Immediate CSV Export
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExcelExport}
                  disabled={isExporting}
                >
                  Background Excel Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Filters */}
          <div className="space-y-4 p-5 rounded-xl border border-border bg-muted/10 dark:bg-muted/5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Account Head */}
              <div className="space-y-2 md:col-span-3">
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
                  onValueChange={(val) => {
                    setSelectedTagAccountIds(val);
                    if (val.length > 0 && !includeTagAccounts) {
                      setIncludeTagAccounts(true);
                      load(fromDate, toDate, true);
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

              {/* Date Range */}
              <div className="space-y-2 md:col-span-3">
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

              {/* Apply / Reset Actions */}
              <div className="md:col-span-3 flex items-center gap-2">
                <Button
                  onClick={() =>
                    load(
                      fromDate,
                      toDate,
                      includeTagAccounts || selectedTagAccountIds.length > 0,
                    )
                  }
                  disabled={isPending}
                  className="h-10 flex-1 font-medium text-sm shadow-md transition-all bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95"
                >
                  <RefreshCw
                    className={cn("h-4 w-4 mr-2", isPending && "animate-spin")}
                  />
                  {isPending ? "Loading…" : "Apply Filters"}
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setSelectedAccountIds([]);
                    setSelectedTagAccountIds([]);
                    setSearchQuery("");
                    setFromDate(undefined);
                    setToDate(undefined);
                    setIncludeTagAccounts(false);
                    setReportType("DETAILED");
                    load(undefined, undefined, false);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Sub-bar: Search, Expand/Collapse, Report Type, Include Tags */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] max-w-xs flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Expand / Collapse */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={expandAll}
                    type="button"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={collapseAll}
                    type="button"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                {/* Report Type */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    View:
                  </span>
                  <RadioGroup
                    value={reportType}
                    onValueChange={(val) => setReportType(val as ReportType)}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="OPENING" id="r-opening" />
                      <Label
                        htmlFor="r-opening"
                        className="cursor-pointer text-xs"
                      >
                        Opening Only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="CLOSING" id="r-closing" />
                      <Label
                        htmlFor="r-closing"
                        className="cursor-pointer text-xs"
                      >
                        Closing Only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="DETAILED" id="r-detailed" />
                      <Label
                        htmlFor="r-detailed"
                        className="cursor-pointer text-xs"
                      >
                        Detailed (All)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Include Tags */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    checked={includeTagAccounts}
                    onCheckedChange={(checked) => {
                      const val = checked as boolean;
                      setIncludeTagAccounts(val);
                      load(fromDate, toDate, val);
                    }}
                  />
                  <span className="text-xs group-hover:text-primary transition-colors">
                    Include Sub-Accounts (Tags)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Balance check banner */}
          {data && selectedAccountIds.length === 0 && (
            <div
              className={cn(
                "flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium",
                data.balanced
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
              )}
            >
              <span>
                {data.balanced
                  ? "✓ Books are balanced"
                  : "⚠ Books are NOT balanced — check for missing entries"}
              </span>
              <span>
                Difference:{" "}
                {fmt(
                  Math.abs((data.totalDebit ?? 0) - (data.totalCredit ?? 0)),
                )}
              </span>
            </div>
          )}

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

          {/* Table */}
          <div className="space-y-2">
            {/* Virtualization & Count Bar */}
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                Showing <span className="font-bold text-foreground">{visibleRows.length}</span> accounts
                {searchQuery && (
                  <span className="text-primary font-medium">(filtered by &quot;{searchQuery}&quot;)</span>
                )}
                {filteredRawRows.length !== rawRows.length && (
                  <span className="text-muted-foreground/70">of {rawRows.length} total</span>
                )}
              </span>
              <span className="font-mono text-[11px] flex items-center gap-1.5 text-muted-foreground/80 bg-muted/40 px-2.5 py-0.5 rounded-full border border-border/40">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                TanStack Virtualized (60 FPS)
              </span>
            </div>

            <div
              ref={tableContainerRef}
              className="overflow-auto max-h-[calc(100vh-280px)] min-h-[420px] rounded-lg border dark:border-border relative scrollbar-thin scrollbar-thumb-muted-foreground/20"
            >
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-xs border-b dark:border-border shadow-xs">
                  <tr className="bg-muted/80 border-b dark:border-border">
                    <th
                      rowSpan={2}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r bg-muted/90 backdrop-blur-xs w-16"
                    >
                      Sr.No
                    </th>
                    <th
                      rowSpan={2}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r bg-muted/90 backdrop-blur-xs w-32"
                    >
                      ACC.CODE
                    </th>
                    <th
                      rowSpan={2}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r bg-muted/90 backdrop-blur-xs min-w-[220px]"
                    >
                      ACCOUNT
                    </th>
                    {showOpening && (
                      <th
                        colSpan={2}
                        className="text-center px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r border-b bg-muted/90 backdrop-blur-xs w-48"
                      >
                        Opening Balance
                      </th>
                    )}
                    {showTransactions && (
                      <th
                        colSpan={2}
                        className="text-center px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r border-b bg-muted/90 backdrop-blur-xs w-48"
                      >
                        Transactions
                      </th>
                    )}
                    {showClosing && (
                      <th
                        colSpan={2}
                        className="text-center px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider bg-muted/90 backdrop-blur-xs w-48"
                      >
                        Closing Balance
                      </th>
                    )}
                  </tr>
                  <tr className="bg-muted/80 border-b dark:border-border">
                    {showOpening && (
                      <>
                        <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider bg-muted/90 backdrop-blur-xs w-24">
                          DR
                        </th>
                        <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r bg-muted/90 backdrop-blur-xs w-24">
                          CR
                        </th>
                      </>
                    )}
                    {showTransactions && (
                      <>
                        <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider bg-muted/90 backdrop-blur-xs w-24">
                          DR
                        </th>
                        <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider border-r bg-muted/90 backdrop-blur-xs w-24">
                          CR
                        </th>
                      </>
                    )}
                    {showClosing && (
                      <>
                        <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider bg-muted/90 backdrop-blur-xs w-24">
                          DR
                        </th>
                        <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs tracking-wider bg-muted/90 backdrop-blur-xs w-24">
                          CR
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={totalCols}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No accounts matching filters to display
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td
                            colSpan={totalCols}
                            style={{ height: `${paddingTop}px` }}
                          />
                        </tr>
                      )}
                      {virtualRows.map((virtualRow) => {
                        const row = visibleRows[virtualRow.index];
                        if (!row) return null;
                        const hasChildren = parentIdsSet.has(row.id);
                        return (
                          <TrialBalanceRow
                            key={row.id || virtualRow.index}
                            row={row}
                            index={virtualRow.index}
                            showOpening={showOpening}
                            showTransactions={showTransactions}
                            showClosing={showClosing}
                            onToggleCollapse={toggleCollapse}
                            isCollapsed={!!collapsedGroups[row.id]}
                            hasChildren={hasChildren}
                          />
                        );
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td
                            colSpan={totalCols}
                            style={{ height: `${paddingBottom}px` }}
                          />
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 z-20 bg-muted/95 backdrop-blur-xs border-t-2 dark:border-border shadow-xs">
                  <tr className="bg-muted/90 border-t-2 dark:border-border font-bold text-sm">
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right uppercase tracking-wider border-r"
                    >
                      Grand Total
                    </td>
                    {showOpening && (
                      <>
                        <td className="px-4 py-3 text-right font-mono">
                          {fmt(data?.totalOpeningDebit ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono border-r">
                          {fmt(data?.totalOpeningCredit ?? 0)}
                        </td>
                      </>
                    )}
                    {showTransactions && (
                      <>
                        <td className="px-4 py-3 text-right font-mono">
                          {fmt(data?.totalTransactionDebit ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono border-r">
                          {fmt(data?.totalTransactionCredit ?? 0)}
                        </td>
                      </>
                    )}
                    {showClosing && (
                      <>
                        <td className="px-4 py-3 text-right font-mono">
                          {fmt(data?.totalClosingDebit ?? data?.totalDebit ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {fmt(
                            data?.totalClosingCredit ?? data?.totalCredit ?? 0,
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Print styles ── */}
      <style jsx global>{`
        @media print {
          body {
            visibility: hidden;
          }
          #tb-print-section {
            visibility: visible;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
          }
          #tb-print-section * {
            visibility: visible;
          }
          @page {
            margin: 15mm;
            size: A4 ${reportType === "DETAILED" ? "landscape" : "portrait"};
          }
          header,
          nav,
          footer,
          aside,
          .print\\:hidden {
            display: none !important;
          }
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
