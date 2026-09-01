import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { GrossSalesReturnTableRow, GrossSalesReturnTotals } from "./types";
import { ChevronRight, ChevronDown, UnfoldVertical, FoldVertical, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface GrossSalesReturnTableProps {
  rows: GrossSalesReturnTableRow[];
  grandTotals: GrossSalesReturnTotals;
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function GrossSalesReturnTable({
  rows,
  grandTotals,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: GrossSalesReturnTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatVal = (val?: number) =>
    val === undefined || val === 0 ? "-" : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-2.5">
      {/* Expand / Collapse Controls */}
      <div className="flex items-center justify-between px-1 no-print">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> sales return hierarchy rows
        </span>
        <div className="flex items-center gap-2">
          {onExpandAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExpandAll}
              className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-lg gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <UnfoldVertical className="h-3 w-3 text-rose-600" />
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

      {/* Clean Minimalist Matrix Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[700px] relative">
          <table className="w-full text-left border-collapse min-w-[2210px] text-xs">
            {/* Clean Light-Themed Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              <tr>
                <th className="py-3 px-3.5 w-[300px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Location / Sales Return # / Returned Product
                </th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Orig Order #</th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Return Date</th>
                <th className="py-3 px-3 w-[150px] shrink-0 border-r border-slate-200 dark:border-slate-700">Customer</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">Cashier</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Refund Mode</th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">FBR Inv #</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">Category</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">Brand</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">SKU / Barcode</th>
                <th className="py-3 px-3 w-[70px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Size</th>
                <th className="py-3 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Color</th>

                {/* Returned Qty */}
                <th className="py-3 px-3 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Ret Qty</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Quantity of items returned.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Gross Return */}
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Return</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Gross product value of returned stock.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* WOST Return */}
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>WOST Return</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Without Sales Tax value of returned stock.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Return Discount */}
                <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-amber-600 dark:text-amber-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Disc Reversal</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-amber-600 hover:text-amber-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Discount reversed on return.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Taxes */}
                <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Taxes</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Sales tax reversed on return.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Net Return Sales */}
                <th className="py-3 px-3.5 w-[130px] shrink-0 text-right font-bold text-rose-600 dark:text-rose-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Refund</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-rose-600 hover:text-rose-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Net refund amount paid out.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Clean Light-Themed Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={19} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-14 text-center text-muted-foreground font-medium text-xs">
                    No sales return records found matching the selected store, cashier, or date range filters.
                  </td>
                </tr>
              ) : (
                virtualItems.map((virtualRow) => {
                  const item = rows[virtualRow.index];
                  if (!item) return null;

                  const isLocation = item.type === "location";
                  const isReturnNote = item.type === "returnNote";
                  const isItem = item.type === "item";

                  const t = item.totals;

                  const depthIndentClass =
                    item.depth === 1
                      ? "pl-6"
                      : item.depth === 2
                      ? "pl-10"
                      : "pl-3.5";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (item.hasChildren && item.nodeId && onToggleNode) {
                          onToggleNode(item.nodeId);
                        }
                      }}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-800/60 transition-colors text-xs select-none",
                        item.hasChildren && "cursor-pointer",
                        isLocation && "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold border-l-4 border-rose-600 hover:bg-slate-200/90",
                        isReturnNote && "bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold border-l-2 border-slate-400 dark:border-slate-500 hover:bg-slate-200/80",
                        isItem && "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-normal hover:bg-slate-50/70 dark:hover:bg-slate-900/30",
                      )}
                    >
                      {/* Label with Expand / Collapse Chevron */}
                      <td className={cn("py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800/60 truncate", depthIndentClass)}>
                        <div className="flex items-center gap-2">
                          {item.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.nodeId && onToggleNode) onToggleNode(item.nodeId);
                              }}
                              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 font-bold" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}

                          {isReturnNote ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-rose-950 dark:text-rose-200">
                              <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                              <span>{item.returnNumber}</span>
                            </div>
                          ) : isItem ? (
                            <span className="truncate">{item.description}</span>
                          ) : (
                            <span className="truncate font-extrabold">{item.label}</span>
                          )}
                        </div>
                      </td>

                      {/* Orig Order # */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.orderNumber || "-"}
                      </td>

                      {/* Return Date */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "-"}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium truncate">
                        {item.customerName ? `${item.customerName} (${item.customerPhone})` : "-"}
                      </td>

                      {/* Cashier */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium">
                        {item.cashierName || "-"}
                      </td>

                      {/* Refund Mode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono font-semibold">
                        {item.paymentMethod ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px]",
                            item.paymentMethod.includes("CASH") ? "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300" :
                            item.paymentMethod.includes("CARD") ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300" :
                            "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                          )}>
                            {item.paymentMethod}
                          </span>
                        ) : "-"}
                      </td>

                      {/* FBR Inv # */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-rose-700 dark:text-rose-400">
                        {item.fbrInvoiceNumber || "-"}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium truncate">
                        {isItem ? item.categoryName || "-" : "-"}
                      </td>

                      {/* Brand */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium truncate">
                        {isItem ? item.brandName || "-" : "-"}
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {isItem ? item.barCode || item.sku || "-" : "-"}
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-medium">
                        {isItem ? item.sizeName || "N/A" : "-"}
                      </td>

                      {/* Color */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center">
                        {isItem ? item.colorName || "N/A" : "-"}
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-semibold">
                        {isItem ? item.quantity : t.totalItems.toLocaleString()}
                      </td>

                      {/* Gross Return */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.grossAmount)}
                      </td>

                      {/* WOST Return */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.wostAmount)}
                      </td>

                      {/* Disc Reversal */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatVal(t.discountAmount)}
                      </td>

                      {/* Taxes */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatVal(t.taxAmount)}
                      </td>

                      {/* Net Refund */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatVal(t.netAmount)}
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={19} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Clean Light-Themed Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold shadow-sm border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold" colSpan={12}>
                  GRAND TOTAL (ALL SELECTED SALES RETURN NOTES)
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-900 dark:text-slate-100">
                  {grandTotals.totalItems.toLocaleString()}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.grossAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.wostAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-600 dark:text-amber-400">
                  {formatVal(grandTotals.discountAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-600 dark:text-slate-400">
                  {formatVal(grandTotals.taxAmount)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-rose-600 dark:text-rose-400">
                  {formatVal(grandTotals.netAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
