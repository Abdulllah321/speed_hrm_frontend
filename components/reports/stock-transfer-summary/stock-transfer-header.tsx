"use client";

import React from "react";
import { TransferGrandTotals } from "./types";
import {
    ArrowLeftRight,
    ArrowUpRight,
    CheckCircle2,
    Truck,
    ShieldCheck,
} from "lucide-react";

interface HeaderProps {
    grandTotals: TransferGrandTotals;
    isLoading: boolean;
}

export function StockTransferHeader({ grandTotals, isLoading }: HeaderProps) {
    const acceptanceRate =
        grandTotals.totalSentQty > 0
            ? Math.round((grandTotals.totalReceivedQty / grandTotals.totalSentQty) * 100)
            : 0;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Card 1: Total Transfers */}
            <div
                className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1 transition-all hover:border-primary/40 cursor-default"
                title={`Total Transfer Orders: ${grandTotals.totalTransfers.toLocaleString()}`}
            >
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Total Transfers</span>
                    <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground truncate">
                    {isLoading ? "..." : grandTotals.totalTransfers.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                    {grandTotals.totalItems.toLocaleString()} SKU line items
                </p>
            </div>

            {/* Card 2: Units Sent */}
            <div
                className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1 transition-all hover:border-sky-500/40 cursor-default"
                title={`Total Units Sent: ${grandTotals.totalSentQty.toLocaleString()}`}
            >
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Units Sent</span>
                    <ArrowUpRight className="h-4 w-4 text-sky-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-sky-600 dark:text-sky-400 truncate">
                    {isLoading ? "..." : grandTotals.totalSentQty.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground">Dispatched stock quantity</p>
            </div>

            {/* Card 3: Units Accepted / Received */}
            <div
                className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1 transition-all hover:border-emerald-500/40 cursor-default"
                title={`Units Received & Accepted: ${grandTotals.totalReceivedQty.toLocaleString()}`}
            >
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Units Accepted</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
                    {isLoading ? "..." : grandTotals.totalReceivedQty.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                    {grandTotals.statusCounts.completed} completed transfers
                </p>
            </div>

            {/* Card 4: In-Transit / Pending */}
            <div
                className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1 transition-all hover:border-amber-500/40 cursor-default"
                title={`Units Pending / In-Transit: ${grandTotals.totalPendingQty.toLocaleString()}`}
            >
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Pending / In-Transit</span>
                    <Truck className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 truncate">
                    {isLoading ? "..." : grandTotals.totalPendingQty.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                    {grandTotals.statusCounts.pending + grandTotals.statusCounts.inTransit} active movements
                </p>
            </div>

            {/* Card 5: Acceptance Rate */}
            <div
                className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1 transition-all hover:border-purple-500/40 cursor-default"
                title={`Acceptance Fulfilled Rate: ${acceptanceRate}%`}
            >
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                    <span>Acceptance Rate</span>
                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400 truncate">
                    {isLoading ? "..." : `${acceptanceRate}%`}
                </div>
                <p className="text-[10px] text-muted-foreground">Receipt completion ratio</p>
            </div>
        </div>
    );
}
