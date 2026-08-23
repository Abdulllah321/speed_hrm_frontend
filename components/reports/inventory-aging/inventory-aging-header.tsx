import React from "react";
import { InventoryAgingTotals } from "./types";
import {
  Clock,
  PackageCheck,
  TrendingDown,
  AlertTriangle,
  Flame,
  ShieldAlert,
} from "lucide-react";

interface InventoryAgingHeaderProps {
  totals: InventoryAgingTotals;
}

export function InventoryAgingHeader({ totals }: InventoryAgingHeaderProps) {
  const freshValue = totals.totalBucket0to30Value;
  const regularValue = totals.totalBucket31to60Value + totals.totalBucket61to90Value;
  const slowValue = totals.totalBucket91to120Value + totals.totalBucket121to180Value;
  const agedValue = totals.totalBucket181PlusValue;

  const totalValue = totals.totalStockValue || 1;
  const agedRatio = ((agedValue / totalValue) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
      {/* 1. Total Stock Units */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Stock Units
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <PackageCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {totals.totalStockQty.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ({totals.totalItems} SKUs)
          </span>
        </div>
      </div>

      {/* 2. Total Valuation */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Valuation
          </span>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Rs. {totals.totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* 3. Fresh Stock (0–30 Days) */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Fresh (0–30d)
          </span>
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
            <Flame className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Rs. {freshValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
            {totals.totalBucket0to30Qty.toLocaleString()} pcs
          </span>
        </div>
      </div>

      {/* 4. Regular (31–90 Days) */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Regular (31–90d)
          </span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Rs. {regularValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {(totals.totalBucket31to60Qty + totals.totalBucket61to90Qty).toLocaleString()} pcs
          </span>
        </div>
      </div>

      {/* 5. Slow Moving (91–180 Days) */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group hover:border-orange-500/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            Slow Moving (91–180d)
          </span>
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Rs. {slowValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
            {(totals.totalBucket91to120Qty + totals.totalBucket121to180Qty).toLocaleString()} pcs
          </span>
        </div>
      </div>

      {/* 6. Aged Stock (181+ Days) */}
      <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm relative overflow-hidden group hover:border-rose-500 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
            Aged Stock (181+d)
          </span>
          <div className="p-2 rounded-xl bg-rose-600 text-white">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-rose-900 dark:text-rose-200">
            Rs. {agedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs font-black text-rose-600 dark:text-rose-400">
            {agedRatio}% ({totals.totalBucket181PlusQty.toLocaleString()} pcs)
          </span>
        </div>
      </div>
    </div>
  );
}
