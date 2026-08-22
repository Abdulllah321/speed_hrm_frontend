import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Inbox, Coins, DollarSign, TrendingUp, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CostOfSalesTotals } from "./types";

interface CostOfSalesHeaderProps {
  totals: CostOfSalesTotals;
}

export function CostOfSalesHeader({ totals }: CostOfSalesHeaderProps) {
  const formatVal = (val: number) => (val === 0 ? "-" : val.toLocaleString());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Sold Articles
            </p>
            <h3 className="text-lg font-bold mt-0.5 text-slate-800 dark:text-slate-100">
              {totals.totalProducts}
            </h3>
          </div>
          <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
            <Layers className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Sold Quantity
            </p>
            <h3 className="text-lg font-bold mt-0.5 text-slate-800 dark:text-slate-100">
              {formatVal(totals.quantity)}
            </h3>
          </div>
          <div className="rounded-lg p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
            <Inbox className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Cost of Sales (COGS)
            </p>
            <h3 className="text-lg font-bold mt-0.5 text-amber-600 dark:text-amber-400">
              {formatCurrency(totals.totalCost)}
            </h3>
          </div>
          <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
            <Coins className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Total Revenue
            </p>
            <h3 className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.totalRevenue)}
            </h3>
          </div>
          <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Gross Profit
            </p>
            <h3 className="text-lg font-bold mt-0.5 text-teal-600 dark:text-teal-400">
              {formatCurrency(totals.grossProfit)}
            </h3>
          </div>
          <div className="rounded-lg p-2 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Profit Margin %
            </p>
            <h3 className="text-lg font-bold mt-0.5 text-sky-600 dark:text-sky-400">
              {totals.profitMargin}%
            </h3>
          </div>
          <div className="rounded-lg p-2 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400">
            <Percent className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
