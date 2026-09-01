import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Package, Coins, DollarSign, TrendingUp, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CostOfSalesTotals } from "./types";

interface CostOfSalesHeaderProps {
  totals: CostOfSalesTotals;
}

export function CostOfSalesHeader({ totals }: CostOfSalesHeaderProps) {
  const formatVal = (val: number) => (val === 0 ? "-" : val.toLocaleString());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              Sold Articles
            </p>
            <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100 font-mono">
              {totals.totalProducts}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Layers className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              Net Sold Qty
            </p>
            <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100 font-mono">
              {formatVal(totals.quantity)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Package className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              COGS (Cost)
            </p>
            <h3 className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(totals.totalCost)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <Coins className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              Net Revenue
            </p>
            <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totals.totalRevenue)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
