"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AllianceRegisterRecord, AllianceRegisterTotals } from "./types";
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
    estimateSize: () => 40,
    overscan: 25,
  });

  const formatVal = (val: number) => {
    if (val === 0 || val === null || val === undefined) return "-";
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border/60 rounded-2xl bg-background shadow-sm">
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

      {/* Main Virtualized Container */}
      <div className="border border-border/60 rounded-2xl overflow-hidden bg-background shadow-sm">
        <div ref={parentRef} className="max-h-[640px] overflow-auto relative">
          <div className="min-w-[2800px]">
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-10 flex items-center bg-indigo-950 text-indigo-100 text-[11px] font-mono font-semibold uppercase tracking-wider h-11 border-b border-border/80 shadow-md">
              <div className="w-40 px-3">Sales Tax Invoice</div>
              <div className="w-28 px-2">Date</div>
              <div className="w-24 px-2">Time</div>
              <div className="w-32 px-2 text-right">Retail Price</div>
              <div className="w-32 px-2 text-right">Retail Price WOST</div>
              <div className="w-28 px-2 text-right text-rose-300 font-bold">Discount</div>
              <div className="w-28 px-2 text-right">S. Tax</div>
              <div className="w-36 px-2 text-right text-emerald-300 font-extrabold">Net Sale</div>
              <div className="w-28 px-2 text-right">Cash</div>
              <div className="w-28 px-2 text-right">Card</div>
              <div className="w-36 px-2">Prefix Card No.</div>
              <div className="w-28 px-2 text-center">Auth ID</div>
              <div className="w-28 px-2 text-center">Card No.</div>
              <div className="w-56 px-3">Alliance Option</div>
              <div className="w-48 px-2">Remarks</div>
              <div className="w-36 px-2">Gift Voucher</div>
              <div className="w-28 px-2 text-right">Amt</div>
              <div className="w-36 px-2">Credit Voucher</div>
              <div className="w-28 px-2 text-right">Amt</div>
              <div className="w-36 px-2">Claim Voucher</div>
              <div className="w-28 px-2 text-right">Amt</div>
              <div className="w-36 px-2">Credit Issued</div>
              <div className="w-28 px-2 text-right">Amt</div>
            </div>

            {/* Virtualized Body */}
            {records.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No matching alliance register records found for the selected filter criteria.
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
                  const row = records[virtualRow.index];

                  return (
                    <div
                      key={row.id || virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="border-b border-border/40 text-xs transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 flex items-center px-0 whitespace-nowrap text-slate-800 dark:text-slate-200"
                    >
                      <div className="w-40 px-3 shrink-0 font-bold font-mono text-indigo-700 dark:text-indigo-400">
                        {highlight(row.invoiceNo, searchQuery)}
                      </div>
                      <div className="w-28 px-2 shrink-0">{row.date}</div>
                      <div className="w-24 px-2 shrink-0 text-muted-foreground">{row.time}</div>
                      <div className="w-32 px-2 shrink-0 text-right font-mono">{formatVal(row.retailPrice)}</div>
                      <div className="w-32 px-2 shrink-0 text-right font-mono">{formatVal(row.retailWost)}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatVal(row.discount)}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono text-muted-foreground">{formatVal(row.sTax)}</div>
                      <div className="w-36 px-2 shrink-0 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">{formatVal(row.netSale)}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono">{formatVal(row.cash)}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono">{formatVal(row.card)}</div>
                      <div className="w-36 px-2 shrink-0 font-mono text-[11px]">{highlight(row.prefixCardNo || "-", searchQuery)}</div>
                      <div className="w-28 px-2 shrink-0 text-center font-mono text-[11px]">{highlight(row.authId || "-", searchQuery)}</div>
                      <div className="w-28 px-2 shrink-0 text-center font-mono text-[11px]">{row.cardNo ? `****${row.cardNo}` : "-"}</div>
                      <div className="w-56 px-3 shrink-0 font-semibold text-indigo-900 dark:text-indigo-300 truncate" title={row.allianceOption}>
                        {highlight(row.allianceOption || "-", searchQuery)}
                      </div>
                      <div className="w-48 px-2 shrink-0 text-muted-foreground truncate" title={row.remarks}>
                        {highlight(row.remarks || "-", searchQuery)}
                      </div>
                      <div className="w-36 px-2 shrink-0 font-mono text-[11px]">{row.giftVoucherCode || "-"}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono">{formatVal(row.giftVoucherAmt)}</div>
                      <div className="w-36 px-2 shrink-0 font-mono text-[11px]">{row.creditCode || "-"}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono">{formatVal(row.creditAmt)}</div>
                      <div className="w-36 px-2 shrink-0 font-mono text-[11px]">{row.claimCode || "-"}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono">{formatVal(row.claimAmt)}</div>
                      <div className="w-36 px-2 shrink-0 font-mono text-[11px]">{row.creditVoucherIssued || "-"}</div>
                      <div className="w-28 px-2 shrink-0 text-right font-mono">{formatVal(row.creditVoucherIssuedAmt)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Table Footer */}
            <div className="sticky bottom-0 z-10 flex items-center bg-indigo-950 text-indigo-100 uppercase text-[11px] font-mono font-bold h-11 border-t-2 border-indigo-900 shadow-md">
              <div className="w-40 px-3 shrink-0 font-black">GRAND TOTALS</div>
              <div className="w-28 px-2 shrink-0">-</div>
              <div className="w-24 px-2 shrink-0">-</div>
              <div className="w-32 px-2 shrink-0 text-right font-black">{formatVal(grandTotals.retailPrice)}</div>
              <div className="w-32 px-2 shrink-0 text-right font-black">{formatVal(grandTotals.retailWost)}</div>
              <div className="w-28 px-2 shrink-0 text-right font-black text-rose-300">{formatVal(grandTotals.discount)}</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.sTax)}</div>
              <div className="w-36 px-2 shrink-0 text-right font-black text-emerald-300">{formatVal(grandTotals.netSale)}</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.cash)}</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.card)}</div>
              <div className="w-36 px-2 shrink-0">-</div>
              <div className="w-28 px-2 shrink-0 text-center">-</div>
              <div className="w-28 px-2 shrink-0 text-center">-</div>
              <div className="w-56 px-3 shrink-0">-</div>
              <div className="w-48 px-2 shrink-0">-</div>
              <div className="w-36 px-2 shrink-0">-</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.giftVoucherAmt)}</div>
              <div className="w-36 px-2 shrink-0">-</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.creditAmt)}</div>
              <div className="w-36 px-2 shrink-0">-</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.claimAmt)}</div>
              <div className="w-36 px-2 shrink-0">-</div>
              <div className="w-28 px-2 shrink-0 text-right">{formatVal(grandTotals.creditVoucherIssuedAmt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
