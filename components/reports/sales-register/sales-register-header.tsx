import React from "react";
import { SalesRegisterTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ShoppingBag,
  DollarSign,
  Percent,
  Receipt,
  CreditCard,
  Wallet,
  Coins,
  Info,
} from "lucide-react";

interface SalesRegisterHeaderProps {
  totals: SalesRegisterTotals;
}

export function SalesRegisterHeader({ totals }: SalesRegisterHeaderProps) {
  const formatCurr = (val: number) =>
    `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 no-print">
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

      {/* 2. Total Invoices / Items */}
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
                  Count of total completed POS register invoices & line items.
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
                Total Discounts
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

      {/* 5. Cash Payments */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Cash Tender
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total cash collected across register checkouts.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.cashAmount)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Coins className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* 6. Card Payments */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Card / POS Term
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total credit/debit card payments processed.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.cardAmount)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <CreditCard className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* 7. Wallet / Credit Payments */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Wallet / Credit
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Mobile wallet, corporate credit, or voucher redemptions.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.walletAmount + totals.creditAmount)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Wallet className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
