import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Layers, ArrowDownLeft, ArrowUpRight, ShoppingCart, PackageCheck, Truck, Info } from "lucide-react";
import { StockActivityTotals } from "./types";

interface StockActivityHeaderProps {
  totals: StockActivityTotals;
}

export function StockActivityHeader({ totals }: StockActivityHeaderProps) {
  const formatVal = (val: number) => (val === 0 ? "-" : val.toLocaleString());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
      {/* Opening B/F */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-indigo-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Opening B/F
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-indigo-500 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total starting stock balance brought forward before the selected start date.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100 font-mono">
              {formatVal(totals.bf)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Layers className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Total Inbound */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-emerald-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Total Inbound
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-emerald-500 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total stock received into location from Warehouses ({formatVal(totals.fromWarehouse)}) + Outlets ({formatVal(totals.fromOutlet)}).
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
              {formatVal(totals.totalTrfIn)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Total Outbound */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-rose-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Total Outbound
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-rose-500 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Total stock transferred out to Warehouses ({formatVal(totals.toWarehouse)}) + Outlets ({formatVal(totals.toOutlet)}).
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400 font-mono">
              {formatVal(totals.totalTrfOut)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* POS Sold Qty */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-indigo-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                POS Sold Qty
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-indigo-500 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Net POS units sold to retail customers during the selected period.
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400 font-mono">
              {formatVal(totals.sales)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Closing Available */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-teal-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Closing Available
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-teal-500 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Current physically available stock on hand (Opening + Inbound - Outbound + Returns - Sales + Adj).
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-xl font-bold mt-1 text-teal-600 dark:text-teal-400 font-mono">
              {formatVal(totals.availableStock)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400">
            <PackageCheck className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* In-Transit */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden relative group hover:border-amber-500/40 transition-all">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                In-Transit
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-amber-500 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                  Stock dispatched and currently en-route (pending receipt confirmation at target destination).
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400 font-mono">
              {formatVal(totals.transit)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <Truck className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
