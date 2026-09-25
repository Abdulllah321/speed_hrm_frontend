import React, { useState } from "react";
import { VoucherRegisterItem } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ticket,
  Copy,
  Check,
  Building2,
  User,
  Phone,
  Store,
  Calendar,
  CreditCard,
  Receipt,
  Clock,
  AlertCircle,
  FileCheck2,
  Coins,
  Percent,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoucherDetailModalProps {
  item: VoucherRegisterItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VoucherDetailModal({ item, isOpen, onClose }: VoucherDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(item.voucherNumber);
    setCopied(true);
    toast.success("Voucher number copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurr = (val: number) =>
    `Rs. ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getTypeBadgeClass = (vType: string) => {
    switch (vType.toUpperCase()) {
      case "GIFT":
      case "OUTLET_GIFT":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300";
      case "CORPORATE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300";
      case "CREDIT":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300";
      case "EXCHANGE":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300";
      case "REFUND":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
    }
  };

  const getStatusBadge = () => {
    if (item.status === "REDEEMED") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300">
          <FileCheck2 className="h-3.5 w-3.5" />
          REDEEMED / SETTLED
        </span>
      );
    }
    if (item.status === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300">
          <AlertCircle className="h-3.5 w-3.5" />
          EXPIRED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping inline-block" />
        ACTIVE / OUTSTANDING
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl gap-0 border shadow-2xl bg-background">
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white p-6 rounded-t-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn("px-2.5 py-0.5 rounded-md text-[11px] font-black border uppercase tracking-wider", getTypeBadgeClass(item.voucherType))}>
                  {item.voucherType} VOUCHER
                </span>
                {getStatusBadge()}
              </div>
              <DialogTitle className="text-2xl font-mono font-black tracking-wider text-white flex items-center gap-2">
                {item.voucherNumber}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  title="Copy Voucher Code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-1">
                Issued on {item.dateTime} at <span className="text-white font-semibold">{item.outletName}</span>
              </DialogDescription>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-300">Face Value</div>
              <div className="text-xl font-black font-mono text-[#4ade80]">{formatCurr(item.faceValue)}</div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-b text-xs">
          <div className="p-2.5 rounded-xl bg-background border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3 text-emerald-600" /> Face Value
            </div>
            <div className="text-sm font-black font-mono text-foreground mt-0.5">{formatCurr(item.faceValue)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-background border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3 text-amber-600" /> Discount Given
            </div>
            <div className="text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {formatCurr(item.discountAmount)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-background border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-sky-600" /> Settled Amount
            </div>
            <div className="text-sm font-black font-mono text-sky-600 dark:text-sky-400 mt-0.5">
              {formatCurr(item.settledAmount)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-background border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-indigo-600" /> Outstanding Bal
            </div>
            <div className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatCurr(item.outstandingAmount)}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Ownership & Beneficiary Info */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" /> Ownership & Beneficiary Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Customer Name</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                  {item.customerName || item.customerDetail || "Walk-in Customer"}
                </p>
              </div>
              {item.customerPhone && (
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Contact Phone</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{item.customerPhone}</p>
                </div>
              )}
              {item.companyName && item.companyName !== "-" && (
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Corporate Partner</span>
                  <p className="font-bold text-purple-700 dark:text-purple-300 mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {item.companyName}
                  </p>
                </div>
              )}
              {item.companyGlCode && item.companyGlCode !== "-" && (
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">GL Account Code</span>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">{item.companyGlCode}</p>
                </div>
              )}
            </div>
          </div>

          {/* Issuance Details & Validity */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-indigo-600" /> Issuance Context & Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Issued Store</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{item.outletName}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Base Memo / Claim #</span>
                <p className="font-mono font-bold text-sky-700 dark:text-sky-300 mt-0.5">{item.baseCashMemo}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Valid Until</span>
                <p className={cn("font-bold mt-0.5", item.isExpired ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400")}>
                  {item.validTill}
                  {item.daysToExpiry !== null && item.daysToExpiry !== undefined && (
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      ({item.daysToExpiry > 0 ? `${item.daysToExpiry} days left` : `${Math.abs(item.daysToExpiry)} days ago`})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details (if GIFT voucher) */}
          {(item.paymentMode || item.merchantName || item.slipNo) && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Payment & Bank Merchant Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Payment Mode</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{item.paymentMode || "Cash"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Bank Merchant</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{item.merchantName || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Bank Slip / Card</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {item.slipNo ? `Slip #${item.slipNo}` : item.cardLast4 ? `Card ...${item.cardLast4}` : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Redemption History Log */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-emerald-600" /> Redemption & Settlement History
            </h4>
            {item.redemptionList && item.redemptionList.length > 0 ? (
              <div className="divide-y rounded-xl border bg-background overflow-hidden">
                {item.redemptionList.map((red, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                        <FileCheck2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">Order #{red.orderNumber}</span>
                        <p className="text-[10px] text-muted-foreground">Redeemed on {red.dateTime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurr(red.amountUsed)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : item.settledInCashMemo && item.settledInCashMemo !== "Pending / Unsettled" ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-300">Invoice: {item.settledInCashMemo}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Settled at {item.settledDateTime}</p>
                </div>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurr(item.settledAmount || item.faceValue)}
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 text-center text-amber-800 dark:text-amber-300">
                <p className="font-semibold">Voucher is currently active and unsettled.</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                  It can be redeemed at POS checkout against eligible customer orders.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} className="px-5 font-bold">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
