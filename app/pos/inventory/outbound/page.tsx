"use client";

import React, { useState, useEffect } from "react";
import {
    ArrowRight,
    ArrowLeft,
    RefreshCcw,
    Package,
    CheckCircle2,
    FileText,
    AlertTriangle,
    Printer,
    Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { getOutboundTransferRequests, approveSourceTransferRequest, updateTransferRequestStatus } from "@/lib/actions/transfer-request";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function OutboundRequestsPage() {
    const { user, hasPermission } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState<string | null>(null);
    const [isRejecting, setIsRejecting] = useState<string | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [editingRequest, setEditingRequest] = useState<any | null>(null);
    const [editedItems, setEditedItems] = useState<{ [itemId: string]: number }>({});

    const handlePrint = (request: any) => {
        setPrintingId(request.id);
        const win = window.open("", "_blank");
        if (!win) {
            toast.error("Allow popups to print");
            setPrintingId(null);
            return;
        }

        const dateStr = format(new Date(request.createdAt), "dd/MM/yyyy HH:mm");
        const sourceLoc = user?.terminal?.location?.name || "This Location";
        const destLoc = request.toLocation?.name || request.toWarehouse?.name || "Warehouse/Outlet";
        const refNo = request.requestNo || "N/A";
        const outboundNo = request.outboundNo || request.formattedSerialNo || null;
        const notes = request.notes || "";
        const totalQty = request.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 0;

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Outbound Stock Transfer - ${refNo}</title>
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
                        <div class="title-main">Stock Transfer OUT</div>
                        <div class="title-sub">Transfer Note</div>
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
                            <span class="meta-label">Source Outlet:</span>
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

    const locationId = user?.terminal?.location?.id || user?.locationId;

    const fetchRequests = async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const res = await getOutboundTransferRequests(locationId, activeTab);
            if (res.status) {
                setRequests(res.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch outbound requests", error);
            toast.error("Failed to load outbound requests");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [locationId, activeTab]);

    const handleApprove = async (requestId: string) => {
        setIsApproving(requestId);
        try {
            const res = await approveSourceTransferRequest(requestId, user?.id);
            if (res.status) {
                toast.success("Source approval completed! Items released for transfer.");
                setRequests(prev => prev.filter(r => r.id !== requestId));
            } else {
                toast.error(res.message || "Failed to approve transfer");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to approve transfer");
        } finally {
            setIsApproving(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setIsRejecting(requestId);
        try {
            const res = await updateTransferRequestStatus(requestId, 'REJECTED');
            if (res.status) {
                toast.success("Transfer request rejected successfully.");
                setRequests(prev => prev.filter(r => r.id !== requestId));
            } else {
                toast.error(res.message || "Failed to reject transfer");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to reject transfer");
        } finally {
            setIsRejecting(null);
        }
    };

    const startEditing = (request: any) => {
        setEditingRequest(request);
        const initialQuantities: { [itemId: string]: number } = {};
        request.items.forEach((item: any) => {
            initialQuantities[item.itemId] = Number(item.quantity);
        });
        setEditedItems(initialQuantities);
    };

    const handleQtyChange = (itemId: string, val: string, maxVal: number) => {
        const num = parseInt(val) || 0;
        const safeNum = Math.max(1, Math.min(num, maxVal));
        setEditedItems(prev => ({
            ...prev,
            [itemId]: safeNum
        }));
    };

    const handleConfirmEditAndApprove = async () => {
        if (!editingRequest) return;
        setIsApproving(editingRequest.id);
        const requestItemsPayload = Object.keys(editedItems).map(itemId => ({
            itemId,
            quantity: editedItems[itemId]
        }));

        try {
            const res = await approveSourceTransferRequest(editingRequest.id, user?.id, requestItemsPayload);
            if (res.status) {
                toast.success("Source approval completed with adjusted quantities! Items released.");
                setRequests(prev => prev.filter(r => r.id !== editingRequest.id));
                setEditingRequest(null);
            } else {
                toast.error(res.message || "Failed to approve transfer");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to approve transfer");
        } finally {
            setIsApproving(null);
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
                        <h1 className="text-2xl font-bold tracking-tight">Outbound Requests</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                            Approve outbound transfers from
                            <Badge variant="outline" className="ml-1 font-bold text-blue-600">
                                {user?.terminal?.location?.name || "This Location"}
                            </Badge>
                            to other outlets
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
                    {/* Custom Modern Tabs */}
                    <div className="flex gap-2 p-1 bg-muted rounded-xl max-w-xs border shadow-sm">
                        <button
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'pending'
                                    ? 'bg-white text-blue-600 shadow-sm border border-black/5'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending Actions
                        </button>
                        <button
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'history'
                                    ? 'bg-white text-blue-600 shadow-sm border border-black/5'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setActiveTab('history')}
                        >
                            Transfer History
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-32 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <Card className="border-dashed h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <ArrowRight className="h-10 w-10 text-blue-600/60" />
                            </div>
                            <h2 className="text-xl mb-2 text-muted-foreground font-bold">
                                {activeTab === 'pending' ? "No Outbound Requests" : "No Outbound History"}
                            </h2>
                            <p className="max-w-xs mx-auto text-muted-foreground">
                                {activeTab === 'pending' 
                                    ? "No pending outbound transfer requests for this location." 
                                    : "No completed or rejected outbound transfers found."}
                            </p>
                            <Button variant="outline" className="mt-6" onClick={fetchRequests}>
                                <RefreshCcw className="h-4 w-4 mr-2" /> Check Again
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {requests.map((request) => (
                                <Card key={request.id} className="overflow-hidden border-2 hover:border-blue-200 transition-all shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-stretch">
                                        {/* Status Sidebar */}
                                        <div className="bg-blue-50 p-4 md:w-48 flex flex-col justify-between border-b md:border-b-0 md:border-r border-blue-200">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Outbound Request</span>
                                                <div className="font-mono text-sm font-bold truncate text-blue-800">{request.requestNo}</div>
                                                {(request.outboundNo || request.formattedSerialNo) && (
                                                    <Badge variant="outline" className="text-[10px] bg-blue-100/50 text-blue-900 border-blue-300 font-mono">
                                                        TR #{request.outboundNo || request.formattedSerialNo}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="mt-4 md:mt-0">
                                                {request.status === 'PENDING' && (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 font-bold">
                                                        <AlertTriangle className="h-3 w-3 mr-1" /> Awaiting Approval
                                                    </Badge>
                                                )}
                                                {request.status === 'SOURCE_APPROVED' && (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200 font-bold">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Source Approved
                                                    </Badge>
                                                )}
                                                {request.status === 'COMPLETED' && (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 font-bold">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                                                    </Badge>
                                                )}
                                                {request.status === 'REJECTED' && (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 font-bold">
                                                        Rejected
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <CardContent className="p-4 md:p-6 flex-1 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1 w-full space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                                        <ArrowRight className="h-6 w-6" />
                                                    </div>
                                                     <div>
                                                         <div className="flex items-center gap-2 flex-wrap mb-1">
                                                             <h3 className="font-bold text-lg leading-tight">
                                                                 {request.items[0]?.item?.description || "Transfer Items"}
                                                             </h3>
                                                             {request.items[0]?.item?.size && (
                                                                 <Badge variant="secondary" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                                                                     Size: {request.items[0]?.item?.size.name || request.items[0]?.item?.size}
                                                                 </Badge>
                                                             )}
                                                             {request.items[0]?.item?.color && (
                                                                 <Badge variant="secondary" className="text-[10px] font-semibold bg-pink-50 text-pink-700 border-pink-200">
                                                                     Color: {request.items[0]?.item?.color.name || request.items[0]?.item?.color}
                                                                 </Badge>
                                                             )}
                                                         </div>
                                                         <p className="text-sm text-muted-foreground font-medium">SKU: {request.items[0]?.item?.sku || "N/A"}</p>
                                                     </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transfer Quantity</span>
                                                        <span className="text-xl font-black text-blue-600">{Number(request.items[0]?.quantity || 0)}</span>
                                                    </div>
                                                    <div className="h-10 w-px bg-border hidden sm:block" />
                                                     <div className="flex flex-col">
                                                         <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destination</span>
                                                         <span className="text-sm font-semibold">{request.toLocation?.name || request.toWarehouse?.name || "Warehouse/Outlet"}</span>
                                                     </div>
                                                    <div className="h-10 w-px bg-border hidden sm:block" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Request Date</span>
                                                        <span className="text-sm font-semibold">{format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</span>
                                                    </div>
                                                </div>

                                                {request.notes && (
                                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 block mb-1">Transfer Reason</span>
                                                        <p className="text-sm text-blue-800">{request.notes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-full md:w-auto flex flex-col gap-2">
                                                {activeTab === 'pending' && (
                                                    <>
                                                        <Button
                                                            className="w-full md:w-40 h-12 text-md font-bold gap-2 shadow-lg shadow-blue-200 bg-blue-600 hover:bg-blue-700"
                                                            disabled={isApproving === request.id || isRejecting === request.id || !hasPermission('pos.inventory.outbound.approve')}
                                                            onClick={() => handleApprove(request.id)}
                                                        >
                                                            {isApproving === request.id ? (
                                                                <RefreshCcw className="h-5 w-5 animate-spin" />
                                                             ) : (
                                                                <CheckCircle2 className="h-5 w-5" />
                                                             )}
                                                            {isApproving === request.id ? "Approving..." : "Approve & Release"}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full md:w-40 h-10 font-bold gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                                            disabled={isApproving === request.id || isRejecting === request.id || !hasPermission('pos.inventory.outbound.approve')}
                                                            onClick={() => startEditing(request)}
                                                        >
                                                            <Pencil className="h-4 w-4" /> Adjust & Approve
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            className="w-full md:w-40 h-10 font-bold gap-2"
                                                            disabled={isRejecting === request.id || isApproving === request.id || !hasPermission('pos.inventory.outbound.approve')}
                                                            onClick={() => handleReject(request.id)}
                                                        >
                                                            {isRejecting === request.id && <RefreshCcw className="h-4 w-4 animate-spin" />}
                                                            Reject Request
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    className="w-full md:w-40 h-10 font-bold gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                                    disabled={printingId === request.id}
                                                    onClick={() => handlePrint(request)}
                                                >
                                                    <Printer className="h-4 w-4" /> Print Slip
                                                </Button>
                                                
                                            </div>
                                        </CardContent>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Quantities Dialog */}
            <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-900">
                            <Pencil className="h-5 w-5 text-blue-600" /> Adjust Transfer Quantities
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            Modify the quantities of items to release. You cannot exceed the originally requested quantity.
                        </DialogDescription>
                    </DialogHeader>

                    {editingRequest && (
                        <div className="space-y-4 my-4 max-h-[300px] overflow-y-auto pr-2">
                            {editingRequest.items.map((item: any) => {
                                const maxQty = Number(item.quantity);
                                const currentVal = editedItems[item.itemId] ?? maxQty;
                                return (
                                    <div key={item.itemId} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h4 className="font-bold text-sm text-foreground truncate">
                                                    {item.item?.description || "Transfer Item"}
                                                </h4>
                                                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                                                    SKU: {item.item?.sku || "—"}
                                                </p>
                                                <div className="flex gap-2 mt-1">
                                                    {item.item?.size && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                                                            Size: {item.item.size.name || item.item.size}
                                                        </Badge>
                                                    )}
                                                    {item.item?.color && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-pink-50 text-pink-700 border-pink-200">
                                                            Color: {item.item.color.name || item.item.color}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Requested</span>
                                                <span className="text-sm font-bold text-blue-955">{maxQty}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed">
                                            <span className="text-xs font-semibold text-muted-foreground">Adjusted Release Qty:</span>
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={maxQty}
                                                    value={currentVal}
                                                    onChange={(e) => handleQtyChange(item.itemId, e.target.value, maxQty)}
                                                    className="h-8 font-bold text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setEditingRequest(null)} disabled={isApproving === editingRequest?.id}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            onClick={handleConfirmEditAndApprove}
                            disabled={isApproving === editingRequest?.id}
                        >
                            {isApproving === editingRequest?.id ? "Processing..." : "Confirm & Release"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}