"use client";

import * as React from "react";
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    Loader2,
    Search,
    BookOpen,
    FolderOpen,
    Folder,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth";
import { ChartOfAccount, createChartOfAccount } from "@/lib/actions/chart-of-account";
import { toast } from "sonner";

// ─── Module-level cache ───────────────────────────────────────────────────────
let _cachedTree: ChartOfAccount[] | null = null;
let _fetchPromise: Promise<ChartOfAccount[]> | null = null;

/** Expose the cached tree so consumers can read children without extra fetches. */
export function getSharedTree(): ChartOfAccount[] {
    return _cachedTree ?? [];
}

/** Invalidate the cached tree so that the next select fetch reloads the database. */
export function invalidateCachedTree() {
    _cachedTree = null;
    _fetchPromise = null;
}

async function fetchTree(): Promise<ChartOfAccount[]> {
    if (_cachedTree) return _cachedTree;
    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = authFetch("/finance/chart-of-accounts/tree", {})
        .then((res) => {
            const data = res.data;
            const tree: ChartOfAccount[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];
            _cachedTree = tree;
            return tree;
        })
        .catch(() => {
            _fetchPromise = null;
            return [];
        });

    return _fetchPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Flatten the entire tree into a single array (depth-first). */
function flattenTree(nodes: ChartOfAccount[]): ChartOfAccount[] {
    const result: ChartOfAccount[] = [];
    function walk(list: ChartOfAccount[]) {
        for (const node of list) {
            result.push(node);
            if (node.children?.length) walk(node.children);
        }
    }
    walk(nodes);
    return result;
}

/** Find a node anywhere in the tree by id. */
function findById(nodes: ChartOfAccount[], id: string): ChartOfAccount | undefined {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children?.length) {
            const found = findById(node.children, id);
            if (found) return found;
        }
    }
    return undefined;
}

/** Auto-generate sequential next code under a parent group. */
function generateNextCode(parent: ChartOfAccount, allAccounts: ChartOfAccount[]): string {
    const parentCode = parent.code;
    
    // Find direct children of this parent
    const siblings = allAccounts.filter(acc => acc.parentId === parent.id);
    const codes = siblings.map(s => s.code);
    
    if (codes.length === 0) {
        return parentCode + "0001";
    }
    
    // Extract numeric suffixes
    const numericSuffixes = codes
        .filter(c => c.startsWith(parentCode))
        .map(c => {
            const suffix = c.substring(parentCode.length);
            return { suffix, num: parseInt(suffix, 10) };
        })
        .filter(x => !isNaN(x.num));
        
    if (numericSuffixes.length === 0) {
        return parentCode + "0001";
    }
    
    const maxVal = Math.max(...numericSuffixes.map(x => x.num));
    const nextVal = maxVal + 1;
    
    const padLen = Math.max(...numericSuffixes.map(x => x.suffix.length));
    return parentCode + String(nextVal).padStart(padLen, '0');
}

// ─── Type badge config ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
    ASSET:     { label: "Asset",     className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    LIABILITY: { label: "Liability", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    EQUITY:    { label: "Equity",    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    REVENUE:   { label: "Revenue",   className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    EXPENSE:   { label: "Expense",   className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
};

/** Recursively filter out an account and its descendants from the tree. */
function filterTreeExclude(nodes: ChartOfAccount[], excludeId?: string): ChartOfAccount[] {
    if (!excludeId) return nodes;
    return nodes
        .filter((node) => node.id !== excludeId)
        .map((node) => ({
            ...node,
            children: node.children ? filterTreeExclude(node.children, excludeId) : [],
        }));
}

/** Recursively filter out tag/sub-accounts (children of ledger/non-group accounts) from the tree. */
function filterTreeExcludeTags(nodes: ChartOfAccount[]): ChartOfAccount[] {
    return nodes.map((node) => {
        if (!node.isGroup) {
            return {
                ...node,
                children: [],
            };
        }
        return {
            ...node,
            children: node.children ? filterTreeExcludeTags(node.children) : [],
        };
    });
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ChartOfAccountSelectProps {
    accounts?: ChartOfAccount[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    allowGroups?: boolean;
    groupsOnly?: boolean;
    excludeAccountId?: string;
    excludeTags?: boolean;
    id?: string;
    mode?: "popover" | "modal";
}

// ─── Tree row ─────────────────────────────────────────────────────────────────
interface TreeRowProps {
    node: ChartOfAccount;
    depth: number;
    expanded: Set<string>;
    onToggle: (id: string) => void;
    selectedId?: string;
    onSelect: (id: string) => void;
    allowGroups?: boolean;
    groupsOnly?: boolean;
}

function TreeRow({
    node,
    depth,
    expanded,
    onToggle,
    selectedId,
    onSelect,
    allowGroups = false,
    groupsOnly = false,
}: TreeRowProps) {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = (node.children?.length ?? 0) > 0;

    const isSelectable = groupsOnly
        ? node.isGroup
        : (allowGroups ? true : !node.isGroup);
    const isInteractive = isSelectable || hasChildren;

    return (
        <>
            <CommandItem
                value={node.id}
                onSelect={() => {
                    if (isSelectable) {
                        onSelect(node.id);
                    } else if (node.isGroup) {
                        onToggle(node.id);
                    }
                }}
                disabled={!isInteractive}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                className={cn(
                    "flex items-center gap-2 py-1.5 pr-3 rounded-md select-none text-sm cursor-pointer",
                    node.isGroup && "text-muted-foreground font-semibold"
                )}
            >
                {/* Expand / collapse chevron */}
                <span
                    onClick={(e) => {
                        if (hasChildren) {
                            e.stopPropagation();
                            onToggle(node.id);
                        }
                    }}
                    className={cn(
                        "shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors",
                        hasChildren ? "cursor-pointer hover:bg-accent-foreground/10" : "pointer-events-none opacity-0"
                    )}
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                        )
                    ) : null}
                </span>

                {/* Icon */}
                {node.isGroup ? (
                    isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )
                ) : (
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}

                {/* Code + name */}
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">{node.code}</span>
                <span className="flex-1 min-w-0 truncate">{node.name}</span>

                {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-primary ml-auto" />}
            </CommandItem>

            {/* Children — rendered when expanded */}
            {isExpanded && node.children?.map((child) => (
                <TreeRow
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    expanded={expanded}
                    onToggle={onToggle}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    allowGroups={allowGroups}
                    groupsOnly={groupsOnly}
                />
            ))}
        </>
    );
}

// ─── Build breadcrumb map ─────────────────────────────────────────────────────
function buildBreadcrumbs(
    nodes: ChartOfAccount[],
    parentPath = ""
): Map<string, string> {
    const map = new Map<string, string>();
    for (const node of nodes) {
        const path = parentPath ? `${parentPath} › ${node.name}` : node.name;
        map.set(node.id, parentPath); // store parent path (not self)
        if (node.children?.length) {
            const childMap = buildBreadcrumbs(node.children, path);
            childMap.forEach((v, k) => map.set(k, v));
        }
    }
    return map;
}

// ─── Inline Create Account Dialog ─────────────────────────────────────────────
interface CreateAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allFlat: ChartOfAccount[];
    onCreated: (newAccount: ChartOfAccount) => void;
}

function CreateAccountDialog({ open, onOpenChange, allFlat, onCreated }: CreateAccountDialogProps) {
    const [parentId, setParentId] = React.useState<string>("");
    const [name, setName] = React.useState<string>("");
    const [code, setCode] = React.useState<string>("");
    const [type, setType] = React.useState<string>("");
    const [isGroup, setIsGroup] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const groups = React.useMemo(() => allFlat.filter(a => a.isGroup), [allFlat]);

    const handleParentChange = (val: string) => {
        setParentId(val);
        const parent = allFlat.find(a => a.id === val);
        if (parent) {
            setType(parent.type);
            setCode(generateNextCode(parent, allFlat));
        } else {
            setType("");
            setCode("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !code || !type) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                code,
                name,
                type,
                parentId: parentId || null,
                isGroup,
                isActive: true
            };
            const result = await createChartOfAccount(payload);
            if (result.status && result.data) {
                toast.success(result.message || "Ledger created successfully!");
                onCreated(result.data);
                onOpenChange(false);
                // Reset form
                setParentId("");
                setName("");
                setCode("");
                setType("");
                setIsGroup(false);
            } else {
                toast.error(result.message || "Failed to create ledger.");
            }
        } catch (error) {
            toast.error("An error occurred while creating ledger.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Ledger</DialogTitle>
                    <DialogDescription>
                        Create a new account directly in the chart of accounts.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label>Parent Account Group</Label>
                        <Select value={parentId} onValueChange={handleParentChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Parent Group" />
                            </SelectTrigger>
                            <SelectContent className="max-h-52">
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>
                                        {g.code} - {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Account Type</Label>
                            <Input value={type} readOnly disabled className="bg-muted font-mono" />
                        </div>
                        <div className="space-y-1">
                            <Label>Account Code *</Label>
                            <Input value={code} onChange={e => setCode(e.target.value)} required placeholder="e.g. 10010001" className="font-mono" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Account Name *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Cash in Hand" autoFocus />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Create Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export const ChartOfAccountSelect = React.forwardRef<HTMLButtonElement, ChartOfAccountSelectProps>(
    function ChartOfAccountSelect(
        {
            accounts: accountsProp,
            value,
            onValueChange,
            placeholder = "Select Account",
            disabled = false,
            className,
            allowGroups = false,
            groupsOnly = false,
            excludeAccountId,
            excludeTags = false,
            id,
            mode = "popover",
        },
        ref
    ) {
        const [open, setOpen] = React.useState(false);
        const [tree, setTree] = React.useState<ChartOfAccount[]>(
            accountsProp ?? _cachedTree ?? []
        );
        const [isLoading, setIsLoading] = React.useState(false);
        const [search, setSearch] = React.useState("");
        const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
        const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
        const [activeTab, setActiveTab] = React.useState<string>("all");

        // Lazy-fetch on first open OR if value is set
        React.useEffect(() => {
            if (accountsProp) {
                setTree(accountsProp);
                return;
            }
            if ((!open && !value) || tree.length > 0) return;

            setIsLoading(true);
            fetchTree().then((data) => {
                setTree(data);
                setIsLoading(false);
            });
        }, [open, value, accountsProp, tree.length]);

        // Sync prop changes
        React.useEffect(() => {
            if (accountsProp) setTree(accountsProp);
        }, [accountsProp]);

        // Reset search + collapse on close
        React.useEffect(() => {
            if (!open) {
                setSearch("");
            }
        }, [open]);

        // Bind Alt+C keyboard shortcut when Popover is open
        React.useEffect(() => {
            if (!open) return;
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.altKey && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    setIsCreateDialogOpen(true);
                }
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }, [open]);

        // ── Derived ────────────────────────────────────────────────────────────────
        const baseFilteredTree = React.useMemo(() => {
            let result = filterTreeExclude(tree, excludeAccountId);
            if (excludeTags) {
                result = filterTreeExcludeTags(result);
            }
            return result;
        }, [tree, excludeAccountId, excludeTags]);

        const filteredTree = React.useMemo(() => {
            if (mode === "popover" || activeTab === "all") return baseFilteredTree;
            return baseFilteredTree.filter(node => node.type === activeTab);
        }, [baseFilteredTree, activeTab, mode]);

        const allFlat = React.useMemo(() => flattenTree(baseFilteredTree), [baseFilteredTree]);

        const breadcrumbMap = React.useMemo(() => buildBreadcrumbs(baseFilteredTree), [baseFilteredTree]);

        const baseSearchResults = React.useMemo(() => {
            if (!search.trim()) return [];
            const q = search.trim().toLowerCase();
            return allFlat.filter((a) => {
                if (groupsOnly) {
                    if (!a.isGroup) return false;
                } else if (!allowGroups) {
                    if (a.isGroup) return false;
                }
                return (
                    a.code.toLowerCase().includes(q) ||
                    a.name.toLowerCase().includes(q) ||
                    a.type.toLowerCase().includes(q)
                );
            });
        }, [allFlat, search, groupsOnly, allowGroups]);

        const searchResults = React.useMemo(() => {
            if (mode === "popover" || activeTab === "all") return baseSearchResults;
            return baseSearchResults.filter(a => a.type === activeTab);
        }, [baseSearchResults, activeTab, mode]);

        const selectedAccount = React.useMemo(
            () => (value ? findById(baseFilteredTree, value) : undefined),
            [baseFilteredTree, value]
        );

        const displayLabel = selectedAccount
            ? `${selectedAccount.code} - ${selectedAccount.name}`
            : null;

        // ── Handlers ───────────────────────────────────────────────────────────────
        function toggleExpand(id: string) {
            setExpanded((prev) => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
            });
        }

        function handleSelect(id: string) {
            onValueChange?.(value === id ? "" : id);
            setOpen(false);
        }

        const handleCreated = async (newAcc: ChartOfAccount) => {
            // Invalidate cache
            invalidateCachedTree();
            setIsLoading(true);
            // Refetch
            const data = await fetchTree();
            setTree(data);
            setIsLoading(false);
            // Select new account
            handleSelect(newAcc.id);
        };

        const isSearching = search.trim().length > 0;

        const renderCommandBody = () => (
            <Command shouldFilter={false}>
                {/* Search bar */}
                <CommandInput
                    placeholder="Search by code or name..."
                    value={search}
                    onValueChange={setSearch}
                    autoFocus
                />

                {/* Body */}
                <CommandList className={cn("overflow-y-auto p-1", mode === "modal" ? "max-h-[380px]" : "max-h-80")}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Loading accounts...</span>
                        </div>
                    ) : isSearching ? (
                        /* ── Search mode ── */
                        searchResults.length === 0 ? (
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                No accounts found.
                            </CommandEmpty>
                        ) : (
                            searchResults.map((acc) => (
                                <CommandItem
                                    key={acc.id}
                                    value={acc.id}
                                    onSelect={() => handleSelect(acc.id)}
                                    className="flex items-start gap-2 px-3 py-2 rounded-md cursor-pointer select-none"
                                >
                                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">{acc.code}</span>
                                            <span className={cn("text-sm truncate", value === acc.id && "font-medium")}>{acc.name}</span>
                                            <span className={cn(
                                                "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 self-center",
                                                TYPE_CONFIG[acc.type]?.className || "bg-muted"
                                            )}>
                                                {TYPE_CONFIG[acc.type]?.label || acc.type}
                                            </span>
                                        </div>
                                        {breadcrumbMap.get(acc.id) && (
                                            <span className="text-[10px] text-muted-foreground truncate">{breadcrumbMap.get(acc.id)}</span>
                                        )}
                                    </div>
                                    {value === acc.id && <CheckIcon className="h-4 w-4 shrink-0 text-primary mt-0.5" />}
                                </CommandItem>
                            ))
                        )
                    ) : (
                        /* ── Tree mode ── */
                        filteredTree.length === 0 ? (
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                No accounts available.
                            </CommandEmpty>
                        ) : (
                            filteredTree.map((node) => (
                                <TreeRow
                                    key={node.id}
                                    node={node}
                                    depth={0}
                                    expanded={expanded}
                                    onToggle={toggleExpand}
                                    selectedId={value}
                                    onSelect={handleSelect}
                                    allowGroups={allowGroups}
                                    groupsOnly={groupsOnly}
                                />
                            ))
                        )
                    )}
                </CommandList>

                {/* Create New Account Button */}
                {!isLoading && !groupsOnly && (
                    <div className="border-t p-2 bg-muted/40 flex flex-col gap-1">
                        <button
                            type="button"
                            className="w-full text-xs flex items-center justify-center gap-1.5 h-8 border border-dashed rounded-md bg-background hover:bg-accent text-accent-foreground transition-colors cursor-pointer select-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateDialogOpen(true);
                            }}
                        >
                            <Plus className="h-3.5 w-3.5 text-primary" />
                            <span>Create New Ledger</span>
                            <span className="text-[10px] text-muted-foreground font-mono ml-auto">Alt+C</span>
                        </button>
                    </div>
                )}

                {/* Footer */}
                {!isLoading && allFlat.length > 0 && (
                    <div className="border-t px-3 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                            {isSearching
                                ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`
                                : groupsOnly
                                    ? `${allFlat.filter((a) => a.isGroup).length} groups`
                                    : `${allFlat.filter((a) => !a.isGroup).length} accounts`}
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
        );

        const triggerButton = (
            <button
                id={id}
                ref={ref}
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                disabled={disabled}
                onClick={mode === "modal" ? () => setOpen(true) : undefined}
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
        );

        return (
            <>
                {mode === "popover" ? (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            {triggerButton}
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-(--radix-popover-trigger-width) min-w-80 p-0"
                            align="start"
                            sideOffset={4}
                        >
                            {renderCommandBody()}
                        </PopoverContent>
                    </Popover>
                ) : (
                    <Dialog open={open} onOpenChange={setOpen}>
                        {triggerButton}
                        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0 bg-background border">
                            <DialogHeader className="p-4 pb-2 border-b">
                                <DialogTitle className="text-base font-semibold">Search Chart of Accounts</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Search by code or name. Filter by category tabs for quicker access.
                                </DialogDescription>
                            </DialogHeader>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <div className="px-4 py-2 border-b bg-muted/30">
                                    <TabsList className="grid grid-cols-6 h-8 w-full">
                                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                                        <TabsTrigger value="ASSET" className="text-xs">Assets</TabsTrigger>
                                        <TabsTrigger value="LIABILITY" className="text-xs">Liabilities</TabsTrigger>
                                        <TabsTrigger value="EQUITY" className="text-xs">Equity</TabsTrigger>
                                        <TabsTrigger value="REVENUE" className="text-xs">Revenue</TabsTrigger>
                                        <TabsTrigger value="EXPENSE" className="text-xs">Expenses</TabsTrigger>
                                    </TabsList>
                                </div>
                            </Tabs>
                            {renderCommandBody()}
                        </DialogContent>
                    </Dialog>
                )}

                <CreateAccountDialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                    allFlat={allFlat}
                    onCreated={handleCreated}
                />
            </>
        );
    }
);
