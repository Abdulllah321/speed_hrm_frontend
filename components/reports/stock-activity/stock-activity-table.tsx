import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { StockActivityTableRow, StockActivityTotals } from "./types";
import { Barcode, ChevronRight, ChevronDown, UnfoldVertical, FoldVertical, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface StockActivityTableProps {
  rows: StockActivityTableRow[];
  grandTotals: StockActivityTotals;
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function StockActivityTable({
  rows,
  grandTotals,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: StockActivityTableProps) {
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

  return (
    <div className="space-y-2.5">
      {/* Expand / Collapse Controls */}
      <div className="flex items-center justify-between px-1 no-print">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> hierarchy activity rows
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

      {/* Clean Minimalist Matrix Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[700px] relative">
          <table className="w-full text-left border-collapse min-w-[2050px] text-xs">
            {/* Clean Light-Themed Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              <tr>
                <th className="py-3 px-3.5 w-[320px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Hierarchy / Item Description
                </th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">SKU</th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">Barcode</th>
                <th className="py-3 px-3 w-[70px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Size</th>
                <th className="py-3 px-3 w-[90px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Color</th>

                {/* Opening B/F */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Opening</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Opening balance brought forward before start date (Fiscal Year snapshot).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Wh IN */}
                <th className="py-3 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Wh IN</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-emerald-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Transfers received from central warehouses.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Outlet IN */}
                <th className="py-3 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Outlet IN</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-emerald-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Transfers received from other outlets.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Total IN */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Total IN</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-emerald-600 hover:text-emerald-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Total inbound transfers (Wh IN + Outlet IN).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Wh OUT */}
                <th className="py-3 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Wh OUT</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-rose-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Transfers returned to warehouses.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Outlet OUT */}
                <th className="py-3 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Outlet OUT</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-rose-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Transfers sent to other outlets.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Total OUT */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-rose-600 dark:text-rose-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Total OUT</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-rose-600 hover:text-rose-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Total outbound transfers (Wh OUT + Outlet OUT).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Exchg */}
                <th className="py-3 px-3 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Exchg</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        POS Exchange In units.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Refund */}
                <th className="py-3 px-3 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Refund</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        POS Returned/Refunded units.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Claim */}
                <th className="py-3 px-3 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Claim</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Approved customer claim units restocked.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Sales */}
                <th className="py-3 px-3 w-[90px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Sales</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-indigo-600 hover:text-indigo-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Outbound sold units at POS checkout.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Adj */}
                <th className="py-3 px-3 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Adj</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Stock adjustments (+ gain / - loss).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Available */}
                <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-teal-600 dark:text-teal-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Available</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-teal-600 hover:text-teal-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Available stock on floor (Opening + In - Out + Returns - Sales + Adj).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Transit */}
                <th className="py-3 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-amber-600 dark:text-amber-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Transit</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-amber-600 hover:text-amber-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Stock currently in-transit on open transfers.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Balance */}
                <th className="py-3 px-3.5 w-[105px] shrink-0 text-right font-bold text-sky-600 dark:text-sky-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Balance</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-sky-600 hover:text-sky-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Accounting balance (Available + Transit).
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
                  <td colSpan={20} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={20} className="p-14 text-center text-muted-foreground font-medium text-xs">
                    No stock activity ledger entries found for the selected period and location filter.
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

                  const t = item.totals;

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
                        isBrand && "bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold border-l-2 border-slate-400 dark:border-slate-500 hover:bg-slate-200/80 dark:hover:bg-slate-750",
                        (isDivision || isGender || isCategory) && "bg-slate-50/80 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
                        isArticle && "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium hover:bg-slate-50 dark:hover:bg-slate-900/40",
                        isVariant && "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-50/70 dark:hover:bg-slate-900/30",
                      )}
                    >
                      {/* Hierarchy Label with Collapsible Chevron */}
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
                                <ChevronDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
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
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {item.sku || "-"}
                      </td>

                      {/* Barcode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {isVariant ? item.barCode || "-" : isArticle ? "All Barcodes" : "-"}
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-medium">
                        {isVariant ? item.size : isArticle ? "All Sizes" : "-"}
                      </td>

                      {/* Color */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center">
                        {isVariant ? item.color || "N/A" : isArticle ? "All Colors" : "-"}
                      </td>

                      {/* Opening B/F */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatVal(t.bf)}
                      </td>

                      {/* Wh IN */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.fromWarehouse)}
                      </td>

                      {/* Outlet IN */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.fromOutlet)}
                      </td>

                      {/* Total IN */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVal(t.totalTrfIn)}
                      </td>

                      {/* Wh OUT */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.toWarehouse)}
                      </td>

                      {/* Outlet OUT */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.toOutlet)}
                      </td>

                      {/* Total OUT */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatVal(t.totalTrfOut)}
                      </td>

                      {/* Exchg */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.exchg)}
                      </td>

                      {/* Refund */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.refund)}
                      </td>

                      {/* Claim */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.claim)}
                      </td>

                      {/* Sales */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatVal(t.sales)}
                      </td>

                      {/* Adj */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.adj)}
                      </td>

                      {/* Available */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                        {formatVal(t.availableStock)}
                      </td>

                      {/* Transit */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatVal(t.transit)}
                      </td>

                      {/* Balance */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                        {formatVal(t.balance)}
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={20} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Clean Light-Themed Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold shadow-sm border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold" colSpan={5}>
                  GRAND TOTAL (ALL SELECTED OUTLETS & WAREHOUSES)
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-900 dark:text-slate-100">
                  {formatVal(grandTotals.bf)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.fromWarehouse)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.fromOutlet)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatVal(grandTotals.totalTrfIn)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.toWarehouse)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.toOutlet)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-600 dark:text-rose-400">
                  {formatVal(grandTotals.totalTrfOut)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.exchg)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.refund)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.claim)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-indigo-600 dark:text-indigo-400">
                  {formatVal(grandTotals.sales)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.adj)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-teal-600 dark:text-teal-400">
                  {formatVal(grandTotals.availableStock)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-600 dark:text-amber-400">
                  {formatVal(grandTotals.transit)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-sky-600 dark:text-sky-400">
                  {formatVal(grandTotals.balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
