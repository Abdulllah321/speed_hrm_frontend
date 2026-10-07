import React, { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { SalesListTableRow, SalesListTotals, SalesListViewMode } from "./types";
import {
  Barcode,
  ChevronRight,
  ChevronDown,
  UnfoldVertical,
  FoldVertical,
  Info,
  Receipt,
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

interface SalesListTableProps {
  rows: SalesListTableRow[];
  grandTotals: SalesListTotals;
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 360° Sale Inspector Modal Dialog
// ─────────────────────────────────────────────────────────────────────────────
function SaleInspectorDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: SalesListTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const t = invoice.totals;
  const disc = invoice.discountDetails;
  const cust = invoice.customerDetails;
  const tender = invoice.tenderDetails;
  const items = invoice.items || [];

  const grossVal = t.grossAmount || 0;
  const valExcl = t.wostAmount !== undefined ? t.wostAmount : (grossVal - (t.taxAmount || 0));
  const qty = t.totalItems || 0;
  const unitPriceWost = qty > 0 ? valExcl / qty : 0;
  const discVal = t.discountAmount || 0;
  const discWost = disc?.wostDiscount ?? (t.discountWostAmount !== undefined ? t.discountWostAmount : (discVal - ((discVal / (grossVal || 1)) * (t.taxAmount || 0))));
  const amtAfterDisc = t.amountAfterDiscount !== undefined ? t.amountAfterDiscount : Math.max(0, valExcl - discWost);
  const taxVal = t.taxAmount || 0;
  const valIncl = t.netAmount || 0;

  const copyOrderNo = () => {
    if (invoice.orderNumber) {
      navigator.clipboard.writeText(invoice.orderNumber);
      setCopied(true);
      toast.success(`Copied ${invoice.orderNumber} to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allVouchers = [
    ...(tender?.giftVouchers || []),
    ...(tender?.creditVouchers || []),
    ...(tender?.exchangeVouchers || []),
    ...(tender?.claimVouchers || []),
    ...(tender?.corporateVouchers || []),
    ...(tender?.rewardVouchers || []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        noScroll={true}
        className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black tracking-tight text-white">
                      {invoice.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={copyOrderNo}
                      className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy invoice number"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium mt-0.5">
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-"}
                    </span>
                    <span>&bull;</span>
                    <span className="text-indigo-200">Cashier: <strong>{invoice.cashierName || "Counter"}</strong></span>
                    {invoice.merchant && (
                      <>
                        <span>&bull;</span>
                        <span className="text-indigo-200">Merchant: <strong>{invoice.merchant}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/40 text-xs px-3 py-1 font-mono font-bold uppercase">
                {invoice.paymentMethod || "CASH"}
              </Badge>
              {invoice.fbrInvoiceNumber && invoice.fbrInvoiceNumber !== "-" && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-xs px-3 py-1 font-mono font-bold">
                  FBR: {invoice.fbrInvoiceNumber}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Financial Sequence Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Qty */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0" title={`Total Quantity: ${qty.toLocaleString()} pcs`}>
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Total Quantity
              </span>
              <p className="font-mono text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {qty.toLocaleString()} <span className="text-xs font-normal text-slate-500">pcs</span>
              </p>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate" title={`WOST: ${unitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/pc`}>
                WOST: {unitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/pc
              </span>
            </div>

            {/* 2. Value Excl */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0" title={`Value Excl. Tax: ${valExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Value Excl. Tax
              </span>
              <p className="font-mono text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {valExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate" title={`Gross: ${grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                Gross: {grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 3. Discount */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 min-w-0" title={`Discount (WOST): ${discWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Retail: ${discVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block truncate">
                  Discount
                </span>
                {disc?.hasOverrideDiscount && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold shrink-0">
                    ⚡ Override
                  </span>
                )}
              </div>
              <p className="font-mono text-base font-black text-amber-900 dark:text-amber-200 mt-1 truncate">
                {discWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block mt-0.5 truncate" title={`Retail: ${discVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}>
                Retail: {discVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>

            {/* 4. Amt After Disc */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 min-w-0" title={`Amt After Disc: ${amtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              <span className="text-[10.5px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block truncate">
                Amt After Disc.
              </span>
              <p className="font-mono text-base font-extrabold text-blue-950 dark:text-blue-200 mt-1 truncate">
                {amtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5 truncate">
                Taxable Base Value
              </span>
            </div>

            {/* 5. Sales Tax */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0" title={`Sales Tax: ${taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Sales Tax (18%)
              </span>
              <p className="font-mono text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1 truncate">
                {taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                Standard POS Rate
              </span>
            </div>

            {/* 6. Value Incl */}
            <div className="bg-emerald-50/90 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 min-w-0" title={`Value Incl. (Net): ${valIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block truncate">
                Value Incl. (Net)
              </span>
              <p className="font-mono text-base font-black text-emerald-950 dark:text-emerald-100 mt-1 truncate">
                {valIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5 truncate">
                Net Settlement Total
              </span>
            </div>
          </div>

          {/* Customer Profile & Identification */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-4 w-4 text-indigo-600" />
              Customer Profile & Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Customer Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate" title={cust?.name || invoice.customerName}>
                  {cust?.name || invoice.customerName || "Walk-in Customer"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Contact Number</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">
                  {cust?.phone || invoice.customerPhone || "-"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">CNIC / ID Card</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                  {cust?.cnic || invoice.customerCnic || "Not Recorded"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Customer Code</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">
                  {cust?.code || invoice.customerCode || "-"}
                </span>
              </div>
            </div>
            {cust?.address && (
              <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 px-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{cust.address}</span>
              </div>
            )}
          </div>

          {/* Discount & Commercial Rules Audit Matrix */}
          <div className="border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-4 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-amber-600" />
              Discount Audit & Promotional Rules Matrix
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* 1. Override Discount */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Manager / Cashier Override
                  </span>
                  {disc?.hasOverrideDiscount ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                      Applied ({disc.overrideDiscountItemsCount} item{disc.overrideDiscountItemsCount > 1 ? "s" : ""})
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">None</span>
                  )}
                </div>
                {disc?.hasOverrideDiscount && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                    {disc.overrideDiscountPercents?.length ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Override Rates:</span>
                        <span className="font-mono font-bold text-amber-600">{disc.overrideDiscountPercents.join("%, ")}%</span>
                      </div>
                    ) : null}
                    {disc.overrideDiscountNotes?.length ? (
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Override Reason:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 italic block mt-0.5">
                          &ldquo;{disc.overrideDiscountNotes.join("; ")}&rdquo;
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 2. Manual Discount */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    Manual Order Discount
                  </span>
                  {disc?.hasManualDiscount ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                      {disc.manualDiscountType === "PERCENT" ? "% Percent Rate" : disc.manualDiscountType === "FLAT_PKR" ? "Flat Fixed Amount" : "Manual Discount"}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">None</span>
                  )}
                </div>
                {disc?.hasManualDiscount && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                    {disc.manualDiscountPercent ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Percent:</span>
                        <span className="font-mono font-bold text-blue-600">{disc.manualDiscountPercent}%</span>
                      </div>
                    ) : null}
                    {disc.manualDiscountAmount ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-mono font-bold text-blue-600">{disc.manualDiscountAmount.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {disc.manualDiscountNote && (
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Discount Note:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 italic block mt-0.5">
                          &ldquo;{disc.manualDiscountNote}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Alliance Partner Discount */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Handshake className="h-3.5 w-3.5 text-teal-500" />
                    Alliance Partner Discount
                  </span>
                  {disc?.alliance ? (
                    <Badge className="bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 text-[10px]">
                      {disc.alliance.discountPercent}% OFF
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">No Alliance</span>
                  )}
                </div>
                {disc?.alliance && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Partner:</span>
                      <span className="font-bold text-teal-700 dark:text-teal-400">{disc.alliance.partnerName}</span>
                    </div>
                    {disc.alliance.code && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Code:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{disc.alliance.code}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Promo Campaign & Coupon */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-purple-500" />
                    Promo & Coupon Codes
                  </span>
                  {disc?.coupon || disc?.promo ? (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                      Promo Applied
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">None</span>
                  )}
                </div>
                {(disc?.coupon || disc?.promo) && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                    {disc.promo && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Campaign:</span>
                        <span className="font-bold text-purple-700 dark:text-purple-400">{disc.promo.name} ({disc.promo.code})</span>
                      </div>
                    )}
                    {disc.coupon && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Coupon Code:</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{disc.coupon.code}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tender Settlement & Voucher Audit Trail */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-violet-600" />
              Tender Settlement & Voucher Audit Trail
            </h4>

            {allVouchers.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Redeemed Vouchers ({allVouchers.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {allVouchers.map((v, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-violet-100 dark:border-violet-900/50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-xs text-violet-700 dark:text-violet-300 block">
                          {v.code}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {v.voucherType || "Voucher"} {v.companyName ? `&bull; ${v.companyName}` : ""} {v.slipNo ? `&bull; Slip: ${v.slipNo}` : ""}
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100" title={`Voucher Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                        {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No vouchers redeemed on this invoice.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Card Details */}
              {tender?.card && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {tender.card.merchant || invoice.merchant || "Bank Card Acquirer"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tender.card.cardLast4 ? `Card: **** ${tender.card.cardLast4}` : ""} {tender.card.authId ? `| Auth / Slip: ${tender.card.authId}` : ""}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-xs" title={`Card Tender: ${t.cardSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                    {t.cardSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Credit Sale */}
              {t.creditSale > 0 && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-sky-100 dark:border-sky-900/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Customer Credit Account Sale</span>
                      <span className="text-[10px] text-slate-400">Receivable charged to account</span>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 text-xs" title={`Credit Sale: ${t.creditSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                    {t.creditSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Purchased Items Matrix Table */}
          {items.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Purchased Items Breakdown ({items.length} line{items.length > 1 ? "s" : ""})
                </h4>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">SKU / Barcode</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-2 text-center">Size</th>
                      <th className="py-2 px-2 text-center">Color</th>
                      <th className="py-2 px-2 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Unit Price WOST</th>
                      <th className="py-2 px-3 text-right">Discount</th>
                      <th className="py-2 px-3 text-right">Tax</th>
                      <th className="py-2 px-3 text-right">Net SubTotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    {items.map((item, idx) => {
                      const taxDivisor = 1 + (item.taxPercent ?? 18) / 100;
                      const itemPriceWost = item.priceWost !== undefined ? item.priceWost : (item.unitPrice || 0) / taxDivisor;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-mono">
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {item.barCode || item.sku || "-"}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">
                            {item.description}
                            {item.hasOverrideDiscount && (
                              <span className="ml-1.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                ⚡ Override {item.overrideDiscountPercent ? `(${item.overrideDiscountPercent}%)` : ""}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">{item.sizeName || "-"}</td>
                          <td className="py-2 px-2 text-center">{item.colorName || "-"}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100" title={`Quantity: ${item.quantity}`}>{item.quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400" title={`Unit Price: ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                            {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400" title={`Unit Price WOST: ${itemPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            {itemPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400 font-bold" title={item.discountAmount ? `Discount: ${item.discountAmount.toLocaleString()}` : undefined}>
                            {item.discountAmount ? item.discountAmount.toLocaleString() : "-"}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400" title={item.taxAmount ? `Tax: ${item.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined}>
                            {item.taxAmount ? item.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400" title={`SubTotal: ${(item.lineTotal || item.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                            {(item.lineTotal || item.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes if any */}
          {invoice.notes && (
            <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                Order Notes
              </span>
              <p className="text-slate-700 dark:text-slate-300">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tender Hover Value Card Component (11 Channels)
// ─────────────────────────────────────────────────────────────────────────────
function TenderHoverValue({
  val,
  type,
  row,
  className,
}: {
  val?: number;
  type:
    | "cash"
    | "cashReturn"
    | "card"
    | "creditSale"
    | "giftVoucher"
    | "creditVoucher"
    | "exchangeVoucher"
    | "claimVoucher"
    | "corporateVoucher"
    | "creditIssued"
    | "rewardVoucher";
  row: SalesListTableRow;
  className?: string;
}) {
  if (val === undefined || val === 0) {
    return <span>-</span>;
  }

  const details = row.tenderDetails;
  const formattedVal = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (row.type === "location") {
    return <span className={className}>{formattedVal}</span>;
  }

  let title = "Tender Settlement";
  let icon = <Coins className="h-4 w-4 text-slate-500" />;
  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  let content: React.ReactNode = null;

  if (type === "card") {
    title = "Card Payment Details";
    icon = <CreditCard className="h-4 w-4 text-indigo-500" />;
    badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300";
    const card = details?.card;
    const merchant = card?.merchant || row.merchant || "Bank Card Acquirer";
    const cardholder = card?.cardholderName || "Walk-in Cardholder";
    const last4 = card?.cardLast4 ? `**** ${card.cardLast4}` : "Card on File";
    const authId = card?.authId || "Approved";
    const binNo = card?.binNo;

    content = (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Merchant / Bank</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={merchant}>
              {merchant}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Card Number</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
              {last4}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Cardholder Name</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block" title={cardholder}>
              {cardholder}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Auth ID / Slip #</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
              {authId}
            </span>
          </div>
        </div>
        {binNo && (
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
            <span>BIN Prefix:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{binNo}</span>
          </div>
        )}
      </div>
    );
  } else if (type === "giftVoucher") {
    title = "Gift Voucher Settlement";
    icon = <Gift className="h-4 w-4 text-violet-500" />;
    badgeColor = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300";
    const list = details?.giftVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-violet-700 dark:text-violet-400 block">{v.code}</span>
                {v.description && <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{v.description}</span>}
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Redeemed Gift Voucher at checkout
          </div>
        )}
      </div>
    );
  } else if (type === "exchangeVoucher") {
    title = "Exchange Voucher Settlement";
    icon = <Repeat className="h-4 w-4 text-orange-500" />;
    badgeColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300";
    const list = details?.exchangeVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-orange-700 dark:text-orange-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">Return Exchange Voucher</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Exchange Voucher redeemed against return
          </div>
        )}
      </div>
    );
  } else if (type === "claimVoucher") {
    title = "Claim Voucher Settlement";
    icon = <ShieldAlert className="h-4 w-4 text-amber-500" />;
    badgeColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300";
    const list = details?.claimVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-amber-700 dark:text-amber-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">Warranty Claim Voucher</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Claim voucher redeemed at counter
          </div>
        )}
      </div>
    );
  } else if (type === "corporateVoucher") {
    title = "Corporate Gift Voucher";
    icon = <Building2 className="h-4 w-4 text-purple-500" />;
    badgeColor = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300";
    const list = details?.corporateVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{v.companyName || "Corporate Account"}</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Corporate institutional gift voucher
          </div>
        )}
      </div>
    );
  } else if (type === "creditVoucher") {
    title = "Credit Voucher / Note";
    icon = <Ticket className="h-4 w-4 text-blue-500" />;
    badgeColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
    const list = details?.creditVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-blue-700 dark:text-blue-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">Customer Credit Note</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Store credit voucher redeemed
          </div>
        )}
      </div>
    );
  } else if (type === "rewardVoucher") {
    title = "Reward Voucher / Loyalty";
    icon = <Award className="h-4 w-4 text-emerald-500" />;
    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300";
    const list = details?.rewardVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-emerald-700 dark:text-emerald-400 block">{v.code || "Reward Voucher"}</span>
                {v.remarks && <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{v.remarks}</span>}
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Loyalty reward voucher points redeemed
          </div>
        )}
      </div>
    );
  } else if (type === "creditSale") {
    title = "Credit Sale Account Details";
    icon = <UserCheck className="h-4 w-4 text-sky-500" />;
    badgeColor = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300";
    const cs = details?.creditSale;
    const cust = cs?.customerName || row.customerName || "Customer Account";
    const phone = cs?.customerPhone || row.customerPhone || "-";
    content = (
      <div className="space-y-2 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Customer:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{cust}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Phone:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{phone}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 text-[11px]">
          <span className="text-slate-500">Unpaid Balance / Due:</span>
          <span className="font-mono font-extrabold text-sky-700 dark:text-sky-400" title={`Unpaid Balance: ${formattedVal}`}>{formattedVal}</span>
        </div>
      </div>
    );
  } else if (type === "creditIssued") {
    title = "Credit Voucher Issued";
    icon = <Receipt className="h-4 w-4 text-rose-500" />;
    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
    const list = details?.creditIssued || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-rose-700 dark:text-rose-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">New Voucher Issued</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-rose-800 dark:text-rose-200" title={`Amount: ${v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Issued Credit Voucher balance
          </div>
        )}
      </div>
    );
  } else if (type === "cashReturn") {
    title = "Cash Return / Refund";
    icon = <Undo2 className="h-4 w-4 text-rose-500" />;
    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
    content = (
      <div className="space-y-1.5 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500">Refund Amount:</span>
          <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400" title={`Refund: ${formattedVal}`}>{formattedVal}</span>
        </div>
        <p className="text-[10px] text-slate-400 px-1">Cash returned directly to customer at register</p>
      </div>
    );
  } else if (type === "cash") {
    title = "Cash Payment";
    icon = <Coins className="h-4 w-4 text-teal-500" />;
    badgeColor = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300";
    content = (
      <div className="space-y-1.5 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Tender:</span>
            <span className="font-bold text-teal-700 dark:text-teal-400">Physical Cash</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Cashier:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{row.cashierName || "Counter"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-slate-500">Collected:</span>
          <span className="font-mono font-extrabold text-teal-800 dark:text-teal-300" title={`Collected: ${formattedVal}`}>{formattedVal}</span>
        </div>
      </div>
    );
  }

  return (
    <HoverCard openDelay={100} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "cursor-pointer font-mono font-bold transition-all duration-150 inline-flex items-center gap-1 group/tender hover:opacity-85 select-none",
            className
          )}
          title={formattedVal}
        >
          <span className="underline decoration-dotted underline-offset-3 decoration-slate-300 dark:decoration-slate-600 group-hover/tender:decoration-current">
            {formattedVal}
          </span>
          <span className="w-1 h-1 rounded-full bg-current opacity-60 group-hover/tender:scale-125 transition-transform" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        side="top"
        sideOffset={6}
        className="w-72 p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 text-xs"
      >
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg border", badgeColor)}>
              {icon}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block leading-tight">
                {title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {row.orderNumber ? `Order: ${row.orderNumber}` : "Invoice Tender"}
              </span>
            </div>
          </div>
          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-slate-100">
            {formattedVal}
          </span>
        </div>
        <div className="p-3">{content}</div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline 360° Order Audit Banner
// ─────────────────────────────────────────────────────────────────────────────
function InlineOrderAuditBanner({
  item,
  colSpan,
}: {
  item: SalesListTableRow;
  colSpan: number;
}) {
  const disc = item.discountDetails;
  const cust = item.customerDetails;
  const tender = item.tenderDetails;

  const allVouchers = [
    ...(tender?.giftVouchers || []),
    ...(tender?.creditVouchers || []),
    ...(tender?.exchangeVouchers || []),
    ...(tender?.claimVouchers || []),
    ...(tender?.corporateVouchers || []),
    ...(tender?.rewardVouchers || []),
  ];

  const card = tender?.card;

  return (
    <tr className="bg-indigo-50/40 dark:bg-slate-950/60 border-b border-indigo-100 dark:border-indigo-950/80">
      <td colSpan={colSpan} className="p-3 pl-12 pr-4">
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-white/95 dark:bg-slate-900/90 p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                Order Audit 360° Summary &bull; Invoice #{item.orderNumber}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Date: <strong className="font-mono text-slate-800 dark:text-slate-200">{item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "-"}</strong></span>
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

            {/* 2. Override & Manual Discount */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                <Percent className="h-3 w-3 text-amber-500" />
                Discount Audit
              </span>
              {disc?.hasOverrideDiscount ? (
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  ⚡ Override: {disc.overrideDiscountPercents?.join("%, ")}% {disc.overrideDiscountNotes?.length ? `("${disc.overrideDiscountNotes.join('; ')}")` : ""}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">No Override Discount</div>
              )}

              {disc?.hasManualDiscount ? (
                <div className="text-[11px] text-blue-700 dark:text-blue-400">
                  📝 Manual: {disc.manualDiscountPercent ? `${disc.manualDiscountPercent}%` : `${disc.manualDiscountAmount?.toLocaleString()}`} ({disc.manualDiscountType === "PERCENT" ? "% Rate" : "Flat Amount"}) {disc.manualDiscountNote ? `"${disc.manualDiscountNote}"` : ""}
                </div>
              ) : null}

              {disc?.alliance ? (
                <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  🤝 Alliance: {disc.alliance.partnerName} ({disc.alliance.discountPercent}%)
                </div>
              ) : null}
            </div>

            {/* 3. Vouchers Used */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider block flex items-center gap-1">
                <Ticket className="h-3 w-3 text-violet-500" />
                Vouchers Redeemed ({allVouchers.length})
              </span>
              {allVouchers.length > 0 ? (
                <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                  {allVouchers.map((v, i) => (
                    <div key={i} className="text-[10.5px] flex items-center justify-between font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-violet-700 dark:text-violet-300 truncate max-w-[110px]">{v.code}</span>
                      <span className="text-slate-800 dark:text-slate-200" title={`Amount: ${v.amount.toLocaleString()}`}>{v.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">No vouchers redeemed</div>
              )}
            </div>

            {/* 4. Card & Order Notes */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-indigo-500" />
                Card & Register Notes
              </span>
              {card ? (
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                  {card.merchant || item.merchant || "Card"} {card.cardLast4 ? `(**** ${card.cardLast4})` : ""} {card.authId ? `Slip: ${card.authId}` : ""}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">Tender: {item.paymentMethod || "CASH"}</div>
              )}

              {item.notes && (
                <div className="text-[10.5px] text-slate-600 dark:text-slate-400 line-clamp-2 italic" title={item.notes}>
                  Notes: &ldquo;{item.notes}&rdquo;
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
// Main Virtualized Sales List Table
// ─────────────────────────────────────────────────────────────────────────────
export function SalesListTable({
  rows,
  grandTotals,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: SalesListTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [inspectingInvoice, setInspectingInvoice] = useState<SalesListTableRow | null>(null);

  // Multi-Mode Display State: "audit" (Inline 360° summary banners), "standard" (Compact matrix), "grid" (Full audit columns)
  const [viewMode, setViewMode] = useState<SalesListViewMode>("audit");
  
  // Track manually toggled invoice audit strips
  const [openAuditInvoiceIds, setOpenAuditInvoiceIds] = useState<Set<string>>(new Set());
  const [unfoldAllAudit, setUnfoldAllAudit] = useState<boolean>(false);

  const toggleInvoiceAudit = (id: string) => {
    setOpenAuditInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUnfoldAllAudit = () => {
    setUnfoldAllAudit((prev) => !prev);
    if (!unfoldAllAudit) {
      // Unfold all
      const allIds = new Set<string>();
      rows.forEach((r) => {
        if (r.type === "invoice") allIds.add(r.id);
      });
      setOpenAuditInvoiceIds(allIds);
    } else {
      setOpenAuditInvoiceIds(new Set());
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatVal = (val?: number) =>
    val === undefined || val === 0 ? "-" : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Compute Grand Total Financial Calculations
  const grandGross = grandTotals.grossAmount || 0;
  const grandValExcl = grandTotals.wostAmount !== undefined ? grandTotals.wostAmount : (grandGross - (grandTotals.taxAmount || 0));
  const grandDisc = grandTotals.discountAmount || 0;
  const grandDiscWost = grandTotals.discountWostAmount !== undefined ? grandTotals.discountWostAmount : (grandDisc - ((grandDisc / (grandGross || 1)) * (grandTotals.taxAmount || 0)));
  const grandAmtAfterDisc = grandTotals.amountAfterDiscount !== undefined ? grandTotals.amountAfterDiscount : Math.max(0, grandValExcl - grandDiscWost);
  const grandTax = grandTotals.taxAmount || 0;
  const grandValIncl = grandTotals.netAmount || 0;

  const isGridMode = viewMode === "grid";
  const totalColumnsCount = isGridMode ? 59 : 29;

  return (
    <div className="space-y-3">
      {/* 360° Sale Inspector Modal Dialog */}
      <SaleInspectorDialog
        invoice={inspectingInvoice}
        open={Boolean(inspectingInvoice)}
        onOpenChange={(open) => !open && setInspectingInvoice(null)}
      />

      {/* Top Toolbar: View Density Switcher + Unfold All Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> sales hierarchy rows
            {grandTotals.orderCount > rows.length && (
              <span className="text-[11px] text-slate-500 font-normal">
                (Preview Sample &bull; Grand Totals include all {grandTotals.orderCount.toLocaleString()} orders)
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
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
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
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
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
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
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
              className="h-7 px-2.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 rounded-lg gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <Sparkles className="h-3 w-3 text-indigo-600" />
              {unfoldAllAudit ? "Collapse All Audit Panels" : "Preview All 360° Details"}
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
              <FoldVertical className="h-3 w-3 text-indigo-600" />
              Collapse All
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Container with Multi-Level Grouped Matrix Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[720px] relative">
          <table className={cn("w-full text-left border-collapse text-xs", isGridMode ? "min-w-[5500px]" : "min-w-[3500px]")}>
            {/* 2-Tier Grouped Matrix Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              {/* Tier 1: Group Super-Headers */}
              <tr className="border-b border-slate-200/90 dark:border-slate-700/90 bg-slate-200/50 dark:bg-slate-900/60 font-black">
                <th colSpan={isGridMode ? 2 : 2} className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  Invoice & Product Hierarchy
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

                <th colSpan={7} className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  Transaction Metadata
                </th>

                <th colSpan={8} className="py-2 px-3 text-center border-r border-slate-300 dark:border-slate-600 bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-extrabold">
                  Financial Valuation Sequence (WOST Analysis)
                </th>

                <th colSpan={3} className="py-2 px-3 text-center border-r border-teal-200 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold">
                  Cash & Account Tenders
                </th>

                {isGridMode ? (
                  <>
                    <th colSpan={6} className="py-2 px-3 text-center border-r border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold">
                      Card Tender Settlement Audit
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-violet-200 dark:border-violet-900/60 bg-violet-50/70 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 font-bold">
                      Gift Voucher
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold">
                      Credit Voucher
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-bold">
                      Exchange Voucher
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold">
                      Claim Voucher
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold">
                      Corporate Voucher
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold">
                      Credit Issued
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold">
                      Reward Voucher
                    </th>
                    <th colSpan={3} className="py-2 px-3 text-center border-r border-amber-300 dark:border-amber-800 bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold">
                      Override Discount Audit
                    </th>
                    <th colSpan={4} className="py-2 px-3 text-center border-r border-blue-300 dark:border-blue-800 bg-blue-100/70 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-bold">
                      Manual Discount Audit
                    </th>
                    <th colSpan={4} className="py-2 px-3 text-center border-r border-teal-300 dark:border-teal-800 bg-teal-100/70 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-bold">
                      Alliance Partner Discount
                    </th>
                    <th colSpan={3} className="py-2 px-3 text-center border-r border-purple-300 dark:border-purple-800 bg-purple-100/70 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-bold">
                      Promos & Coupons
                    </th>
                    <th className="py-2 px-3">
                      Notes
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400">
                      Card
                    </th>
                    <th colSpan={7} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-300">
                      Vouchers Settlement Breakdown
                    </th>
                  </>
                )}
              </tr>

              {/* Tier 2: Specific Sub-Column Headers */}
              <tr>
                <th className="py-2.5 px-3.5 w-[280px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Location / Invoice # / Description
                </th>
                <th className="py-2.5 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700">Date & Time</th>

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

                {/* Transaction Metadata */}
                <th className="py-2.5 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700">Cashier</th>
                <th className="py-2.5 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Payment Mode</th>
                <th className="py-2.5 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700">Merchant</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">FBR Inv #</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">SKU / Barcode</th>
                <th className="py-2.5 px-2 w-[55px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Size</th>
                <th className="py-2.5 px-2 w-[65px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Color</th>

                {/* Financial Sequence Columns */}
                <th className="py-2.5 px-3 w-[65px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono">Qty</th>
                <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-semibold">Unit Price</th>
                <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-semibold">Unit Price WOST</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">Value Excl.</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-600 dark:text-amber-400">Discount</th>
                <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-blue-700 dark:text-blue-400">Amt After Disc.</th>
                <th className="py-2.5 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-semibold text-slate-600 dark:text-slate-400">Sales Tax</th>
                <th className="py-2.5 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">Value Incl.</th>

                {/* Cash & Credit Tenders */}
                <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">Cash Sale</th>
                <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">Cash Return</th>
                <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">Credit Sale</th>

                {/* Card & Voucher Columns */}
                {isGridMode ? (
                  <>
                    {/* Card Columns */}
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">Card Sale</th>
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Bank / Merchant</th>
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Cardholder</th>
                    <th className="py-2.5 px-3 w-[90px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">Last 4</th>
                    <th className="py-2.5 px-3 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">BIN #</th>
                    <th className="py-2.5 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">Auth Slip #</th>

                    {/* Gift Voucher */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-violet-700 dark:text-violet-400">Gift Codes</th>
                    <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-violet-700 dark:text-violet-400">Gift Amount</th>

                    {/* Credit Voucher */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-blue-700 dark:text-blue-400">Credit Codes</th>
                    <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-blue-700 dark:text-blue-400">Credit Amount</th>

                    {/* Exchange Voucher */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-orange-700 dark:text-orange-400">Exchange Codes</th>
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-orange-700 dark:text-orange-400">Exchange Amt</th>

                    {/* Claim Voucher */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-amber-700 dark:text-amber-400">Claim Codes</th>
                    <th className="py-2.5 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-700 dark:text-amber-400">Claim Amount</th>

                    {/* Corporate Voucher */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-purple-700 dark:text-purple-400">Corp Codes</th>
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-purple-700 dark:text-purple-400">Corp Amount</th>

                    {/* Credit Issued */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-rose-700 dark:text-rose-400">Issued Codes</th>
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-rose-700 dark:text-rose-400">Issued Amount</th>

                    {/* Reward Voucher */}
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-emerald-700 dark:text-emerald-400">Reward Codes</th>
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">Reward Amount</th>

                    {/* Override Audit */}
                    <th className="py-2.5 px-2.5 w-[70px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-amber-700 dark:text-amber-400">Applied?</th>
                    <th className="py-2.5 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-amber-700 dark:text-amber-400">Override %</th>
                    <th className="py-2.5 px-3 w-[160px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Override Note / Reason</th>

                    {/* Manual Discount Audit */}
                    <th className="py-2.5 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700">Type (%/Flat)</th>
                    <th className="py-2.5 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-right font-bold text-blue-700 dark:text-blue-400">Manual Value</th>
                    <th className="py-2.5 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-right text-blue-600 dark:text-blue-400">WOST Value</th>
                    <th className="py-2.5 px-3 w-[170px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Manual Disc Note</th>

                    {/* Alliance Partner Discount */}
                    <th className="py-2.5 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-bold text-teal-700 dark:text-teal-400">Partner</th>
                    <th className="py-2.5 px-3 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono">Code</th>
                    <th className="py-2.5 px-3 w-[75px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-teal-700 dark:text-teal-400">Rate %</th>
                    <th className="py-2.5 px-3 w-[150px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">Description</th>

                    {/* Promos & Coupons */}
                    <th className="py-2.5 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-bold text-purple-700 dark:text-purple-400">Campaign</th>
                    <th className="py-2.5 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-purple-700 dark:text-purple-400">Promo Code</th>
                    <th className="py-2.5 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 font-mono text-purple-700 dark:text-purple-400">Coupon Code</th>

                    {/* Order Notes */}
                    <th className="py-2.5 px-3.5 w-[180px] shrink-0">Order Notes</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">Card Sale</th>
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-violet-700 dark:text-violet-400">Gift Voucher</th>
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-blue-700 dark:text-blue-400">Credit Voucher</th>
                    <th className="py-2.5 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-orange-700 dark:text-orange-400">Exchange Voucher</th>
                    <th className="py-2.5 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-700 dark:text-amber-400">Claim Voucher</th>
                    <th className="py-2.5 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-purple-700 dark:text-purple-400">Corporate Voucher</th>
                    <th className="py-2.5 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-rose-700 dark:text-rose-400">Credit Issued</th>
                    <th className="py-2.5 px-3.5 w-[125px] shrink-0 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">Reward Voucher</th>
                  </>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={totalColumnsCount} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={totalColumnsCount} className="p-14 text-center text-muted-foreground font-medium text-xs">
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
                  const disc = item.discountDetails;
                  const cust = item.customerDetails;
                  const tender = item.tenderDetails;

                  // Financial Sequence Row Values
                  const qty = isItem ? (item.quantity || 0) : t.totalItems;
                  const rowGross = isItem ? (item.unitPrice ? item.unitPrice * (item.quantity || 1) : (item.subTotal || 0)) : t.grossAmount;
                  const rowUnitPrice = isItem
                    ? (item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : (qty > 0 ? rowGross / qty : 0))
                    : (qty > 0 ? rowGross / qty : 0);
                  const taxDivisor = 1 + ((isItem ? item.taxPercent : undefined) ?? 18) / 100;
                  const rowUnitPriceWost = isItem
                    ? (item.priceWost !== undefined ? item.priceWost : (item.unitPrice || 0) / taxDivisor)
                    : (qty > 0 ? ((t.wostAmount !== undefined ? t.wostAmount : (rowGross - (t.taxAmount || 0))) / qty) : 0);
                  const rowValExcl = isItem
                    ? (item.valueExcl !== undefined ? item.valueExcl : qty * rowUnitPriceWost)
                    : (t.wostAmount !== undefined ? t.wostAmount : (rowGross - (t.taxAmount || 0)));
                  const rowDisc = isItem ? (item.discountAmount || 0) : t.discountAmount;
                  const rowDiscWost = isItem
                    ? (item.discountAmountWost !== undefined ? item.discountAmountWost : (rowDisc - ((rowDisc / (rowGross || 1)) * (t.taxAmount || 0))))
                    : (t.discountWostAmount !== undefined ? t.discountWostAmount : (disc?.wostDiscount ?? (rowDisc - ((rowDisc / (rowGross || 1)) * (t.taxAmount || 0)))));
                  const rowAmtAfterDisc = isItem
                    ? (item.amountAfterDiscount !== undefined ? item.amountAfterDiscount : Math.max(0, rowValExcl - rowDiscWost))
                    : (t.amountAfterDiscount !== undefined ? t.amountAfterDiscount : Math.max(0, rowValExcl - rowDiscWost));
                  const rowTax = isItem ? (item.taxAmount || 0) : t.taxAmount;
                  const rowValIncl = isItem ? (item.valueIncl !== undefined ? item.valueIncl : (item.subTotal || 0)) : t.netAmount;

                  const isAuditOpen = isInvoice && (unfoldAllAudit || openAuditInvoiceIds.has(item.id));

                  const depthIndentClass =
                    isItem ? (item.depth === 2 ? "pl-11 text-slate-700 dark:text-slate-300" : "pl-8 text-slate-700 dark:text-slate-300") :
                    item.depth === 1 ? "pl-6 font-semibold" :
                    item.depth === 2 ? "pl-10 text-muted-foreground text-[11px]" :
                    "font-bold text-slate-800 dark:text-slate-200";

                  // Extract individual voucher codes for Grid Mode
                  const giftCodes = tender?.giftVouchers?.map((v) => v.code).join(", ") || "-";
                  const creditCodes = tender?.creditVouchers?.map((v) => v.code).join(", ") || "-";
                  const exchangeCodes = tender?.exchangeVouchers?.map((v) => v.code).join(", ") || "-";
                  const claimCodes = tender?.claimVouchers?.map((v) => v.code).join(", ") || "-";
                  const corpCodes = tender?.corporateVouchers?.map((v) => v.code).join(", ") || "-";
                  const issuedCodes = tender?.creditIssued?.map((v) => v.code).join(", ") || "-";
                  const rewardCodes = tender?.rewardVouchers?.map((v) => v.code).join(", ") || "-";

                  // Extract Card Information
                  const card = tender?.card;
                  const cardMerchant = card?.merchant || (isInvoice ? item.merchant : undefined) || "-";
                  const cardholder = card?.cardholderName || "-";
                  const cardLast4 = card?.cardLast4 ? `**** ${card.cardLast4}` : "-";
                  const cardBin = card?.binNo || "-";
                  const cardSlip = card?.authId || "-";

                  // Extract Customer Information
                  const custName = cust?.name || item.customerName || (isInvoice ? "Walk-in" : "-");
                  const custPhone = cust?.phone || item.customerPhone || "-";
                  const custCnic = cust?.cnic || item.customerCnic || "-";
                  const custCode = cust?.code || item.customerCode || "-";

                  // Extract Override Details
                  const hasOverride = isItem ? item.hasOverrideDiscount : disc?.hasOverrideDiscount;
                  const overridePercentStr = isItem
                    ? (item.overrideDiscountPercent ? `${item.overrideDiscountPercent}%` : "-")
                    : (disc?.overrideDiscountPercents?.length ? `${disc.overrideDiscountPercents.join("%, ")}%` : "-");
                  const overrideNoteStr = isItem
                    ? (item.overrideDiscountNote || "-")
                    : (disc?.overrideDiscountNotes?.length ? disc.overrideDiscountNotes.join("; ") : "-");

                  // Extract Manual Discount Details
                  const manualType = disc?.manualDiscountType === "PERCENT" ? "% Rate" : disc?.manualDiscountType === "FLAT_PKR" ? "Flat Amount" : (disc?.hasManualDiscount ? "Manual" : "-");
                  const manualVal = disc?.manualDiscountAmount ? disc.manualDiscountAmount.toLocaleString() : (disc?.manualDiscountPercent ? `${disc.manualDiscountPercent}%` : "-");
                  const manualWost = disc?.manualDiscountAmount ? (disc.manualDiscountAmount - (((disc.manualDiscountAmount || 0) / (rowGross || 1)) * (t.taxAmount || 0))).toFixed(1) : "-";
                  const manualNote = disc?.manualDiscountNote || "-";

                  // Extract Alliance Details
                  const alliancePartner = disc?.alliance?.partnerName || "-";
                  const allianceCode = disc?.alliance?.code || "-";
                  const allianceRate = disc?.alliance?.discountPercent ? `${disc.alliance.discountPercent}%` : "-";
                  const allianceDesc = disc?.alliance?.description || "-";

                  // Extract Promo & Coupon Details
                  const promoCampaign = disc?.promo?.name || "-";
                  const promoCode = disc?.promo?.code || "-";
                  const couponCode = disc?.coupon?.code || "-";

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => {
                          if (item.hasChildren && item.nodeId && onToggleNode) {
                            onToggleNode(item.nodeId);
                          }
                        }}
                        className={cn(
                          "border-b border-slate-100 dark:border-slate-800/60 transition-colors text-xs select-none",
                          item.hasChildren && "cursor-pointer",
                          isLocation ? "bg-slate-100/80 dark:bg-slate-800/80 font-bold hover:bg-slate-200/60 dark:hover:bg-slate-800" :
                          isInvoice ? "bg-slate-50/70 dark:bg-slate-900/40 font-semibold hover:bg-slate-100/60 dark:hover:bg-slate-800/40" :
                          "bg-white/60 dark:bg-slate-950/20 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-400 text-[11px]"
                        )}
                      >
                        {/* 1. Hierarchy Label / Chevron / Action Triggers */}
                        <td className={cn("py-2 px-3.5 border-r border-slate-100 dark:border-slate-800/60", depthIndentClass)}>
                          <div className="flex items-center gap-2 overflow-hidden">
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
                              <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingInvoice(item);
                                  }}
                                  className="flex items-center gap-1 font-mono text-[11px] font-extrabold text-indigo-950 dark:text-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors shrink-0"
                                  title="Open Full 360° Inspector Modal"
                                >
                                  <Receipt className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                  <span>{item.orderNumber}</span>
                                </button>

                                {/* Inline 360° Audit Toggle Button */}
                                {viewMode === "audit" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleInvoiceAudit(item.id);
                                    }}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-colors flex items-center gap-0.5 shrink-0",
                                      isAuditOpen
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                                    )}
                                    title="Toggle inline 360° order audit banner"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    <span>{isAuditOpen ? "Hide Audit" : "Audit 360°"}</span>
                                  </button>
                                )}

                                {/* Badges */}
                                {disc?.hasOverrideDiscount && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold border border-amber-300 dark:border-amber-800 shrink-0">
                                    ⚡ Override
                                  </span>
                                )}
                                {disc?.hasManualDiscount && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[9px] font-bold border border-blue-300 dark:border-blue-800 shrink-0">
                                    📝 Disc Note
                                  </span>
                                )}
                                {disc?.alliance && (
                                  <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[9px] font-bold border border-teal-300 dark:border-teal-800 shrink-0">
                                    🤝 {disc.alliance.partnerName}
                                  </span>
                                )}
                              </div>
                            ) : isItem ? (
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={item.description}>
                                  {item.description}
                                </span>
                                {item.hasOverrideDiscount && (
                                  <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                                    ⚡ Override {item.overrideDiscountPercent ? `(${item.overrideDiscountPercent}%)` : ""}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="truncate font-extrabold">{item.label}</span>
                            )}
                          </div>
                        </td>

                        {/* 2. Date & Time */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "-"}
                        </td>

                        {/* Customer Information (4 columns in Grid, 1 in Standard) */}
                        {isGridMode ? (
                          <>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={custName}>
                              {custName}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {custPhone}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                              {custCnic}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {custCode}
                            </td>
                          </>
                        ) : (
                          <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 truncate">
                            {isInvoice ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {item.customerName || "Walk-in"}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                  {item.customerPhone && item.customerPhone !== "-" && <span>{item.customerPhone}</span>}
                                  {item.customerCnic && (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                                      {item.customerCnic}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : isLocation ? (
                              "-"
                            ) : (
                              "-"
                            )}
                          </td>
                        )}

                        {/* Transaction Metadata */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium">
                          {item.cashierName || "-"}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono font-semibold">
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
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={item.merchant}>
                          {isInvoice ? item.merchant || "-" : "-"}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                          {item.fbrInvoiceNumber || "-"}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                          {isItem ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{item.barCode || item.sku || "-"}</span>
                              {item.sku && item.barCode && item.sku !== item.barCode && (
                                <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800/60 text-center font-medium">
                          {isItem ? item.sizeName || "N/A" : "-"}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800/60 text-center">
                          {isItem ? item.colorName || "N/A" : "-"}
                        </td>

                        {/* Financial Sequence Columns */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-semibold" title={`Quantity: ${qty.toLocaleString()}`}>
                          {qty.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300" title={`Unit Price: ${formatVal(rowUnitPrice)}`}>
                          {formatVal(rowUnitPrice)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300" title={`Unit Price WOST: ${formatVal(rowUnitPriceWost)}`}>
                          {formatVal(rowUnitPriceWost)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-semibold text-slate-800 dark:text-slate-200" title={`Value Excl. Tax: ${formatVal(rowValExcl)}`}>
                          {formatVal(rowValExcl)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-amber-600 dark:text-amber-400" title={`Discount (WOST): ${formatVal(rowDiscWost)} | Retail: ${formatVal(rowDisc)}`}>
                          <div className="flex flex-col items-end">
                            <span>{formatVal(rowDiscWost)}</span>
                            {rowDisc > 0 ? (
                              <span className="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-normal">
                                Retail: {formatVal(rowDisc)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-blue-700 dark:text-blue-400" title={`Amt After Disc: ${formatVal(rowAmtAfterDisc)}`}>
                          {formatVal(rowAmtAfterDisc)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-600 dark:text-slate-400" title={`Tax: ${formatVal(rowTax)}`}>
                          {formatVal(rowTax)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400" title={`Value Incl. Tax: ${formatVal(rowValIncl)}`}>
                          {formatVal(rowValIncl)}
                        </td>

                        {/* Cash & Credit Tenders */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                          <TenderHoverValue val={t.cashSale} type="cash" row={item} className="text-teal-700 dark:text-teal-400" />
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          <TenderHoverValue val={t.cashReturn} type="cashReturn" row={item} className="text-rose-600 dark:text-rose-400" />
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                          <TenderHoverValue val={t.creditSale} type="creditSale" row={item} className="text-sky-700 dark:text-sky-400" />
                        </td>

                        {/* Card & Voucher Columns (Multi-column in Grid, Single in Standard) */}
                        {isGridMode ? (
                          <>
                            {/* Card Settlement Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                              <TenderHoverValue val={t.cardSale} type="card" row={item} className="text-indigo-700 dark:text-indigo-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={cardMerchant}>
                              {cardMerchant}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={cardholder}>
                              {cardholder}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                              {cardLast4}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {cardBin}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              {cardSlip}
                            </td>

                            {/* Gift Voucher Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-violet-700 dark:text-violet-300 truncate max-w-[120px]" title={giftCodes}>
                              {giftCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-violet-700 dark:text-violet-400">
                              <TenderHoverValue val={t.giftVoucherAmount} type="giftVoucher" row={item} className="text-violet-700 dark:text-violet-400" />
                            </td>

                            {/* Credit Voucher Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-blue-700 dark:text-blue-300 truncate max-w-[120px]" title={creditCodes}>
                              {creditCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-blue-700 dark:text-blue-400">
                              <TenderHoverValue val={t.creditVoucherAmount} type="creditVoucher" row={item} className="text-blue-700 dark:text-blue-400" />
                            </td>

                            {/* Exchange Voucher Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-orange-700 dark:text-orange-300 truncate max-w-[120px]" title={exchangeCodes}>
                              {exchangeCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-orange-700 dark:text-orange-400">
                              <TenderHoverValue val={t.exchangeVoucherAmount} type="exchangeVoucher" row={item} className="text-orange-700 dark:text-orange-400" />
                            </td>

                            {/* Claim Voucher Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-amber-700 dark:text-amber-300 truncate max-w-[120px]" title={claimCodes}>
                              {claimCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-amber-700 dark:text-amber-400">
                              <TenderHoverValue val={t.claimVoucherAmount} type="claimVoucher" row={item} className="text-amber-700 dark:text-amber-400" />
                            </td>

                            {/* Corporate Voucher Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-purple-700 dark:text-purple-300 truncate max-w-[120px]" title={corpCodes}>
                              {corpCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-purple-700 dark:text-purple-400">
                              <TenderHoverValue val={t.giftVoucherCorporate} type="corporateVoucher" row={item} className="text-purple-700 dark:text-purple-400" />
                            </td>

                            {/* Credit Issued Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-rose-700 dark:text-rose-300 truncate max-w-[120px]" title={issuedCodes}>
                              {issuedCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-rose-700 dark:text-rose-400 font-bold">
                              <TenderHoverValue val={t.creditVoucherIssuedAmount} type="creditIssued" row={item} className="text-rose-700 dark:text-rose-400" />
                            </td>

                            {/* Reward Voucher Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[10.5px] text-emerald-700 dark:text-emerald-300 truncate max-w-[120px]" title={rewardCodes}>
                              {rewardCodes}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-emerald-700 dark:text-emerald-400">
                              <TenderHoverValue val={t.rewardVoucherAmount} type="rewardVoucher" row={item} className="text-emerald-700 dark:text-emerald-400" />
                            </td>

                            {/* Override Audit Sub-columns */}
                            <td className="py-2 px-2.5 border-r border-slate-100 dark:border-slate-800/60 text-center font-bold">
                              {hasOverride ? (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9.5px]">YES</span>
                              ) : (
                                <span className="text-slate-400">NO</span>
                              )}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-amber-700 dark:text-amber-400">
                              {overridePercentStr}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={overrideNoteStr}>
                              {overrideNoteStr}
                            </td>

                            {/* Manual Discount Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300">
                              {manualType}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-right font-bold text-blue-700 dark:text-blue-400">
                              {manualVal}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-right text-blue-600 dark:text-blue-400">
                              {manualWost}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={manualNote}>
                              {manualNote}
                            </td>

                            {/* Alliance Partner Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-teal-700 dark:text-teal-400 truncate max-w-[130px]" title={alliancePartner}>
                              {alliancePartner}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {allianceCode}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] font-bold text-teal-700 dark:text-teal-400">
                              {allianceRate}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={allianceDesc}>
                              {allianceDesc}
                            </td>

                            {/* Promo & Coupon Sub-columns */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-purple-700 dark:text-purple-400 truncate max-w-[130px]" title={promoCampaign}>
                              {promoCampaign}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-purple-700 dark:text-purple-400">
                              {promoCode}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-purple-700 dark:text-purple-400">
                              {couponCode}
                            </td>

                            {/* Order Notes */}
                            <td className="py-2 px-3.5 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[180px]" title={item.notes}>
                              {item.notes || "-"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                              <TenderHoverValue val={t.cardSale} type="card" row={item} className="text-indigo-700 dark:text-indigo-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                              <TenderHoverValue val={t.giftVoucherAmount} type="giftVoucher" row={item} className="text-violet-700 dark:text-violet-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                              <TenderHoverValue val={t.creditVoucherAmount} type="creditVoucher" row={item} className="text-blue-700 dark:text-blue-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                              <TenderHoverValue val={t.exchangeVoucherAmount} type="exchangeVoucher" row={item} className="text-orange-700 dark:text-orange-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                              <TenderHoverValue val={t.claimVoucherAmount} type="claimVoucher" row={item} className="text-amber-700 dark:text-amber-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                              <TenderHoverValue val={t.giftVoucherCorporate} type="corporateVoucher" row={item} className="text-purple-700 dark:text-purple-400" />
                            </td>
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-rose-700 dark:text-rose-400 font-bold">
                              <TenderHoverValue val={t.creditVoucherIssuedAmount} type="creditIssued" row={item} className="text-rose-700 dark:text-rose-400" />
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                              <TenderHoverValue val={t.rewardVoucherAmount} type="rewardVoucher" row={item} className="text-emerald-700 dark:text-emerald-400" />
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Inline 360° Order Audit Banner Row */}
                      {isAuditOpen && (
                        <InlineOrderAuditBanner item={item} colSpan={totalColumnsCount} />
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={totalColumnsCount} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Table Footer with Financial Totals */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold shadow-sm border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold" colSpan={isGridMode ? 13 : 10}>
                  GRAND TOTAL (ALL SELECTED INVOICES)
                </td>
                {/* 1. Qty */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-900 dark:text-slate-100">
                  {grandTotals.totalItems.toLocaleString()}
                </td>
                {/* 2. Unit Price Avg */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {grandTotals.totalItems > 0 ? formatVal(grandGross / grandTotals.totalItems) : "-"}
                </td>
                {/* 3. Unit Price WOST Avg */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {grandTotals.totalItems > 0 ? formatVal(grandValExcl / grandTotals.totalItems) : "-"}
                </td>
                {/* 4. Value Excl. */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono" title={`Total Value Excl. Tax (WOST): ${formatVal(grandValExcl)} | Retail: ${formatVal(grandGross)}`}>
                  <div className="flex flex-col items-end">
                    <span>{formatVal(grandValExcl)}</span>
                    {grandGross > 0 && (
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                        Retail: {formatVal(grandGross)}
                      </span>
                    )}
                  </div>
                </td>
                {/* 5. Discount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-600 dark:text-amber-400" title={`Total Discount (WOST): ${formatVal(grandDiscWost)} | Retail: ${formatVal(grandDisc)}`}>
                  <div className="flex flex-col items-end">
                    <span>{formatVal(grandDiscWost)}</span>
                    {grandDisc > 0 && (
                      <span className="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-normal">
                        Retail: {formatVal(grandDisc)}
                      </span>
                    )}
                  </div>
                </td>
                {/* 6. Amt After Disc. */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-blue-700 dark:text-blue-400" title={`Total Amt After Disc: ${formatVal(grandAmtAfterDisc)}`}>
                  {formatVal(grandAmtAfterDisc)}
                </td>
                {/* 7. Sales Tax */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-600 dark:text-slate-400" title={`Total Tax: ${formatVal(grandTax)}`}>
                  {formatVal(grandTax)}
                </td>
                {/* 8. Value Incl. */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-emerald-600 dark:text-emerald-400" title={`Total Value Incl. Tax: ${formatVal(grandValIncl)}`}>
                  {formatVal(grandValIncl)}
                </td>

                {/* Cash & Credit Tenders */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-teal-700 dark:text-teal-400" title={`Total Cash Sale: ${formatVal(grandTotals.cashSale)}`}>
                  {formatVal(grandTotals.cashSale)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-600 dark:text-rose-400" title={`Total Cash Return: ${formatVal(grandTotals.cashReturn)}`}>
                  {formatVal(grandTotals.cashReturn)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-sky-700 dark:text-sky-400" title={`Total Credit Sale: ${formatVal(grandTotals.creditSale)}`}>
                  {formatVal(grandTotals.creditSale)}
                </td>

                {/* Card & Voucher Footer Totals */}
                {isGridMode ? (
                  <>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-indigo-700 dark:text-indigo-400" title={`Total Card Sale: ${formatVal(grandTotals.cardSale)}`}>
                      {formatVal(grandTotals.cardSale)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>

                    {/* Gift Voucher */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-violet-700 dark:text-violet-400" title={`Total Gift Voucher: ${formatVal(grandTotals.giftVoucherAmount)}`}>
                      {formatVal(grandTotals.giftVoucherAmount)}
                    </td>

                    {/* Credit Voucher */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-blue-700 dark:text-blue-400" title={`Total Credit Voucher: ${formatVal(grandTotals.creditVoucherAmount)}`}>
                      {formatVal(grandTotals.creditVoucherAmount)}
                    </td>

                    {/* Exchange Voucher */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-orange-700 dark:text-orange-400" title={`Total Exchange Voucher: ${formatVal(grandTotals.exchangeVoucherAmount)}`}>
                      {formatVal(grandTotals.exchangeVoucherAmount)}
                    </td>

                    {/* Claim Voucher */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-700 dark:text-amber-400" title={`Total Claim Voucher: ${formatVal(grandTotals.claimVoucherAmount)}`}>
                      {formatVal(grandTotals.claimVoucherAmount)}
                    </td>

                    {/* Corporate Voucher */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-purple-700 dark:text-purple-400" title={`Total Corporate Gift: ${formatVal(grandTotals.giftVoucherCorporate)}`}>
                      {formatVal(grandTotals.giftVoucherCorporate)}
                    </td>

                    {/* Credit Issued */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-700 dark:text-rose-400" title={`Total Credit Issued: ${formatVal(grandTotals.creditVoucherIssuedAmount)}`}>
                      {formatVal(grandTotals.creditVoucherIssuedAmount)}
                    </td>

                    {/* Reward Voucher */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-emerald-700 dark:text-emerald-400" title={`Total Reward Voucher: ${formatVal(grandTotals.rewardVoucherAmount)}`}>
                      {formatVal(grandTotals.rewardVoucherAmount)}
                    </td>

                    {/* Overrides */}
                    <td className="py-3 px-2.5 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>

                    {/* Manual Disc */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>

                    {/* Alliance */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>

                    {/* Promo */}
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-400 text-center">-</td>

                    {/* Notes */}
                    <td className="py-3 px-3.5 font-mono text-slate-400 text-center">-</td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-indigo-700 dark:text-indigo-400" title={`Total Card Sale: ${formatVal(grandTotals.cardSale)}`}>
                      {formatVal(grandTotals.cardSale)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono" title={`Total Gift Voucher: ${formatVal(grandTotals.giftVoucherAmount)}`}>
                      {formatVal(grandTotals.giftVoucherAmount)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono" title={`Total Credit Voucher: ${formatVal(grandTotals.creditVoucherAmount)}`}>
                      {formatVal(grandTotals.creditVoucherAmount)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono" title={`Total Exchange Voucher: ${formatVal(grandTotals.exchangeVoucherAmount)}`}>
                      {formatVal(grandTotals.exchangeVoucherAmount)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono" title={`Total Claim Voucher: ${formatVal(grandTotals.claimVoucherAmount)}`}>
                      {formatVal(grandTotals.claimVoucherAmount)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono" title={`Total Corporate Gift: ${formatVal(grandTotals.giftVoucherCorporate)}`}>
                      {formatVal(grandTotals.giftVoucherCorporate)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-700 dark:text-rose-400" title={`Total Credit Issued: ${formatVal(grandTotals.creditVoucherIssuedAmount)}`}>
                      {formatVal(grandTotals.creditVoucherIssuedAmount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-emerald-700 dark:text-emerald-400" title={`Total Reward Voucher: ${formatVal(grandTotals.rewardVoucherAmount)}`}>
                      {formatVal(grandTotals.rewardVoucherAmount)}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
