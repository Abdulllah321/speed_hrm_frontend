"use client";

import React, { useState } from "react";
import { TransferRecord, TransferGrandTotals } from "./types";
import {
    Package,
    ChevronRight,
    ChevronDown,
    Copy,
    Check,
    ArrowRight,
    Truck,
    Clock,
    UserCheck,
    CheckCircle2,
    ArrowLeftRight,
    Building2,
    Store,
    Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
                        <mark
                            key={i}
                            className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-sm px-0.5 font-semibold"
                        >
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
    filteredTransfers: TransferRecord[];
    grandTotals: TransferGrandTotals;
    searchQuery: string;
    isLoading: boolean;
}

export function StockTransferTable({
    filteredTransfers,
    grandTotals,
    searchQuery,
    isLoading,
}: TableProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [copiedRef, setCopiedRef] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const handleCopy = (refText: string) => {
        if (!refText || refText === "-") return;
        navigator.clipboard.writeText(refText);
        setCopiedRef(refText);
        setTimeout(() => setCopiedRef(null), 2000);
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toUpperCase() || "";
        if (s === "COMPLETED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
            );
        }
        if (s === "IN_TRANSIT" || s === "SOURCE_APPROVED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap">
                    <Truck className="h-3 w-3" /> In-Transit
                </span>
            );
        }
        if (s === "CANCELLED" || s === "REJECTED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
                    Cancelled
                </span>
            );
        }
        if (s === "AUTHORIZED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                    Authorized
                </span>
            );
        }
        if (s === "CHECKED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
                    Checked
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                <Clock className="h-3 w-3" /> Pending
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        if (type === "WAREHOUSE_TO_OUTLET") {
            return (
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 whitespace-nowrap">
                    WH → Outlet
                </span>
            );
        }
        if (type === "OUTLET_TO_WAREHOUSE") {
            return (
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                    Return to WH
                </span>
            );
        }
        if (type === "OUTLET_TO_OUTLET") {
            return (
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
                    Outlet → Outlet
                </span>
            );
        }
        if (type === "WAREHOUSE_TO_WAREHOUSE") {
            return (
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
                    WH → WH
                </span>
            );
        }
        return (
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border whitespace-nowrap">
                {type?.replace(/_/g, " ")}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="p-16 text-center border border-border rounded-2xl bg-card shadow-sm">
                <div className="inline-flex items-center gap-2.5 text-sm font-semibold text-muted-foreground animate-pulse">
                    <Package className="h-5 w-5 animate-spin text-primary" />
                    Loading stock transfer movements and approval records...
                </div>
            </div>
        );
    }

    if (!filteredTransfers || filteredTransfers.length === 0) {
        return (
            <div className="p-16 text-center border border-border rounded-2xl bg-card shadow-sm">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                    No stock transfer records found matching the current filters.
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                    Try adjusting your date range, location, or search keywords.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="max-h-[680px] overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                <table className="w-full border-collapse text-left text-xs min-w-[1300px]">
                    {/* Header */}
                    <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md border-b border-border shadow-xs">
                        <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="w-9 px-3 py-3 text-center"></th>
                            <th className="w-40 px-3 py-3">Transfer / STN #</th>
                            <th className="w-28 px-3 py-3">Date</th>
                            <th className="px-3 py-3">Route (Source → Destination)</th>
                            <th className="w-32 px-3 py-3">Type</th>
                            <th className="w-32 px-3 py-3">Status</th>
                            <th className="w-36 px-3 py-3">Initiated By</th>
                            <th className="w-36 px-3 py-3">Accepted By</th>
                            <th className="w-20 px-3 py-3 text-right">Sent</th>
                            <th className="w-20 px-3 py-3 text-right">Accepted</th>
                            <th className="w-20 px-3 py-3 text-right">Pending</th>
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-border/60">
                        {filteredTransfers.map((tr) => {
                            const isExpanded = expandedIds.has(tr.id);

                            return (
                                <React.Fragment key={tr.id}>
                                    {/* Master Transfer Row */}
                                    <tr
                                        onClick={() => toggleExpand(tr.id)}
                                        className={cn(
                                            "transition-colors hover:bg-muted/40 cursor-pointer select-none",
                                            isExpanded ? "bg-muted/30 font-medium" : "bg-card"
                                        )}
                                    >
                                        {/* Expand Toggle */}
                                        <td className="w-9 px-3 py-3 text-center">
                                            <button
                                                type="button"
                                                className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(tr.id);
                                                }}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </button>
                                        </td>

                                        {/* STN # */}
                                        <td className="w-40 px-3 py-3">
                                            <div className="flex items-center gap-1.5 font-semibold text-foreground font-mono">
                                                <span>{highlight(tr.requestNo, searchQuery)}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopy(tr.requestNo);
                                                    }}
                                                    className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded cursor-pointer"
                                                    title="Copy STN #"
                                                >
                                                    {copiedRef === tr.requestNo ? (
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </div>
                                            {tr.outboundNo && tr.outboundNo !== tr.requestNo && (
                                                <span className="text-[10px] text-muted-foreground font-mono block">
                                                    {tr.outboundNo}
                                                </span>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="w-28 px-3 py-3 text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                                            {tr.createdAt ? format(new Date(tr.createdAt), "dd MMM yyyy") : "-"}
                                        </td>

                                        {/* Route */}
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="font-medium text-foreground truncate max-w-[200px]" title={tr.sourceName}>
                                                    {highlight(tr.sourceName, searchQuery)}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="font-semibold text-foreground truncate max-w-[200px]" title={tr.destinationName}>
                                                    {highlight(tr.destinationName, searchQuery)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="w-32 px-3 py-3">{getTypeBadge(tr.transferType)}</td>

                                        {/* Status */}
                                        <td className="w-32 px-3 py-3">{getStatusBadge(tr.status)}</td>

                                        {/* Initiated By */}
                                        <td className="w-36 px-3 py-3">
                                            <span className="text-foreground font-medium block truncate max-w-[130px]" title={tr.creatorName || "System / Maker"}>
                                                {highlight(tr.creatorName || "System / Maker", searchQuery)}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground block">
                                                {tr.createdAt ? format(new Date(tr.createdAt), "hh:mm a") : ""}
                                            </span>
                                        </td>

                                        {/* Accepted By */}
                                        <td className="w-36 px-3 py-3">
                                            {tr.acceptedByName ? (
                                                <div>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold block truncate max-w-[130px] flex items-center gap-1" title={tr.acceptedByName}>
                                                        <UserCheck className="h-3 w-3 shrink-0" />
                                                        {highlight(tr.acceptedByName, searchQuery)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        {tr.acceptedAt ? format(new Date(tr.acceptedAt), "dd MMM, hh:mm a") : "Accepted"}
                                                    </span>
                                                </div>
                                            ) : tr.status === "COMPLETED" ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                    Accepted
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1">
                                                    <Clock className="h-3 w-3 shrink-0" /> Pending Accept
                                                </span>
                                            )}
                                        </td>

                                        {/* Sent Qty */}
                                        <td className="w-20 px-3 py-3 text-right font-bold text-foreground font-mono">
                                            {tr.totalSentQty.toLocaleString()}
                                        </td>

                                        {/* Accepted Qty */}
                                        <td className="w-20 px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                            {tr.totalReceivedQty.toLocaleString()}
                                        </td>

                                        {/* Pending Qty */}
                                        <td
                                            className={cn(
                                                "w-20 px-3 py-3 text-right font-bold font-mono",
                                                tr.totalPendingQty > 0
                                                    ? "text-amber-600 dark:text-amber-400"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {tr.totalPendingQty.toLocaleString()}
                                        </td>
                                    </tr>

                                    {/* Expanded Detail Row */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={11} className="p-0 border-b border-border bg-muted/20">
                                                <div className="px-5 py-4 space-y-4">
                                                    {/* Top Step Cards */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                                        {/* Step 1: Initiated By */}
                                                        <div className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-1">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                1. Initiated By
                                                            </div>
                                                            <div className="font-semibold text-foreground truncate">
                                                                {tr.creatorName || "System / Maker"}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground font-mono">
                                                                {tr.createdAt ? format(new Date(tr.createdAt), "dd MMM yyyy, hh:mm a") : "-"}
                                                            </div>
                                                        </div>

                                                        {/* Step 2: Verification Flow */}
                                                        <div className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-1">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                2. Verification Flow
                                                            </div>
                                                            <div className="text-[11px] text-foreground">
                                                                <span className="font-medium text-muted-foreground">Checker:</span>{" "}
                                                                <span className="font-semibold">{tr.checkerName || (tr.checkedAt ? "Checked" : "Pending")}</span>
                                                            </div>
                                                            <div className="text-[11px] text-foreground">
                                                                <span className="font-medium text-muted-foreground">Authorizer:</span>{" "}
                                                                <span className="font-semibold">{tr.authorizerName || (tr.authorizedAt ? "Authorized" : "Pending")}</span>
                                                            </div>
                                                        </div>

                                                        {/* Step 3: Logistics */}
                                                        <div className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-1">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                                                <span>3. Dispatch & Logistics</span>
                                                                <Truck className="h-3 w-3 text-primary" />
                                                            </div>
                                                            <div className="text-[11px] text-foreground font-semibold truncate">
                                                                {tr.courierName || tr.riderName || tr.dispatchType || "In-House Transfer"}
                                                            </div>
                                                            {tr.trackingNumber && (
                                                                <div className="text-[11px] text-muted-foreground font-mono truncate">
                                                                    Tracking: {tr.trackingNumber}
                                                                </div>
                                                            )}
                                                            {tr.riderPhone && (
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    Phone: {tr.riderPhone}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Step 4: Destination Receiver */}
                                                        <div className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-1">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                                                <span>4. Destination Receiver</span>
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                            </div>
                                                            <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                                                                {tr.acceptedByName || (tr.status === "COMPLETED" ? "Accepted" : "Awaiting Acceptance")}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground font-mono">
                                                                {tr.acceptedAt ? format(new Date(tr.acceptedAt), "dd MMM yyyy, hh:mm a") : "-"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Items Sub-table */}
                                                    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                                                        <div className="px-3.5 py-2.5 border-b border-border bg-muted/60 flex items-center justify-between text-xs font-semibold text-foreground">
                                                            <span className="flex items-center gap-1.5">
                                                                <Package className="h-3.5 w-3.5 text-primary" />
                                                                Item Line Details ({tr.items?.length || 0} Products)
                                                            </span>
                                                            <span className="text-[11px] text-muted-foreground font-normal">
                                                                {tr.totalSentQty} sent | {tr.totalReceivedQty} accepted | {tr.totalPendingQty} pending
                                                            </span>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs border-collapse">
                                                                <thead>
                                                                    <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                                                                        <th className="px-3 py-2">SKU</th>
                                                                        <th className="px-3 py-2">Article / Description</th>
                                                                        <th className="px-3 py-2">Brand / Category</th>
                                                                        <th className="px-3 py-2">Size / Color</th>
                                                                        <th className="px-3 py-2">Barcode</th>
                                                                        <th className="px-3 py-2 text-right">Sent</th>
                                                                        <th className="px-3 py-2 text-right">Accepted</th>
                                                                        <th className="px-3 py-2 text-right">Pending</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/60">
                                                                    {tr.items && tr.items.length > 0 ? (
                                                                        tr.items.map((it, idx) => (
                                                                            <tr key={it.id || idx} className="hover:bg-muted/30 transition-colors">
                                                                                <td className="px-3 py-2 font-mono font-semibold text-foreground">
                                                                                    {highlight(it.sku, searchQuery)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-foreground font-medium max-w-[240px] truncate" title={it.articleName}>
                                                                                    {highlight(it.articleName, searchQuery)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-muted-foreground">
                                                                                    {it.brand} / {it.category}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                                                                    {it.size} / {it.color}
                                                                                </td>
                                                                                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                                                                                    {it.barCode || "-"}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-right font-bold text-foreground font-mono">
                                                                                    {it.sentQty.toLocaleString()}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                                                    {it.receivedQty.toLocaleString()}
                                                                                </td>
                                                                                <td className={cn(
                                                                                    "px-3 py-2 text-right font-bold font-mono",
                                                                                    it.pendingQty > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                                                                )}>
                                                                                    {it.pendingQty.toLocaleString()}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">
                                                                                No line items found for this transfer
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* Notes */}
                                                    {tr.notes && (
                                                        <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border flex items-start gap-1.5">
                                                            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                                            <div>
                                                                <span className="font-semibold text-foreground">Notes:</span> {tr.notes}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>

                    {/* Footer */}
                    <tfoot className="sticky bottom-0 z-20 bg-muted/95 backdrop-blur-md border-t-2 border-border text-xs font-bold text-foreground shadow-lg">
                        <tr>
                            <td className="px-3 py-3 text-center"></td>
                            <td className="px-3 py-3">
                                Total: {grandTotals.totalTransfers.toLocaleString()} Orders
                            </td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3 text-right pr-2">Totals:</td>
                            <td className="px-3 py-3 text-right font-mono text-sky-600 dark:text-sky-400">
                                {grandTotals.totalSentQty.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                {grandTotals.totalReceivedQty.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-amber-600 dark:text-amber-400">
                                {grandTotals.totalPendingQty.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
