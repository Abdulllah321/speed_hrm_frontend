"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    RefreshCcw, Printer, PackageCheck, ArrowLeft,
    CalendarDays, MapPin, Package, FileText, Boxes,
    ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { getTransferRequests } from "@/lib/actions/transfer-request";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface TransferItem {
    id: string;
    quantity: number;
    item?: {
        sku: string;
        description: string;
        unitPrice?: number;
        color?: { name: string };
        size?: { name: string };
    };
}

interface Transfer {
    id: string;
    requestNo: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    transferType: string;
    notes?: string;
    toLocationId?: string;
    fromLocation?: { name: string };
    toLocation?: { id?: string; name: string };
    items: TransferItem[];
}

function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
}

export default function StockReceiptPage() {
    const { user, hasPermission } = useAuth();
    const router = useRouter();
    const printRef = useRef<HTMLDivElement>(null);

    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const locationId = user?.terminal?.location?.id || (user as any)?.locationId;
    const locationName = user?.terminal?.location?.name || getCookie("locationName") || "Outlet";
    const companyName = getCookie("companyName") || "Store";

    const fetchReceipts = async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const res = await getTransferRequests({ status: "COMPLETED" });
            if (res.status) {
                // Show all completed transfers for this location (both IN and OUT)
                const locationTransfers = (res.data || []).filter(
                    (t: Transfer) =>
                        t.status === "COMPLETED" &&
                        (t.toLocationId === locationId || (t.toLocation as any)?.id === locationId ||
                         t.fromLocationId === locationId || (t.fromLocation as any)?.id === locationId)
                );
                const sorted = [...locationTransfers].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                sorted.forEach((t: any, idx: number) => {
                    const isIncoming = t.toLocationId === locationId || (t.toLocation as any)?.id === locationId;
                    t.serialNo = isIncoming 
                        ? (t.inboundNo || t.formattedSerialNo || `IN-${(idx + 1).toString().padStart(4, '0')}`)
                        : (t.outboundNo || t.formattedSerialNo || `OUT-${(idx + 1).toString().padStart(4, '0')}`);
                });
                setTransfers(sorted.reverse());
            }
        } catch {
            toast.error("Failed to load receipts");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchReceipts(); }, [locationId]);

    const totalUnits = (t: Transfer) =>
        t.items.reduce((sum, i) => sum + Number(i.quantity), 0);

    const filtered = transfers.filter((t) => {
        const q = search.toLowerCase();
        return (
            t.requestNo?.toLowerCase().includes(q) ||
            t.fromLocation?.name?.toLowerCase().includes(q) ||
            t.items.some((i) => i.item?.sku?.toLowerCase().includes(q) || i.item?.description?.toLowerCase().includes(q))
        );
    });

    const handlePrint = (transfer: Transfer) => {
        setPrintingId(transfer.id);
        const win = window.open("", "_blank");
        if (!win) {
            toast.error("Allow popups to print");
            setPrintingId(null);
            return;
        }

        const isIncoming = transfer.toLocationId === locationId || (transfer.toLocation as any)?.id === locationId;
        const dateStr = format(new Date(transfer.updatedAt || transfer.createdAt), "dd/MM/yyyy HH:mm");
        const sourceLoc = transfer.fromLocation?.name || transfer.fromWarehouse?.name || "Source Warehouse/Outlet";
        const destLoc = transfer.toLocation?.name || transfer.toWarehouse?.name || locationName;
        const refNo = transfer.requestNo || "N/A";
        const serialNo = (transfer as any).serialNo || (isIncoming ? transfer.inboundNo : transfer.outboundNo) || transfer.formattedSerialNo || null;
        const notes = transfer.notes || "";
        const totalQty = totalUnits(transfer);

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stock Transfer Note - ${refNo}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; font-size: 10px; padding: 20px; line-height: 1.3; }
                    @media print {
                        @page { margin: 0.7cm; }
                        body { padding: 0; }
                    }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
                    .logo-box { width: 20%; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
                    .logo-img { width: 70px; height: auto; object-fit: contain; }
                    .title-box { width: 35%; background-color: #eef2f6; text-align: center; padding: 6px 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .title-main { font-size: 16px; font-weight: 800; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; letter-spacing: 0.5px; }
                    .title-sub { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
                    .meta-box { width: 45%; background-color: #f8fafc; border: 1px solid #d1d5db; padding: 5px 8px; font-size: 9.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; flex-direction: column; justify-content: center; }
                    .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .meta-row:last-child { margin-bottom: 0; }
                    .meta-label { font-weight: 700; }
                    .meta-val { font-weight: 600; }

                    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5px; table-layout: fixed; }
                    thead tr { border-top: 2px solid #000; border-bottom: 2px solid #000; }
                    th { padding: 3px 4px; text-align: left; font-weight: 700; }
                    th.text-right { text-align: right; }
                    th.text-center { text-align: center; }
                    td { padding: 3px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                    td.text-right { text-align: right; }
                    td.text-center { text-align: center; }
                    .font-bold { font-weight: 700; }
                    .uppercase { text-transform: uppercase; }

                    .totals-bar { width: 100%; border-top: 2px solid #000; padding: 4px 0; display: flex; justify-content: space-between; align-items: flex-start; font-size: 9.5px; font-weight: 700; margin-top: 0; }
                    .double-underline { border-bottom: 3px double #000; padding-bottom: 1px; }

                    .remarks-box { margin-top: 8px; margin-bottom: 8px; font-size: 9.5px; }
                    .remarks-title { font-weight: 700; font-size: 10px; }
                    .remarks-content { color: #374151; margin-top: 1px; }

                    .signatures-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
                    .signature-card { border: 1px solid #000; height: 75px; padding: 4px; text-align: center; font-size: 9px; font-weight: 700; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-box">
                        <img src="${window.location.origin}/image.png" alt="Logo" class="logo-img" />
                    </div>
                    <div class="title-box">
                        <div class="title-main">${isIncoming ? 'Stock Receipt IN' : 'Stock Issue OUT'}</div>
                        <div class="title-sub">Note</div>
                    </div>
                    <div class="meta-box">
                        <div class="meta-row">
                            <span class="meta-label">Transfer Number:</span>
                            <span class="meta-val">${refNo}</span>
                        </div>
                        ${serialNo ? `
                        <div class="meta-row">
                            <span class="meta-label">${isIncoming ? 'Inbound Serial No:' : 'Outbound Serial No:'}</span>
                            <span class="meta-val">${serialNo}</span>
                        </div>` : ''}
                        <div class="meta-row">
                            <span class="meta-label">Date:</span>
                            <span class="meta-val">${dateStr}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Received From:</span>
                            <span class="meta-val">${sourceLoc}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Destination Outlet:</span>
                            <span class="meta-val">${destLoc}</span>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 6%;">S.No</th>
                            <th style="width: 22%;">SKU / Code</th>
                            <th style="width: 42%;">Description</th>
                            <th class="text-center" style="width: 15%;">Size / Color</th>
                            <th class="text-right" style="width: 15%;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transfer.items.map((item: any, idx: number) => {
                            const sku = item.item?.sku || "—";
                            const desc = item.item?.description || "Item";
                            const sizeStr = item.item?.size?.name || item.item?.size || "—";
                            const colorStr = item.item?.color?.name || item.item?.color || "—";
                            return `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td class="font-bold">${sku}</td>
                                    <td class="uppercase">${desc}</td>
                                    <td class="text-center">${sizeStr} / ${colorStr}</td>
                                    <td class="text-right font-bold">${Number(item.quantity)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="totals-bar">
                    <div>Total Lines: ${transfer.items.length}</div>
                    <div>
                        <span style="margin-right: 8px;">Total Quantity:</span>
                        <span class="double-underline">${totalQty}</span>
                    </div>
                </div>

                ${notes ? `
                    <div class="remarks-box">
                        <div class="remarks-title">Remarks</div>
                        <div class="remarks-content">${notes}</div>
                    </div>
                ` : ''}

                <div class="signatures-grid">
                    <div class="signature-card">PREPARED BY</div>
                    <div class="signature-card">CHECKED BY</div>
                    <div class="signature-card">APPROVED BY</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    };
                </script>
            </body>
            </html>
        `);
        win.document.close();
        win.focus();
        setPrintingId(null);
    };

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-6 lg:-m-8">
            {/* Header */}
            <header
                className="flex-none p-4 md:p-6 pb-4 border-b bg-muted/20 backdrop-blur-xl sticky z-10"
                style={{ top: "calc(var(--banner-height) + 4rem)" }}
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <PackageCheck className="h-6 w-6 text-primary" />
                            Stock Receipts
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">
                            Accepted stock transfers — print receipt slips
                        </p>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchReceipts} disabled={isLoading}>
                        <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                    <Input
                        placeholder="Search by ref no, location, or SKU…"
                        className="pl-9 h-10 bg-muted/30 border-border/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            {/* List */}
            <main className="flex-1 overflow-auto p-4 md:p-6 pb-20">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <div className="h-20 w-20 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                            <FileText className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <p className="font-semibold text-muted-foreground">No receipts found</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            Accepted transfers will appear here
                        </p>
                        <Button variant="outline" className="mt-4" onClick={fetchReceipts}>
                            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((transfer) => {
                            const isIncoming = transfer.toLocationId === locationId || (transfer.toLocation as any)?.id === locationId;
                            return (
                                <Card key={transfer.id} className="overflow-hidden border-border/60 !py-0">
                                    {/* Main Row */}
                                    <CardContent className="p-0">
                                        <div className="flex items-center gap-4 p-4">
                                            {/* Icon */}
                                            <div className={`h-10 w-10 rounded-lg ${isIncoming ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center flex-none font-bold text-xs`}>
                                                {isIncoming ? 'IN' : 'OUT'}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-bold text-sm">{transfer.requestNo}</span>
                                                    {(transfer as any).serialNo && (
                                                        <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono text-slate-800">
                                                            TR #{(transfer as any).serialNo}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary" className={`text-[10px] font-bold ${isIncoming ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                                                        {isIncoming ? 'STOCK IN' : 'STOCK OUT'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {transfer.transferType === "WAREHOUSE_TO_OUTLET" ? "Warehouse → Outlet"
                                                            : transfer.transferType === "OUTLET_TO_OUTLET" ? "Outlet → Outlet"
                                                            : transfer.transferType === "OUTLET_TO_WAREHOUSE" ? "Return"
                                                            : transfer.transferType}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        From: <span className="font-semibold text-foreground ml-1">{transfer.fromLocation?.name || transfer.fromWarehouse?.name || "Warehouse/Outlet"}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        To: <span className="font-semibold text-foreground ml-1">{transfer.toLocation?.name || transfer.toWarehouse?.name || "Warehouse/Outlet"}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Boxes className="h-3 w-3" />
                                                        {totalUnits(transfer)} units · {transfer.items.length} SKUs
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDays className="h-3 w-3" />
                                                        {format(new Date(transfer.updatedAt || transfer.createdAt), "dd MMM yyyy")}
                                                    </span>
                                                </div>
                                            </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-none">
                                            <Button
                                                size="sm"
                                                className="gap-1.5 font-semibold"
                                                onClick={() => handlePrint(transfer)}
                                                disabled={printingId === transfer.id || !hasPermission('pos.inventory.receipt.view')}
                                            >
                                                <Printer className="h-3.5 w-3.5" />
                                                Print
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setExpandedId(expandedId === transfer.id ? null : transfer.id)}
                                            >
                                                {expandedId === transfer.id
                                                    ? <ChevronUp className="h-4 w-4" />
                                                    : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded Items */}
                                    {expandedId === transfer.id && (
                                        <>
                                            <Separator />
                                            <div className="px-4 py-3 bg-muted/10">
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 mb-2 pb-2 border-b border-border/60">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Size</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Qty</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {transfer.items.map((item) => (
                                                        <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center border-b border-border/40 last:border-0 py-2 last:pb-0">
                                                            <div className="min-w-0">
                                                                <span className="font-mono text-[10px] text-muted-foreground block">{item.item?.sku || "—"}</span>
                                                                <p className="text-sm font-medium truncate" title={item.item?.description}>{item.item?.description || "—"}</p>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{item.item?.color?.name || "—"}</span>
                                                            <span className="text-xs text-muted-foreground">{item.item?.size?.name || "—"}</span>
                                                            <span className="text-xs font-semibold text-muted-foreground">
                                                                {item.item?.unitPrice !== undefined && item.item?.unitPrice !== null ? `Rs. ${item.item.unitPrice.toLocaleString()}` : "—"}
                                                            </span>
                                                            <span className="font-bold font-mono text-sm text-right">{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {transfer.notes && (
                                                    <div className="mt-3 p-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                                                        <span className="font-bold uppercase tracking-widest block mb-0.5">Notes</span>
                                                        {transfer.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                    </div>
                )}
            </main>
        </div>
    );
}
