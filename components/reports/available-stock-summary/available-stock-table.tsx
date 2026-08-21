"use client";

import React, { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TreeNode, StockTotals } from "./types";
import { ChevronRight, ChevronDown, Folder, Package, Layers, Tag, QrCode } from "lucide-react";
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
        estimateSize: () => 44,
        overscan: 25,
    });

    if (isLoading) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground animate-pulse">
                    <Package className="h-5 w-5 animate-spin text-primary" />
                    Loading available stock data...
                </div>
            </div>
        );
    }

    if (!treeData || treeData.length === 0) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card shadow-sm">
                <p className="text-sm font-semibold text-muted-foreground">No available stock items found matching current filters.</p>
            </div>
        );
    }

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div
                ref={parentRef}
                className="max-h-[680px] overflow-y-auto relative scrollbar-thin scrollbar-thumb-border"
            >
                <div className="min-w-[1100px]">
                    {/* Header Row */}
                    <div className="sticky top-0 z-20 border-b border-border bg-muted/95 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm flex items-center h-10 px-4">
                        <div className="flex-1 min-w-[340px] pr-3">GPC / Category / Product / Barcode</div>
                        <div className="w-20 text-center shrink-0">Size</div>
                        <div className="w-44 text-center shrink-0">Color</div>
                        <div className="w-28 text-right shrink-0">Available Qty</div>
                        <div className="w-24 text-right shrink-0">In Transit</div>
                        <div className="w-28 text-right shrink-0">Reserved</div>
                        <div className="w-28 text-right shrink-0">Total Balance</div>
                        <div className="w-32 text-right shrink-0">Selling Price</div>
                        <div className="w-36 text-right shrink-0">Selling Value</div>
                    </div>

                    {/* Virtualized Body Container */}
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            position: "relative",
                        }}
                        className="w-full"
                    >
                        {virtualItems.map((virtualRow) => {
                            const row = flatVisibleRows[virtualRow.index];
                            const { node, depth, hasChildren, isExpanded, id } = row;
                            const paddingLeft = depth * 20 + 12;

                            let displayLabel = node.value;
                            if (node.sku && node.articleName) {
                                displayLabel = `[${node.sku}] ${node.articleName}`;
                            } else if (node.level === "variant" && node.barCode) {
                                displayLabel = `[${node.barCode}] ${node.color || "Default"}-${node.size || "Default"}`;
                            }

                            const isSubtotalRow = depth < 3;
                            const isArticle = node.level === "article";
                            const isVariant = node.level === "variant";

                            return (
                                <div
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
                                        "border-b border-border/40 text-xs transition-colors hover:bg-muted/50 flex items-center px-4 whitespace-nowrap",
                                        isSubtotalRow
                                            ? "bg-muted/20 font-semibold text-foreground"
                                            : "bg-background text-foreground/90",
                                        depth === 0 && "font-bold bg-muted/40 text-foreground"
                                    )}
                                >
                                    {/* Column 1: Node Label & Hierarchy Tree */}
                                    <div
                                        style={{ paddingLeft: `${paddingLeft}px` }}
                                        className="flex-1 min-w-[340px] pr-3 flex items-center gap-1.5 truncate"
                                    >
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                onClick={() => toggleCollapse(id)}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0 transition-colors"
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
                                        ) : isVariant ? (
                                            <QrCode className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                        ) : isArticle ? (
                                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        ) : (
                                            <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        )}

                                        <span className="truncate max-w-[450px]" title={displayLabel}>
                                            {highlight(displayLabel, searchQuery)}
                                        </span>
                                    </div>

                                    {/* Column 2: Size Badge */}
                                    <div className="w-20 text-center shrink-0 flex items-center justify-center">
                                        {node.size ? (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-foreground border border-border/50">
                                                {node.size}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/60">-</span>
                                        )}
                                    </div>

                                    {/* Column 3: Color Pill Badge */}
                                    <div className="w-44 text-center shrink-0 flex items-center justify-center px-1">
                                        {node.color ? (
                                            <span
                                                title={node.color}
                                                className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-secondary/80 text-[11px] font-medium text-secondary-foreground border border-border/60 truncate whitespace-nowrap max-w-[160px]"
                                            >
                                                {highlight(node.color, searchQuery)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/60">-</span>
                                        )}
                                    </div>

                                    {/* Column 4: Available Qty */}
                                    <div
                                        className={cn(
                                            "w-28 text-right shrink-0 font-medium",
                                            node.totals.quantity > 0
                                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {node.totals.quantity.toLocaleString()}
                                    </div>

                                    {/* Column 5: In Transit */}
                                    <div
                                        className={cn(
                                            "w-24 text-right shrink-0 font-medium",
                                            node.totals.transit > 0
                                                ? "text-amber-600 dark:text-amber-400 font-semibold"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {node.totals.transit.toLocaleString()}
                                    </div>

                                    {/* Column 6: Stock Reserved */}
                                    <div
                                        className={cn(
                                            "w-28 text-right shrink-0 font-medium",
                                            node.totals.reserved > 0
                                                ? "text-purple-600 dark:text-purple-400 font-semibold"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {node.totals.reserved.toLocaleString()}
                                    </div>

                                    {/* Column 7: Total Balance */}
                                    <div className="w-28 text-right shrink-0 font-bold text-foreground">
                                        {node.totals.total.toLocaleString()}
                                    </div>

                                    {/* Column 8: Selling Price */}
                                    <div className="w-32 text-right shrink-0 text-muted-foreground">
                                        {node.totals.unitPrice ? formatCurrency(node.totals.unitPrice) : "-"}
                                    </div>

                                    {/* Column 9: Selling Value */}
                                    <div className="w-36 text-right shrink-0 font-semibold text-foreground">
                                        {formatCurrency(node.totals.value)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sticky Grand Totals Footer */}
            <div className="border-t-2 border-border bg-muted/95 backdrop-blur-md px-4 h-11 text-xs font-bold text-foreground shadow-inner flex items-center min-w-[1100px]">
                <div className="flex-1 min-w-[340px] uppercase tracking-wider text-muted-foreground">GRAND TOTAL</div>
                <div className="w-20 text-center text-muted-foreground/60">-</div>
                <div className="w-44 text-center text-muted-foreground/60">-</div>
                <div className="w-28 text-right text-emerald-600 dark:text-emerald-400">
                    {grandTotals.quantity.toLocaleString()}
                </div>
                <div className="w-24 text-right text-amber-600 dark:text-amber-400">
                    {grandTotals.transit.toLocaleString()}
                </div>
                <div className="w-28 text-right text-purple-600 dark:text-purple-400">
                    {grandTotals.reserved.toLocaleString()}
                </div>
                <div className="w-28 text-right text-cyan-600 dark:text-cyan-400">
                    {grandTotals.total.toLocaleString()}
                </div>
                <div className="w-32 text-right text-muted-foreground/60">-</div>
                <div className="w-36 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                    {formatCurrency(grandTotals.value)}
                </div>
            </div>
        </div>
    );
}
