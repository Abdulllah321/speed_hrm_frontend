"use client";

import React, { useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FlatItemRecord, TransactionTotals } from "./types";
import { Package, ChevronRight, ChevronDown, FileText, Copy, Check, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function highlight(text: string, query: string) {
    if (!text) return <></>;
    const q = query.trim();
    if (!q) return <>{text}</>;

    try {
        const pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        const parts = text.split(pattern);

        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === q.toLowerCase() ? (
                        <mark key={i} className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-sm px-0.5 font-semibold">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    } catch {
        return <>{text}</>;
    }
}

interface TableProps {
    filteredItems: FlatItemRecord[];
    grandTotals: TransactionTotals;
    searchQuery: string;
    isLoading: boolean;
}

export function StockTransactionDetailTable({
    filteredItems,
    grandTotals,
    searchQuery,
    isLoading,
}: TableProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
    const [copiedRef, setCopiedRef] = useState<string | null>(null);

    const toggleExpand = (key: string) => {
        const next = new Set(expandedItemIds);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setExpandedItemIds(next);
    };

    const handleCopy = (refText: string) => {
        if (!refText || refText === "-") return;
        navigator.clipboard.writeText(refText);
        setCopiedRef(refText);
        setTimeout(() => setCopiedRef(null), 2000);
    };

    // Standardized Virtualizer matching overall-available-reserved-table setup
    const rowVirtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const item = filteredItems[index];
            const key = item.itemId || `${item.sku}-${index}`;
            const isExpanded = expandedItemIds.has(key);
            if (!isExpanded) return 44;
            const txCount = item.transactions?.length || 0;
            return 44 + 52 + (txCount * 36);
        },
        overscan: 15,
    });

    const getDocBadgeClass = (docType: string) => {
        const dt = docType.toLowerCase();
        if (dt.includes("in") || dt.includes("rir") || dt.includes("received") || dt.includes("receipt")) {
            return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        }
        if (dt.includes("sale retail")) {
            return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
        }
        if (dt.includes("exchange") || dt.includes("return")) {
            return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        }
        if (dt.includes("void") || dt.includes("refund")) {
            return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
        }
        if (dt.includes("transit")) {
            return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
        }
        if (dt.includes("adjustment")) {
            return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
        }
        return "bg-muted text-muted-foreground border-border/50";
    };

    if (isLoading) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground animate-pulse">
                    <Package className="h-5 w-5 animate-spin text-primary" />
                    Loading stock transaction detail movement data...
                </div>
            </div>
        );
    }

    if (!filteredItems || filteredItems.length === 0) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card shadow-sm">
                <p className="text-sm font-semibold text-muted-foreground">No stock transaction records found matching current filters.</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div
                ref={parentRef}
                className="max-h-[680px] overflow-x-auto overflow-y-auto relative scrollbar-thin scrollbar-thumb-border"
            >
                <div className="inline-block min-w-full align-middle">
                    {/* Header Row */}
                    <div className="sticky top-0 z-20 border-b border-border bg-muted/95 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm flex items-center h-10 px-3 whitespace-nowrap">
                        <div className="w-8 shrink-0"></div>
                        <div className="w-28 shrink-0 pr-2">Brand</div>
                        <div className="w-28 shrink-0 pr-2">Division</div>
                        <div className="w-28 shrink-0 pr-2">Category</div>
                        <div className="w-24 shrink-0 pr-2">Gender</div>
                        <div className="w-24 shrink-0 pr-2">Silhouette</div>
                        <div className="w-28 shrink-0 pr-2">SKU</div>
                        <div className="w-48 shrink-0 pr-2">Article Name</div>
                        <div className="w-16 text-center shrink-0">Size</div>
                        <div className="w-24 text-center shrink-0">Color</div>
                        <div className="w-32 text-center shrink-0">Barcode</div>
                        <div className="w-24 text-right shrink-0">Opening (B/F)</div>
                        <div className="w-20 text-right shrink-0">In (+)</div>
                        <div className="w-20 text-right shrink-0">Out (-)</div>
                        <div className="w-20 text-right shrink-0">Transit</div>
                        <div className="w-28 text-right shrink-0">Closing Bal</div>
                    </div>

                    {/* Virtualized Body */}
                    <div
                        className="w-full relative"
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const idx = virtualRow.index;
                            const item = filteredItems[idx];
                            const itemKey = item.itemId || `${item.sku}-${idx}`;
                            const isExpanded = expandedItemIds.has(itemKey);
                            const txCount = item.transactions?.length || 0;
                            const bgStyle = idx % 2 === 0 ? "bg-background" : "bg-muted/15";

                            return (
                                <div
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                    className="absolute top-0 left-0 w-full flex flex-col border-b border-border/40"
                                    style={{
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {/* Main Product Row */}
                                    <div
                                        onClick={() => toggleExpand(itemKey)}
                                        className={cn(
                                            "text-xs transition-colors hover:bg-muted/60 flex items-center px-3 py-2.5 whitespace-nowrap cursor-pointer select-none h-[44px]",
                                            bgStyle,
                                            isExpanded && "bg-muted/70 font-medium"
                                        )}
                                    >
                                        {/* Expand Toggle */}
                                        <div className="w-8 shrink-0 flex items-center justify-center text-muted-foreground">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-primary" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </div>

                                        <div className="w-28 shrink-0 pr-2 truncate font-medium">{highlight(item.brand || "-", searchQuery)}</div>
                                        <div className="w-28 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.division || "-", searchQuery)}</div>
                                        <div className="w-28 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.category || "-", searchQuery)}</div>
                                        <div className="w-24 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.gender || "-", searchQuery)}</div>
                                        <div className="w-24 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.silhouette || "-", searchQuery)}</div>
                                        <div className="w-28 shrink-0 pr-2 truncate font-mono font-medium text-foreground">{highlight(item.sku || "-", searchQuery)}</div>
                                        <div className="w-48 shrink-0 pr-2 truncate font-semibold text-foreground" title={item.articleName}>{highlight(item.articleName || "-", searchQuery)}</div>

                                        {/* Size */}
                                        <div className="w-16 text-center shrink-0">
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-muted text-[11px] font-bold text-foreground border border-border/50">
                                                {item.size || "-"}
                                            </span>
                                        </div>

                                        {/* Color */}
                                        <div className="w-24 text-center shrink-0 px-1 truncate">
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-secondary/80 text-[11px] font-medium text-secondary-foreground border border-border/60 truncate max-w-[85px]">
                                                {highlight(item.color || "-", searchQuery)}
                                            </span>
                                        </div>

                                        {/* Barcode */}
                                        <div className="w-32 text-center shrink-0 font-mono font-bold text-primary truncate">
                                            {highlight(item.barCode || "-", searchQuery)}
                                        </div>

                                        {/* B/F Opening */}
                                        <div className="w-24 text-right shrink-0 text-muted-foreground">
                                            {item.openingBalance.toLocaleString()}
                                        </div>

                                        {/* In Qty */}
                                        <div className={cn("w-20 text-right shrink-0 font-semibold", item.inQty > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                            {item.inQty > 0 ? `+${item.inQty.toLocaleString()}` : "0"}
                                        </div>

                                        {/* Out Qty */}
                                        <div className={cn("w-20 text-right shrink-0 font-semibold", item.outQty > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                                            {item.outQty > 0 ? `-${item.outQty.toLocaleString()}` : "0"}
                                        </div>

                                        {/* Transit */}
                                        <div className={cn("w-20 text-right shrink-0 font-medium", item.inTransitQty > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                                            {item.inTransitQty.toLocaleString()}
                                        </div>

                                        {/* Closing Balance */}
                                        <div className="w-28 text-right shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
                                            {item.closingBalance.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Expanded Transaction History Drawer */}
                                    {isExpanded && (
                                        <div className="p-3.5 bg-muted/20 border-t border-border/60 space-y-2 animate-in fade-in-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span>Transaction Ledger History for {item.sku} ({item.articleName})</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                                                        {txCount} Movements
                                                    </span>
                                                </div>
                                            </div>

                                            {txCount === 0 ? (
                                                <p className="text-xs text-muted-foreground py-2 text-center italic">
                                                    No movement transactions recorded for this item in selected date range.
                                                </p>
                                            ) : (
                                                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-muted/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                                                            <tr>
                                                                <th className="py-2 px-3">Date & Time</th>
                                                                <th className="py-2 px-3">Doc Type</th>
                                                                <th className="py-2 px-3">Doc Reference #</th>
                                                                <th className="py-2 px-3">Remarks / Description</th>
                                                                <th className="py-2 px-3 text-right">In (+)</th>
                                                                <th className="py-2 px-3 text-right">Out (-)</th>
                                                                <th className="py-2 px-3 text-right">Running Balance</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/40 font-mono">
                                                            {item.transactions.map((tx, txIdx) => (
                                                                <tr key={tx.id || txIdx} className="hover:bg-muted/40 transition-colors h-[36px]">
                                                                    <td className="py-1.5 px-3 text-muted-foreground whitespace-nowrap">
                                                                        {tx.date ? format(new Date(tx.date), "yyyy-MM-dd HH:mm") : "-"}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 whitespace-nowrap">
                                                                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border", getDocBadgeClass(tx.docType))}>
                                                                            {tx.docType}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-1.5 px-3 font-bold text-foreground whitespace-nowrap">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span>{highlight(tx.docRef || "-", searchQuery)}</span>
                                                                            {tx.docRef && tx.docRef !== "-" && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleCopy(tx.docRef)}
                                                                                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                                                                    title="Copy Reference Number"
                                                                                >
                                                                                    {copiedRef === tx.docRef ? (
                                                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                                                    ) : (
                                                                                        <Copy className="h-3 w-3" />
                                                                                    )}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 px-3 font-sans text-muted-foreground">
                                                                        {highlight(tx.remarks || "-", searchQuery)}
                                                                    </td>
                                                                    <td className={cn("py-1.5 px-3 text-right font-bold", tx.inQty > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40")}>
                                                                        {tx.inQty > 0 ? `+${tx.inQty}` : "-"}
                                                                    </td>
                                                                    <td className={cn("py-1.5 px-3 text-right font-bold", tx.outQty > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground/40")}>
                                                                        {tx.outQty > 0 ? `-${tx.outQty}` : "-"}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                                        {tx.runningBalance?.toLocaleString() ?? "-"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Sticky Grand Totals Footer */}
                    <div className="sticky bottom-0 z-20 border-t-2 border-border bg-muted/95 backdrop-blur-md px-3 h-11 text-xs font-bold text-foreground shadow-lg flex items-center whitespace-nowrap">
                        <div className="w-8 shrink-0"></div>
                        <div className="w-28 shrink-0 uppercase tracking-wider text-muted-foreground">GRAND TOTAL</div>
                        <div className="w-28 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-28 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-24 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-24 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-28 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-48 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-16 text-center text-muted-foreground/40">-</div>
                        <div className="w-24 text-center text-muted-foreground/40">-</div>
                        <div className="w-32 text-center text-muted-foreground/40">-</div>

                        <div className="w-24 text-right shrink-0 text-slate-600 dark:text-slate-400">
                            {grandTotals.openingBalance.toLocaleString()}
                        </div>
                        <div className="w-20 text-right shrink-0 text-emerald-600 dark:text-emerald-400">
                            +{grandTotals.totalInQty.toLocaleString()}
                        </div>
                        <div className="w-20 text-right shrink-0 text-rose-600 dark:text-rose-400">
                            -{grandTotals.totalOutQty.toLocaleString()}
                        </div>
                        <div className="w-20 text-right shrink-0 text-amber-600 dark:text-amber-400">
                            {grandTotals.inTransitQty.toLocaleString()}
                        </div>
                        <div className="w-28 text-right shrink-0 text-indigo-600 dark:text-indigo-400 font-bold">
                            {grandTotals.closingBalance.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
