"use client";

import React, { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TreeNode, StockTotals } from "./types";
import { ChevronRight, ChevronDown, Folder, Package, Layers } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Highlight helper ──────────────────────────────────────────────────────────
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
    treeData: TreeNode[];
    grandTotals: StockTotals;
    searchQuery: string;
    isLoading: boolean;
}

interface FlatRowItem {
    id: string;
    node: TreeNode;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
}

export function AvailableStockTable({ treeData, grandTotals, searchQuery, isLoading }: TableProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

    const toggleCollapse = (key: string) => {
        setCollapsedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Flatten visible tree nodes dynamically for TanStack Virtualizer
    const flatVisibleRows = useMemo(() => {
        const rows: FlatRowItem[] = [];

        function traverse(nodes: TreeNode[], depth: number = 0, parentKey: string = "root") {
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const nodeKey = `${parentKey}_${node.level}_${node.value}_${i}`;
                const hasChildren = Boolean(node.children && node.children.length > 0);
                const isCollapsed = collapsedKeys.has(nodeKey);

                rows.push({
                    id: nodeKey,
                    node,
                    depth,
                    hasChildren,
                    isExpanded: !isCollapsed,
                });

                if (hasChildren && !isCollapsed) {
                    traverse(node.children, depth + 1, nodeKey);
                }
            }
        }

        traverse(treeData, 0, "root");
        return rows;
    }, [treeData, collapsedKeys]);

    const rowVirtualizer = useVirtualizer({
        count: flatVisibleRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 38,
        overscan: 25,
    });

    if (isLoading) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground animate-pulse">
                    <Package className="h-5 w-5 animate-spin text-primary" />
                    Loading available stock data...
                </div>
            </div>
        );
    }

    if (!treeData || treeData.length === 0) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card">
                <p className="text-sm font-semibold text-muted-foreground">No available stock items found matching current filters.</p>
            </div>
        );
    }

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div
                ref={parentRef}
                className="max-h-[680px] overflow-y-auto relative scrollbar-thin scrollbar-thumb-border"
            >
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-20 border-b border-border bg-muted/90 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
                        <tr>
                            <th className="py-3 px-4 min-w-[280px]">GPC / Category / Product</th>
                            <th className="py-3 px-3 text-center w-20">Size</th>
                            <th className="py-3 px-3 text-center w-24">Color</th>
                            <th className="py-3 px-3 text-right w-28">Available Qty</th>
                            <th className="py-3 px-3 text-right w-24">In Transit</th>
                            <th className="py-3 px-3 text-right w-28">Reserved</th>
                            <th className="py-3 px-3 text-right w-28">Total Balance</th>
                            <th className="py-3 px-3 text-right w-32">Selling Price</th>
                            <th className="py-3 px-3 text-right w-36">Selling Value</th>
                        </tr>
                    </thead>
                    <tbody
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            position: "relative",
                        }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const row = flatVisibleRows[virtualRow.index];
                            const { node, depth, hasChildren, isExpanded, id } = row;
                            const paddingLeft = depth * 20 + 12;

                            let displayLabel = node.value;
                            if (node.sku && node.articleName) {
                                displayLabel = `[${node.sku}] ${node.articleName}`;
                            }

                            const isSubtotalRow = depth < 3;
                            const isArticleOrVariant = node.level === "article" || node.level === "variant";

                            return (
                                <tr
                                    key={id}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={cn(
                                        "border-b border-border/40 text-xs transition-colors hover:bg-muted/50 flex items-center",
                                        isSubtotalRow
                                            ? "bg-muted/20 font-semibold"
                                            : "bg-background",
                                        depth === 0 && "font-bold bg-muted/30"
                                    )}
                                >
                                    <td
                                        style={{ paddingLeft: `${paddingLeft}px` }}
                                        className="py-1.5 pr-3 min-w-[280px] flex-1 truncate"
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            {hasChildren ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCollapse(id)}
                                                    className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="w-4 shrink-0" />
                                            )}

                                            {depth === 0 ? (
                                                <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                                            ) : isArticleOrVariant ? (
                                                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            ) : (
                                                <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            )}

                                            <span className="truncate">{highlight(displayLabel, searchQuery)}</span>
                                        </div>
                                    </td>

                                    <td className="py-1.5 px-3 text-center text-muted-foreground w-20 shrink-0">
                                        {node.size || "-"}
                                    </td>

                                    <td className="py-1.5 px-3 text-center text-muted-foreground w-24 shrink-0">
                                        {node.color || "-"}
                                    </td>

                                    <td
                                        className={cn(
                                            "py-1.5 px-3 text-right font-medium w-28 shrink-0",
                                            node.totals.quantity > 0
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {node.totals.quantity.toLocaleString()}
                                    </td>

                                    <td
                                        className={cn(
                                            "py-1.5 px-3 text-right font-medium w-24 shrink-0",
                                            node.totals.transit > 0
                                                ? "text-amber-600 dark:text-amber-400"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {node.totals.transit.toLocaleString()}
                                    </td>

                                    <td
                                        className={cn(
                                            "py-1.5 px-3 text-right font-medium w-28 shrink-0",
                                            node.totals.reserved > 0
                                                ? "text-purple-600 dark:text-purple-400"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {node.totals.reserved.toLocaleString()}
                                    </td>

                                    <td className="py-1.5 px-3 text-right font-bold text-foreground w-28 shrink-0">
                                        {node.totals.total.toLocaleString()}
                                    </td>

                                    <td className="py-1.5 px-3 text-right text-muted-foreground w-32 shrink-0">
                                        {node.totals.unitPrice ? formatCurrency(node.totals.unitPrice) : "-"}
                                    </td>

                                    <td className="py-1.5 px-3 text-right font-semibold text-foreground w-36 shrink-0">
                                        {formatCurrency(node.totals.value)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Sticky Grand Totals Footer */}
            <div className="border-t-2 border-border bg-muted/90 backdrop-blur-md px-4 py-3 text-xs font-bold text-foreground shadow-inner flex items-center justify-between">
                <div className="min-w-[280px]">GRAND TOTAL</div>
                <div className="flex items-center gap-0 text-right">
                    <div className="w-20 text-center">-</div>
                    <div className="w-24 text-center">-</div>
                    <div className="w-28 text-emerald-600 dark:text-emerald-400">
                        {grandTotals.quantity.toLocaleString()}
                    </div>
                    <div className="w-24 text-amber-600 dark:text-amber-400">
                        {grandTotals.transit.toLocaleString()}
                    </div>
                    <div className="w-28 text-purple-600 dark:text-purple-400">
                        {grandTotals.reserved.toLocaleString()}
                    </div>
                    <div className="w-28 text-cyan-600 dark:text-cyan-400">
                        {grandTotals.total.toLocaleString()}
                    </div>
                    <div className="w-32"></div>
                    <div className="w-36 text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(grandTotals.value)}
                    </div>
                </div>
            </div>
        </div>
    );
}
