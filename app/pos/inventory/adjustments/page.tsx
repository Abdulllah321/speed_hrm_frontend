"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
    Plus, RefreshCcw, Printer, FileText, ArrowLeft,
    CalendarDays, Tag, ClipboardList, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { getStockAdjustments } from "@/lib/actions/stock-adjustment";
import { getLocationById } from "@/lib/actions/location";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

interface Adjustment {
    id: string;
    adjustmentNo: string;
    createdAt: string;
    adjustmentDate: string;
    status: "DRAFT" | "PENDING_APPROVAL" | "SUBMITTED" | "REJECTED" | "CANCELLED";
    adjustmentType: "STANDARD" | "SWAP";
    reason: string | null;
    notes: string | null;
    items: any[];
}

const STATUS_META: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300" },
    PENDING_APPROVAL: { label: "Pending Approval", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300" },
    SUBMITTED: { label: "Approved / Posted", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300" },
    REJECTED: { label: "Rejected", color: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300" },
    CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-950/30 dark:text-slate-300" },
};

export default function PosStockAdjustmentsPage() {
    const { user } = useAuth();
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [warehouseId, setWarehouseId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const locationId = user?.terminal?.location?.id || (user as any)?.locationId;

    const fetchWarehouseAndAdjustments = async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            // First get the location details to retrieve warehouseId
            const locRes = await getLocationById(locationId);
            if (locRes.status && locRes.data?.warehouseId) {
                const whId = locRes.data.warehouseId;
                setWarehouseId(whId);
                
                // Then fetch stock adjustments for this warehouse
                const res = await getStockAdjustments({ warehouseId: whId });
                if (res.status !== false) {
                    setAdjustments(res.data || []);
                }
            } else {
                toast.error("This store location is not mapped to any warehouse.");
            }
        } catch (error) {
            console.error("Failed to load adjustments", error);
            toast.error("Failed to load adjustments");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouseAndAdjustments();
    }, [locationId]);

    const handlePrint = (adj: Adjustment) => {
        const win = window.open("", "_blank");
        if (!win) {
            toast.error("Allow popups to print");
            return;
        }

        const dateStr = format(new Date(adj.createdAt), "dd MMM yyyy HH:mm");
        const refNo = adj.adjustmentNo || "N/A";
        const typeStr = adj.adjustmentType === "SWAP" ? "Stock Swap Correction" : "Standard Count Correction";
        const statusMeta = STATUS_META[adj.status] || { label: adj.status, color: "" };

        win.document.write(`
            <html><head><title>Adjustment Slip - ${refNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; padding: 40px; }
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 1px; }
                .document-title { font-size: 14px; font-weight: 600; color: #4b5563; text-transform: uppercase; margin-top: 4px; }
                .status-badge { padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid; display: inline-block; }
                
                .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .meta-item { display: flex; flex-direction: column; }
                .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
                .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
                .text-right { text-align: right; }
                
                .notes-section { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 40px; border-radius: 0 8px 8px 0; }
                .notes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
                .notes-content { font-size: 12px; color: #334155; }
                
                .signature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 60px; }
                .signature-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            </style>
            </head>
            <body onload="window.print()">
                <div class="header-container">
                    <div>
                        <div class="company-name">SPEED LIMIT POS</div>
                        <div class="document-title">Stock Adjustment Request</div>
                    </div>
                    <div>
                        <span class="status-badge" style="background-color: #dbeafe; color: #1e40af; border-color: #bfdbfe;">
                            ${statusMeta.label}
                        </span>
                    </div>
                </div>
                
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Adjustment No</span>
                        <span class="meta-value">${refNo}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Date Requested</span>
                        <span class="meta-value">${dateStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Adjustment Type</span>
                        <span class="meta-value">${typeStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Store Location</span>
                        <span class="meta-value">${user?.terminal?.location?.name || "This Outlet"}</span>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item Details</th>
                            <th class="text-right">System Qty</th>
                            <th class="text-right">Physical Count</th>
                            <th class="text-right">Adjusted Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${adj.items.map(item => {
                            const disc = Number(item.adjustedQty);
                            const discText = disc > 0 ? `+${disc.toFixed(2)}` : disc.toFixed(2);
                            return `
                                <tr>
                                    <td>
                                        <strong>${item.item?.sku || item.itemId}</strong>
                                        <div style="font-size: 10px; color: #666;">${item.item?.description || ""}</div>
                                        ${item.swapItem ? `<div style="font-size: 10px; color: #d97706; margin-top: 2px;">Swapped with: ${item.swapItem.sku}</div>` : ""}
                                    </td>
                                    <td class="text-right">${Number(item.currentQty).toFixed(2)}</td>
                                    <td class="text-right">${Number(item.physicalQty).toFixed(2)}</td>
                                    <td class="text-right" style="font-weight: bold; color: ${disc === 0 ? '#555' : disc > 0 ? '#16a34a' : '#dc2626'}">
                                        ${discText}
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
                
                ${adj.reason ? `
                    <div class="notes-section">
                        <div class="notes-title">Reason / Remarks</div>
                        <div class="notes-content">${adj.reason}</div>
                    </div>
                ` : ""}
                
                ${adj.notes ? `
                    <div class="notes-section" style="border-left-color: #64748b;">
                        <div class="notes-title">Internal Notes</div>
                        <div class="notes-content">${adj.notes}</div>
                    </div>
                ` : ""}
                
                <div class="signature-grid">
                    <div class="signature-box">Outlet Store Manager</div>
                    <div class="signature-box">ERP Head Office Approval</div>
                </div>
            </body>
            </html>
        `);
        win.document.close();
    };

    if (!locationId) {
        return (
            <div className="p-6 max-w-md mx-auto mt-20">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-6 text-center space-y-4">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Terminal Context Required</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Please log in from an authorized terminal session to access stock adjustments.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stock Adjustment Requests</h1>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Manage and request physical stock count corrections or item swapping for {user?.terminal?.location?.name || "this outlet"}.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchWarehouseAndAdjustments}
                        className="gap-2 h-9 border-muted"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Link href="/pos/inventory/adjustments/new">
                        <Button className="gap-2 h-9 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold">
                            <Plus className="h-4 w-4" />
                            Request Adjustment
                        </Button>
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : adjustments.length === 0 ? (
                <Card className="border-dashed border-muted py-12 text-center">
                    <CardContent className="space-y-3">
                        <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/60" />
                        <h3 className="text-lg font-semibold">No adjustment requests found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            You haven't requested any stock adjustments yet. Click "Request Adjustment" to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {adjustments.map((adj) => {
                        const isExpanded = expandedId === adj.id;
                        const statusMeta = STATUS_META[adj.status] || { label: adj.status, color: "bg-muted text-muted-foreground" };
                        
                        return (
                            <Card key={adj.id} className="border-muted shadow-sm overflow-hidden hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                                <CardContent className="p-0">
                                    <div 
                                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/10"
                                        onClick={() => setExpandedId(isExpanded ? null : adj.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold font-mono text-sm">{adj.adjustmentNo}</span>
                                                    <Badge variant="outline" className={statusMeta.color}>
                                                        {statusMeta.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        {format(new Date(adj.createdAt), "dd MMM yyyy HH:mm")}
                                                    </span>
                                                    <span>•</span>
                                                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">
                                                        {adj.adjustmentType === "SWAP" ? "Stock Swap" : "Standard Count"}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>{adj.items?.length || 0} items</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePrint(adj)}
                                                className="gap-1.5 border-slate-200 dark:border-slate-800"
                                            >
                                                <Printer className="h-3.5 w-3.5" />
                                                Print
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedId(isExpanded ? null : adj.id)}
                                            >
                                                {isExpanded ? "Hide Details" : "Show Details"}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="border-t border-muted bg-slate-50/30 dark:bg-slate-900/10 p-4 space-y-4">
                                            {adj.reason && (
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Reason / Remarks</span>
                                                    <span className="text-sm font-medium">{adj.reason}</span>
                                                </div>
                                            )}
                                            {adj.notes && (
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Internal Notes</span>
                                                    <span className="text-sm text-slate-600 dark:text-slate-400">{adj.notes}</span>
                                                </div>
                                            )}

                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Adjusted Items</span>
                                                <div className="border border-muted rounded-md overflow-hidden bg-white dark:bg-slate-950">
                                                    <table className="w-full text-xs text-left border-collapse">
                                                        <thead className="bg-slate-50 dark:bg-slate-900 font-semibold border-b border-muted">
                                                            <tr>
                                                                <th className="p-2.5">Item</th>
                                                                <th className="p-2.5 text-right">System Qty</th>
                                                                <th className="p-2.5 text-right">Physical Count</th>
                                                                <th className="p-2.5 text-right">Discrepancy</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-muted">
                                                            {adj.items.map((item) => {
                                                                const discrepancy = Number(item.adjustedQty);
                                                                return (
                                                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                                                        <td className="p-2.5">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-semibold font-mono">{item.item?.sku || item.itemId}</span>
                                                                                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                                                                    {item.item?.description}
                                                                                </span>
                                                                                {item.swapItem && (
                                                                                    <span className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 px-1 py-0.2 rounded w-fit mt-0.5">
                                                                                        Swapped with: {item.swapItem.sku}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-2.5 text-right text-muted-foreground font-medium">
                                                                            {Number(item.currentQty).toFixed(2)}
                                                                        </td>
                                                                        <td className="p-2.5 text-right font-medium">
                                                                            {Number(item.physicalQty).toFixed(2)}
                                                                        </td>
                                                                        <td className="p-2.5 text-right font-bold">
                                                                            {discrepancy === 0 ? (
                                                                                <span className="text-slate-400">0.00</span>
                                                                            ) : discrepancy > 0 ? (
                                                                                <span className="text-emerald-600">+{discrepancy.toFixed(2)}</span>
                                                                            ) : (
                                                                                <span className="text-red-600">{discrepancy.toFixed(2)}</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
