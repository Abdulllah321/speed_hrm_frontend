"use client";

import React, { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  NetSalesListTableRow,
  NetSalesListTotals,
  NetSalesListDocumentNode,
} from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Undo2,
  Copy,
  Check,
  Eye,
  Store,
  Calendar,
  User,
  CreditCard,
  Coins,
  Ticket,
  Receipt,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NetSalesListTableProps {
  rows: NetSalesListTableRow[];
  grandTotals: NetSalesListTotals | null;
  onToggleLocation?: (locationKey: string) => void;
  onToggleDoc?: (docId: string) => void;
}

export function NetSalesListTable({
  rows,
  grandTotals,
  onToggleLocation,
  onToggleDoc,
}: NetSalesListTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<NetSalesListDocumentNode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row.type === "location-header") return 40;
      if (row.type === "document-header") return 46;
      return 36; // line-item
    },
    overscan: 15,
  });

  const formatCurr = (val?: number) =>
    (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied ${text}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
      {/* ── Table Matrix Header ── */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none shrink-0 z-10">
        <div className="col-span-3 flex items-center gap-1.5">
          <span>Type & Document / Article</span>
        </div>
        <div className="col-span-2">Date & Cashier</div>
        <div className="col-span-2">Customer & Channel</div>
        <div className="col-span-1 text-right">Net Qty</div>
        <div className="col-span-1 text-right">Gross (WOST / Ret)</div>
        <div className="col-span-1 text-right">Discount</div>
        <div className="col-span-1 text-right">Tax</div>
        <div className="col-span-1 text-right">Net Amount</div>
      </div>

      {/* ── Virtualized Rows Body ── */}
      <div
        ref={parentRef}
        className="overflow-y-auto max-h-[620px] min-h-[300px] relative divide-y divide-slate-100 dark:divide-slate-800/60"
      >
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Scale className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            No net sales documents match the selected filters.
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="transition-colors"
                >
                  {/* Location Header Row */}
                  {row.type === "location-header" && (
                    <div
                      onClick={() => onToggleLocation?.(row.locationKey)}
                      className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-semibold text-xs text-slate-800 dark:text-slate-200 items-center border-y border-slate-200/80 dark:border-slate-700/60"
                    >
                      <div className="col-span-6 flex items-center gap-2">
                        {row.isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <Store className="h-4 w-4 text-emerald-600" />
                        <span>{row.locationName}</span>
                      </div>
                      <div className="col-span-1 text-right font-mono text-xs">
                        {row.totals.netItems.toLocaleString()} pcs
                      </div>
                      <div className="col-span-1 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        {formatCurr(row.totals.netWostAmount)}
                      </div>
                      <div className="col-span-1 text-right font-mono text-xs text-amber-600">
                        {formatCurr(row.totals.netDiscountWostAmount)}
                      </div>
                      <div className="col-span-1 text-right font-mono text-xs text-slate-500">
                        {formatCurr(row.totals.netTaxAmount)}
                      </div>
                      <div className="col-span-2 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        PKR {formatCurr(row.totals.totalNetAmount)}
                      </div>
                    </div>
                  )}

                  {/* Document Header Row */}
                  {row.type === "document-header" && (
                    <div
                      className={`grid grid-cols-12 gap-2 px-4 py-2 text-xs items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${
                        row.document.docType === "RETURN"
                          ? "bg-rose-50/30 dark:bg-rose-950/10"
                          : "bg-white dark:bg-slate-900"
                      }`}
                    >
                      {/* Col 1-3: Type & Doc# */}
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleDoc?.(row.document.id)}
                          className="text-slate-400 hover:text-slate-600 shrink-0"
                        >
                          {row.isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {row.document.docType === "SALE" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold py-0 h-4 shrink-0">
                            SALE
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 text-[10px] font-bold py-0 h-4 shrink-0">
                            RETURN
                          </Badge>
                        )}

                        <div className="min-w-0 truncate">
                          <span
                            className="font-bold font-mono text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
                            onClick={() => setSelectedDoc(row.document)}
                          >
                            {row.document.docNumber}
                          </span>
                          {row.document.refDocNumber && (
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                              (Ref: {row.document.refDocNumber})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(row.document.docNumber, row.document.id)}
                          className="text-slate-400 hover:text-slate-600 shrink-0"
                          title="Copy Document Number"
                        >
                          {copiedId === row.document.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDoc(row.document)}
                          className="text-slate-400 hover:text-emerald-600 shrink-0 ml-auto"
                          title="360° Inspector View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Col 4-5: Date & Cashier */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                          {new Date(row.document.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {row.document.cashierName} • {row.document.locationName}
                        </p>
                      </div>

                      {/* Col 6-7: Customer & Tenders */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                          {row.document.customerName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {row.document.customerPhone || row.document.paymentMethod}
                        </p>
                      </div>

                      {/* Col 8: Net Qty */}
                      <div className="col-span-1 text-right font-mono text-xs">
                        <span
                          className={
                            row.document.docType === "RETURN"
                              ? "text-rose-600 dark:text-rose-400 font-bold"
                              : "text-slate-800 dark:text-slate-200"
                          }
                        >
                          {row.document.docType === "RETURN"
                            ? `-${Math.abs(row.document.totals.totalItems)}`
                            : row.document.totals.totalItems}
                        </span>
                      </div>

                      {/* Col 9: Gross (WOST / Ret) */}
                      <div className="col-span-1 text-right font-mono text-xs">
                        <p
                          className={
                            row.document.docType === "RETURN"
                              ? "text-rose-600 dark:text-rose-400 font-semibold"
                              : "text-slate-800 dark:text-slate-200 font-semibold"
                          }
                        >
                          {row.document.docType === "RETURN" ? "-" : ""}
                          {formatCurr(Math.abs(row.document.totals.wostAmount))}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {row.document.docType === "RETURN" ? "-" : ""}
                          {formatCurr(Math.abs(row.document.totals.grossAmount))}
                        </p>
                      </div>

                      {/* Col 10: Discount */}
                      <div className="col-span-1 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        <p>
                          {row.document.docType === "RETURN" ? "-" : ""}
                          {formatCurr(Math.abs(row.document.totals.discountWostAmount))}
                        </p>
                        <p className="text-[9px] text-amber-700/60 dark:text-amber-500/60">
                          {row.document.docType === "RETURN" ? "-" : ""}
                          {formatCurr(Math.abs(row.document.totals.discountAmount))}
                        </p>
                      </div>

                      {/* Col 11: Tax */}
                      <div className="col-span-1 text-right font-mono text-xs text-slate-500">
                        {row.document.docType === "RETURN" ? "-" : ""}
                        {formatCurr(Math.abs(row.document.totals.taxAmount))}
                      </div>

                      {/* Col 12: Net Amount */}
                      <div className="col-span-1 text-right font-mono text-xs font-bold">
                        <span
                          className={
                            row.document.docType === "RETURN"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }
                        >
                          {row.document.docType === "RETURN" ? "-" : ""}
                          {formatCurr(Math.abs(row.document.totals.netAmount))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Line Item Row (Expanded Article) */}
                  {row.type === "line-item" && (
                    <div className="grid grid-cols-12 gap-2 pl-8 pr-4 py-1.5 text-[11px] items-center bg-slate-50/50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 border-l-2 border-emerald-500/40">
                      <div className="col-span-5 flex items-center gap-2 truncate">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {row.item.sku || row.item.barCode}
                        </span>
                        <span className="truncate text-slate-500">
                          {row.item.description}
                        </span>
                        {(row.item.sizeName || row.item.colorName) && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            [{row.item.sizeName} / {row.item.colorName}]
                          </span>
                        )}
                        {row.item.returnReason && (
                          <span className="text-[10px] text-rose-500 italic">
                            ({row.item.returnReason})
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-slate-400 font-mono text-[10px]">
                        Unit: {formatCurr(row.item.unitPrice)} (WOST: {formatCurr(row.item.priceWost)})
                      </div>

                      <div className="col-span-1 text-right font-mono">
                        <span className={row.docType === "RETURN" ? "text-rose-500 font-semibold" : ""}>
                          {row.docType === "RETURN" ? `-${Math.abs(row.item.quantity)}` : row.item.quantity}
                        </span>
                      </div>

                      <div className="col-span-1 text-right font-mono">
                        {row.docType === "RETURN" ? "-" : ""}
                        {formatCurr(Math.abs(row.item.valueExcl))}
                      </div>

                      <div className="col-span-1 text-right font-mono text-amber-600">
                        {row.docType === "RETURN" ? "-" : ""}
                        {formatCurr(Math.abs(row.item.discountAmountWost))}
                      </div>

                      <div className="col-span-1 text-right font-mono text-slate-400">
                        {row.docType === "RETURN" ? "-" : ""}
                        {formatCurr(Math.abs(row.item.taxAmount))}
                      </div>

                      <div className="col-span-1 text-right font-mono font-semibold">
                        <span className={row.docType === "RETURN" ? "text-rose-600" : "text-slate-900 dark:text-slate-100"}>
                          {row.docType === "RETURN" ? "-" : ""}
                          {formatCurr(Math.abs(row.item.lineTotal))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky Grand Totals Bottom Row ── */}
      {grandTotals && (
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 shrink-0 z-10 items-center">
          <div className="col-span-3 flex items-center gap-2">
            <span className="uppercase tracking-wider">Grand Total (Net Sales)</span>
            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
              {grandTotals.totalDocuments} Docs
            </Badge>
          </div>
          <div className="col-span-2 text-slate-500 text-[10px] font-mono">
            {grandTotals.salesOrderCount} Sold / {grandTotals.returnCount} Returned
          </div>
          <div className="col-span-2 text-slate-500 text-[10px] font-mono">
            Cash: {formatCurr(grandTotals.netCash)} | Card: {formatCurr(grandTotals.netCard)}
          </div>
          <div className="col-span-1 text-right font-mono font-black text-slate-900 dark:text-slate-100">
            {grandTotals.netItems.toLocaleString()} pcs
          </div>
          <div className="col-span-1 text-right font-mono">
            <p className="font-extrabold text-slate-900 dark:text-slate-100">
              {formatCurr(grandTotals.netWostAmount)}
            </p>
            <p className="text-[9px] font-normal text-slate-500">
              Ret: {formatCurr(grandTotals.netGrossAmount)}
            </p>
          </div>
          <div className="col-span-1 text-right font-mono text-amber-600 dark:text-amber-400">
            <p className="font-extrabold">{formatCurr(grandTotals.netDiscountWostAmount)}</p>
            <p className="text-[9px] font-normal text-amber-700/70 dark:text-amber-500/70">
              Ret: {formatCurr(grandTotals.netDiscountAmount)}
            </p>
          </div>
          <div className="col-span-1 text-right font-mono text-slate-500">
            {formatCurr(grandTotals.netTaxAmount)}
          </div>
          <div className="col-span-1 text-right font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
            PKR {formatCurr(grandTotals.totalNetAmount)}
          </div>
        </div>
      )}

      {/* ── 360° Inspector Dialog Modal ── */}
      {selectedDoc && (
        <Dialog open={Boolean(selectedDoc)} onOpenChange={(open) => !open && setSelectedDoc(null)}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-2">
                  {selectedDoc.docType === "SALE" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      SALES INVOICE
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                      SALES RETURN / REFUND
                    </Badge>
                  )}
                  <span className="font-mono">{selectedDoc.docNumber}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(selectedDoc.createdAt).toLocaleString()}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs mt-2">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Store</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedDoc.locationName}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Cashier</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedDoc.cashierName}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Customer</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedDoc.customerName}
                  </p>
                  {selectedDoc.customerPhone && (
                    <p className="text-[10px] text-slate-400 font-mono">{selectedDoc.customerPhone}</p>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">FBR Status</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedDoc.fbrInvoiceNumber || "N/A"}
                  </p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Gross Value (Without Sales Tax - WOST):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    PKR {formatCurr(selectedDoc.totals.wostAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Retail Gross Amount (incl tax):</span>
                  <span>PKR {formatCurr(selectedDoc.totals.grossAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Discounts Applied (WOST / Retail):</span>
                  <span>
                    -PKR {formatCurr(selectedDoc.totals.discountWostAmount)} / -PKR {formatCurr(selectedDoc.totals.discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Amount After Discount:</span>
                  <span>PKR {formatCurr(selectedDoc.totals.amountAfterDiscount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Sales Tax (GST):</span>
                  <span>PKR {formatCurr(selectedDoc.totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-emerald-700 dark:text-emerald-400">
                  <span>Net Revenue Document Total:</span>
                  <span>PKR {formatCurr(selectedDoc.totals.netAmount)}</span>
                </div>
              </div>

              {/* Tenders Paid / Refunded */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tender Settlements & Payment Modes
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold uppercase">Cash</span>
                    <p className="font-bold text-teal-950 dark:text-teal-100 font-mono mt-0.5">
                      PKR {formatCurr(selectedDoc.totals.cashAmount)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold uppercase">Card</span>
                    <p className="font-bold text-blue-950 dark:text-blue-100 font-mono mt-0.5">
                      PKR {formatCurr(selectedDoc.totals.cardAmount)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase">Vouchers</span>
                    <p className="font-bold text-purple-950 dark:text-purple-100 font-mono mt-0.5">
                      PKR{" "}
                      {formatCurr(
                        (selectedDoc.totals.giftVoucherAmount || 0) +
                          (selectedDoc.totals.exchangeVoucherAmount || 0) +
                          (selectedDoc.totals.creditVoucherAmount || 0) +
                          (selectedDoc.totals.claimVoucherAmount || 0) +
                          (selectedDoc.totals.rewardVoucherAmount || 0) +
                          (selectedDoc.totals.corporateVoucherAmount || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Document Articles ({selectedDoc.items.length})
                </span>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {selectedDoc.items.map((it) => (
                    <div key={it.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold font-mono text-slate-800 dark:text-slate-200 truncate">
                          {it.sku || it.barCode}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{it.description}</p>
                        {(it.sizeName || it.colorName) && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Size: {it.sizeName || "-"} | Color: {it.colorName || "-"}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {it.quantity} x PKR {formatCurr(it.unitPrice)}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Net: PKR {formatCurr(it.lineTotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDoc.notes && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-bold">Notes: </span>
                  {selectedDoc.notes}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
