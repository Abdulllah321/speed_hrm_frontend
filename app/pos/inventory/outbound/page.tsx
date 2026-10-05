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
    Pencil,
    Search,
    Filter,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
import { SmartPagination } from "@/components/ui/smart-pagination";


const getBrandColor = (brand: string) => {
    const b = brand.toUpperCase();
    if (['NIKE'].includes(b)) return 'bg-black text-white border-black shadow-sm';
    if (['ADIDAS'].includes(b)) return 'bg-blue-600 text-white border-blue-600 shadow-sm';
    if (['PUMA'].includes(b)) return 'bg-red-600 text-white border-red-600 shadow-sm';
    if (['UNDER ARMOUR'].includes(b)) return 'bg-gray-800 text-white border-gray-800 shadow-sm';
    if (['ASICS'].includes(b)) return 'bg-blue-800 text-white border-blue-800 shadow-sm';
    if (['BIRKENSTOCK', 'TIMBERLAND'].includes(b)) return 'bg-amber-700 text-white border-amber-700 shadow-sm';
    if (['CHARLES & KEITH', 'PEDRO', 'FENDI', 'DIOR'].includes(b)) return 'bg-stone-800 text-stone-100 border-stone-800 shadow-sm';
    if (['TISSOT', 'RADO', 'TAG HEUER', 'ORIS', 'WATCHES'].includes(b)) return 'bg-slate-700 text-slate-100 border-slate-700 shadow-sm';
    if (['GUESS', 'POLICE', 'NAUTICA', 'USPA', 'TIMEX', 'DANISH DESIGN'].includes(b)) return 'bg-indigo-700 text-white border-indigo-700 shadow-sm';
    return 'bg-gray-200 text-gray-800 border-gray-300 shadow-sm';
};

const BrandBadge = ({ brand }: { brand?: string }) => {
    if (!brand) return null;
    return (
        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-black tracking-widest uppercase ${getBrandColor(brand)}`}>
            {brand}
        </Badge>
    );
};


const BRANDS = [
    "WATCHES", "TISSOT", "RADO", "GUESS", "USPA", "TIMEX", "TIMBERLAND", 
    "TAG Heuer", "POLICE", "ORIS", "NAUTICA", "FENDI", "DIOR", "DANISH DESIGN", 
    "PEDRO", "CHARLES & KEITH", "UNDER ARMOUR", "PUMA", "NIKE", "BIRKENSTOCK", 
    "ASICS", "ADIDAS"
];

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
    const [dispatchDetails, setDispatchDetails] = useState({ courierName: '', trackingNumber: '', vehicleNumber: '', riderName: '', dispatchNotes: '' });
    
    // Filters and Search
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [brandFilter, setBrandFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("newest");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy, statusFilter, activeTab]);

    const groupedRequests = React.useMemo(() => {
        const groups: { date: string; items: any[] }[] = [];
        requests.forEach(request => {
            const dateStr = format(new Date(request.createdAt), 'MMMM d, yyyy');
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.date === dateStr) {
                lastGroup.items.push(request);
            } else {
                groups.push({ date: dateStr, items: [request] });
            }
        });
        return groups;
    }, [requests]);

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

    const [locationBrands, setLocationBrands] = useState<string[]>(BRANDS);

    useEffect(() => {
        if (locationId) {
            import("@/lib/actions/location").then(({ getLocationById }) => {
                getLocationById(locationId).then(res => {
                    if (res.status && res.data?.brands && res.data.brands.length > 0) {
                        setLocationBrands(res.data.brands.map((b: any) => b.name));
                    }
                });
            });
        }
    }, [locationId]);


    const fetchRequests = async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const res = await getOutboundTransferRequests(locationId, {
                status: activeTab,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: searchQuery,
                sortBy: sortBy,
                statusFilter: statusFilter
            , dateFrom, dateTo, brand: brandFilter });
            if (res.status) {
                setRequests(res.data || []);
                setTotalPages(res.meta?.totalPages || 1);
                setTotalRecords(res.meta?.total || 0);
            }
        } catch (error) {
            console.error("Failed to fetch outbound requests", error);
            toast.error("Failed to load outbound requests");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // debounce fetch to prevent rapid keystrokes from spamming API
        const timeoutId = setTimeout(() => {
            fetchRequests();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [locationId, activeTab, currentPage, searchQuery, sortBy, statusFilter]);

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

    const handleDispatchChange = (field: string, value: string) => {
        setDispatchDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmEditAndApprove = async () => {
        if (!editingRequest) return;
        setIsApproving(editingRequest.id);
        const requestItemsPayload = Object.keys(editedItems).map(itemId => ({
            itemId,
            quantity: editedItems[itemId]
        }));

        try {
            const res = await approveSourceTransferRequest(editingRequest.id, user?.id, requestItemsPayload, dispatchDetails);
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
        <div className="flex flex-col">
            {/* Header */}
            <header className="flex-none p-4 md:p-6 border-b backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4 w-full">
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
            <main className="flex-1 p-4 md:p-6 pb-20">
                <div className="w-full space-y-6">
                    {/* Custom Modern Tabs */}
                    <div className="flex gap-2 p-1 bg-muted rounded-xl max-w-xs border shadow-sm">
                        <button
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'pending'
                                    ? 'bg-white text-blue-600 shadow-sm border border-black/5'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => {
                                setActiveTab('pending');
                                setStatusFilter('ALL');
                                setSearchQuery('');
                            }}
                        >
                            Pending Actions
                        </button>
                        <button
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'history'
                                    ? 'bg-white text-blue-600 shadow-sm border border-black/5'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => {
                                setActiveTab('history');
                                setStatusFilter('ALL');
                                setSearchQuery('');
                            }}
                        >
                            Transfer History
                        </button>
                    </div>

                    {/* Filters & Search UI */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                            <Input
                                placeholder="Search by SKU, Barcode, Reference..."
                                className="pl-9 h-10 bg-white shadow-sm border-black/10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {activeTab === 'history' && (
                            <div className="flex items-center gap-1 w-full sm:w-auto shrink-0 bg-white p-1 rounded-lg border border-black/10 shadow-sm">
                                <Input type="date" className="h-8 border-none shadow-none focus-visible:ring-0 text-xs w-[130px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                                <span className="text-muted-foreground text-xs font-medium px-1">TO</span>
                                <Input type="date" className="h-8 border-none shadow-none focus-visible:ring-0 text-xs w-[130px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                        )}
                        <div className="flex gap-2">
                            
                        <Select value={brandFilter} onValueChange={setBrandFilter}>
                            <SelectTrigger className="w-[140px] bg-white shadow-sm border-black/10 h-10">
                                <SelectValue placeholder="All Brands" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Brands</SelectItem>
                                {locationBrands.map(b => (
                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
<Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[140px] bg-white border-dashed">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            {activeTab === 'history' && (
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] bg-white border-dashed">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
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
                        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                            <Table className="min-w-[1000px]">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[160px]">Request No</TableHead>
                                        <TableHead className="w-[130px]">TR #</TableHead>
                                        <TableHead className="min-w-[300px]">Description / Items</TableHead>
                                        <TableHead className="w-[180px]">Destination</TableHead>
                                        <TableHead className="text-right w-[80px]">Qty</TableHead>
                                        <TableHead className="text-center w-[120px]">Status</TableHead>
                                        <TableHead className="text-right w-[200px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedRequests.map((group) => (
                                        <React.Fragment key={group.date}>
                                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                                                <TableCell colSpan={7} className="py-2">
                                                    <div className="flex items-center gap-2 font-bold text-xs text-muted-foreground uppercase tracking-wider">
                                                        <Calendar className="h-3 w-3" /> {group.date}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {group.items.map((request) => {
                                                const totalQty = (request.items || []).reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
                                                const totalItemsCount = request.items?.length || 0;
                                                const firstItem = request.items?.[0]?.item;
                                                const brandName = request.brand?.name || firstItem?.brand?.name;
                                                
                                                return (
                                                    <TableRow key={request.id} className="hover:bg-muted/30 group">
                                                        <TableCell className="font-mono text-xs font-bold">{request.requestNo}</TableCell>
                                                        <TableCell>
                                                            {(request.outboundNo || request.formattedSerialNo) && (
                                                                <Badge variant="outline" className="text-[10px] bg-blue-100/50 text-blue-900 border-blue-300 font-mono">
                                                                    TR #{request.outboundNo || request.formattedSerialNo}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm leading-tight text-gray-800">
                                                            {totalItemsCount > 1
                                                              ? `Stock Transfer Note (${totalItemsCount} Products)`
                                                              : firstItem?.description || "Transfer Items"}
                                                        </span>
                                                        <BrandBadge brand={brandName} />
                                                    </div>
                                                                {totalItemsCount > 1 ? (
                                                                    <div className="flex flex-col gap-1 mt-1.5 w-full">
                                                                        {(request.items || []).slice(0, 3).map((i: any, idx: number) => (
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
                                                                {request.notes && <span className="text-[10px] text-blue-700 font-medium line-clamp-1 mt-1 bg-blue-50 p-1 px-2 rounded w-fit" title={request.notes}>Notes: {request.notes}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {request.toLocation?.name || request.toWarehouse?.name || "Warehouse/Outlet"}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-blue-600">
                                                            {totalQty}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {request.status === 'PENDING' && (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 text-[10px] font-bold">
                                                                    Awaiting Approval
                                                                </Badge>
                                                            )}
                                                            {request.status === 'SOURCE_APPROVED' && (
                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200 text-[10px] font-bold">
                                                                    Source Approved
                                                                </Badge>
                                                            )}
                                                            {request.status === 'COMPLETED' && (
                                                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 text-[10px] font-bold">
                                                                    Completed
                                                                </Badge>
                                                            )}
                                                            {request.status === 'REJECTED' && (
                                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 text-[10px] font-bold">
                                                                    Rejected
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {activeTab === 'pending' && request.status === 'PENDING' && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                                                                            disabled={isApproving === request.id || isRejecting === request.id || !hasPermission('pos.inventory.outbound.approve')}
                                                                            onClick={() => handleApprove(request.id)}
                                                                        >
                                                                            {isApproving === request.id && <RefreshCcw className="h-3 w-3 animate-spin mr-1" />}
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            className="h-8 px-3 text-xs"
                                                                            disabled={isRejecting === request.id || isApproving === request.id || !hasPermission('pos.inventory.outbound.approve')}
                                                                            onClick={() => handleReject(request.id)}
                                                                        >
                                                                            {isRejecting === request.id && <RefreshCcw className="h-3 w-3 animate-spin mr-1" />}
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                                                    disabled={printingId === request.id}
                                                                    onClick={() => handlePrint(request)}
                                                                >
                                                                    <Printer className="h-3 w-3 mr-1" /> Print
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
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
                    </div>
            </main>

            {/* Edit Quantities Dialog */}
            <Dialog open={!!editingRequest} onOpenChange={(open) => { if(!open){ setEditingRequest(null); setDispatchDetails({ courierName: "", trackingNumber: "", vehicleNumber: "", riderName: "", dispatchNotes: "" }); } }}>
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

                    {editingRequest && (
                        <div className="space-y-3 my-4 border-t pt-4">
                            <h4 className="font-bold text-sm text-blue-900">Dispatch Details (Optional)</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Courier Name</label>
                                    <Input placeholder="e.g. TCS, Leopard" value={dispatchDetails.courierName} onChange={e => handleDispatchChange('courierName', e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Tracking Number</label>
                                    <Input placeholder="Tracking No." value={dispatchDetails.trackingNumber} onChange={e => handleDispatchChange('trackingNumber', e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Rider Name</label>
                                    <Input placeholder="Name" value={dispatchDetails.riderName} onChange={e => handleDispatchChange('riderName', e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Vehicle Number</label>
                                    <Input placeholder="e.g. ABC-123" value={dispatchDetails.vehicleNumber} onChange={e => handleDispatchChange('vehicleNumber', e.target.value)} className="h-8 text-xs" />
                                </div>
                            </div>
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