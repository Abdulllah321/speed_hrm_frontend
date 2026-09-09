"use client";

import * as React from "react";
import {
  Tag,
  Building2,
  ChevronDownIcon,
  CheckIcon,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { toast } from "sonner";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";

export interface TagSubAccountGroup {
  head: {
    id: string;
    code: string;
    name: string;
    type?: string;
  };
  accounts: ChartOfAccount[];
}

export interface TagAccountSelectProps {
  groups?: TagSubAccountGroup[];
  children?: ChartOfAccount[];
  value?: string[];
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function findInTree(
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

export function TagAccountSelect({
  groups = [],
  children = [],
  value = [],
  onValueChange,
  disabled,
  id,
  placeholder,
  className,
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
            className,
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
