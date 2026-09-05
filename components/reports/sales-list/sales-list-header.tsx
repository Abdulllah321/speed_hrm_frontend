import React, { useState } from "react";
import { SalesListTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  DollarSign,
  Percent,
  Receipt,
  CreditCard,
  Wallet,
  Coins,
  Info,
  Repeat,
  ShieldAlert,
  Building2,
  Gift,
  Ticket,
  Award,
  UserCheck,
  Undo2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SalesListHeaderProps {
  totals: SalesListTotals;
}

export function SalesListHeader({ totals }: SalesListHeaderProps) {
  const [showAllTenders, setShowAllTenders] = useState(true);

  const formatCurr = (val?: number) =>
    `Rs. ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalVouchers =
    (totals.exchangeVoucherAmount || 0) +
    (totals.giftVoucherAmount || 0) +
    (totals.claimVoucherAmount || 0) +
    (totals.giftVoucherCorporate || 0) +
    (totals.creditVoucherAmount || 0) +
    (totals.rewardVoucherAmount || 0);

  return (
    <div className="space-y-3 no-print">
      {/* ── Primary KPI Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Net Sales Amount */}
        <Card className="border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 dark:from-emerald-950/40 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Net Sales
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-emerald-500 hover:text-emerald-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Total revenue collected from completed sales (Gross Sales - Discounts).
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-extrabold text-emerald-950 dark:text-emerald-100 mt-1 font-mono">
                {formatCurr(totals.netAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Invoices / Orders */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Invoices / Items
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Count of total completed POS invoices & sold line items.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {totals.orderCount.toLocaleString()} <span className="text-xs font-medium text-slate-500">({totals.totalItems.toLocaleString()} pcs)</span>
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 3. Gross Sales */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Gross Sales
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Total gross product retail amount before promotional or item discounts.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {formatCurr(totals.grossAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Receipt className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Discounts */}
        <Card className="border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/60 to-amber-100/20 dark:from-amber-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Discounts
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-amber-500 hover:text-amber-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Combined promo, alliance, coupon, and cart discounts applied.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-bold text-amber-900 dark:text-amber-100 mt-1 font-mono">
                {formatCurr(totals.discountAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Percent className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 5. Cash Tender */}
        <Card className="border border-teal-200/80 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/60 to-teal-100/20 dark:from-teal-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  Cash Tender
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-teal-500 hover:text-teal-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Total cash collected across all checkout registers.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-bold text-teal-950 dark:text-teal-100 mt-1 font-mono">
                {formatCurr(totals.cashSale || totals.cashAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Coins className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 6. Card Tender */}
        <Card className="border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 to-indigo-100/20 dark:from-indigo-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                  Card / Term
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-indigo-500 hover:text-indigo-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Total credit/debit card payments processed on card terminals.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-bold text-indigo-950 dark:text-indigo-100 mt-1 font-mono">
                {formatCurr(totals.cardSale || totals.cardAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 7. Total Vouchers & Credit */}
        <Card className="border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/60 to-purple-100/20 dark:from-purple-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                  Voucher & Credit
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-purple-500 hover:text-purple-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Combined total of Exchange, Claim, Gift, Corporate, Reward vouchers, and credit sales.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-bold text-purple-950 dark:text-purple-100 mt-1 font-mono">
                {formatCurr(totalVouchers + (totals.creditSale || totals.creditAmount || totals.onCreditAmount || 0))}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Wallet className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Detailed Tender & Voucher Settlement Strip ── */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-indigo-600" />
              Tender & Voucher Settlement Breakdown
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              11 Channels
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllTenders((prev) => !prev)}
            className="h-6 px-2 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {showAllTenders ? (
              <span className="flex items-center gap-1">Collapse <ChevronUp className="h-3 w-3" /></span>
            ) : (
              <span className="flex items-center gap-1">View Details <ChevronDown className="h-3 w-3" /></span>
            )}
          </Button>
        </div>

        {showAllTenders && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2 pt-1">
            {/* 1. Cash Sale */}
            <div className="bg-white dark:bg-slate-800/90 border border-teal-100 dark:border-teal-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                <Coins className="h-3 w-3 text-teal-600" />
                <span>Cash Sale</span>
              </div>
              <p className="text-xs font-extrabold text-teal-950 dark:text-teal-100 mt-1 font-mono">
                {formatCurr(totals.cashSale)}
              </p>
            </div>

            {/* 2. Card Sale */}
            <div className="bg-white dark:bg-slate-800/90 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                <CreditCard className="h-3 w-3 text-indigo-600" />
                <span>Card Sale</span>
              </div>
              <p className="text-xs font-extrabold text-indigo-950 dark:text-indigo-100 mt-1 font-mono">
                {formatCurr(totals.cardSale)}
              </p>
            </div>

            {/* 3. Exchange Voucher */}
            <div className="bg-white dark:bg-slate-800/90 border border-orange-100 dark:border-orange-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                <Repeat className="h-3 w-3 text-orange-600" />
                <span>Exchange Vch</span>
              </div>
              <p className="text-xs font-extrabold text-orange-950 dark:text-orange-100 mt-1 font-mono">
                {formatCurr(totals.exchangeVoucherAmount)}
              </p>
            </div>

            {/* 4. Claim Voucher */}
            <div className="bg-white dark:bg-slate-800/90 border border-amber-100 dark:border-amber-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-3 w-3 text-amber-600" />
                <span>Claim Vch</span>
              </div>
              <p className="text-xs font-extrabold text-amber-950 dark:text-amber-100 mt-1 font-mono">
                {formatCurr(totals.claimVoucherAmount)}
              </p>
            </div>

            {/* 5. Corporate Gift */}
            <div className="bg-white dark:bg-slate-800/90 border border-purple-100 dark:border-purple-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                <Building2 className="h-3 w-3 text-purple-600" />
                <span>Corp Gift</span>
              </div>
              <p className="text-xs font-extrabold text-purple-950 dark:text-purple-100 mt-1 font-mono">
                {formatCurr(totals.giftVoucherCorporate)}
              </p>
            </div>

            {/* 6. Gift Voucher */}
            <div className="bg-white dark:bg-slate-800/90 border border-violet-100 dark:border-violet-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <Gift className="h-3 w-3 text-violet-600" />
                <span>Gift Voucher</span>
              </div>
              <p className="text-xs font-extrabold text-violet-950 dark:text-violet-100 mt-1 font-mono">
                {formatCurr(totals.giftVoucherAmount)}
              </p>
            </div>

            {/* 7. Credit Voucher */}
            <div className="bg-white dark:bg-slate-800/90 border border-blue-100 dark:border-blue-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                <Ticket className="h-3 w-3 text-blue-600" />
                <span>Credit Vch</span>
              </div>
              <p className="text-xs font-extrabold text-blue-950 dark:text-blue-100 mt-1 font-mono">
                {formatCurr(totals.creditVoucherAmount)}
              </p>
            </div>

            {/* 8. Reward Voucher */}
            <div className="bg-white dark:bg-slate-800/90 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Award className="h-3 w-3 text-emerald-600" />
                <span>Reward Vch</span>
              </div>
              <p className="text-xs font-extrabold text-emerald-950 dark:text-emerald-100 mt-1 font-mono">
                {formatCurr(totals.rewardVoucherAmount)}
              </p>
            </div>

            {/* 9. Credit Sale / Customer Balance */}
            <div className="bg-white dark:bg-slate-800/90 border border-sky-100 dark:border-sky-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                <UserCheck className="h-3 w-3 text-sky-600" />
                <span>Credit Sale</span>
              </div>
              <p className="text-xs font-extrabold text-sky-950 dark:text-sky-100 mt-1 font-mono">
                {formatCurr(totals.creditSale || totals.onCreditAmount)}
              </p>
            </div>

            {/* 10. Credit Voucher Issued */}
            <div className="bg-white dark:bg-slate-800/90 border border-red-100 dark:border-red-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
                <Receipt className="h-3 w-3 text-red-600" />
                <span>Credit Issued</span>
              </div>
              <p className="text-xs font-extrabold text-red-950 dark:text-red-100 mt-1 font-mono">
                {formatCurr(totals.creditVoucherIssuedAmount)}
              </p>
            </div>

            {/* 11. Cash Return */}
            <div className="bg-white dark:bg-slate-800/90 border border-rose-100 dark:border-rose-900/40 rounded-xl p-2 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                <Undo2 className="h-3 w-3 text-rose-600" />
                <span>Cash Return</span>
              </div>
              <p className="text-xs font-extrabold text-rose-950 dark:text-rose-100 mt-1 font-mono">
                {formatCurr(totals.cashReturn)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
