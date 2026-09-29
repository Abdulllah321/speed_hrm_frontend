"use client";

import React, { useState } from "react";
import { NetSalesListTotals } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Receipt,
  Percent,
  ShoppingBag,
  CreditCard,
  Wallet,
  Coins,
  Info,
  Repeat,
  ShieldAlert,
  Building2,
  Gift,
  Ticket,
  Award,
  UserCheck,
  Undo2,
  ChevronDown,
  ChevronUp,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface NetSalesListHeaderProps {
  totals: NetSalesListTotals | null;
}

export function NetSalesListHeader({ totals }: NetSalesListHeaderProps) {
  const [showAllTenders, setShowAllTenders] = useState(true);

  if (!totals) return null;

  const formatCurr = (val?: number) =>
    (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3 no-print">
      {/* ── Primary KPI Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* 1. Net Sales Revenue (Hero Card) */}
        <Card className="border border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-emerald-100/40 dark:from-emerald-950/60 dark:to-slate-900 shadow-sm rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Net Sales Revenue
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-emerald-600 hover:text-emerald-800">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Net Revenue = Completed Sales Revenue ({formatCurr(totals.netSalesAmount)}) minus Returns & Refunds ({formatCurr(totals.netReturnAmount)}).
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                className="text-lg font-black text-emerald-950 dark:text-emerald-100 mt-1 font-mono truncate"
                title={`Net Sales Revenue: ${formatCurr(totals.totalNetAmount)}`}
              >
                PKR {formatCurr(totals.totalNetAmount)}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> {formatCurr(totals.netSalesAmount)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <ArrowDownLeft className="h-3 w-3" /> {formatCurr(totals.netReturnAmount)}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Documents & Net Items */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Documents & Items
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Total Transactions ({totals.totalDocuments} total = {totals.salesOrderCount} Sales Orders + {totals.returnCount} Returns). Net Items = {totals.totalItemsSold} Sold - {totals.totalItemsReturned} Returned.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono truncate"
                title={`Net Items: ${totals.netItems.toLocaleString()} pcs`}
              >
                {totals.netItems.toLocaleString()} <span className="text-xs font-normal text-slate-500">pcs (Net)</span>
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                {totals.salesOrderCount} Sales / {totals.returnCount} Returns
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 3. Net Gross Sales (WOST on top, Retail below) */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Net Gross (WOST)
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-slate-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Top: Net Gross Without Sales Tax (WOST) = {formatCurr(totals.netWostAmount)}. Bottom: Net Retail Gross = {formatCurr(totals.netGrossAmount)}.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono truncate"
                title={`Net WOST Gross: ${formatCurr(totals.netWostAmount)}`}
              >
                {formatCurr(totals.netWostAmount)}
              </p>
              <p
                className="text-[10px] text-slate-500 font-mono mt-0.5 truncate"
                title={`Retail Net Gross: ${formatCurr(totals.netGrossAmount)}`}
              >
                Retail: {formatCurr(totals.netGrossAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Net Discounts (WOST on top, Retail below) */}
        <Card className="border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/60 to-amber-100/20 dark:from-amber-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Net Discounts
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-amber-500 hover:text-amber-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Net Discount given (Sales Discounts minus Reversed Discounts in Returns). Top: WOST ({formatCurr(totals.netDiscountWostAmount)}). Bottom: Retail ({formatCurr(totals.netDiscountAmount)}).
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                className="text-base font-bold text-amber-900 dark:text-amber-100 mt-1 font-mono truncate"
                title={`Net Discount (WOST): ${formatCurr(totals.netDiscountWostAmount)}`}
              >
                {formatCurr(totals.netDiscountWostAmount)}
              </p>
              <p
                className="text-[10px] text-amber-700/80 dark:text-amber-400 font-mono mt-0.5 truncate"
                title={`Retail Net Discount: ${formatCurr(totals.netDiscountAmount)}`}
              >
                Retail: {formatCurr(totals.netDiscountAmount)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Percent className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 5. Net Cash */}
        <Card className="border border-teal-200/80 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/60 to-teal-100/20 dark:from-teal-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  Net Cash
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-teal-500 hover:text-teal-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Net Cash collected = Cash Sales ({formatCurr(totals.cashSale)}) minus Cash Refunds ({formatCurr(totals.cashRefund)}).
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                className="text-base font-bold text-teal-950 dark:text-teal-100 mt-1 font-mono truncate"
                title={`Net Cash: ${formatCurr(totals.netCash)}`}
              >
                {formatCurr(totals.netCash)}
              </p>
              <p className="text-[10px] text-teal-700/80 dark:text-teal-400 font-mono mt-0.5 truncate">
                Sale: {formatCurr(totals.cashSale)} | Ref: {formatCurr(totals.cashRefund)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
              <Coins className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 6. Net Card */}
        <Card className="border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/60 to-blue-100/20 dark:from-blue-950/30 dark:to-slate-900 shadow-2xs rounded-2xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                  Net Card
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-blue-500 hover:text-blue-700">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                    Net Card settlement = Card Sales ({formatCurr(totals.cardSale)}) minus Card Refunds ({formatCurr(totals.cardRefund)}).
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                className="text-base font-bold text-blue-950 dark:text-blue-100 mt-1 font-mono truncate"
                title={`Net Card: ${formatCurr(totals.netCard)}`}
              >
                {formatCurr(totals.netCard)}
              </p>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-400 font-mono mt-0.5 truncate">
                Sale: {formatCurr(totals.cardSale)} | Ref: {formatCurr(totals.cardRefund)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Secondary Tender Channels Breakdown Bar ── */}
      <Card className="border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shadow-none rounded-2xl">
        <div className="p-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tender & Voucher Reconciliation Breakdown
            </span>
            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-slate-100 dark:bg-slate-800">
              11 Channels Audited
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            onClick={() => setShowAllTenders(!showAllTenders)}
          >
            {showAllTenders ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" /> Expand
              </>
            )}
          </Button>
        </div>

        {showAllTenders && (
          <CardContent className="p-3 pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* Credit Sale */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Credit Sale</span>
                <UserCheck className="h-3 w-3 text-indigo-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.creditSale)}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">Account Receivable</p>
            </div>

            {/* Exchange Vouchers (Redeemed vs Issued) */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Exchange Voucher</span>
                <Repeat className="h-3 w-3 text-violet-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.netExchangeVoucher)} <span className="text-[9px] font-normal text-slate-400">(Net)</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Red: {formatCurr(totals.exchangeVoucherRedeemed)} | Iss: {formatCurr(totals.exchangeVoucherIssued)}
              </p>
            </div>

            {/* Credit Vouchers (Redeemed vs Issued) */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Credit Voucher</span>
                <Ticket className="h-3 w-3 text-sky-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.netCreditVoucher)} <span className="text-[9px] font-normal text-slate-400">(Net)</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Red: {formatCurr(totals.creditVoucherRedeemed)} | Iss: {formatCurr(totals.creditVoucherIssued)}
              </p>
            </div>

            {/* Claim Vouchers (Redeemed vs Issued) */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Claim Voucher</span>
                <ShieldAlert className="h-3 w-3 text-amber-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.netClaimVoucher)} <span className="text-[9px] font-normal text-slate-400">(Net)</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Red: {formatCurr(totals.claimVoucherRedeemed)} | Iss: {formatCurr(totals.claimVoucherIssued)}
              </p>
            </div>

            {/* Gift Vouchers */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Gift Voucher</span>
                <Gift className="h-3 w-3 text-rose-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.giftVoucherAmount)}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">Customer Gift</p>
            </div>

            {/* Corporate Vouchers */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Corporate</span>
                <Building2 className="h-3 w-3 text-cyan-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.giftVoucherCorporate)}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">B2B Institutional</p>
            </div>

            {/* Reward Vouchers */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase">Loyalty Reward</span>
                <Award className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate">
                {formatCurr(totals.rewardVoucherAmount)}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">Points Redeemed</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
