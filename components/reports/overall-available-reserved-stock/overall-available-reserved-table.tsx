"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FlatItemRecord, LocationHeader, StockTotals } from "./types";
import { Package } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

function highlight(text: string, query: string) {
    if (!text) return <></>;
    const q = query.trim();
    if (!q) return <>{text}</>;

    try {
        const pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        const parts = text.split(pattern);

        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === q.toLowerCase() ? (
                        <mark key={i} className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-sm px-0.5 font-semibold">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    } catch {
        return <>{text}</>;
    }
}

interface TableProps {
    filteredItems: FlatItemRecord[];
    locationHeaders: LocationHeader[];
    grandTotals: StockTotals;
    searchQuery: string;
    isLoading: boolean;
}

export function OverallAvailableReservedTable({
    filteredItems,
    locationHeaders,
    grandTotals,
    searchQuery,
    isLoading,
}: TableProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 25,
    });

    if (isLoading) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground animate-pulse">
                    <Package className="h-5 w-5 animate-spin text-primary" />
                    Loading overall stock report matrix data...
                </div>
            </div>
        );
    }

    if (!filteredItems || filteredItems.length === 0) {
        return (
            <div className="p-12 text-center border border-border rounded-2xl bg-card shadow-sm">
                <p className="text-sm font-semibold text-muted-foreground">No stock records found matching current filters.</p>
            </div>
        );
    }

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div
                ref={parentRef}
                className="max-h-[680px] overflow-x-auto overflow-y-auto relative scrollbar-thin scrollbar-thumb-border"
            >
                <div className="inline-block min-w-full align-middle">
                    {/* Header Row */}
                    <div className="sticky top-0 z-20 border-b border-border bg-muted/95 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm flex items-center h-10 px-3">
                        <div className="w-28 shrink-0 pr-2">Brand</div>
                        <div className="w-28 shrink-0 pr-2">Division</div>
                        <div className="w-28 shrink-0 pr-2">Category</div>
                        <div className="w-24 shrink-0 pr-2">Gender</div>
                        <div className="w-24 shrink-0 pr-2">Silhouette</div>
                        <div className="w-28 shrink-0 pr-2">SKU</div>
                        <div className="w-48 shrink-0 pr-2">Article Name</div>
                        <div className="w-16 text-center shrink-0">Size</div>
                        <div className="w-24 text-center shrink-0">Color</div>
                        <div className="w-32 text-center shrink-0">Barcode</div>
                        <div className="w-24 text-right shrink-0">Total Qty</div>
                        <div className="w-20 text-right shrink-0">Transit</div>
                        <div className="w-20 text-right shrink-0">Reserved</div>
                        <div className="w-24 text-right shrink-0">Total Bal</div>
                        <div className="w-28 text-right shrink-0">Price</div>
                        <div className="w-32 text-right shrink-0">Value</div>

                        {/* Dynamic Store / Warehouse Columns Header */}
                        {locationHeaders.map((hdr) => (
                            <div
                                key={hdr.id}
                                title={`${hdr.name} (${hdr.type})`}
                                className={cn(
                                    "w-24 text-right shrink-0 px-2 font-mono font-bold truncate",
                                    hdr.type === "warehouse" ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"
                                )}
                            >
                                {hdr.code}
                            </div>
                        ))}
                    </div>

                    {/* Virtualized Body Rows */}
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            position: "relative",
                        }}
                        className="w-full"
                    >
                        {virtualItems.map((virtualRow) => {
                            const item = filteredItems[virtualRow.index];
                            const bgStyle = virtualRow.index % 2 === 0 ? "bg-background" : "bg-muted/15";

                            return (
                                <div
                                    key={virtualRow.index}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={cn(
                                        "border-b border-border/40 text-xs transition-colors hover:bg-muted/50 flex items-center px-3 whitespace-nowrap",
                                        bgStyle
                                    )}
                                >
                                    <div className="w-28 shrink-0 pr-2 truncate font-medium">{highlight(item.brand || "-", searchQuery)}</div>
                                    <div className="w-28 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.division || "-", searchQuery)}</div>
                                    <div className="w-28 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.category || "-", searchQuery)}</div>
                                    <div className="w-24 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.gender || "-", searchQuery)}</div>
                                    <div className="w-24 shrink-0 pr-2 truncate text-muted-foreground">{highlight(item.silhouette || "-", searchQuery)}</div>
                                    <div className="w-28 shrink-0 pr-2 truncate font-mono font-medium text-foreground">{highlight(item.sku || "-", searchQuery)}</div>
                                    <div className="w-48 shrink-0 pr-2 truncate font-semibold text-foreground" title={item.articleName}>{highlight(item.articleName || "-", searchQuery)}</div>
                                    
                                    {/* Size */}
                                    <div className="w-16 text-center shrink-0">
                                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-muted text-[11px] font-bold text-foreground border border-border/50">
                                            {item.size || "-"}
                                        </span>
                                    </div>

                                    {/* Color */}
                                    <div className="w-24 text-center shrink-0 px-1 truncate">
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-secondary/80 text-[11px] font-medium text-secondary-foreground border border-border/60 truncate max-w-[85px]">
                                            {highlight(item.color || "-", searchQuery)}
                                        </span>
                                    </div>

                                    {/* BarCode */}
                                    <div className="w-32 text-center shrink-0 font-mono font-bold text-primary truncate">
                                        {highlight(item.barCode || "-", searchQuery)}
                                    </div>

                                    {/* Available Qty */}
                                    <div className={cn("w-24 text-right shrink-0 font-semibold", item.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                        {item.quantity.toLocaleString()}
                                    </div>

                                    {/* Transit */}
                                    <div className={cn("w-20 text-right shrink-0 font-medium", item.transit > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                                        {item.transit.toLocaleString()}
                                    </div>

                                    {/* Reserved */}
                                    <div className={cn("w-20 text-right shrink-0 font-medium", item.reserved > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground")}>
                                        {item.reserved.toLocaleString()}
                                    </div>

                                    {/* Total Balance */}
                                    <div className="w-24 text-right shrink-0 font-bold text-foreground">
                                        {item.total.toLocaleString()}
                                    </div>

                                    {/* Price */}
                                    <div className="w-28 text-right shrink-0 text-muted-foreground">
                                        {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                                    </div>

                                    {/* Selling Value */}
                                    <div className="w-32 text-right shrink-0 font-semibold text-foreground">
                                        {formatCurrency(item.value)}
                                    </div>

                                    {/* Dynamic Store / Warehouse Quantities */}
                                    {locationHeaders.map((hdr) => {
                                        const qty = hdr.type === "warehouse"
                                            ? (item.warehouseStocks?.[hdr.id] || 0)
                                            : (item.locationStocks?.[hdr.id] || 0);

                                        return (
                                            <div
                                                key={hdr.id}
                                                className={cn(
                                                    "w-24 text-right shrink-0 px-2 font-mono text-xs",
                                                    qty > 0 ? "font-bold text-foreground" : "text-muted-foreground/40"
                                                )}
                                            >
                                                {qty}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Sticky Grand Totals Footer (inside scroll container to scroll horizontally in sync) */}
                    <div className="sticky bottom-0 z-20 border-t-2 border-border bg-muted/95 backdrop-blur-md px-3 h-11 text-xs font-bold text-foreground shadow-lg flex items-center whitespace-nowrap">
                        <div className="w-28 shrink-0 uppercase tracking-wider text-muted-foreground">GRAND TOTAL</div>
                        <div className="w-28 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-28 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-24 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-24 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-28 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-48 shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-16 text-center text-muted-foreground/40">-</div>
                        <div className="w-24 text-center text-muted-foreground/40">-</div>
                        <div className="w-32 text-center text-muted-foreground/40">-</div>

                        <div className="w-24 text-right shrink-0 text-emerald-600 dark:text-emerald-400">
                            {grandTotals.quantity.toLocaleString()}
                        </div>
                        <div className="w-20 text-right shrink-0 text-amber-600 dark:text-amber-400">
                            {grandTotals.transit.toLocaleString()}
                        </div>
                        <div className="w-20 text-right shrink-0 text-purple-600 dark:text-purple-400">
                            {grandTotals.reserved.toLocaleString()}
                        </div>
                        <div className="w-24 text-right shrink-0 text-cyan-600 dark:text-cyan-400">
                            {grandTotals.total.toLocaleString()}
                        </div>
                        <div className="w-28 text-right shrink-0 text-muted-foreground/40">-</div>
                        <div className="w-32 text-right shrink-0 text-indigo-600 dark:text-indigo-400 font-bold">
                            {formatCurrency(grandTotals.value)}
                        </div>

                        {/* Grand totals for each store/warehouse column */}
                        {locationHeaders.map((hdr) => {
                            const totalStoreQty = hdr.type === "warehouse"
                                ? (grandTotals.warehouseStocks?.[hdr.id] || 0)
                                : (grandTotals.locationStocks?.[hdr.id] || 0);

                            return (
                                <div key={hdr.id} className="w-24 text-right shrink-0 px-2 font-mono text-primary font-bold">
                                    {totalStoreQty.toLocaleString()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
