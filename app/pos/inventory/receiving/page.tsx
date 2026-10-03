"use client";

import React, { useState, useEffect } from "react";
import {
    PackageCheck,
    ArrowLeft,
    RefreshCcw,
    Package,
    ArrowRight,
    Search,
    Clock,
    CheckCircle2,
    FileText,
    Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/providers/auth-provider";
import { getIncomingTransferRequests, acceptTransferRequest } from "@/lib/actions/transfer-request";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function StockReceivingPage() {
    const { user, hasPermission } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);

    const handlePrint = (request: any) => {
        setPrintingId(request.id);
        const win = window.open("", "_blank");
        if (!win) {
            toast.error("Allow popups to print");
            setPrintingId(null);
            return;
        }

        const dateStr = format(new Date(request.createdAt), "dd/MM/yyyy HH:mm");
        const sourceLoc = request.fromWarehouse?.name || request.warehouse?.name || request.sourceWarehouse?.name || request.stockRequisition?.fromWarehouse?.name || request.fromLocation?.name || request.fromWarehouse?.code || "LOGISTIC AREA";
        const destLoc = user?.terminal?.location?.name || "This Location";
        const refNo = request.requestNo || "N/A";
        const outboundNo = request.outboundNo || request.formattedSerialNo || null;
        const notes = request.notes || "";
        const totalQty = request.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 0;

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stock Receiving Note - ${refNo}</title>
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
                        <div class="title-main">Warehouse Receiving</div>
                        <div class="title-sub">Receiving Note</div>
                    </div>
                    <div class="meta-box">
                        <div class="meta-row">
                            <span class="meta-label">Transfer Number:</span>
                            <span class="meta-val">${refNo}</span>
                        </div>
                        ${outboundNo ? `
                        <div class="meta-row">
                            <span class="meta-label">Outbound Serial No:</span>
                            <span class="meta-val">${outboundNo}</span>
                        </div>` : ''}
                        <div class="meta-row">
                            <span class="meta-label">Date:</span>
                            <span class="meta-val">${dateStr}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Warehouse (Source):</span>
                            <span class="meta-val">${sourceLoc}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Location (Actual):</span>
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
                        ${request.items.map((item: any, idx: number) => {
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
                    <div>Total Lines: ${request.items.length}</div>
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
                    <div class="signature-card">RECEIVED BY</div>
                    <div class="signature-card">CHECKED BY</div>
                    <div class="signature-card">STORE MANAGER</div>
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

    const locationId = user?.terminal?.location?.id || user?.locationId;

    const fetchRequests = async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const res = await getIncomingTransferRequests(locationId);
            if (res.status) {
                setRequests(res.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch incoming transfers", error);
            toast.error("Failed to load incoming transfers");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [locationId]);

    const handleAccept = async (requestId: string) => {
        setIsAccepting(requestId);
        try {
            const res = await acceptTransferRequest(requestId, user?.id);
            if (res.status) {
                toast.success("Stock accepted successfully!");
                setRequests(prev => prev.filter(r => r.id !== requestId));
            } else {
                toast.error(res.message || "Failed to accept stock");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to accept stock");
        } finally {
            setIsAccepting(null);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none p-4 md:p-6 border-b backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">Stock Receiving</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                            Accept incoming warehouse transfers for
                            <Badge variant="outline" className="ml-1 font-bold text-primary">
                                {user?.terminal?.location?.name || "This Location"}
                            </Badge>
                        </p>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchRequests} disabled={isLoading}>
                        <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 pb-20 overflow-auto">
                <div className="max-w-5xl mx-auto w-full space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-32 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <Card className="border-dashed h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                            <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                                <PackageCheck className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <CardTitle className="text-xl mb-2 text-muted-foreground">No Incoming Stock</CardTitle>
                            <CardDescription className="max-w-xs mx-auto">
                                All transfers have been processed. New transfers will appear here once initiated from the warehouse.
                            </CardDescription>
                            <Button variant="outline" className="mt-6" onClick={fetchRequests}>
                                <RefreshCcw className="h-4 w-4 mr-2" /> Check Again
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {requests.map((request) => {
                                const totalQty = (request.items || []).reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
                                const totalItemsCount = request.items?.length || 0;
                                const firstItem = request.items?.[0]?.item;
                                const brandName = request.brand?.name || firstItem?.brand?.name;

                                return (
                                <Card key={request.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all shadow-sm !py-0">
                                    <div className="flex flex-col md:flex-row md:items-stretch">
                                        {/* Status Sidebar */}
                                        <div className="bg-primary/5 p-4 md:w-48 flex flex-col justify-between border-b md:border-b-0 md:border-r border-primary/10">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Request No</span>
                                                <div className="font-mono text-sm font-bold truncate">{request.requestNo}</div>
                                            </div>
                                            <div className="mt-4 md:mt-0">
                                                {request.status === 'APPROVED' ? (
                                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200">
                                                        <Clock className="h-3 w-3 mr-1" /> Pending
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <CardContent className="p-4 md:p-6 flex-1 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1 w-full space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                                                        <Package className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg leading-tight">
                                                            {totalItemsCount > 1
                                                                ? `Stock Transfer Note (${totalItemsCount} Products${brandName ? ` · ${brandName}` : ''})`
                                                                : (firstItem?.description || "Inventory Item")}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground font-medium">
                                                            {totalItemsCount > 1
                                                                ? `${totalItemsCount} line items · Total ${totalQty} pcs`
                                                                : `SKU: ${firstItem?.sku || "N/A"}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Qty</span>
                                                        <span className="text-xl font-black text-primary">
                                                            {totalQty} <span className="text-xs font-bold text-muted-foreground">Pcs</span>
                                                        </span>
                                                    </div>
                                                    <div className="h-10 w-px bg-border hidden sm:block" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Items</span>
                                                        <span className="text-xl font-black text-foreground">
                                                            {totalItemsCount} <span className="text-xs font-bold text-muted-foreground">Items</span>
                                                        </span>
                                                    </div>
                                                    <div className="h-10 w-px bg-border hidden sm:block" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Warehouse</span>
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {request.fromWarehouse?.name || 
                                                             request.warehouse?.name || 
                                                             request.sourceWarehouse?.name || 
                                                             request.stockRequisition?.fromWarehouse?.name || 
                                                             request.fromLocation?.name || 
                                                             request.fromWarehouse?.code || 
                                                             "LOGISTIC AREA"}
                                                        </span>
                                                    </div>
                                                    <div className="h-10 w-px bg-border hidden sm:block" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sent Date</span>
                                                        <span className="text-sm font-semibold">{format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-auto flex flex-col gap-2">
                                                <Button
                                                    className="w-full md:w-40 h-14 text-lg font-bold gap-2 shadow-lg shadow-primary/20"
                                                    disabled={isAccepting === request.id || !hasPermission('pos.inventory.receiving.accept')}
                                                    onClick={() => handleAccept(request.id)}
                                                >
                                                    {isAccepting === request.id ? (
                                                        <RefreshCcw className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    )}
                                                    {isAccepting === request.id ? "Accepting..." : "Accept"}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full md:w-40 h-10 font-bold gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                                    disabled={printingId === request.id}
                                                    onClick={() => handlePrint(request)}
                                                >
                                                    {printingId === request.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print Slip
                                                </Button>
                                            </div>
                                        </CardContent>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
