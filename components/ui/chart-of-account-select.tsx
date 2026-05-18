"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, Loader2, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { authFetch } from "@/lib/auth";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";

// ─── Module-level cache ───────────────────────────────────────────────────────
// Shared across all instances so we only fetch once per page load.
let _cachedAccounts: ChartOfAccount[] | null = null;
let _fetchPromise: Promise<ChartOfAccount[]> | null = null;

async function fetchAllAccounts(): Promise<ChartOfAccount[]> {
    if (_cachedAccounts) return _cachedAccounts;
    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = authFetch("/finance/chart-of-accounts", {})
        .then((res) => {
            const data = res.data;
            const accounts: ChartOfAccount[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];
            _cachedAccounts = accounts;
            return accounts;
        })
        .catch(() => {
            _fetchPromise = null;
            return [];
        });

    return _fetchPromise;
}

// ─── Type badge config ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
    ASSET:     { label: "Asset",     className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    LIABILITY: { label: "Liability", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    EQUITY:    { label: "Equity",    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    REVENUE:   { label: "Revenue",   className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    EXPENSE:   { label: "Expense",   className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
};

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ChartOfAccountSelectProps {
    /** Pre-loaded accounts (optional). If omitted, the component fetches them lazily. */
    accounts?: ChartOfAccount[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Only show leaf (non-group) accounts */
    leafOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ChartOfAccountSelect({
    accounts: accountsProp,
    value,
    onValueChange,
    placeholder = "Select Account",
    disabled = false,
    className,
    leafOnly = false,
}: ChartOfAccountSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [accounts, setAccounts] = React.useState<ChartOfAccount[]>(
        accountsProp ?? _cachedAccounts ?? []
    );
    const [isLoading, setIsLoading] = React.useState(false);
    const [search, setSearch] = React.useState("");

    // Lazy-fetch on first open if no accounts provided
    React.useEffect(() => {
        if (accountsProp) {
            setAccounts(accountsProp);
            return;
        }
        if (!open || accounts.length > 0) return;

        setIsLoading(true);
        fetchAllAccounts().then((data) => {
            setAccounts(data);
            setIsLoading(false);
        });
    }, [open, accountsProp, accounts.length]);

    // Sync prop changes
    React.useEffect(() => {
        if (accountsProp) setAccounts(accountsProp);
    }, [accountsProp]);

    // Reset search on close
    React.useEffect(() => {
        if (!open) setSearch("");
    }, [open]);

    // ── Derived state ──────────────────────────────────────────────────────────
    const filtered = React.useMemo(() => {
        let list = leafOnly ? accounts.filter((a) => !a.isGroup) : accounts;
        if (!search.trim()) return list;
        const q = search.trim().toLowerCase();
        return list.filter(
            (a) =>
                a.code.toLowerCase().includes(q) ||
                a.name.toLowerCase().includes(q) ||
                a.type.toLowerCase().includes(q)
        );
    }, [accounts, search, leafOnly]);

    const grouped = React.useMemo(() => {
        const map = new Map<string, ChartOfAccount[]>();
        for (const acc of filtered) {
            const type = acc.type ?? "OTHER";
            if (!map.has(type)) map.set(type, []);
            map.get(type)!.push(acc);
        }
        // Sort groups by canonical order
        return TYPE_ORDER.filter((t) => map.has(t))
            .map((t) => ({ type: t, items: map.get(t)! }))
            .concat(
                [...map.entries()]
                    .filter(([t]) => !TYPE_ORDER.includes(t))
                    .map(([t, items]) => ({ type: t, items }))
            );
    }, [filtered]);

    const selectedAccount = React.useMemo(
        () => accounts.find((a) => a.id === value),
        [accounts, value]
    );

    const displayLabel = selectedAccount
        ? `${selectedAccount.code} - ${selectedAccount.name}`
        : null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    disabled={disabled}
                    className={cn(
                        "flex items-center w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-normal cursor-pointer select-none text-left",
                        "hover:bg-accent hover:text-accent-foreground transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        open && "ring-2 ring-ring/20",
                        disabled && "pointer-events-none opacity-50",
                        className
                    )}
                >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-2" />
                    <span className={cn("flex-1 min-w-0 truncate", !displayLabel && "text-muted-foreground")}>
                        {displayLabel ?? placeholder}
                    </span>
                    {selectedAccount && (
                        <span
                            className={cn(
                                "ml-2 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                TYPE_CONFIG[selectedAccount.type]?.className ?? "bg-muted text-muted-foreground"
                            )}
                        >
                            {TYPE_CONFIG[selectedAccount.type]?.label ?? selectedAccount.type}
                        </span>
                    )}
                    <ChevronDownIcon
                        className={cn(
                            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            open && "rotate-180"
                        )}
                    />
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="w-(--radix-popover-trigger-width) min-w-80 p-0"
                align="start"
                sideOffset={4}
            >
                <Command shouldFilter={false} className="rounded-lg">
                    <div className="flex items-center border-b px-3 gap-2">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search by code or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <CommandList className="max-h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8 gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Loading accounts...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                No accounts found.
                            </CommandEmpty>
                        ) : (
                            grouped.map(({ type, items }) => {
                                const cfg = TYPE_CONFIG[type];
                                return (
                                    <CommandGroup
                                        key={type}
                                        heading={
                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1 py-0.5 rounded", cfg?.className)}>
                                                {cfg?.label ?? type} ({items.length})
                                            </span>
                                        }
                                        className="p-1"
                                    >
                                        {items.map((acc) => {
                                            const isSelected = value === acc.id;
                                            return (
                                                <CommandItem
                                                    key={acc.id}
                                                    value={acc.id}
                                                    onSelect={() => {
                                                        onValueChange?.(isSelected ? "" : acc.id);
                                                        setOpen(false);
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer",
                                                        isSelected && "bg-accent",
                                                        acc.isGroup && "opacity-60 italic"
                                                    )}
                                                    disabled={acc.isGroup && leafOnly}
                                                >
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                                                {acc.code}
                                                            </span>
                                                            <span className={cn("text-sm truncate", isSelected && "font-medium")}>
                                                                {acc.name}
                                                            </span>
                                                        </div>
                                                        {acc.isGroup && (
                                                            <span className="text-[10px] text-muted-foreground">Group account</span>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                                                    )}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                );
                            })
                        )}
                    </CommandList>

                    {!isLoading && accounts.length > 0 && (
                        <div className="border-t px-3 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                                {filtered.length} of {accounts.length} accounts
                            </span>
                            {value && (
                                <button
                                    type="button"
                                    onClick={() => { onValueChange?.(""); setOpen(false); }}
                                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}
