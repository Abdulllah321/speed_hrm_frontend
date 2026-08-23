"use client";

import React from "react";
import { AllianceRegisterTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Layers, ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface HeaderProps {
  totals: AllianceRegisterTotals;
}

export function AllianceRegisterHeader({ totals }: HeaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
      {/* Memos Count */}
      <Card className="border-border/60 shadow-sm bg-card hover:border-border transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Alliance Memos
            </p>
            <h3 className="text-2xl font-black text-foreground">
              {totals.count.toLocaleString()}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Inbox className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Retail Price */}
      <Card className="border-border/60 shadow-sm bg-card hover:border-border transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Retail Price Value
            </p>
            <h3 className="text-2xl font-black text-foreground font-mono">
              {formatCurrency(totals.retailPrice)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-slate-500/10 text-slate-600 dark:text-slate-400">
            <Layers className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Discount Availed */}
      <Card className="border-border/60 shadow-sm bg-card hover:border-border transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Discount Availed
            </p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(totals.discount)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Net Sales */}
      <Card className="border-border/60 shadow-sm bg-card hover:border-border transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Net Sales Revenue
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totals.netSale)}
            </h3>
          </div>
          <div className="rounded-xl p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
