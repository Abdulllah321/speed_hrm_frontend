import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { SalesListTableRow, SalesListTotals } from "./types";
import { Barcode, ChevronRight, ChevronDown, UnfoldVertical, FoldVertical, Info, Receipt, UserCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface SalesListTableProps {
  rows: SalesListTableRow[];
  grandTotals: SalesListTotals;
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function SalesListTable({
  rows,
  grandTotals,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: SalesListTableProps) {
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
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> sales hierarchy rows
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
          <table className="w-full text-left border-collapse min-w-[3200px] text-xs">
            {/* Clean Light-Themed Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              <tr>
                <th className="py-3 px-3.5 w-[280px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Location / Invoice # / Item Description
                </th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Date & Time</th>
                <th className="py-3 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700">Customer</th>
                <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700">Cashier</th>
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Payment Mode</th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">FBR Inv #</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">SKU / Barcode</th>
                <th className="py-3 px-3 w-[65px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Size</th>
                <th className="py-3 px-3 w-[75px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Color</th>

                {/* Qty */}
                <th className="py-3 px-3 w-[70px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Total items sold on invoice.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Gross Amount */}
                <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Amt</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Gross price before discounts.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Discount */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-amber-600 dark:text-amber-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Discount</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-amber-600 hover:text-amber-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Promotions, coupons, or cart discount applied.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Taxes */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Taxes</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Sales tax / FBR tax collected.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Net Sales Amount */}
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Sales</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-emerald-600 hover:text-emerald-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Final collected revenue (Gross - Discount + Taxes).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* 1. CashSale */}
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                  CashSale
                </th>

                {/* 2. CashRetrun */}
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                  CashRetrun
                </th>

                {/* 3. CardSale */}
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                  CardSale
                </th>

                {/* 4. CreditSale */}
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                  CreditSale
                </th>

                {/* 5. GiftVoucherAmount */}
                <th className="py-3 px-3 w-[125px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-violet-700 dark:text-violet-400">
                  GiftVoucherAmount
                </th>

                {/* 6. CreditVoucherAmount */}
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                  CreditVoucherAmount
                </th>

                {/* 7. ExchangeVoucherAmount */}
                <th className="py-3 px-3 w-[145px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-orange-700 dark:text-orange-400">
                  ExchangeVoucherAmount
                </th>

                {/* 8. ClaimVoucherAmount */}
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                  ClaimVoucherAmount
                </th>

                {/* 9. GiftVoucherAmount_Corporate */}
                <th className="py-3 px-3 w-[170px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                  GiftVoucherAmount_Corporate
                </th>

                {/* 10. CreditVoucherIssuedAmount */}
                <th className="py-3 px-3 w-[160px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-red-700 dark:text-red-400">
                  CreditVoucherIssuedAmount
                </th>

                {/* 11. RewardVoucherAmount */}
                <th className="py-3 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  RewardVoucherAmount
                </th>

                {/* 12. OnCreditAmount */}
                <th className="py-3 px-3.5 w-[120px] shrink-0 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                  OnCreditAmount
                </th>
              </tr>
            </thead>

            {/* Clean Light-Themed Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={26} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={26} className="p-14 text-center text-muted-foreground font-medium text-xs">
                    No sales invoices found matching the selected store, cashier, or date range filters.
                  </td>
                </tr>
              ) : (
                virtualItems.map((virtualRow) => {
                  const item = rows[virtualRow.index];
                  if (!item) return null;

                  const isLocation = item.type === "location";
                  const isInvoice = item.type === "invoice";
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
                        isLocation && "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold border-l-4 border-emerald-600 hover:bg-slate-200/90",
                        isInvoice && "bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold border-l-2 border-slate-400 dark:border-slate-500 hover:bg-slate-200/80",
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
                                <ChevronDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}

                          {isInvoice ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                              <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                              <span>{item.orderNumber}</span>
                            </div>
                          ) : isItem ? (
                            <span className="truncate">{item.description}</span>
                          ) : (
                            <span className="truncate font-extrabold">{item.label}</span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
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

                      {/* Payment Mode */}
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
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        {item.fbrInvoiceNumber || "-"}
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

                      {/* Gross Amt */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.grossAmount)}
                      </td>

                      {/* Discount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatVal(t.discountAmount)}
                      </td>

                      {/* Taxes */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatVal(t.taxAmount)}
                      </td>

                      {/* Net Sales */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVal(t.netAmount)}
                      </td>

                      {/* 1. CashSale */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                        {formatVal(t.cashSale)}
                      </td>

                      {/* 2. CashRetrun */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatVal(t.cashReturn)}
                      </td>

                      {/* 3. CardSale */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {formatVal(t.cardSale)}
                      </td>

                      {/* 4. CreditSale */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                        {formatVal(t.creditSale)}
                      </td>

                      {/* 5. GiftVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.giftVoucherAmount)}
                      </td>

                      {/* 6. CreditVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.creditVoucherAmount)}
                      </td>

                      {/* 7. ExchangeVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.exchangeVoucherAmount)}
                      </td>

                      {/* 8. ClaimVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.claimVoucherAmount)}
                      </td>

                      {/* 9. GiftVoucherAmount_Corporate */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.giftVoucherCorporate)}
                      </td>

                      {/* 10. CreditVoucherIssuedAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-rose-700 dark:text-rose-400 font-bold">
                        {formatVal(t.creditVoucherIssuedAmount)}
                      </td>

                      {/* 11. RewardVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.rewardVoucherAmount)}
                      </td>

                      {/* 12. OnCreditAmount */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatVal(t.onCreditAmount)}
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={26} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Clean Light-Themed Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold shadow-sm border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold" colSpan={9}>
                  GRAND TOTAL (ALL SELECTED SALES INVOICES)
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-900 dark:text-slate-100">
                  {grandTotals.totalItems.toLocaleString()}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.grossAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-600 dark:text-amber-400">
                  {formatVal(grandTotals.discountAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-600 dark:text-slate-400">
                  {formatVal(grandTotals.taxAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatVal(grandTotals.netAmount)}
                </td>
                {/* 1. CashSale */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-teal-700 dark:text-teal-400">
                  {formatVal(grandTotals.cashSale)}
                </td>
                {/* 2. CashRetrun */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-600 dark:text-rose-400">
                  {formatVal(grandTotals.cashReturn)}
                </td>
                {/* 3. CardSale */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-indigo-700 dark:text-indigo-400">
                  {formatVal(grandTotals.cardSale)}
                </td>
                {/* 4. CreditSale */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-sky-700 dark:text-sky-400">
                  {formatVal(grandTotals.creditSale)}
                </td>
                {/* 5. GiftVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.giftVoucherAmount)}
                </td>
                {/* 6. CreditVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.creditVoucherAmount)}
                </td>
                {/* 7. ExchangeVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.exchangeVoucherAmount)}
                </td>
                {/* 8. ClaimVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.claimVoucherAmount)}
                </td>
                {/* 9. GiftVoucherAmount_Corporate */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.giftVoucherCorporate)}
                </td>
                {/* 10. CreditVoucherIssuedAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-700 dark:text-rose-400">
                  {formatVal(grandTotals.creditVoucherIssuedAmount)}
                </td>
                {/* 11. RewardVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.rewardVoucherAmount)}
                </td>
                {/* 12. OnCreditAmount */}
                <td className="py-3 px-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                  {formatVal(grandTotals.onCreditAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
