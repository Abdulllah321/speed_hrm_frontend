import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatCurrency, cn } from "@/lib/utils";
import { CostOfSalesTableRow, CostOfSalesTotals } from "./types";

interface CostOfSalesTableProps {
  rows: CostOfSalesTableRow[];
  grandTotals: CostOfSalesTotals;
}

export function CostOfSalesTable({ rows, grandTotals }: CostOfSalesTableProps) {
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
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs bg-background overflow-hidden no-print">
      <div ref={parentRef} className="overflow-auto max-h-[680px] relative">
        <table className="w-full text-left border-collapse min-w-[1250px] text-xs">
          {/* Synchronized Sticky Header */}
          <thead className="sticky top-0 z-20 bg-slate-900 text-slate-100 uppercase text-[10px] font-extrabold tracking-wider shadow-sm">
            <tr className="border-b border-slate-700">
              <th className="p-3 w-[340px] shrink-0 border-r border-slate-700">GPC / Category / Product</th>
              <th className="p-3 w-[140px] shrink-0 border-r border-slate-700">SKU</th>
              <th className="p-3 w-[90px] shrink-0 border-r border-slate-700 text-center">Size</th>
              <th className="p-3 w-[110px] shrink-0 border-r border-slate-700 text-center">Color</th>
              <th className="p-3 w-[100px] shrink-0 border-r border-slate-700 text-right">Sold Qty</th>
              <th className="p-3 w-[130px] shrink-0 border-r border-slate-700 text-right">Unit Cost</th>
              <th className="p-3 w-[150px] shrink-0 border-r border-slate-700 text-right">Total Cost (COGS)</th>
              <th className="p-3 w-[130px] shrink-0 border-r border-slate-700 text-right">Unit Price</th>
              <th className="p-3 w-[150px] shrink-0 border-r border-slate-700 text-right">Total Revenue</th>
              <th className="p-3 w-[140px] shrink-0 border-r border-slate-700 text-right">Gross Profit</th>
              <th className="p-3 w-[100px] shrink-0 text-right">Margin %</th>
            </tr>
          </thead>

          {/* Virtualized Body */}
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td colSpan={11} style={{ height: `${paddingTop}px` }} />
              </tr>
            )}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-12 text-center text-muted-foreground font-medium">
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

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-slate-100 dark:border-slate-800/60 transition-colors font-medium text-xs",
                      isBrand && "bg-slate-900 text-white font-bold",
                      isDivision && "bg-slate-800 text-slate-100 font-bold",
                      isGender && "bg-slate-700 text-slate-100 font-bold",
                      isCategory && "bg-slate-600 text-slate-100 font-semibold",
                      isArticle && "bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold",
                      isVariant && "bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40",
                    )}
                  >
                    {/* GPC / Label */}
                    <td
                      className={cn(
                        "p-2.5 font-semibold border-r border-slate-200/60 dark:border-slate-800/60 truncate",
                        isBrand && "pl-3 text-sm tracking-wide",
                        isDivision && "pl-6 text-xs",
                        isGender && "pl-8 text-xs",
                        isCategory && "pl-10 text-xs",
                        isArticle && "pl-12 text-xs text-sky-600 dark:text-sky-400 font-bold",
                        isVariant && "pl-14 text-xs italic text-slate-500",
                      )}
                    >
                      {isVariant ? `— Variant: ${item.color || "Default"}` : item.label}
                    </td>

                    {/* SKU */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 font-mono text-[11px]">
                      {item.sku || "-"}
                    </td>

                    {/* Size */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-center font-bold">
                      {isVariant ? item.size : isArticle ? "All Sizes" : "-"}
                    </td>

                    {/* Color */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-center">
                      {isVariant ? item.color || "N/A" : isArticle ? "All Colors" : "-"}
                    </td>

                    {/* Sold Qty */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-right font-bold">
                      {formatVal(q)}
                    </td>

                    {/* Unit Cost */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-right">
                      {formatPrice(cost)}
                    </td>

                    {/* Total Cost (COGS) */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatPrice(totCost)}
                    </td>

                    {/* Unit Price */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-right">
                      {formatPrice(price)}
                    </td>

                    {/* Total Revenue */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(rev)}
                    </td>

                    {/* Gross Profit */}
                    <td className="p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 text-right font-bold text-teal-600 dark:text-teal-400">
                      {formatPrice(profit)}
                    </td>

                    {/* Profit Margin % */}
                    <td className="p-2.5 text-right font-bold text-sky-600 dark:text-sky-400">
                      {margin !== undefined && margin !== 0 ? `${margin}%` : "-"}
                    </td>
                  </tr>
                );
              })
            )}

            {paddingBottom > 0 && (
              <tr>
                <td colSpan={11} style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>

          {/* Sticky Grand Totals Footer */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-slate-100 uppercase text-[11px] font-extrabold shadow-md">
            <tr className="border-t-2 border-slate-700">
              <td className="p-3 border-r border-slate-700 font-bold" colSpan={4}>
                GRAND TOTAL (ALL SELECTED OUTLETS & WAREHOUSES)
              </td>
              <td className="p-3 border-r border-slate-700 text-right text-emerald-400">
                {formatVal(grandTotals.quantity)}
              </td>
              <td className="p-3 border-r border-slate-700 text-right">
                {formatPrice(grandTotals.avgUnitCost)}
              </td>
              <td className="p-3 border-r border-slate-700 text-right text-amber-400">
                {formatPrice(grandTotals.totalCost)}
              </td>
              <td className="p-3 border-r border-slate-700 text-right">-</td>
              <td className="p-3 border-r border-slate-700 text-right text-emerald-400">
                {formatPrice(grandTotals.totalRevenue)}
              </td>
              <td className="p-3 border-r border-slate-700 text-right text-teal-400">
                {formatPrice(grandTotals.grossProfit)}
              </td>
              <td className="p-3 text-right text-sky-400">
                {grandTotals.profitMargin}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
