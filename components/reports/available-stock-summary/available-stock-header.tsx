"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StockTotals } from "./types";
import { formatCurrency } from "@/lib/utils";
import { Package, TrendingUp, Truck, Store, Layers, Coins } from "lucide-react";

interface HeaderProps {
    grandTotals: StockTotals;
    totalItemsCount: number;
    isLoading: boolean;
}

export function AvailableStockHeader({ grandTotals, totalItemsCount, isLoading }: HeaderProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Items</span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Package className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold mt-1 text-foreground">
                        {isLoading ? "..." : totalItemsCount.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Available Qty</span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                        {isLoading ? "..." : grandTotals.quantity.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In Transit</span>
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Truck className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold mt-1 text-amber-600 dark:text-amber-400">
                        {isLoading ? "..." : grandTotals.transit.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reserved</span>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Store className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold mt-1 text-purple-600 dark:text-purple-400">
                        {isLoading ? "..." : grandTotals.reserved.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Balance</span>
                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                            <Layers className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold mt-1 text-cyan-600 dark:text-cyan-400">
                        {isLoading ? "..." : grandTotals.total.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Selling Value</span>
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Coins className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold mt-1 text-indigo-600 dark:text-indigo-400 truncate">
                        {isLoading ? "..." : formatCurrency(grandTotals.value)}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
