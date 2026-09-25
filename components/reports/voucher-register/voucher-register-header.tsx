import React from "react";
import { VoucherRegisterTotals, VoucherReportMode } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Ticket,
  Coins,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VoucherRegisterHeaderProps {
  totals: VoucherRegisterTotals;
  mode: VoucherReportMode;
  asOfDateStr?: string;
  totalVouchersInDataset?: number;
}

export function VoucherRegisterHeader({
  totals,
  mode,
  asOfDateStr,
  totalVouchersInDataset,
}: VoucherRegisterHeaderProps) {
  const formatCurr = (val: number) =>
    `Rs. ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isOutstandingMode = mode === "outstanding";
  const displayCount = totals.totalVouchers;

  return (
    <div className="space-y-4 no-print">
      {/* Refined Enterprise Mode Context Banner */}
      {isOutstandingMode ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Outstanding Liability Ledger
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  • As of {asOfDateStr || "Today"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                Filtering all active, unsettled vouchers issued on or before selected date across all stores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-slate-800 sm:pl-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Unsettled
              </div>
              <div className="text-base font-extrabold font-mono text-white">
                {totals.totalOutstandingCount.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-400">vouchers</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Liability (PKR)
              </div>
              <div className="text-base font-extrabold font-mono text-amber-300">
                {formatCurr(totals.totalOutstandingAmount)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Clean Enterprise Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Outstanding Liability */}
        <Card className="border border-border/80 bg-card hover:border-border transition-colors shadow-2xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Outstanding Liability
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Net unredeemed balance representing current unsettled financial liability.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <p className="text-xl font-bold font-mono text-foreground tracking-tight">
                {formatCurr(totals.totalOutstandingAmount)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{totals.totalOutstandingCount.toLocaleString()} unredeemed vouchers</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Face Value */}
        <Card className="border border-border/80 bg-card hover:border-border transition-colors shadow-2xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Face Value
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Total face value printed across all vouchers in the current view.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold font-mono text-foreground tracking-tight">
                {formatCurr(totals.totalFaceValue)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{displayCount.toLocaleString()} total vouchers</span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Settled / Redeemed Value */}
        <Card className="border border-border/80 bg-card hover:border-border transition-colors shadow-2xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Settled Value
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Value redeemed at POS checkout against customer invoices.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatCurr(totals.totalSettledAmount)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{totals.totalRedeemedCount.toLocaleString()} redeemed</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Discounts */}
        <Card className="border border-border/80 bg-card hover:border-border transition-colors shadow-2xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Discounts
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Total discount granted at time of voucher issuance.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold font-mono text-foreground tracking-tight">
                {formatCurr(totals.totalDiscount)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">Net: {formatCurr(totals.totalNetValue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 5. Validity Breakdown */}
        <Card className="border border-border/80 bg-card hover:border-border transition-colors shadow-2xs rounded-xl col-span-2 md:col-span-4 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status Mix
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex flex-col gap-1 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Valid Active
                </span>
                <span className="font-mono font-bold">{totals.totalActiveCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Expired
                </span>
                <span className="font-mono font-bold text-muted-foreground">{totals.totalExpiredCount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
