"use client";

import React, { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WholesaleReturnTreeNode, WholesaleReturnTotals } from "./types";
import { ChevronRight, ChevronDown, Folder, Package, Layers, QrCode, FileText, User } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

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
  treeData: WholesaleReturnTreeNode[];
  grandTotals: WholesaleReturnTotals;
  searchQuery: string;
  isLoading: boolean;
}

interface FlatRowItem {
  id: string;
  node: WholesaleReturnTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export function WholesaleReturnTable({ treeData, grandTotals, searchQuery, isLoading }: TableProps) {
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

  const expandAll = () => setCollapsedKeys(new Set());
  const collapseAll = () => {
    const allKeys = new Set<string>();
    function traverse(nodes: WholesaleReturnTreeNode[], parentKey: string = "root") {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const key = `${parentKey}_${node.level}_${node.value}_${i}`;
        if (node.children && node.children.length > 0) {
          allKeys.add(key);
          traverse(node.children, key);
        }
      }
    }
    traverse(treeData, "root");
    setCollapsedKeys(allKeys);
  };

  const flatVisibleRows = useMemo(() => {
    const rows: FlatRowItem[] = [];

    function traverse(nodes: WholesaleReturnTreeNode[], depth: number = 0, parentKey: string = "root") {
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
    estimateSize: () => 40,
    overscan: 25,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 border rounded-2xl bg-background shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          Computing Wholesale Return hierarchy...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Table Action Controls */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div>
          Showing <span className="font-bold text-foreground">{flatVisibleRows.length.toLocaleString()}</span> matrix rows
          {grandTotals.totalItems > 0 && grandTotals.totalItems > flatVisibleRows.length && (
            <span className="text-[11px] text-muted-foreground ml-1 font-normal">
              (Preview Sample &bull; Grand Totals include all {grandTotals.totalItems.toLocaleString()} items)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="hover:text-primary font-medium transition-colors"
          >
            + Expand All
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="hover:text-primary font-medium transition-colors"
          >
            - Collapse All
          </button>
        </div>
      </div>

      {/* Main Virtualized Container */}
      <div className="border border-border/60 rounded-2xl overflow-hidden bg-background shadow-sm">
        <div ref={parentRef} className="max-h-[640px] overflow-auto relative">
          <div className="min-w-[2000px]">
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-10 flex items-center bg-slate-900 dark:bg-slate-950 text-slate-100 text-[11px] font-mono font-semibold uppercase tracking-wider h-11 border-b border-border/80 shadow-md">
              <div className="flex-1 min-w-[340px] px-4 shrink-0">Hierarchy / Description</div>
              <div className="w-24 px-2 text-center shrink-0">Color</div>
              <div className="w-20 px-2 text-center shrink-0">Size</div>
              <div className="w-28 px-2 text-right shrink-0">Quantity</div>
              <div className="w-32 px-2 text-right shrink-0">Selling Price</div>
              <div className="w-40 px-2 text-right shrink-0">Value Excl. Tax</div>
              <div className="w-32 px-2 text-right shrink-0">Discount</div>
              <div className="w-28 px-2 text-right shrink-0">Sales Tax</div>
              <div className="w-32 px-2 text-right shrink-0">Add. Sales Tax</div>
              <div className="w-32 px-2 text-right shrink-0">Tax Payable</div>
              <div className="w-44 px-4 text-right shrink-0">Value Incl. Tax</div>
            </div>

            {/* Virtualized Body */}
            {flatVisibleRows.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No matching wholesale Return records found.
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
                className="w-full"
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = flatVisibleRows[virtualRow.index];
                  const { node, depth, hasChildren, isExpanded, id } = row;
                  const paddingLeft = depth * 20 + 12;

                  let displayLabel = node.value;
                  if (node.sku && node.description) {
                    displayLabel = `[${node.sku}] ${node.description}`;
                  }

                  const isSubtotalRow = depth < 2; // e.g. Customer, Return
                  const isArticle = node.level === "product";
                  const isVariant = node.level === "variant";
                  const isCustomer = node.level === "customer";
                  const isReturn = node.level === "Return";

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

                        {isCustomer ? (
                          <User className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : isReturn ? (
                          <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        ) : isVariant ? (
                          <QrCode className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        ) : isArticle ? (
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}

                        <span className="truncate max-w-[450px]" title={displayLabel}>
                          {highlight(displayLabel, searchQuery)}
                        </span>
                      </div>

                      {/* Column 2: Color */}
                      <div className="w-24 px-2 text-center shrink-0 flex items-center justify-center font-mono text-[11px]">
                        {node.color ? (
                          <span
                            title={node.color}
                            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-muted/80 text-foreground/90 border border-border/40 truncate max-w-full"
                          >
                            {highlight(node.color, searchQuery)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </div>

                      {/* Column 3: Size */}
                      <div className="w-20 px-2 text-center shrink-0 flex items-center justify-center">
                        {node.size ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-foreground border border-border/50">
                            {node.size}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </div>

                      {/* Column 4: Quantity */}
                      <div className="w-28 px-2 text-right shrink-0 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {node.totals.totalItems.toLocaleString()}
                      </div>

                      {/* Column 5: Selling Price */}
                      <div className="w-32 px-2 text-right shrink-0 font-mono text-slate-700 dark:text-slate-300">
                        {node.unitPrice ? formatCurrency(node.unitPrice) : "-"}
                      </div>

                      {/* Column 6: Value Excluding Sales Tax */}
                      <div className="w-40 px-2 text-right shrink-0 font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(node.totals.wostAmount)}
                      </div>

                      {/* Column 7: Discounts */}
                      <div className="w-32 px-2 text-right shrink-0 font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(node.totals.discountAmount)}
                      </div>

                      {/* Column 8: Sales Tax */}
                      <div className="w-28 px-2 text-right shrink-0 font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(node.totals.taxAmount)}
                      </div>

                      {/* Column 9: Additional Sales Tax */}
                      <div className="w-32 px-2 text-right shrink-0 font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(node.totals.addTaxAmount)}
                      </div>

                      {/* Column 10: Sales Tax Payable */}
                      <div className="w-32 px-2 text-right shrink-0 font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(node.totals.taxPayable)}
                      </div>

                      {/* Column 11: Value Including Sales Tax */}
                      <div className="w-44 px-4 text-right shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(node.totals.netAmount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Table Footer */}
            <div className="sticky bottom-0 z-10 flex items-center bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold h-11 border-t-2 border-slate-300 dark:border-slate-700 shadow-md">
              <div className="flex-1 min-w-[340px] px-4 shrink-0">Grand Total Summary</div>
              <div className="w-24 px-2 text-center shrink-0">-</div>
              <div className="w-20 px-2 text-center shrink-0">-</div>
              <div className="w-28 px-2 text-right font-black shrink-0">{grandTotals.totalItems.toLocaleString()}</div>
              <div className="w-32 px-2 text-right shrink-0">-</div>
              <div className="w-40 px-2 text-right shrink-0">{formatCurrency(grandTotals.wostAmount)}</div>
              <div className="w-32 px-2 text-right text-amber-600 dark:text-amber-400 shrink-0">{formatCurrency(grandTotals.discountAmount)}</div>
              <div className="w-28 px-2 text-right shrink-0">{formatCurrency(grandTotals.taxAmount)}</div>
              <div className="w-32 px-2 text-right shrink-0">{formatCurrency(grandTotals.addTaxAmount)}</div>
              <div className="w-32 px-2 text-right shrink-0">{formatCurrency(grandTotals.taxPayable)}</div>
              <div className="w-44 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black shrink-0">{formatCurrency(grandTotals.netAmount)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
