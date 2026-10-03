"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    RefreshCcw, Printer, PackageCheck, ArrowLeft,
    CalendarDays, MapPin, Package, FileText, Boxes,
    ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SmartPagination } from "@/components/ui/smart-pagination";
import { getLocationReceipts } from "@/lib/actions/transfer-request";
import { ArrowDown } from "lucide-react";
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
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const ITEMS_PER_PAGE = 20;

    const locationId = user?.terminal?.location?.id || (user as any)?.locationId;
    const locationName = user?.terminal?.location?.name || getCookie("locationName") || "Outlet";
    const companyName = getCookie("companyName") || "Store";

    const fetchReceipts = async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const res = await getLocationReceipts(locationId, { page: currentPage, limit: ITEMS_PER_PAGE, search });
            if (res.status) {
                const fetchedTransfers = res.data || [];
                fetchedTransfers.forEach((t: any, idx: number) => {
                    const isIncoming = t.toLocationId === locationId || (t.toLocation as any)?.id === locationId;
                    t.serialNo = isIncoming 
                        ? (t.inboundNo || t.formattedSerialNo || `IN-${((currentPage-1)*ITEMS_PER_PAGE + idx + 1).toString().padStart(4, '0')}`)
                        : (t.outboundNo || t.formattedSerialNo || `OUT-${((currentPage-1)*ITEMS_PER_PAGE + idx + 1).toString().padStart(4, '0')}`);
                });
                setTransfers(fetchedTransfers);
                
                if (res.meta) {
                    setTotalPages(res.meta.totalPages);
                    setTotalRecords(res.meta.total);
                }
            }
        } catch {
            toast.error("Failed to load receipts");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        const delayDebounceFn = setTimeout(() => {
            fetchReceipts(); 
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [locationId, currentPage, search]);


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
                <div className="mx-auto w-full space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-32 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : transfers.length === 0 ? (
                        <Card className="border-dashed h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <FileText className="h-10 w-10 text-slate-600/60" />
                            </div>
                            <h2 className="text-xl mb-2 text-muted-foreground font-bold">
                                No Receipts Found
                            </h2>
                            <p className="max-w-xs mx-auto text-muted-foreground">
                                Completed stock transfers will appear here as STNs.
                            </p>
                            <Button variant="outline" className="mt-6" onClick={fetchReceipts}>
                                <RefreshCcw className="h-4 w-4 mr-2" /> Check Again
                            </Button>
                        </Card>
                    ) : (
                        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                            <Table className="min-w-[1000px]">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[160px]">STN No</TableHead>
                                        <TableHead className="w-[130px]">Ref #</TableHead>
                                        <TableHead className="min-w-[300px]">Description / Items</TableHead>
                                        <TableHead className="w-[180px]">Location</TableHead>
                                        <TableHead className="text-right w-[80px]">Qty</TableHead>
                                        <TableHead className="text-center w-[120px]">Type</TableHead>
                                        <TableHead className="text-right w-[160px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.map((transfer) => {
                                        const isIncoming = transfer.toLocationId === locationId || (transfer.toLocation as any)?.id === locationId;
                                        const totalQty = (transfer.items || []).reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
                                        const totalItemsCount = transfer.items?.length || 0;
                                        const firstItem = transfer.items?.[0]?.item;
                                        const brandName = (transfer as any).brand?.name || firstItem?.brand?.name;
                                        
                                        return (
                                            <TableRow key={transfer.id} className="hover:bg-muted/30 group">
                                                <TableCell className="font-mono text-xs font-bold">{transfer.requestNo}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[10px] ${isIncoming ? 'bg-emerald-100/50 text-emerald-900 border-emerald-300' : 'bg-blue-100/50 text-blue-900 border-blue-300'} font-mono`}>
                                                        TR #{(transfer as any).serialNo}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm leading-tight text-gray-800">
                                                            {totalItemsCount > 1
                                                              ? `Stock Transfer Note (${totalItemsCount} Products${brandName ? ` · ${brandName}` : ""})`
                                                              : firstItem?.description || "Transfer Items"}
                                                        </span>
                                                        {totalItemsCount > 1 ? (
                                                            <div className="flex flex-col gap-1 mt-1.5 w-full">
                                                                {(transfer.items || []).slice(0, 3).map((i: any, idx: number) => (
                                                                    <div key={i.id || idx} className="flex justify-between items-center text-[10px] bg-gray-50/80 p-1 px-1.5 rounded border border-gray-100">
                                                                        <span className="truncate flex-1 mr-2 text-gray-600 font-medium" title={i.item?.description}>{i.item?.description || "Unknown Item"}</span>
                                                                        <span className="font-bold text-gray-900 ml-2">x{i.quantity}</span>
                                                                    </div>
                                                                ))}
                                                                {totalItemsCount > 3 && (
                                                                    <div className="text-[9px] text-center text-muted-foreground bg-gray-50/50 p-0.5 rounded border border-gray-50 font-medium">
                                                                        + {totalItemsCount - 3} more line items
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                                                SKU: {firstItem?.sku || "N/A"}
                                                            </span>
                                                        )}
                                                        {transfer.notes && <span className="text-[10px] text-green-700 font-medium line-clamp-1 mt-1 bg-green-50 p-1 px-2 rounded w-fit" title={transfer.notes}>Notes: {transfer.notes}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {isIncoming ? (transfer.fromLocation?.name || transfer.fromWarehouse?.name || "Warehouse/Outlet") : (transfer.toLocation?.name || (transfer as any).toWarehouse?.name || "Warehouse/Outlet")}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-slate-700">
                                                    {totalQty}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className={`text-[10px] font-bold ${isIncoming ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                                                        {isIncoming ? 'STOCK IN' : 'STOCK OUT'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => printReceipt(transfer)}
                                                            disabled={printingId === transfer.id}
                                                            className="text-primary hover:text-primary hover:bg-primary/5 bg-white border-primary/20 shadow-sm transition-all"
                                                        >
                                                            {printingId === transfer.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 mr-1.5" />} Print
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    
                    {/* Pagination Controls */}
                    {!isLoading && totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
                            <span className="text-sm text-muted-foreground font-medium">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)} of {totalRecords}
                            </span>
                            <SmartPagination 
                                currentPage={currentPage} 
                                totalPages={totalPages} 
                                onPageChange={setCurrentPage} 
                            />
                        </div>
                    )}
                </div></main>
        </div>
    );
}
