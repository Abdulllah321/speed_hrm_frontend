"use client";

import React, { useState, useMemo } from "react";
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

function TreeTableRow({
    node,
    depth = 0,
    searchQuery,
}: {
    node: TreeNode;
    depth?: number;
    searchQuery: string;
}) {
    const [collapsed, setCollapsed] = useState(false);

    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = depth * 20 + 12;

    let displayLabel = node.value;
    if (node.sku && node.articleName) {
        displayLabel = `[${node.sku}] ${node.articleName}`;
    }

    const isSubtotalRow = depth < 3;
    const isArticleOrVariant = node.level === "article" || node.level === "variant";

    return (
        <>
            <tr
                className={cn(
                    "border-b border-border/50 text-xs transition-colors hover:bg-muted/40",
                    isSubtotalRow
                        ? "bg-muted/20 font-semibold"
                        : "bg-background",
                    depth === 0 && "font-bold bg-muted/30"
                )}
            >
                <td style={{ paddingLeft: `${paddingLeft}px` }} className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={() => setCollapsed((c) => !c)}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                            >
                                {collapsed ? (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                )}
                            </button>
                        ) : (
                            <span className="w-4" />
                        )}

                        {depth === 0 ? (
                            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : isArticleOrVariant ? (
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                            <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}

                        <span className="truncate max-w-md">{highlight(displayLabel, searchQuery)}</span>
                    </div>
                </td>

                <td className="py-2 px-3 text-center text-muted-foreground">{node.size || "-"}</td>
                <td className="py-2 px-3 text-center text-muted-foreground">{node.color || "-"}</td>

                <td className={cn("py-2 px-3 text-right font-medium", node.totals.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {node.totals.quantity.toLocaleString()}
                </td>

                <td className={cn("py-2 px-3 text-right font-medium", node.totals.transit > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                    {node.totals.transit.toLocaleString()}
                </td>

                <td className={cn("py-2 px-3 text-right font-medium", node.totals.reserved > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground")}>
                    {node.totals.reserved.toLocaleString()}
                </td>

                <td className="py-2 px-3 text-right font-bold text-foreground">
                    {node.totals.total.toLocaleString()}
                </td>

                <td className="py-2 px-3 text-right text-muted-foreground">
                    {node.totals.unitPrice ? formatCurrency(node.totals.unitPrice) : "-"}
                </td>

                <td className="py-2 px-3 text-right font-semibold text-foreground">
                    {formatCurrency(node.totals.value)}
                </td>
            </tr>

            {!collapsed &&
                hasChildren &&
                node.children.map((child, idx) => (
                    <TreeTableRow
                        key={`${child.level}_${child.value}_${idx}`}
                        node={child}
                        depth={depth + 1}
                        searchQuery={searchQuery}
                    />
                ))}
        </>
    );
}

export function AvailableStockTable({ treeData, grandTotals, searchQuery, isLoading }: TableProps) {
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

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                    <tbody>
                        {treeData.map((rootNode, idx) => (
                            <TreeTableRow
                                key={`${rootNode.level}_${rootNode.value}_${idx}`}
                                node={rootNode}
                                depth={0}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-border bg-muted/80 text-xs font-bold text-foreground">
                            <td className="py-3 px-4" colSpan={3}>
                                GRAND TOTAL
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                                {grandTotals.quantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">
                                {grandTotals.transit.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-purple-600 dark:text-purple-400">
                                {grandTotals.reserved.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-cyan-600 dark:text-cyan-400">
                                {grandTotals.total.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right"></td>
                            <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(grandTotals.value)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
