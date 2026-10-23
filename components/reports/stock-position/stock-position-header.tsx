import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Layers,
  ShoppingCart,
  TrendingUp,
  Package,
  Boxes,
  Rocket,
  Info,
} from "lucide-react";
import { StockPositionTotals } from "./types";

interface StockPositionHeaderProps {
  totals: StockPositionTotals;
  totalSkus?: number;
}

export function StockPositionHeader({
  totals,
  totalSkus,
}: StockPositionHeaderProps) {
  const formatVal = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "" || val === "-") return "-";
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toLocaleString();
  };

  const sellThroughFormatted =
    totals.sellThroughPercent != null && totals.sellThroughPercent > 0
      ? `${totals.sellThroughPercent.toFixed(1)}%`
      : "-";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
      {/* Beginning Stock */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-indigo-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Beginning
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100"
                >
                  Beginning Stock = Opening (B/F) + Net Purchases + Net Adjustments.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3
              className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100 font-mono"
              title={`Beginning: ${totals.beginning?.toLocaleString() || 0} pcs`}
            >
              {formatVal(totals.beginning)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <Layers className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Net Sales */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-emerald-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Net Sales
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100"
                >
                  Net Sales = POS Sales + Deliveries - Sales Returns.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3
              className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono"
              title={`Net Sales: ${totals.netSales?.toLocaleString() || 0} pcs`}
            >
              {formatVal(totals.netSales)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Sell Through % */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-amber-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Sell Through %
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100"
                >
                  Sell Through Rate = (Net Sales / Beginning) × 100.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3
              className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400 font-mono"
              title={`Sell Through: ${sellThroughFormatted}`}
            >
              {sellThroughFormatted}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* End Stock */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-blue-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                End Stock
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100"
                >
                  End Stock = Beginning - Net Sales.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3
              className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400 font-mono"
              title={`End: ${totals.end?.toLocaleString() || 0} pcs`}
            >
              {formatVal(totals.end)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            <Package className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Total Quantity */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-violet-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Total Quantity
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-violet-500 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100"
                >
                  Total sale quantity done on the latest sale date across all outlets.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3
              className="text-xl font-bold mt-1 text-violet-600 dark:text-violet-400 font-mono"
              title={`Total Qty: ${totals.totalQty?.toLocaleString() || 0} pcs`}
            >
              {formatVal(totals.totalQty)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
            <Boxes className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Launch Quantity */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-cyan-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Launch Qty
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-cyan-500 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100"
                >
                  Initial launch or receipt quantity from GRN / Landed Cost.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3
              className="text-xl font-bold mt-1 text-cyan-600 dark:text-cyan-400 font-mono"
              title={`Launch Qty: ${totals.launchQty?.toLocaleString() || 0} pcs`}
            >
              {formatVal(totals.launchQty)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400">
            <Rocket className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
