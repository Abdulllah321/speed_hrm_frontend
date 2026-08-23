import React from "react";
import { GrossSalesSummaryTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingBag,
  Info,
  Receipt,
} from "lucide-react";

interface GrossSalesSummaryHeaderProps {
  totals: GrossSalesSummaryTotals;
}

export function GrossSalesSummaryHeader({ totals }: GrossSalesSummaryHeaderProps) {
  const formatCurr = (val: number) =>
    `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 no-print">
      {/* 1. Net Sales */}
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
                  Total revenue collected from completed sales across all categories.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100 mt-1 font-mono">
              {formatCurr(totals.netAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Items Sold */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Total Units Sold
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total physical product quantity sold across register checkouts.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {totals.totalItems.toLocaleString()} <span className="text-xs font-medium text-slate-500">pcs</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Gross Amount */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Gross Amount
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total gross product retail price before promotional discounts.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.grossAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Total Discounts */}
      <Card className="border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/60 to-amber-100/20 dark:from-amber-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
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
                  Combined line item and promo discounts applied.
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

      {/* 5. Sales Taxes */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Taxes Collected
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Sales tax collected on register transactions.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurr(totals.taxAmount)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Receipt className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
