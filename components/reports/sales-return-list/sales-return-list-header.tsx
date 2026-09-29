"use client";

import React from "react";
import { SalesReturnTotals } from "./types";
import {
  RotateCcw,
  Package,
  Receipt,
  Tag,
  DollarSign,
  Ticket,
  Percent,
} from "lucide-react";

import { DateRange } from "@/components/ui/date-range-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SalesReturnListHeaderProps {
  totals?: SalesReturnTotals;
  grandTotals?: SalesReturnTotals;
  dateRange?: DateRange;
  selectedLocations?: string;
  isCalculating?: boolean;
  progressPercent?: number;
  progressMessage?: string;
}

export function SalesReturnListHeader({
  totals: propTotals,
  grandTotals,
}: SalesReturnListHeaderProps) {
  const totals: SalesReturnTotals = propTotals || grandTotals || {
    returnCount: 0,
    totalItems: 0,
    grossAmount: 0,
    wostAmount: 0,
    discountAmount: 0,
    discountWostAmount: 0,
    amountAfterDiscount: 0,
    taxAmount: 0,
    netAmount: 0,
    cashRefund: 0,
    cardRefund: 0,
    voucherIssuedAmount: 0,
    exchangeVoucherAmount: 0,
    creditVoucherAmount: 0,
    claimVoucherAmount: 0,
    rewardVoucherAmount: 0,
  };

  const fmt = (val?: number) =>
    (val || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const cards = [
    {
      title: "Total Returns",
      value: (totals.returnCount || 0).toLocaleString(),
      unit: "Orders",
      icon: RotateCcw,
      bg: "bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-900/10",
      border: "border-rose-200/80 dark:border-rose-900/50",
      text: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400",
      sub: `${(totals.totalItems || 0).toLocaleString()} Return Units`,
      fullValue: `${(totals.returnCount || 0).toLocaleString()} Return Orders (${(totals.totalItems || 0).toLocaleString()} Total Units)`,
    },
    {
      title: "Return Units (Qty)",
      value: (totals.totalItems || 0).toLocaleString(),
      unit: "Pcs",
      icon: Package,
      bg: "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-900/10",
      border: "border-amber-200/80 dark:border-amber-900/50",
      text: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400",
      sub: `Avg ${(totals.returnCount > 0 ? (totals.totalItems / totals.returnCount).toFixed(1) : "0")} units / return`,
      fullValue: `${(totals.totalItems || 0).toLocaleString()} Return Units (Avg: ${(totals.returnCount > 0 ? (totals.totalItems / totals.returnCount).toFixed(2) : "0")} units per return)`,
    },
    {
      title: "Return Value (Excl. Tax)",
      value: fmt(totals.wostAmount),
      icon: Receipt,
      bg: "bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-950/40 dark:via-sky-900/10",
      border: "border-sky-200/80 dark:border-sky-900/50",
      text: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400",
      sub: `Gross Retail: ${fmt(totals.grossAmount)}`,
      fullValue: `Return Value (Excl. Tax / WOST): ${fmt(totals.wostAmount)} | Gross Retail: ${fmt(totals.grossAmount)}`,
    },
    {
      title: "Discount Reversed (WOST)",
      value: fmt(totals.discountWostAmount),
      icon: Percent,
      bg: "bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-950/40 dark:via-purple-900/10",
      border: "border-purple-200/80 dark:border-purple-900/50",
      text: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400",
      sub: `Retail Disc: ${fmt(totals.discountAmount)}`,
      fullValue: `Discount Reversed (WOST): ${fmt(totals.discountWostAmount)} | Retail Disc: ${fmt(totals.discountAmount)}`,
    },
    {
      title: "Sales Tax Reversed (18%)",
      value: fmt(totals.taxAmount),
      icon: Tag,
      bg: "bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-950/40 dark:via-indigo-900/10",
      border: "border-indigo-200/80 dark:border-indigo-900/50",
      text: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400",
      sub: "Reversed from Tax Liability",
      fullValue: `Sales Tax Reversed (18%): ${fmt(totals.taxAmount)}`,
    },
    {
      title: "Net Return Value (Incl.)",
      value: fmt(totals.netAmount),
      icon: DollarSign,
      bg: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/10",
      border: "border-emerald-200/80 dark:border-emerald-900/50",
      text: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400",
      sub: "Total Refund & Exchange Outflow",
      fullValue: `Net Return Value (Tax Incl.): ${fmt(totals.netAmount)}`,
    },
    {
      title: "Cash Refunded",
      value: fmt(totals.cashRefund),
      icon: DollarSign,
      bg: "bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-950/40 dark:via-orange-900/10",
      border: "border-orange-200/80 dark:border-orange-900/50",
      text: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400",
      sub: "Direct Cash Drawer Outflow",
      fullValue: `Cash Refund Outflow: ${fmt(totals.cashRefund)}`,
    },
    {
      title: "Vouchers Issued",
      value: fmt(totals.voucherIssuedAmount),
      icon: Ticket,
      bg: "bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent dark:from-teal-950/40 dark:via-teal-900/10",
      border: "border-teal-200/80 dark:border-teal-900/50",
      text: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400",
      sub: `Exc: ${fmt(totals.exchangeVoucherAmount)} | Crd: ${fmt(totals.creditVoucherAmount)}`,
      fullValue: `Vouchers Issued: ${fmt(totals.voucherIssuedAmount)} (Exc: ${fmt(totals.exchangeVoucherAmount)} | Crd: ${fmt(totals.creditVoucherAmount)} | Clm: ${fmt(totals.claimVoucherAmount)})`,
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3.5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <div
                  className={`p-3.5 rounded-xl border ${card.border} ${card.bg} shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
                  title={`${card.title}: ${card.value}${card.unit ? " " + card.unit : ""}\n${card.sub || ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">
                      {card.title}
                    </span>
                    <div className={`p-1.5 rounded-lg ${card.iconBg} shrink-0`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`text-base font-extrabold tracking-tight ${card.text} truncate`}>
                      {card.value}
                      {card.unit && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                          {card.unit}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {card.sub}
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1 bg-slate-950 text-slate-100 border border-slate-800 shadow-xl">
                <div className="font-semibold text-slate-300">{card.title}</div>
                <div className="font-mono text-sm font-black text-amber-400">
                  {card.value}{card.unit ? " " + card.unit : ""}
                </div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-1">
                  {card.fullValue}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
