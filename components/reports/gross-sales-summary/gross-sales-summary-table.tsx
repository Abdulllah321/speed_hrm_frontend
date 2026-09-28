"use client";

import React, { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GrossSalesSummaryTreeNode, GrossSalesSummaryTotals } from "./types";
import { ChevronRight, ChevronDown, Folder, Package, Layers, QrCode } from "lucide-react";
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
  treeData: GrossSalesSummaryTreeNode[];
  grandTotals: GrossSalesSummaryTotals;
  searchQuery: string;
  isLoading: boolean;
}

interface FlatRowItem {
  id: string;
  node: GrossSalesSummaryTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export function GrossSalesSummaryTable({ treeData, grandTotals, searchQuery, isLoading }: TableProps) {
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
    function traverse(nodes: GrossSalesSummaryTreeNode[], parentKey: string = "root") {
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

    function traverse(nodes: GrossSalesSummaryTreeNode[], depth: number = 0, parentKey: string = "root") {
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
          Computing Gross Sales Summary hierarchy...
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
      <div className="border border-border/80 rounded-2xl overflow-hidden bg-background shadow-md">
        <div ref={parentRef} className="max-h-[660px] overflow-auto relative">
          <div className="min-w-[1650px] w-full">
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-20 flex items-center bg-slate-950 text-slate-100 text-[11px] font-mono font-bold uppercase tracking-wider h-11 border-b-2 border-slate-800 shadow-md min-w-[1650px] px-3">
              <div className="w-[360px] min-w-[360px] shrink-0 px-2">Product Hierarchy / Description</div>
              <div className="w-[140px] min-w-[140px] shrink-0 px-2 text-center">SKU / Barcode</div>
              <div className="w-[80px] min-w-[80px] shrink-0 px-2 text-center">Size</div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-center">Color</div>
              <div className="w-[90px] min-w-[90px] shrink-0 px-2 text-right">Sold Qty</div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-right">Unit Price</div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-right">Price WOST</div>
              <div className="w-[130px] min-w-[130px] shrink-0 px-2 text-right">Total Price WOST</div>
              <div className="w-[120px] min-w-[120px] shrink-0 px-2 text-right">Discount Amt</div>
              <div className="w-[130px] min-w-[130px] shrink-0 px-2 text-right">Val Excl Tax</div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-right">Sales Tax</div>
              <div className="w-[160px] min-w-[160px] shrink-0 pl-2 pr-4 text-right">Val Incl Tax / Total Rev</div>
            </div>

            {/* Virtualized Body */}
            {flatVisibleRows.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No matching gross sales summary records found.
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
                className="w-full min-w-[1650px]"
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = flatVisibleRows[virtualRow.index];
                  const { node, depth, hasChildren, isExpanded, id } = row;
                  const indentPx = depth * 18;

                  let displayLabel = node.value;
                  if (node.sku && node.articleName) {
                    displayLabel = `[${node.sku}] ${node.articleName}`;
                  } else if (node.level === "variant" && node.barCode) {
                    displayLabel = `[${node.barCode}] ${node.color || "Default"}-${node.size || "Default"}`;
                  }

                  const isSubtotalRow = depth < 3;
                  const isArticle = node.level === "article";
                  const isVariant = node.level === "variant";

                  const unitPrice = node.totals.unitPrice || node.unitPrice || 0;
                  const priceWost = node.totals.priceWost || (unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0);
                  const totalPriceWost = node.totals.wostAmount;
                  const discountAmt = node.totals.discountAmount;
                  const valExTax = node.totals.valueExSalesTax;
                  const taxAmt = node.totals.taxAmount;
                  const valInclTax = node.totals.valueInclSalesTax || node.totals.netAmount;

                  return (
                    <div
                      key={id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        minWidth: "1650px",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={cn(
                        "border-b border-border/40 text-xs transition-colors flex items-center px-3 whitespace-nowrap",
                        depth === 0
                          ? "bg-slate-100/90 dark:bg-slate-900/90 font-bold border-b-2 border-border/60 text-foreground"
                          : isSubtotalRow
                          ? "bg-slate-50/70 dark:bg-slate-900/50 font-semibold text-foreground"
                          : "bg-background text-foreground/90 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                      )}
                    >
                      {/* Column 1: Node Label & Hierarchy Tree */}
                      <div className="w-[360px] min-w-[360px] shrink-0 px-2 flex items-center gap-1.5 overflow-hidden">
                        <div style={{ marginLeft: `${indentPx}px` }} className="flex items-center gap-1.5 shrink-0 overflow-hidden max-w-full">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleCollapse(id)}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0 transition-colors cursor-pointer"
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

                          <span className="truncate font-medium" title={displayLabel}>
                            {highlight(displayLabel, searchQuery)}
                          </span>
                        </div>
                      </div>

                      {/* Column 2: SKU / Barcode */}
                      <div className="w-[140px] min-w-[140px] shrink-0 px-2 text-center flex items-center justify-center font-mono text-[11px]">
                        {node.barCode || node.sku ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-muted/80 text-foreground font-semibold border border-border/50 shadow-2xs">
                            {highlight(node.barCode || node.sku || "", searchQuery)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </div>

                      {/* Column 3: Size Badge */}
                      <div className="w-[80px] min-w-[80px] shrink-0 px-2 text-center flex items-center justify-center">
                        {node.size ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-foreground border border-border/60">
                            {node.size}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </div>

                      {/* Column 4: Color Pill Badge */}
                      <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-center flex items-center justify-center">
                        {node.color ? (
                          <span
                            title={node.color}
                            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-secondary/90 text-[11px] font-medium text-secondary-foreground border border-border/60 truncate whitespace-nowrap max-w-[100px]"
                          >
                            {highlight(node.color, searchQuery)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </div>

                      {/* Column 5: Sold Qty */}
                      <div
                        className="w-[90px] min-w-[90px] shrink-0 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100"
                        title={`Sold Qty: ${node.totals.totalItems.toLocaleString()} pcs`}
                      >
                        {node.totals.totalItems.toLocaleString()}
                      </div>

                      {/* Column 6: Unit Price */}
                      <div
                        className="w-[110px] min-w-[110px] shrink-0 px-2 text-right font-mono font-medium text-slate-700 dark:text-slate-300"
                        title={unitPrice > 0 ? `Unit Price: ${formatCurrency(unitPrice)}` : undefined}
                      >
                        {unitPrice > 0 ? formatCurrency(unitPrice) : "-"}
                      </div>

                      {/* Column 7: Price WOST */}
                      <div
                        className="w-[110px] min-w-[110px] shrink-0 px-2 text-right font-mono text-slate-600 dark:text-slate-400"
                        title={priceWost > 0 ? `Price WOST: ${formatCurrency(priceWost)}` : undefined}
                      >
                        {priceWost > 0 ? formatCurrency(priceWost) : "-"}
                      </div>

                      {/* Column 8: Total Price WOST */}
                      <div
                        className="w-[130px] min-w-[130px] shrink-0 px-2 text-right font-mono font-medium text-indigo-600 dark:text-indigo-400"
                        title={`Total Price WOST: ${formatCurrency(totalPriceWost)}`}
                      >
                        {formatCurrency(totalPriceWost)}
                      </div>

                      {/* Column 9: Discount Amount */}
                      <div
                        className="w-[120px] min-w-[120px] shrink-0 px-2 text-right font-mono font-semibold text-amber-600 dark:text-amber-400"
                        title={`Discount Amt: ${formatCurrency(discountAmt)}`}
                      >
                        {formatCurrency(discountAmt)}
                      </div>

                      {/* Column 10: Value Excl. Sales Tax (After Discount) */}
                      <div
                        className="w-[130px] min-w-[130px] shrink-0 px-2 text-right font-mono font-semibold text-sky-600 dark:text-sky-400"
                        title={`Val Excl Tax: ${formatCurrency(valExTax)}`}
                      >
                        {formatCurrency(valExTax)}
                      </div>

                      {/* Column 11: Sales Tax */}
                      <div
                        className="w-[110px] min-w-[110px] shrink-0 px-2 text-right font-mono text-slate-600 dark:text-slate-400"
                        title={`Sales Tax: ${formatCurrency(taxAmt)}`}
                      >
                        {formatCurrency(taxAmt)}
                      </div>

                      {/* Column 12: Value Incl. Sales Tax / Total Revenue */}
                      <div
                        className="w-[160px] min-w-[160px] shrink-0 pl-2 pr-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400"
                        title={`Val Incl Tax / Revenue: ${formatCurrency(valInclTax)}`}
                      >
                        {formatCurrency(valInclTax)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Table Footer */}
            <div className="sticky bottom-0 z-20 flex items-center bg-slate-900 text-slate-100 text-xs font-mono font-bold uppercase h-12 border-t-2 border-slate-700 shadow-xl min-w-[1650px] px-3">
              <div className="w-[360px] min-w-[360px] shrink-0 px-2">Grand Total Summary</div>
              <div className="w-[140px] min-w-[140px] shrink-0 px-2 text-center text-slate-500">-</div>
              <div className="w-[80px] min-w-[80px] shrink-0 px-2 text-center text-slate-500">-</div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-center text-slate-500">-</div>
              <div
                className="w-[90px] min-w-[90px] shrink-0 px-2 text-right font-black text-amber-300"
                title={`Grand Total Sold Qty: ${grandTotals.totalItems.toLocaleString()} pcs`}
              >
                {grandTotals.totalItems.toLocaleString()}
              </div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-right text-slate-400">-</div>
              <div className="w-[110px] min-w-[110px] shrink-0 px-2 text-right text-slate-400">-</div>
              <div
                className="w-[130px] min-w-[130px] shrink-0 px-2 text-right text-indigo-300"
                title={`Grand Total Price WOST: ${formatCurrency(grandTotals.wostAmount)}`}
              >
                {formatCurrency(grandTotals.wostAmount)}
              </div>
              <div
                className="w-[120px] min-w-[120px] shrink-0 px-2 text-right text-amber-400"
                title={`Grand Total Discounts: ${formatCurrency(grandTotals.discountAmount)}`}
              >
                {formatCurrency(grandTotals.discountAmount)}
              </div>
              <div
                className="w-[130px] min-w-[130px] shrink-0 px-2 text-right text-sky-300"
                title={`Grand Total Val Excl Tax: ${formatCurrency(grandTotals.valueExSalesTax)}`}
              >
                {formatCurrency(grandTotals.valueExSalesTax)}
              </div>
              <div
                className="w-[110px] min-w-[110px] shrink-0 px-2 text-right text-slate-300"
                title={`Grand Total Sales Tax: ${formatCurrency(grandTotals.taxAmount)}`}
              >
                {formatCurrency(grandTotals.taxAmount)}
              </div>
              <div
                className="w-[160px] min-w-[160px] shrink-0 pl-2 pr-4 text-right text-emerald-400 font-black text-sm"
                title={`Grand Total Value Incl Tax: ${formatCurrency(grandTotals.valueInclSalesTax || grandTotals.netAmount)}`}
              >
                {formatCurrency(grandTotals.valueInclSalesTax || grandTotals.netAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
