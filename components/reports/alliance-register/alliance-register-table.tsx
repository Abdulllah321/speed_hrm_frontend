"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AllianceRegisterRecord, AllianceRegisterTotals } from "./types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
  records: AllianceRegisterRecord[];
  grandTotals: AllianceRegisterTotals;
  searchQuery: string;
  isLoading: boolean;
}

export function AllianceRegisterTable({ records, grandTotals, searchQuery, isLoading }: TableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 25,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
      : 0;

  const formatVal = (val: number) => {
    if (val === 0 || val === null || val === undefined) return "-";
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          Loading Alliance Register records...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Action status info bar */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div>
          Showing <span className="font-bold text-foreground">{records.length.toLocaleString()}</span> alliance transaction memos
        </div>
      </div>

      {/* Clean Minimalist Matrix Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[700px] relative">
          <table className="w-full text-left border-collapse min-w-[3400px] text-xs">
            {/* Clean Light-Themed Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              <tr>
                <th className="py-3 px-3.5 w-[160px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Sales Tax Invoice
                </th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Date & Time
                </th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  Retail Price
                </th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  Retail WOST
                </th>
                <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-rose-600 dark:text-rose-400">
                  Discount
                </th>
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right text-slate-600 dark:text-slate-400">
                  S. Tax
                </th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  Net Sale
                </th>

                {/* 12 Tender Breakdown Columns */}
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                  Cash Sale
                </th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                  Cash Return
                </th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                  Card Sale
                </th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                  Credit Sale
                </th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-violet-700 dark:text-violet-400 whitespace-nowrap">
                  Gift Voucher
                </th>
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                  Credit Voucher
                </th>
                <th className="py-3 px-3 w-[145px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                  Exchange Voucher
                </th>
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                  Claim Voucher
                </th>
                <th className="py-3 px-3 w-[155px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                  Corporate Voucher
                </th>
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                  Credit Issued
                </th>
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  Reward Voucher
                </th>
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  On Credit
                </th>

                {/* Card / Alliance Metadata */}
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  BIN No.
                </th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                  4 Digit Card No.
                </th>
                <th className="py-3 px-3.5 w-[160px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Card Name
                </th>
                <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                  Auth ID
                </th>
                <th className="py-3 px-3.5 w-[200px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Alliance Option
                </th>
                <th className="py-3 px-3 w-[180px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Remarks
                </th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Gift Voucher No.
                </th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Credit Voucher No.
                </th>
                <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Claim Voucher No.
                </th>
                <th className="py-3 px-3.5 w-[130px] shrink-0">
                  Credit Issued No.
                </th>
              </tr>
            </thead>

            {/* Clean Light-Themed Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={29} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {records.length === 0 ? (
                <tr>
                  <td colSpan={29} className="p-14 text-center text-muted-foreground font-medium text-xs">
                    No matching alliance register records found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                virtualItems.map((virtualRow) => {
                  const row = records[virtualRow.index];
                  if (!row) return null;

                  return (
                    <tr
                      key={row.id || virtualRow.index}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors border-b border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                    >
                      <td className="py-2.5 px-3.5 border-r border-slate-200 dark:border-slate-800 font-bold font-mono text-indigo-700 dark:text-indigo-400">
                        {highlight(row.invoiceNo, searchQuery)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-muted-foreground whitespace-nowrap">
                        {row.date} <span className="text-[10px]">{row.time}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.retailPrice)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.retailWost)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatVal(row.discount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-muted-foreground">
                        {formatVal(row.sTax)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10">
                        {formatVal(row.netSale)}
                      </td>

                      {/* 12 Tender Breakdown Cells */}
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                        {formatVal(row.cashSale)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatVal(row.cashReturn)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {formatVal(row.cardSale)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                        {formatVal(row.creditSale)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.giftVoucherAmount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.creditVoucherAmount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.exchangeVoucherAmount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.claimVoucherAmount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.giftVoucherCorporate)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-red-600 dark:text-red-400">
                        {formatVal(row.creditVoucherIssuedAmount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                        {formatVal(row.rewardVoucherAmount)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold">
                        {formatVal(row.onCreditAmount)}
                      </td>

                      {/* Card / Alliance Metadata */}
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                        {highlight(row.binNo || row.prefixCardNo || "-", searchQuery)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]">
                        {highlight(row.cardNo || row.cardLast4 || "-", searchQuery)}
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={row.cardName}>
                        {highlight(row.cardName || "-", searchQuery)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]">
                        {highlight(row.authId || "-", searchQuery)}
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-slate-200 dark:border-slate-800 font-semibold text-indigo-900 dark:text-indigo-300 truncate max-w-[200px]" title={row.allianceOption}>
                        {highlight(row.allianceOption || "-", searchQuery)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-muted-foreground truncate max-w-[180px]" title={row.remarks}>
                        {highlight(row.remarks || "-", searchQuery)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                        {row.giftVoucherCode || "-"}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                        {row.creditCode || "-"}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                        {row.claimCode || "-"}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">
                        {row.creditVoucherIssued || "-"}
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={29} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Clean Light-Themed Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 shadow-md">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-300 dark:border-slate-600 font-black">
                  GRAND TOTALS
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black">
                  {formatVal(grandTotals.retailPrice)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black">
                  {formatVal(grandTotals.retailWost)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-rose-600 dark:text-rose-400">
                  {formatVal(grandTotals.discount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.sTax)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30">
                  {formatVal(grandTotals.netSale)}
                </td>

                {/* 12 Tender Breakdown Totals */}
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-teal-700 dark:text-teal-400">
                  {formatVal(grandTotals.cashSale)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-rose-600 dark:text-rose-400">
                  {formatVal(grandTotals.cashReturn)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-indigo-700 dark:text-indigo-400">
                  {formatVal(grandTotals.cardSale)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-sky-700 dark:text-sky-400">
                  {formatVal(grandTotals.creditSale)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.giftVoucherAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.creditVoucherAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.exchangeVoucherAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.claimVoucherAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.giftVoucherCorporate)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black text-red-600 dark:text-red-400">
                  {formatVal(grandTotals.creditVoucherIssuedAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right">
                  {formatVal(grandTotals.rewardVoucherAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-right font-black">
                  {formatVal(grandTotals.onCreditAmount)}
                </td>

                {/* Card / Alliance Metadata Totals */}
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-center">-</td>
                <td className="py-3 px-3.5 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600 text-center">-</td>
                <td className="py-3 px-3.5 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">-</td>
                <td className="py-3 px-3.5">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
