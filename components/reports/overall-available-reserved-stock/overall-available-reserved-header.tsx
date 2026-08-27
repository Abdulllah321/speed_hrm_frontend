import React from "react";
import { StockTotals } from "./types";
import { Layers, Package, Truck, Lock, ShieldCheck, DollarSign, Calculator } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface HeaderProps {
    grandTotals: StockTotals;
    totalItemsCount: number;
    isLoading: boolean;
    isPosLevel?: boolean;
}

export function OverallAvailableReservedHeader({ grandTotals, totalItemsCount, isLoading, isPosLevel = false }: HeaderProps) {
    const kpiCards = [
        {
            title: "Total Items Analyzed",
            value: totalItemsCount.toLocaleString(),
            sub: "Active SKUs & Variants",
            icon: Layers,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50",
        },
        {
            title: "Available Stock Qty",
            value: grandTotals.quantity.toLocaleString(),
            sub: "Ready for sale / dispatch",
            icon: Package,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50",
        },
        {
            title: "Stock In Transit",
            value: grandTotals.transit.toLocaleString(),
            sub: "Transfer / Stock movement",
            icon: Truck,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50",
        },
        {
            title: "Reserved Stock Qty",
            value: grandTotals.reserved.toLocaleString(),
            sub: "Committed orders / hold",
            icon: Lock,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50",
        },
        {
            title: "Total Net Balance Qty",
            value: grandTotals.total.toLocaleString(),
            sub: "Available + Transit + Reserved",
            icon: ShieldCheck,
            color: "text-cyan-600 dark:text-cyan-400",
            bg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/50",
        },
        {
            title: "Total Selling Value",
            value: formatCurrency(grandTotals.value),
            sub: "Total Retail Valuation",
            icon: DollarSign,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50",
        },
        ...(!isPosLevel ? [{
            title: "Total Unit Value",
            value: formatCurrency(grandTotals.costingValue),
            sub: "Total Cost Valuation",
            icon: Calculator,
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/50",
        }] : []),
    ];

    return (
        <div className={cn(
            "grid gap-3 mb-4",
            isPosLevel
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-7"
        )}>
            {kpiCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border ${card.bg} shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-muted-foreground truncate">{card.title}</span>
                            <Icon className={`h-4 w-4 shrink-0 ${card.color}`} />
                        </div>
                        <div className="mt-2">
                            <span className={`text-lg font-bold tracking-tight text-foreground ${isLoading ? "animate-pulse" : ""}`}>
                                {isLoading ? "..." : card.value}
                            </span>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.sub}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
