import React from "react";
import { NetSalesSummaryTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  TrendingUp,
  RotateCcw,
  Percent,
  ShoppingBag,
  Info,
  DollarSign,
} from "lucide-react";

interface NetSalesSummaryHeaderProps {
  totals: NetSalesSummaryTotals;
}

export function NetSalesSummaryHeader({ totals }: NetSalesSummaryHeaderProps) {
  const formatCurr = (val: number) =>
    `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 no-print">
      {/* 1. Net Revenue */}
      <Card className="border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 dark:from-emerald-950/40 dark:to-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Net Sales Revenue
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-emerald-500 hover:text-emerald-700">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total gross sales minus return refunds and promotional discounts.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100 mt-1 font-mono">
              {formatCurr(totals.netSalesAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Net Units Sold */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Net Sold Quantity
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total items sold minus items returned.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {totals.netItems.toLocaleString()} <span className="text-xs font-medium text-slate-500">pcs</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Gross Sales */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Gross Sales Amount
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Gross checkout value before returns and discounts.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.grossSalesAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Total Returns */}
      <Card className="border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/60 to-rose-100/20 dark:from-rose-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Total Returns & Refunds
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-rose-500 hover:text-rose-700">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total return refunds deducted from revenue.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-rose-900 dark:text-rose-100 mt-1 font-mono">
              {formatCurr(totals.returnAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <RotateCcw className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 5. Total Discounts */}
      <Card className="border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/60 to-amber-100/20 dark:from-amber-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Discounts Applied
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-amber-500 hover:text-amber-700">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Line item and promotion discounts.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1 font-mono">
              {formatCurr(totals.discountAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Percent className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
