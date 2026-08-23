import React from "react";
import { GrossSalesReturnTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  RotateCcw,
  DollarSign,
  Percent,
  Receipt,
  CreditCard,
  Wallet,
  Coins,
  Info,
} from "lucide-react";

interface GrossSalesReturnHeaderProps {
  totals: GrossSalesReturnTotals;
}

export function GrossSalesReturnHeader({ totals }: GrossSalesReturnHeaderProps) {
  const formatCurr = (val: number) =>
    `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 no-print">
      {/* 1. Net Sales Return */}
      <Card className="border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/80 to-rose-100/30 dark:from-rose-950/40 dark:to-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Net Sales Returns
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-rose-500 hover:text-rose-700">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total refund amount issued for sales returns & exchange notes.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-extrabold text-rose-950 dark:text-rose-100 mt-1 font-mono">
              {formatCurr(totals.netAmount)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-rose-600/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400">
            <RotateCcw className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Return Notes / Returned Units */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Returns / Units
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Count of total sales return notes & returned product quantity.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {totals.returnCount.toLocaleString()} <span className="text-xs font-medium text-slate-500">({totals.totalItems.toLocaleString()} pcs)</span>
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Receipt className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Gross Return Amount */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Gross Return Amt
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Gross price of returned items before promo adjustments.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.grossAmount)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Return Discounts */}
      <Card className="border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/60 to-amber-100/20 dark:from-amber-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Return Discounts
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-amber-500 hover:text-amber-700">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Reversed discount portion associated with returned merchandise.
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

      {/* 5. Cash Refund */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Cash Refund
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Cash paid out directly to customers for returned sales.
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

      {/* 6. Card Refund */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Card Refund
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Card refund chargebacks or banking reversals.
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

      {/* 7. Exchange Voucher Issued */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Exchange Voucher
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Store credit / exchange vouchers issued for returns.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.voucherAmount)}
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
