"use client";

import React from "react";
import { TransactionTotals } from "./types";
import { Layers, Inbox, ArrowUpRight, ArrowDownRight, Truck, Scale } from "lucide-react";

interface HeaderProps {
    grandTotals: TransactionTotals;
    isLoading: boolean;
}

export function StockTransactionDetailHeader({ grandTotals, isLoading }: HeaderProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Total SKUs */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Total SKUs / Items</span>
                    <Layers className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? "..." : grandTotals.totalItems.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground">Active products analyzed</p>
            </div>

            {/* Card 2: B/F Opening Balance */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Opening Balance (B/F)</span>
                    <Inbox className="h-4 w-4 text-slate-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                    {isLoading ? "..." : grandTotals.openingBalance.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground">Starting inventory stock</p>
            </div>

            {/* Card 3: Total Inbound */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Inbound Stock (+)</span>
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {isLoading ? "..." : `+${grandTotals.totalInInbound ? grandTotals.totalInQty.toLocaleString() : grandTotals.totalInQty.toLocaleString()}`}
                </div>
                <p className="text-[10px] text-muted-foreground">GRN, Transfers & Returns</p>
            </div>

            {/* Card 4: Total Outbound */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Outbound Stock (-)</span>
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                    {isLoading ? "..." : `-${grandTotals.totalOutQty.toLocaleString()}`}
                </div>
                <p className="text-[10px] text-muted-foreground">Sales, Dispatches & Voids</p>
            </div>

            {/* Card 5: In Transit */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>In-Transit Stock</span>
                    <Truck className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {isLoading ? "..." : grandTotals.inTransitQty.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground">Active transfer movement</p>
            </div>

            {/* Card 6: Net Closing Balance */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Net Closing Balance</span>
                    <Scale className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                    {isLoading ? "..." : grandTotals.closingBalance.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground">Ending available stock</p>
            </div>
        </div>
    );
}
