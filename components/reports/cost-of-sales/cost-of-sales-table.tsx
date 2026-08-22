import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatCurrency, cn } from "@/lib/utils";
import { CostOfSalesTableRow, CostOfSalesTotals } from "./types";
import { Barcode, ChevronRight, ChevronDown, UnfoldVertical, FoldVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CostOfSalesTableProps {
  rows: CostOfSalesTableRow[];
  grandTotals: CostOfSalesTotals;
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function CostOfSalesTable({
  rows,
  grandTotals,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: CostOfSalesTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatVal = (val?: number) =>
    val === undefined || val === 0 ? "-" : val.toLocaleString();

  const formatPrice = (val?: number) =>
    val === undefined || val === 0 ? "-" : formatCurrency(val);

  return (
    <div className="space-y-2.5">
      {/* Tree Expand / Collapse Controls Header Bar */}
      <div className="flex items-center justify-between px-1 no-print">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> hierarchy rows
        </span>
        <div className="flex items-center gap-2">
          {onExpandAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExpandAll}
              className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-lg gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <UnfoldVertical className="h-3 w-3 text-emerald-600" />
              Expand All
            </Button>
          )}
          {onCollapseAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCollapseAll}
              className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-lg gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FoldVertical className="h-3 w-3 text-indigo-600" />
              Collapse All
            </Button>
          )}
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-background overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[700px] relative">
          <table className="w-full text-left border-collapse min-w-[1350px] text-xs">
            {/* Synchronized Minimal Dark Header */}
            <thead className="sticky top-0 z-20 bg-slate-950 text-slate-200 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800 shadow-xs">
              <tr>
                <th className="py-3 px-3.5 w-[350px] shrink-0 border-r border-slate-800">Hierarchy / Item Description</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-800">SKU</th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-800">Barcode</th>
                <th className="py-3 px-3 w-[75px] shrink-0 border-r border-slate-800 text-center">Size</th>
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-800 text-center">Color</th>
                <th className="py-3 px-3 w-[90px] shrink-0 border-r border-slate-800 text-right">Sold Qty</th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-800 text-right">Unit Cost</th>
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-800 text-right">COGS (Total Cost)</th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-800 text-right">Unit Price</th>
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-800 text-right">Revenue</th>
                <th className="py-3 px-3 w-[125px] shrink-0 border-r border-slate-800 text-right">Gross Profit</th>
                <th className="py-3 px-3.5 w-[90px] shrink-0 text-right">Margin %</th>
              </tr>
            </thead>

            {/* Virtualized Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={12} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-14 text-center text-muted-foreground font-medium text-xs">
                    No sold items or sales data found for the selected period and location filter.
                  </td>
                </tr>
              ) : (
                virtualItems.map((virtualRow) => {
                  const item = rows[virtualRow.index];
                  if (!item) return null;

                  const isBrand = item.type === "brand";
                  const isDivision = item.type === "division";
                  const isGender = item.type === "gender";
                  const isCategory = item.type === "category";
                  const isArticle = item.type === "article";
                  const isVariant = item.type === "variant";

                  const q = isVariant ? item.quantity : item.totals?.quantity;
                  const cost = isVariant ? item.unitCost : item.totals?.avgUnitCost;
                  const totCost = isVariant ? item.totalCost : item.totals?.totalCost;
                  const price = isVariant ? item.unitPrice : undefined;
                  const rev = isVariant ? item.totalRevenue : item.totals?.totalRevenue;
                  const profit = isVariant ? item.grossProfit : item.totals?.grossProfit;
                  const margin = isVariant ? item.profitMargin : item.totals?.profitMargin;

                  const depthIndentClass =
                    item.depth === 1
                      ? "pl-6"
                      : item.depth === 2
                      ? "pl-10"
                      : item.depth === 3
                      ? "pl-14"
                      : item.depth === 4
                      ? "pl-18"
                      : item.depth === 5
                      ? "pl-22"
                      : "pl-3";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (item.hasChildren && item.nodeId && onToggleNode) {
                          onToggleNode(item.nodeId);
                        }
                      }}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-800/50 transition-colors font-medium text-xs select-none",
                        item.hasChildren && "cursor-pointer",
                        isBrand && "bg-slate-900 text-white font-bold tracking-wide border-l-4 border-emerald-500 hover:bg-slate-850",
                        isDivision && "bg-slate-800 text-white font-bold border-l-4 border-indigo-500 hover:bg-slate-750",
                        isGender && "bg-slate-700 text-white font-bold border-l-4 border-blue-400 hover:bg-slate-650",
                        isCategory && "bg-slate-100/90 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-bold border-l-4 border-slate-400 hover:bg-slate-200/90",
                        isArticle && "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold border-l-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60",
                        isVariant && "bg-slate-50/40 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
                      )}
                    >
                      {/* Hierarchy Label with Collapsible Chevron */}
                      <td className={cn("py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800/50 truncate", depthIndentClass)}>
                        <div className="flex items-center gap-2">
                          {item.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.nodeId && onToggleNode) onToggleNode(item.nodeId);
                              }}
                              className="p-0.5 rounded hover:bg-white/20 transition-colors shrink-0"
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-emerald-400 font-bold" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}

                          {isVariant ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Barcode className="h-3.5 w-3.5 opacity-60 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {item.barCode || "N/A"}
                              </span>
                            </div>
                          ) : (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 font-mono text-[11px]">
                        {item.sku || "-"}
                      </td>

                      {/* Barcode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 font-mono text-[11px]">
                        {isVariant ? item.barCode || "-" : isArticle ? "All Barcodes" : "-"}
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-center font-medium">
                        {isVariant ? item.size : isArticle ? "All Sizes" : "-"}
                      </td>

                      {/* Color */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-center">
                        {isVariant ? item.color || "N/A" : isArticle ? "All Colors" : "-"}
                      </td>

                      {/* Sold Qty */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-right font-mono font-bold">
                        {formatVal(q)}
                      </td>

                      {/* Unit Cost */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-right font-mono">
                        {formatPrice(cost)}
                      </td>

                      {/* Total Cost (COGS) */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatPrice(totCost)}
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-right font-mono">
                        {formatPrice(price)}
                      </td>

                      {/* Total Revenue */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(rev)}
                      </td>

                      {/* Gross Profit */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/50 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                        {formatPrice(profit)}
                      </td>

                      {/* Profit Margin % */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                        {margin !== undefined && margin !== 0 ? `${margin}%` : "-"}
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={12} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Minimal Dark Grand Totals Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-950 text-slate-200 uppercase text-[11px] font-mono font-bold shadow-md">
              <tr className="border-t-2 border-slate-800">
                <td className="py-3 px-3.5 border-r border-slate-800 font-bold" colSpan={5}>
                  GRAND TOTAL (ALL SELECTED OUTLETS & WAREHOUSES)
                </td>
                <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-emerald-400">
                  {formatVal(grandTotals.quantity)}
                </td>
                <td className="py-3 px-3 border-r border-slate-800 text-right font-mono">
                  {formatPrice(grandTotals.avgUnitCost)}
                </td>
                <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-amber-400">
                  {formatPrice(grandTotals.totalCost)}
                </td>
                <td className="py-3 px-3 border-r border-slate-800 text-right font-mono">-</td>
                <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-emerald-400">
                  {formatPrice(grandTotals.totalRevenue)}
                </td>
                <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-teal-400">
                  {formatPrice(grandTotals.grossProfit)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-sky-400">
                  {grandTotals.profitMargin}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
