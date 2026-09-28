import React, { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import {
  SalesReturnMatrixRow,
  SalesReturnTotals,
  SalesReturnNode,
  SalesReturnLineItem,
  ReturnSubType,
} from "./types";
import {
  Barcode,
  ChevronRight,
  ChevronDown,
  UnfoldVertical,
  FoldVertical,
  Info,
  Receipt,
  RotateCcw,
  UserCheck,
  CreditCard,
  Coins,
  Gift,
  Ticket,
  Repeat,
  ShieldAlert,
  Building2,
  Award,
  Undo2,
  Eye,
  Percent,
  Sparkles,
  Zap,
  Tag,
  Handshake,
  User,
  Phone,
  CreditCard as IdCard,
  MapPin,
  Mail,
  Calendar,
  Layers,
  FileText,
  Copy,
  Check,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type SalesReturnViewMode = "audit" | "standard" | "grid";

interface SalesReturnListTableProps {
  rows?: SalesReturnMatrixRow[];
  grandTotals?: SalesReturnTotals;
  onToggleRow?: (rowId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub Type Badge Helper
// ─────────────────────────────────────────────────────────────────────────────
function SubTypeBadge({ subType }: { subType?: string }) {
  if (subType === "EXCHANGE_SR") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[10px] font-mono font-bold flex items-center gap-1">
        <Repeat className="h-3 w-3 text-amber-600" />
        <span>Exchange (_SR)</span>
      </Badge>
    );
  }
  if (subType === "REFUND_RF") {
    return (
      <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 text-[10px] font-mono font-bold flex items-center gap-1">
        <Coins className="h-3 w-3 text-rose-600" />
        <span>Refund (RF)</span>
      </Badge>
    );
  }
  if (subType === "CLAIM_CLM") {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 text-[10px] font-mono font-bold flex items-center gap-1">
        <ShieldAlert className="h-3 w-3 text-purple-600" />
        <span>Claim (_CLM)</span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-mono">
      {subType || "RETURN"}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 360° Return Detail Inspector Modal Dialog
// ─────────────────────────────────────────────────────────────────────────────
function ReturnInspectorDialog({
  returnDoc,
  open,
  onOpenChange,
}: {
  returnDoc: SalesReturnNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedReturnNo, setCopiedReturnNo] = useState(false);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);

  if (!returnDoc) return null;

  const t = returnDoc.totals;
  const cust = returnDoc.customerDetails;
  const items = returnDoc.items || [];
  const voucher = returnDoc.voucherDetails;

  const grossVal = t.grossAmount || 0;
  const valExcl = t.wostAmount || grossVal / 1.18;
  const qty = t.totalItems || 0;
  const unitPriceWost = qty > 0 ? valExcl / qty : 0;
  const discVal = t.discountAmount || 0;
  const discWost = t.discountWostAmount || discVal / 1.18;
  const amtAfterDisc = t.amountAfterDiscount || Math.max(0, valExcl - discWost);
  const taxVal = t.taxAmount || 0;
  const valIncl = t.netAmount || 0;

  const copyText = (text: string, isReturn: boolean) => {
    navigator.clipboard.writeText(text);
    if (isReturn) {
      setCopiedReturnNo(true);
      toast.success(`Copied Return #${text} to clipboard`);
      setTimeout(() => setCopiedReturnNo(false), 2000);
    } else {
      setCopiedInvoiceNo(true);
      toast.success(`Copied Invoice #${text} to clipboard`);
      setTimeout(() => setCopiedInvoiceNo(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        noScroll={true}
        className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white border-b border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black tracking-tight text-white">
                      {returnDoc.returnNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(returnDoc.returnNumber, true)}
                      className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy return number"
                    >
                      {copiedReturnNo ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <SubTypeBadge subType={returnDoc.subType} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium mt-0.5">
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {returnDoc.createdAt ? new Date(returnDoc.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-"}
                    </span>
                    <span>&bull;</span>
                    <span className="text-amber-200">Location: <strong>{returnDoc.locationName || "Store"}</strong></span>
                    <span>&bull;</span>
                    <span className="text-amber-200">Cashier: <strong>{returnDoc.cashierName || "Counter"}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Original Invoice Reference pill */}
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Original Sale Reference
              </div>
              <div className="flex items-center gap-2 justify-end mt-0.5">
                <span className="font-mono font-bold text-white text-sm">
                  {returnDoc.originalOrderNumber || "Direct / No Invoice"}
                </span>
                {returnDoc.originalOrderNumber && (
                  <button
                    type="button"
                    onClick={() => copyText(returnDoc.originalOrderNumber, false)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Copy original invoice number"
                  >
                    {copiedInvoiceNo ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Row: Customer Identification & Return Reason Audit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Identification Card */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-4 w-4 text-indigo-500" />
                  Customer Profile & Contact
                </h4>
                {returnDoc.customerCode && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Code: {returnDoc.customerCode}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {cust?.name || returnDoc.customerName || "Walk-in Customer"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Phone Number</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {cust?.phone || returnDoc.customerPhone || "-"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">CNIC / ID Card</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {cust?.cnic || returnDoc.customerCnic || "-"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email / Address</span>
                  <span className="text-slate-600 dark:text-slate-400 truncate block">
                    {cust?.address || cust?.email || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Voucher Issued & Return Settlement Card */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Ticket className="h-4 w-4 text-amber-500" />
                  Voucher Issued & Settlement Audit
                </h4>
                <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-[10px]">
                  Mode: {returnDoc.refundMode || "VOUCHER"}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                {/* Voucher Details */}
                {returnDoc.voucherCode || voucher?.code ? (
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">
                        Voucher Issued Against Return
                      </span>
                      <span className="font-mono font-black text-sm text-amber-900 dark:text-amber-200">
                        {returnDoc.voucherCode || voucher?.code}
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-0.5">
                        Type: {voucher?.voucherType || (returnDoc.subType === "EXCHANGE_SR" ? "Exchange Voucher" : returnDoc.subType === "CLAIM_CLM" ? "Claim Voucher" : "Credit Voucher")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Face Value</span>
                      <span
                        className="font-mono font-black text-base text-amber-900 dark:text-amber-200 cursor-help"
                        title={`Voucher Face Value: ${(returnDoc.voucherAmount || voucher?.faceValue || t.voucherIssuedAmount || valIncl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      >
                        {(returnDoc.voucherAmount || voucher?.faceValue || t.voucherIssuedAmount || valIncl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 text-xs">No voucher generated</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Direct Cash/Card Return</span>
                  </div>
                )}

                {/* Cash vs Card vs Voucher Breakdown */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">Cash Refund</span>
                    <span
                      className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 block cursor-help"
                      title={`Cash Refund: ${(t.cashRefund || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    >
                      {(t.cashRefund || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">Card Refund</span>
                    <span
                      className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block cursor-help"
                      title={`Card Refund: ${(t.cardRefund || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    >
                      {(t.cardRefund || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">Voucher Total</span>
                    <span
                      className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 block cursor-help"
                      title={`Voucher Total: ${(t.voucherIssuedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    >
                      {(t.voucherIssuedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Sequence Valuation Strip */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Return Financial Valuation Sequence (Without Sales Tax Analysis)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Standard Sales Tax Base: 18% (Divisor: 1.18)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60" title={`Return Quantity: ${qty} pcs`}>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Return Qty</span>
                <span className="text-base font-black font-mono text-white">{qty}</span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60" title={`Avg Unit Price WOST: ${unitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Avg Unit Price WOST</span>
                <span className="text-sm font-bold font-mono text-slate-200 truncate block">
                  {unitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60" title={`Value Excl. (WOST): ${valExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Value Excl. (WOST)</span>
                <span className="text-sm font-black font-mono text-amber-300 truncate block">
                  {valExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60" title={`Discount (WOST): ${discWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Discount (WOST)</span>
                <span className="text-sm font-bold font-mono text-rose-400 truncate block">
                  {discWost > 0 ? `-${discWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00"}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60" title={`Amount After Discount: ${amtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Amt After Disc</span>
                <span className="text-sm font-black font-mono text-sky-300 truncate block">
                  {amtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60" title={`Sales Tax (18%): ${taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Sales Tax (18%)</span>
                <span className="text-sm font-bold font-mono text-emerald-400 truncate block">
                  {taxVal > 0 ? `+${taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00"}
                </span>
              </div>

              <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-2.5 rounded-xl border border-amber-400 text-white shadow-lg" title={`Net Value Incl. Tax: ${valIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-100 block">Net Value Incl.</span>
                <span className="text-base font-black font-mono text-white truncate block">
                  {valIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Reason & Claim Status Remarks */}
          {(returnDoc.reason || returnDoc.claimStatus) && (
            <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>Return Reason:</strong> {returnDoc.reason || "Standard Customer Return"}
                </span>
              </div>
              {returnDoc.claimStatus && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px]">
                  Claim Status: {returnDoc.claimStatus}
                </Badge>
              )}
            </div>
          )}

          {/* Returned Items Breakdown Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Barcode className="h-4 w-4 text-indigo-500" />
                Returned Line Items ({items.length})
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Total Qty: <strong>{qty} pcs</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Item Details</th>
                    <th className="py-2.5 px-2">Size / Color</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right">Unit Price</th>
                    <th className="py-2.5 px-2 text-right">WOST Price</th>
                    <th className="py-2.5 px-2 text-right">Value Excl.</th>
                    <th className="py-2.5 px-2 text-right">Discount</th>
                    <th className="py-2.5 px-2 text-right">Tax (18%)</th>
                    <th className="py-2.5 px-3 text-right font-black">Net Total</th>
                    <th className="py-2.5 px-3">Item Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{it.description || "Returned Item"}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span>SKU: {it.sku || "-"}</span>
                          <span>&bull;</span>
                          <span>Bar: {it.barCode || "-"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                        {it.sizeName || "-"} / {it.colorName || "-"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100" title={`Qty: ${it.quantity} pcs`}>
                        {it.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400" title={`Unit Price: ${it.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                        {it.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400" title={`Price WOST: ${(it.priceWost || it.unitPrice / 1.18).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                        {(it.priceWost || it.unitPrice / 1.18).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold text-amber-700 dark:text-amber-400" title={`Value Excl.: ${(it.valueExcl || (it.quantity * it.unitPrice) / 1.18).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                        {(it.valueExcl || (it.quantity * it.unitPrice) / 1.18).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-rose-600 dark:text-rose-400" title={`Discount: ${it.discountAmount > 0 ? it.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}`}>
                        {it.discountAmount > 0 ? `-${it.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400" title={`Tax (18%): ${it.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                        {it.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100" title={`Line Total: ${it.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                        {it.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 italic max-w-[140px] truncate" title={it.returnReason || returnDoc.reason}>
                        {it.returnReason || returnDoc.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Registered Return Document &bull; ERP Audited Record
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 font-semibold"
          >
            Close Inspector
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline 360° Return Audit Banner
// ─────────────────────────────────────────────────────────────────────────────
function InlineReturnAuditBanner({
  item,
  colSpan,
}: {
  item: SalesReturnNode;
  colSpan: number;
}) {
  const cust = item.customerDetails;
  const voucher = item.voucherDetails;
  const t = item.totals;

  return (
    <tr className="bg-amber-50/40 dark:bg-slate-950/60 border-b border-amber-100 dark:border-amber-950/80">
      <td colSpan={colSpan} className="p-3 pl-12 pr-4">
        <div className="rounded-xl border border-amber-200 dark:border-amber-950/60 bg-white/95 dark:bg-slate-900/90 p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                Return Audit 360° Summary &bull; Return #{item.returnNumber}
              </span>
              <SubTypeBadge subType={item.subType} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Original Invoice: <strong className="font-mono text-slate-800 dark:text-slate-200">{item.originalOrderNumber || "Direct"}</strong></span>
              <span>&bull;</span>
              <span>Cashier: <strong className="text-slate-800 dark:text-slate-200">{item.cashierName || "Counter"}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            {/* 1. Customer & CNIC */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <User className="h-3 w-3 text-indigo-500" />
                Customer Identity
              </span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {cust?.name || item.customerName || "Walk-in"}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Phone: <span className="font-bold text-slate-700 dark:text-slate-300">{cust?.phone || item.customerPhone || "-"}</span>
              </div>
              {cust?.cnic && (
                <div className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  CNIC: {cust.cnic}
                </div>
              )}
            </div>

            {/* 2. Voucher Issued Against */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                <Ticket className="h-3 w-3 text-amber-500" />
                Voucher Issued
              </span>
              {item.voucherCode ? (
                <div className="space-y-0.5">
                  <div className="font-mono font-black text-amber-900 dark:text-amber-200 text-xs">
                    {item.voucherCode}
                  </div>
                  <div
                    className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 cursor-help"
                    title={`Voucher Amount: ${(item.voucherAmount || t.voucherIssuedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  >
                    {(item.voucherAmount || t.voucherIssuedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">No voucher issued</div>
              )}
            </div>

            {/* 3. Refund Tenders */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Coins className="h-3 w-3 text-rose-500" />
                Tender Settlement
              </span>
              <div className="text-[11px] flex justify-between">
                <span className="text-slate-500">Cash:</span>
                <span
                  className="font-mono font-bold text-rose-600 dark:text-rose-400 cursor-help"
                  title={`Cash Refund: ${(t.cashRefund || 0).toLocaleString()}`}
                >
                  {(t.cashRefund || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] flex justify-between">
                <span className="text-slate-500">Card:</span>
                <span
                  className="font-mono font-bold text-indigo-600 dark:text-indigo-400 cursor-help"
                  title={`Card Refund: ${(t.cardRefund || 0).toLocaleString()}`}
                >
                  {(t.cardRefund || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* 4. Reason & Claim Status */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Info className="h-3 w-3 text-purple-500" />
                Reason & Claim Status
              </span>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate" title={item.reason}>
                {item.reason || "Standard Return"}
              </div>
              {item.claimStatus && (
                <div className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  Status: {item.claimStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Virtualized Sales Return List Table
// ─────────────────────────────────────────────────────────────────────────────
export function SalesReturnListTable({
  rows = [],
  grandTotals = {
    returnCount: 0,
    totalItems: 0,
    grossAmount: 0,
    wostAmount: 0,
    discountAmount: 0,
    discountWostAmount: 0,
    amountAfterDiscount: 0,
    taxAmount: 0,
    netAmount: 0,
    cashRefund: 0,
    cardRefund: 0,
    voucherIssuedAmount: 0,
    exchangeVoucherAmount: 0,
    creditVoucherAmount: 0,
    claimVoucherAmount: 0,
    rewardVoucherAmount: 0,
  },
  onToggleRow,
  onExpandAll,
  onCollapseAll,
}: SalesReturnListTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [inspectingReturn, setInspectingReturn] = useState<SalesReturnNode | null>(null);

  // Multi-Mode Display State: "audit", "standard", "grid"
  const [viewMode, setViewMode] = useState<SalesReturnViewMode>("audit");
  
  // Track manually toggled return audit strips
  const [openAuditReturnIds, setOpenAuditReturnIds] = useState<Set<string>>(new Set());
  const [unfoldAllAudit, setUnfoldAllAudit] = useState<boolean>(false);

  const safeRows = rows || [];

  const toggleReturnAudit = (id: string) => {
    setOpenAuditReturnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUnfoldAllAudit = () => {
    setUnfoldAllAudit((prev) => !prev);
    if (!unfoldAllAudit) {
      const allIds = new Set<string>();
      safeRows.forEach((r) => {
        if (r.type === "return-row") allIds.add(r.id);
      });
      setOpenAuditReturnIds(allIds);
    } else {
      setOpenAuditReturnIds(new Set());
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: safeRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatVal = (val?: number) =>
    val === undefined || val === 0 ? "-" : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Grand Totals Calculations
  const grandGross = grandTotals?.grossAmount || 0;
  const grandValExcl = grandTotals?.wostAmount || (grandGross > 0 ? grandGross / 1.18 : 0);
  const grandDisc = grandTotals?.discountAmount || 0;
  const grandDiscWost = grandTotals?.discountWostAmount || (grandDisc > 0 ? grandDisc / 1.18 : 0);
  const grandAmtAfterDisc = grandTotals?.amountAfterDiscount || Math.max(0, grandValExcl - grandDiscWost);
  const grandTax = grandTotals?.taxAmount || 0;
  const grandValIncl = grandTotals?.netAmount || 0;

  const isGridMode = viewMode === "grid";
  const totalColSpan = isGridMode ? 32 : 18;

  return (
    <div className="space-y-3">
      {/* 360° Return Inspector Modal Dialog */}
      <ReturnInspectorDialog
        returnDoc={inspectingReturn}
        open={Boolean(inspectingReturn)}
        onOpenChange={(open) => !open && setInspectingReturn(null)}
      />

      {/* Top Toolbar: View Density Switcher + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> return records & lines
            {grandTotals.returnCount > rows.length && (
              <span className="text-[11px] text-slate-500 font-normal">
                (Grand Totals include all {grandTotals.returnCount.toLocaleString()} returns)
              </span>
            )}
          </span>

          {/* Segmented View Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("audit")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5",
                viewMode === "audit"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>360° Audit View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("standard")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5",
                viewMode === "standard"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Standard Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Full Audit Grid</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {viewMode === "audit" && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleUnfoldAllAudit}
              className="h-7 px-2.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 rounded-lg gap-1 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <Sparkles className="h-3 w-3 text-amber-600" />
              {unfoldAllAudit ? "Collapse All 360° Panels" : "Preview All 360° Details"}
            </Button>
          )}

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
              <FoldVertical className="h-3 w-3 text-amber-600" />
              Collapse All
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Container with 2-Tier Grouped Matrix Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[720px] relative">
          <table className={cn("w-full text-left border-collapse text-xs", isGridMode ? "min-w-[4200px]" : "min-w-[2800px]")}>
            {/* 2-Tier Grouped Matrix Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              {/* Tier 1: Group Super-Headers */}
              <tr className="border-b border-slate-200/90 dark:border-slate-700/90 bg-slate-200/50 dark:bg-slate-900/60 font-black">
                <th colSpan={2} className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  Return & Original Reference
                </th>

                <th colSpan={isGridMode ? 3 : 2} className="py-2 px-3 text-center border-r border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                  Return Classification & Sub Type
                </th>

                {isGridMode ? (
                  <th colSpan={4} className="py-2 px-3 text-center border-r border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200">
                    Customer Profile & Identification
                  </th>
                ) : (
                  <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">
                    Customer
                  </th>
                )}

                <th colSpan={3} className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  Register Metadata
                </th>

                <th colSpan={7} className="py-2 px-3 text-center border-r border-slate-300 dark:border-slate-600 bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-extrabold">
                  Financial Valuation Sequence (WOST Analysis)
                </th>

                <th colSpan={isGridMode ? 3 : 2} className="py-2 px-3 text-center border-r border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold">
                  Voucher Issued Against
                </th>

                <th colSpan={2} className="py-2 px-3 text-center border-r border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold">
                  Cash & Card Refunds
                </th>

                <th className="py-2 px-3">
                  Reason & Notes
                </th>
              </tr>

              {/* Tier 2: Specific Sub-Column Headers */}
              <tr>
                <th className="py-2.5 px-3.5 w-[260px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Location / Return # / Item Description
                </th>
                <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Original Invoice #
                </th>

                {/* SubType Sub-columns */}
                <th className="py-2.5 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                  Sub Type
                </th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                  Refund Mode
                </th>
                {isGridMode && (
                  <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Claim Status
                  </th>
                )}

                {/* Customer Sub-columns */}
                {isGridMode ? (
                  <>
                    <th className="py-2.5 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700">Customer Name</th>
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">Phone #</th>
                    <th className="py-2.5 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-indigo-700 dark:text-indigo-300">CNIC / ID</th>
                    <th className="py-2.5 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">Cust Code</th>
                  </>
                ) : (
                  <th className="py-2.5 px-3 w-[145px] shrink-0 border-r border-slate-200 dark:border-slate-700">Customer</th>
                )}

                {/* Register Metadata */}
                <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Date & Time</th>
                <th className="py-2.5 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">Location</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">Cashier</th>

                {/* Financial Sequence */}
                <th className="py-2.5 px-2.5 w-[75px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700">Ret Qty</th>
                <th className="py-2.5 px-3 w-[115px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700">Unit Price WOST</th>
                <th className="py-2.5 px-3 w-[125px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 font-bold">Value Excl.</th>
                <th className="py-2.5 px-3 w-[115px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">Discount WOST</th>
                <th className="py-2.5 px-3 w-[125px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-400">Amt After Disc</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400">Sales Tax (18%)</th>
                <th className="py-2.5 px-3 w-[135px] shrink-0 text-right border-r border-slate-300 dark:border-slate-600 font-black text-slate-900 dark:text-slate-100 bg-slate-200/40 dark:bg-slate-800/40">Value Incl. (Net)</th>

                {/* Voucher Issued */}
                <th className="py-2.5 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-amber-700 dark:text-amber-400 font-bold">
                  Voucher Issued
                </th>
                <th className="py-2.5 px-3 w-[115px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 font-mono">
                  Voucher Value
                </th>
                {isGridMode && (
                  <th className="py-2.5 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Voucher Type
                  </th>
                )}

                {/* Cash / Card Refund */}
                <th className="py-2.5 px-3 w-[110px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 font-mono">
                  Cash Refund
                </th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 text-right border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-mono">
                  Card Refund
                </th>

                {/* Reason */}
                <th className="py-2.5 px-3 w-[200px] shrink-0">
                  Return Reason
                </th>
              </tr>
            </thead>

            {/* Virtualized Table Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={totalColSpan} />
                </tr>
              )}

              {virtualItems.map((virtualItem) => {
                const row = rows[virtualItem.index];
                if (!row) return null;

                // ── 1. Sub Type Header Row ──
                if (row.type === "subType-header") {
                  const t = row.totals;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onToggleRow?.(row.id)}
                      className="bg-amber-100/70 dark:bg-amber-950/40 border-y-2 border-amber-300 dark:border-amber-800 font-bold cursor-pointer hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors select-none"
                    >
                      <td colSpan={totalColSpan} className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                              {row.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <SubTypeBadge subType={row.subType} />
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                              ({row.itemCount} returns)
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span title={`Total Return Quantity: ${t.totalItems} pcs`}>Qty: <strong className="text-slate-900 dark:text-slate-100">{t.totalItems}</strong></span>
                            <span title={`Value Excl. (WOST): ${formatVal(t.wostAmount || t.grossAmount / 1.18)}`}>Val Excl: <strong className="text-amber-700 dark:text-amber-400">{formatVal(t.wostAmount || t.grossAmount / 1.18)}</strong></span>
                            <span title={`Discount (WOST): ${formatVal(t.discountWostAmount || t.discountAmount / 1.18)}`}>Disc: <strong className="text-rose-600 dark:text-rose-400">{formatVal(t.discountWostAmount || t.discountAmount / 1.18)}</strong></span>
                            <span title={`Sales Tax (18%): ${formatVal(t.taxAmount)}`}>Tax: <strong className="text-emerald-600 dark:text-emerald-400">{formatVal(t.taxAmount)}</strong></span>
                            <span
                              className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-black cursor-help"
                              title={`Net Return Total (Tax Incl.): ${formatVal(t.netAmount)}`}
                            >
                              Net: {formatVal(t.netAmount)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // ── 2. Location Header Row ──
                if (row.type === "location-header") {
                  const t = row.totals;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onToggleRow?.(row.id)}
                      className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-700 font-semibold cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors select-none"
                    >
                      <td colSpan={totalColSpan} className="py-2 px-3 pl-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="p-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              {row.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </span>
                            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {row.locationName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              ({row.itemCount} returns)
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span title={`Location Return Quantity: ${t.totalItems} pcs`}>Qty: <strong>{t.totalItems}</strong></span>
                            <span title={`Location Net Return: ${formatVal(t.netAmount)}`}>Net: <strong className="text-amber-600 dark:text-amber-400">{formatVal(t.netAmount)}</strong></span>
                            <span title={`Location Vouchers Issued: ${formatVal(t.voucherIssuedAmount)}`}>Vouchers: <strong className="text-amber-700 dark:text-amber-300">{formatVal(t.voucherIssuedAmount)}</strong></span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // ── 3. Return Document Row ──
                if (row.type === "return-row") {
                  const ret = row.data;
                  const t = ret.totals;
                  const cust = ret.customerDetails;
                  const isAuditOpen = openAuditReturnIds.has(ret.id);

                  const grossVal = t.grossAmount || 0;
                  const valExcl = t.wostAmount || grossVal / 1.18;
                  const qty = t.totalItems || 0;
                  const unitPriceWost = qty > 0 ? valExcl / qty : 0;
                  const discWost = t.discountWostAmount || (t.discountAmount || 0) / 1.18;
                  const amtAfterDisc = t.amountAfterDiscount || Math.max(0, valExcl - discWost);
                  const taxVal = t.taxAmount || 0;
                  const valIncl = t.netAmount || 0;

                  return (
                    <React.Fragment key={row.id}>
                      <tr className="border-b border-slate-200 dark:border-slate-800 hover:bg-amber-50/30 dark:hover:bg-slate-800/40 transition-colors group">
                        {/* 1. Hierarchy & Return Number */}
                        <td className="py-2.5 px-3 pl-8 border-r border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleRow?.(row.id)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Toggle line items"
                            >
                              {row.isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-amber-600" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setInspectingReturn(ret)}
                              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 transition-colors"
                              title="Open 360° Return Detail Inspector"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <div>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs block">
                                {ret.returnNumber}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {ret.items?.length || 0} line items
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Original Invoice */}
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {ret.originalOrderNumber || <span className="text-slate-400 italic">Direct Return</span>}
                        </td>

                        {/* 3. SubType */}
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-center">
                          <SubTypeBadge subType={ret.subType} />
                        </td>

                        {/* 4. Refund Mode */}
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {ret.refundMode || "VOUCHER"}
                        </td>

                        {/* 5. Claim Status (Grid Mode) */}
                        {isGridMode && (
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]">
                            {ret.claimStatus ? (
                              <Badge variant="outline" className="text-[10px] text-purple-700 dark:text-purple-300">
                                {ret.claimStatus}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                        )}

                        {/* Customer Identification */}
                        {isGridMode ? (
                          <>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[140px]" title={cust?.name || ret.customerName}>
                              {cust?.name || ret.customerName || "Walk-in"}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400" title={cust?.phone || ret.customerPhone}>
                              {cust?.phone || ret.customerPhone || "-"}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono font-semibold text-indigo-700 dark:text-indigo-400" title={cust?.cnic || ret.customerCnic}>
                              {cust?.cnic || ret.customerCnic || "-"}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500" title={cust?.code || ret.customerCode}>
                              {cust?.code || ret.customerCode || "-"}
                            </td>
                          </>
                        ) : (
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[145px]" title={cust?.name || ret.customerName}>
                              {cust?.name || ret.customerName || "Walk-in"}
                            </div>
                            {(cust?.phone || ret.customerPhone) && (
                              <div className="font-mono text-[10px] text-slate-500">
                                {cust?.phone || ret.customerPhone}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Register Metadata */}
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {ret.createdAt ? new Date(ret.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "-"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[130px]" title={ret.locationName}>
                          {ret.locationName || "-"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[110px]" title={ret.cashierName}>
                          {ret.cashierName || "Counter"}
                        </td>

                        {/* Financial Sequence Valuation */}
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800" title={`Return Qty: ${qty} pcs`}>
                          {qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800" title={`Avg Unit Price (WOST): ${formatVal(unitPriceWost)}`}>
                          {formatVal(unitPriceWost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800" title={`Value Excl. (WOST): ${formatVal(valExcl)}`}>
                          {formatVal(valExcl)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800" title={`Discount (WOST): ${formatVal(discWost)}`}>
                          {formatVal(discWost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sky-700 dark:text-sky-400 border-r border-slate-200 dark:border-slate-800" title={`Amount After Discount: ${formatVal(amtAfterDisc)}`}>
                          {formatVal(amtAfterDisc)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800" title={`Sales Tax (18%): ${formatVal(taxVal)}`}>
                          {formatVal(taxVal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-100/50 dark:bg-slate-800/40 border-r border-slate-300 dark:border-slate-600" title={`Net Value Incl. Tax: ${formatVal(valIncl)}`}>
                          {formatVal(valIncl)}
                        </td>

                        {/* Voucher Issued Against */}
                        <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-amber-700 dark:text-amber-400" title={ret.voucherCode || "No voucher"}>
                          {ret.voucherCode || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800" title={`Voucher Amount: ${formatVal(ret.voucherAmount || t.voucherIssuedAmount)}`}>
                          {formatVal(ret.voucherAmount || t.voucherIssuedAmount)}
                        </td>
                        {isGridMode && (
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400" title={ret.voucherDetails?.voucherType || "Voucher Type"}>
                            {ret.voucherDetails?.voucherType || (ret.voucherCode ? "Return Voucher" : "-")}
                          </td>
                        )}

                        {/* Cash & Card Refund */}
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800" title={`Cash Refund: ${formatVal(t.cashRefund)}`}>
                          {formatVal(t.cashRefund)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800" title={`Card Refund: ${formatVal(t.cardRefund)}`}>
                          {formatVal(t.cardRefund)}
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={ret.reason}>
                          {ret.reason || "Standard Return"}
                        </td>
                      </tr>

                      {/* Optional Inline 360° Audit Banner */}
                      {viewMode === "audit" && isAuditOpen && (
                        <InlineReturnAuditBanner item={ret} colSpan={totalColSpan} />
                      )}
                    </React.Fragment>
                  );
                }

                // ── 4. Item Line Row ──
                if (row.type === "item-row") {
                  const it = row.data;
                  const priceWost = it.priceWost || it.unitPrice / 1.18;
                  const valExcl = it.valueExcl || (it.quantity * it.unitPrice) / 1.18;
                  const discWost = it.discountAmountWost || (it.discountAmount || 0) / 1.18;
                  const amtAfter = it.amountAfterDiscount || Math.max(0, valExcl - discWost);

                  return (
                    <tr
                      key={row.id}
                      className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors text-[11px]"
                    >
                      {/* Hierarchy indentation + Description */}
                      <td className="py-2 px-3 pl-14 border-r border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-slate-800 dark:text-slate-200" title={it.description}>
                          {it.description || "Returned Item"}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span>SKU: {it.sku || "-"}</span>
                          <span>&bull;</span>
                          <span>Bar: {it.barCode || "-"}</span>
                        </div>
                      </td>

                      {/* Size & Color in Invoice column */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500" title={`${it.sizeName || "-"} / ${it.colorName || "-"}`}>
                        {it.sizeName || "-"} / {it.colorName || "-"}
                      </td>

                      {/* Subtype placeholder */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400 font-mono">
                        Line Item
                      </td>

                      {/* Refund Mode placeholder */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400">
                        -
                      </td>

                      {isGridMode && (
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400">
                          -
                        </td>
                      )}

                      {/* Customer columns placeholder */}
                      {isGridMode ? (
                        <>
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                        </>
                      ) : (
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                      )}

                      {/* Register metadata placeholders */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>

                      {/* Financial Sequence Line Breakdown */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800" title={`Line Qty: ${it.quantity} pcs`}>
                        {it.quantity}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800" title={`Line Unit Price (WOST): ${formatVal(priceWost)}`}>
                        {formatVal(priceWost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800" title={`Line Value Excl. (WOST): ${formatVal(valExcl)}`}>
                        {formatVal(valExcl)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-500 border-r border-slate-200 dark:border-slate-800" title={`Line Discount (WOST): ${formatVal(discWost)}`}>
                        {formatVal(discWost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-sky-600 border-r border-slate-200 dark:border-slate-800" title={`Line Amount After Disc: ${formatVal(amtAfter)}`}>
                        {formatVal(amtAfter)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 border-r border-slate-200 dark:border-slate-800" title={`Line Tax (18%): ${formatVal(it.taxAmount)}`}>
                        {formatVal(it.taxAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/30 border-r border-slate-300 dark:border-slate-600" title={`Line Total (Tax Incl.): ${formatVal(it.lineTotal)}`}>
                        {formatVal(it.lineTotal)}
                      </td>

                      {/* Voucher placeholder */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400 text-right">-</td>
                      {isGridMode && (
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">-</td>
                      )}

                      {/* Cash / Card placeholder */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400 text-right">-</td>
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400 text-right">-</td>

                      {/* Line Reason */}
                      <td className="py-2 px-3 text-[10px] text-slate-500 italic truncate max-w-[200px]" title={it.returnReason}>
                        {it.returnReason || "-"}
                      </td>
                    </tr>
                  );
                }

                return null;
              })}

              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={totalColSpan} />
                </tr>
              )}
            </tbody>

            {/* Sticky Grand Totals Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-mono font-bold text-xs shadow-lg border-t-2 border-slate-700">
              <tr>
                <td colSpan={isGridMode ? 10 : 7} className="py-3 px-4 text-amber-400 tracking-wider uppercase font-black">
                  Grand Totals ({grandTotals.returnCount.toLocaleString()} returns)
                </td>

                {/* Financial Sequence Grand Totals */}
                <td className="py-3 px-2.5 text-right font-mono font-black text-white border-r border-slate-800" title={`Grand Total Units: ${grandTotals.totalItems.toLocaleString()} pcs`}>
                  {grandTotals.totalItems}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-300 border-r border-slate-800" title={`Grand Avg Unit Price (WOST): ${formatVal(grandTotals.totalItems > 0 ? grandValExcl / grandTotals.totalItems : 0)}`}>
                  {formatVal(grandTotals.totalItems > 0 ? grandValExcl / grandTotals.totalItems : 0)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300 font-black border-r border-slate-800" title={`Grand Total Value Excl. (WOST): ${formatVal(grandValExcl)}`}>
                  {formatVal(grandValExcl)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-300 font-black border-r border-slate-800" title={`Grand Total Discount (WOST): ${formatVal(grandDiscWost)}`}>
                  {formatVal(grandDiscWost)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sky-300 font-black border-r border-slate-800" title={`Grand Total Amount After Disc: ${formatVal(grandAmtAfterDisc)}`}>
                  {formatVal(grandAmtAfterDisc)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-300 font-black border-r border-slate-800" title={`Grand Total Sales Tax (18%): ${formatVal(grandTax)}`}>
                  {formatVal(grandTax)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-white bg-amber-600/60 border-r border-slate-800 text-sm" title={`Grand Total Net Return Value (Tax Incl.): ${formatVal(grandValIncl)}`}>
                  {formatVal(grandValIncl)}
                </td>

                {/* Voucher Issued Grand Totals */}
                <td className="py-3 px-3 border-r border-slate-800 text-amber-300">
                  Issued:
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300 font-black border-r border-slate-800" title={`Grand Total Vouchers Issued: ${formatVal(grandTotals.voucherIssuedAmount)}`}>
                  {formatVal(grandTotals.voucherIssuedAmount)}
                </td>
                {isGridMode && (
                  <td className="py-3 px-3 border-r border-slate-800 text-slate-400">-</td>
                )}

                {/* Cash & Card Refund Totals */}
                <td className="py-3 px-3 text-right font-mono text-rose-300 font-black border-r border-slate-800" title={`Grand Total Cash Refunded: ${formatVal(grandTotals.cashRefund)}`}>
                  {formatVal(grandTotals.cashRefund)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-indigo-300 font-black border-r border-slate-800" title={`Grand Total Card Refunded: ${formatVal(grandTotals.cardRefund)}`}>
                  {formatVal(grandTotals.cardRefund)}
                </td>

                <td className="py-3 px-3 text-slate-400">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
