"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    RotateCcw, ArrowLeft, RefreshCcw, Package, CheckCircle2, FileText,
    AlertTriangle, Plus, Minus, Trash2, Search, Send, ShoppingCart, Building2,
    Calendar, PackageCheck, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/providers/auth-provider";
import { getReturnTransferRequests, acceptTransferRequest, createReturnTransferRequest } from "@/lib/actions/transfer-request";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartPagination } from "@/components/ui/smart-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { warehouseApi, inventoryApi } from "@/lib/api";

interface Warehouse {
    id: string;
    name: string;
    isActive: boolean;
}

interface Item {
    id: string;
    sku: string;
    barCode?: string;
    description: string;
    size?: { id: string; name: string };
    color?: { id: string; name: string };
    totalQuantity: number;
}

interface CartItem {
    item: Item;
    quantity: number;
}

interface RequestItem {
    id: string;
    quantity: number;
    item?: {
        sku: string;
        description: string;
    };
}

interface ReturnRequest {
    id: string;
    requestNo: string;
    status: string;
    createdAt: string;
    notes?: string;
    fromWarehouse?: {
        name: string;
    };
    items: RequestItem[];
}


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

const BRANDS = ["WATCHES", "TISSOT", "RADO", "GUESS", "USPA", "TIMEX", "TIMBERLAND", "TAG Heuer", "POLICE", "ORIS", "NAUTICA", "FENDI", "DIOR", "DANISH DESIGN", "PEDRO", "CHARLES & KEITH", "UNDER ARMOUR", "PUMA", "NIKE", "BIRKENSTOCK", "ASICS", "ADIDAS"];
export default function ReturnRequestsPage() {
    const { user, hasPermission } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);

    // Create Mode States
    const [isCreating, setIsCreating] = useState(false);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [itemQuery, setItemQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Item[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const debouncedQuery = useDebounce(itemQuery, 300);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [brandFilter, setBrandFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("newest");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const ITEMS_PER_PAGE = 20;

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

    const fetchRequests = useCallback(async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const res = await getReturnTransferRequests(locationId, {
                status: activeTab === 'history' ? 'history' : undefined,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: searchQuery,
                sortBy: sortBy,
                statusFilter: statusFilter,
                dateFrom,
                dateTo,
                brand: brandFilter
            });
            if (res.status) {
                setRequests(res.data || []);
                setTotalPages(res.meta?.totalPages || 1);
                setTotalRecords(res.meta?.total || 0);
            }
        } catch (error) {
            console.error("Failed to fetch return requests", error);
            toast.error("Failed to load return requests");
        } finally {
            setIsLoading(false);
        }
    }, [locationId, activeTab, currentPage, searchQuery, sortBy, statusFilter, dateFrom, dateTo, brandFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy, statusFilter, activeTab, brandFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchRequests();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [fetchRequests]);

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

    const fetchWarehouses = useCallback(async () => {
        try {
            const res = await warehouseApi.getAll();
            const activeWhs = res.filter((w) => w.isActive);
            setWarehouses(activeWhs);
            if (activeWhs.length > 0) {
                setSelectedWarehouseId(activeWhs[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch warehouses", error);
            toast.error("Failed to load destination warehouses");
        }
    }, []);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim() || !locationId) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await inventoryApi.search(query, undefined, locationId);
            if (res.status) {
                const availableItems = (res.data || []).map((item: any) => ({
                    id: item.id,
                    sku: item.sku,
                    barCode: item.barCode,
                    description: item.description,
                    size: item.size,
                    color: item.color,
                    totalQuantity: item.totalQuantity || 0,
                    brand: item.brand
                })).filter((item: any) => item.totalQuantity > 0);
                setSearchResults(availableItems);
            }
        } catch (error) {
            console.error("Failed to search inventory", error);
        } finally {
            setIsSearching(false);
        }
    }, [locationId]);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = itemQuery.trim();
            if (!query || !locationId) return;

            if (searchResults.length === 1) {
                addToCart(searchResults[0]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await inventoryApi.search(query, undefined, locationId);
                if (res.status && res.data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const availableItems = res.data.map((item: any) => ({
                        id: item.id,
                        sku: item.sku,
                        barCode: item.barCode,
                        description: item.description,
                        size: item.size,
                        color: item.color,
                        totalQuantity: item.totalQuantity || 0
                    })).filter((item: any) => item.totalQuantity > 0);
                    
                    if (availableItems.length === 1) {
                        addToCart(availableItems[0]);
                    } else if (availableItems.length > 1) {
                        setSearchResults(availableItems);
                    } else {
                        toast.error("Item not found or out of stock at this location");
                    }
                }
            } catch (error) {
                toast.error("Failed to search item");
            } finally {
                setIsSearching(false);
            }
        }
    };

    useEffect(() => {
        if (isCreating) fetchWarehouses();
    }, [isCreating, fetchWarehouses]);

    useEffect(() => {
        if (isCreating) handleSearch(debouncedQuery);
    }, [debouncedQuery, isCreating, handleSearch]);

    const addToCart = (item: Item) => {
        setCart(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                if (existing.quantity >= item.totalQuantity) {
                    toast.warning(`Cannot add more than available stock (${item.totalQuantity})`);
                    return prev;
                }
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
        setItemQuery('');
        setSearchResults([]);
        
        // Return focus to scanner input for continuous scanning
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const updateCartQuantity = (itemId: string, newQty: number) => {
        setCart(prev => prev.map(i => {
            if (i.item.id === itemId) {
                const maxStock = i.item.totalQuantity;
                const validatedQty = Math.max(1, Math.min(maxStock, newQty));
                return { ...i, quantity: validatedQty };
            }
            return i;
        }));
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.item.id !== itemId));
    };

    const handleSubmitReturn = async () => {
        if (!locationId) {
            toast.error("Your terminal/outlet location is not configured");
            return;
        }
        if (!selectedWarehouseId) {
            toast.error("Please select a destination warehouse");
            return;
        }
        if (cart.length === 0) {
            toast.error("Please add at least one item to return");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await createReturnTransferRequest({
                fromLocationId: locationId,
                toWarehouseId: selectedWarehouseId,
                items: cart.map(i => ({ itemId: i.item.id, quantity: i.quantity })),
                notes: notes,
                createdById: user?.id
            });
            if (res.status) {
                toast.success("Return request submitted successfully! Awaiting approval.");
                setIsCreating(false);
                setCart([]);
                setNotes('');
                fetchRequests();
            } else {
                toast.error(res.message || "Failed to submit return request");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to submit return request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAccept = async (requestId: string) => {
        setIsAccepting(requestId);
        try {
            const res = await acceptTransferRequest(requestId, user?.id);
            if (res.status) {
                toast.success("Return request approved! Items returned to warehouse.");
                fetchRequests();
            } else {
                toast.error(res.message || "Failed to approve return");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to approve return");
        } finally {
            setIsAccepting(null);
        }
    };

    const handlePrint = (request: any) => {
        setPrintingId(request.id);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const win = iframe.contentWindow;
        if (!win) {
            toast.error("Failed to create print frame");
            setPrintingId(null);
            return;
        }

        const dateStr = format(new Date(request.createdAt), "dd/MM/yyyy HH:mm");
        const sourceLoc = user?.terminal?.location?.name || "This Location";
        const destLoc = request.fromWarehouse?.name || request.warehouse?.name || "Warehouse";
        const refNo = request.requestNo || "N/A";
        const notes = request.notes || "";
        const totalQty = request.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 0;

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Return Request - ${refNo}</title>
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
                        <div class="title-main">Return Transfer</div>
                        <div class="title-sub">Return Request Note</div>
                    </div>
                    <div class="meta-box">
                        <div class="meta-row">
                            <span class="meta-label">Transfer Number:</span>
                            <span class="meta-val">${refNo}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Date:</span>
                            <span class="meta-val">${dateStr}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Location (Source):</span>
                            <span class="meta-val">${sourceLoc}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Warehouse (Destination):</span>
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
                        ${request.items
                          .map((item: any, idx: number) => {
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
                          })
                          .join("")}
                    </tbody>
                </table>

                <div class="totals-bar">
                    <div>Total Lines: ${request.items.length}</div>
                    <div>
                        <span style="margin-right: 8px;">Total Quantity:</span>
                        <span class="double-underline">${totalQty}</span>
                    </div>
                </div>

                ${notes ? `<div class="remarks-box"><div class="remarks-title">Remarks</div><div class="remarks-content">${notes}</div></div>` : ""}

                <div class="signatures-grid">
                    <div class="signature-card">SENT BY</div>
                    <div class="signature-card">CHECKED BY</div>
                    <div class="signature-card">WAREHOUSE MANAGER</div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 200);
                    };
                    window.onafterprint = function() {
                        setTimeout(function() {
                            if (window.frameElement) {
                                window.parent.document.body.removeChild(window.frameElement);
                            }
                        }, 500);
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
        <div className="flex flex-col">
            {/* Header */}
            <header className="flex-none p-4 md:p-6 border-b backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4 mx-auto w-full">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">Return Requests</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                            Manage return requests to send items back to warehouse from
                            <Badge variant="outline" className="ml-1 font-bold text-primary">
                                {user?.terminal?.location?.name || "This Location"}
                            </Badge>
                        </p>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchRequests} disabled={isLoading}>
                        <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    {(hasPermission('pos.inventory.transfer.create') || hasPermission('erp.inventory.transfer.create')) && (
                        <Button className="bg-primary hover:bg-primary/90 text-white font-bold" onClick={() => setIsCreating(true)}>
                            <Plus className="h-4 w-4 mr-2" /> New Return
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 pb-20">
                <div className="mx-auto w-full space-y-6">
                    {isCreating ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold tracking-tight">Create Return Request</h2>
                                <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                            
                            <Card className="border-border/50 shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-md font-bold">Destination Warehouse</CardTitle>
                                    <CardDescription className="text-xs">Select the warehouse where the items will be returned.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                        <SelectTrigger className="w-full md:w-[300px]">
                                            <SelectValue placeholder="Select Warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map(w => (
                                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Left Column: Item Search Card */}
                                <div className="md:col-span-1 flex flex-col gap-4">
                                    <Card className="border-border/50 shadow-sm">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-md font-bold flex items-center justify-between text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Search className="h-5 w-5 text-orange-600" />
                                                    Search Items
                                                </div>
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1 text-[10px] py-0">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    Scanner Ready
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="text-xs">Scan barcode to quick-add, or find items with available stock at this outlet.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                <Input
                                                    ref={searchInputRef}
                                                    autoFocus
                                                    placeholder="Scan barcode or type SKU..."
                                                    value={itemQuery}
                                                    onChange={(e) => setItemQuery(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                            className="pl-9 h-11 bg-muted/20 border-border/50"
                                        />
                                    </div>

                                    {/* Search Results */}
                                    <ScrollArea className="h-[250px] rounded-lg border border-border/50 bg-muted/5">
                                        {isSearching ? (
                                            <div className="p-4 space-y-2">
                                                {[1, 2, 3].map(i => (
                                                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                                                ))}
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                                                <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {itemQuery ? "No matching items with stock found" : "Type to search available stock"}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/50">
                                                {searchResults.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => addToCart(item)}
                                                        className="w-full text-left p-3 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors flex items-center justify-between gap-4 group"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                                <span className="font-mono text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground group-hover:bg-orange-100 group-hover:text-orange-700 dark:group-hover:bg-orange-950/40 dark:group-hover:text-orange-300 transition-colors">
                                                                    {item.sku}
                                                                </span>
                                                                {item.barCode && (
                                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium font-mono text-blue-600 bg-blue-50 border-blue-200">
                                                                        {item.barCode}
                                                                    </Badge>
                                                                )}
                                                                {item.uniqueNo && (
                                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium font-mono text-purple-600 bg-purple-50 border-purple-200">
                                                                        {item.uniqueNo}
                                                                    </Badge>
                                                                )}
                                                                {item.size?.name && (
                                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium">
                                                                        Size: {item.size.name}
                                                                    </Badge>
                                                                )}
                                                                {item.color?.name && (
                                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium">
                                                                        Color: {item.color.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-semibold truncate text-foreground">{item.description}</p>
                                                        </div>
                                                        <div className="text-right flex-none">
                                                            <span className="text-[9px] block font-bold text-muted-foreground uppercase tracking-wider">Available</span>
                                                            <span className="text-xs font-bold text-emerald-600">{item.totalQuantity} units</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Return Cart */}
                        <div className="md:col-span-3">
                            <Card className="border-border/50 shadow-sm h-full flex flex-col min-h-[450px]">
                                <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-md font-bold flex items-center gap-2 text-foreground">
                                            <ShoppingCart className="h-5 w-5 text-orange-600" />
                                            Return List
                                        </CardTitle>
                                        <CardDescription className="text-xs">Items selected for return.</CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100/80 dark:bg-orange-950/40 dark:text-orange-300 font-bold">
                                        {cart.length} {cart.length === 1 ? 'item' : 'items'}
                                    </Badge>
                                </CardHeader>

                                <div className="flex-1 flex flex-col justify-between">
                                    {/* Cart Items */}
                                    <ScrollArea className="flex-1 max-h-[300px]">
                                        {cart.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center p-6">
                                                <ShoppingCart className="h-12 w-12 text-muted-foreground/20 mb-3" />
                                                <h4 className="font-bold text-muted-foreground text-sm">Return List is Empty</h4>
                                                <p className="text-xs text-muted-foreground/60 max-w-xs mt-1">
                                                    Search and select items on the left to add them to your return request.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/50">
                                                {cart.map(({ item, quantity }) => (
                                                    <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                <p className="font-mono text-xs font-bold text-orange-600">{item.sku}</p>
                                                                {item.barCode && <span className="text-[10px] text-blue-600 font-medium px-1 bg-blue-50 rounded border border-blue-200 font-mono">{item.barCode}</span>}
                                                                {item.uniqueNo && <span className="text-[10px] text-purple-600 font-medium px-1 bg-purple-50 rounded border border-purple-200 font-mono">{item.uniqueNo}</span>}
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-foreground truncate">{item.description}</h4>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {item.size?.name && (
                                                                    <span className="text-[10px] text-muted-foreground">Size: <span className="font-bold text-foreground">{item.size.name}</span></span>
                                                                )}
                                                                {item.color?.name && (
                                                                    <span className="text-[10px] text-muted-foreground">Color: <span className="font-bold text-foreground">{item.color.name}</span></span>
                                                                )}
                                                                <span className="text-[10px] text-muted-foreground">Available: <span className="font-bold text-emerald-600">{item.totalQuantity}</span></span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 flex-none">
                                                            {/* Quantity Selector */}
                                                            <div className="flex items-center border border-border/50 rounded-lg overflow-hidden bg-background shadow-sm h-9">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-full w-8 rounded-none border-r border-border/50 hover:bg-muted"
                                                                    onClick={() => updateCartQuantity(item.id, quantity - 1)}
                                                                    disabled={quantity <= 1}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <span className="w-10 text-center font-mono text-xs font-bold">{quantity}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-full w-8 rounded-none border-l border-border/50 hover:bg-muted"
                                                                    onClick={() => updateCartQuantity(item.id, quantity + 1)}
                                                                    disabled={quantity >= item.totalQuantity}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                            </div>

                                                            {/* Delete Button */}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9 rounded-lg"
                                                                onClick={() => removeFromCart(item.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>

                                    {/* Footer & Notes */}
                                    <div className="p-4 md:p-6 border-t border-border/50 bg-muted/5 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="return-notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Return Reason / Notes</Label>
                                            <Textarea
                                                id="return-notes"
                                                placeholder="Specify the reason for returning these items..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={2}
                                                className="bg-background resize-none border-border/50"
                                            />
                                        </div>

                                        <Button
                                            onClick={handleSubmitReturn}
                                            className="w-full h-12 text-md font-bold gap-2 shadow-lg shadow-orange-100 dark:shadow-none bg-orange-600 hover:bg-orange-700 text-white"
                                            disabled={isSubmitting || cart.length === 0}
                                        >
                                            {isSubmitting ? (
                                                <RefreshCcw className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Send className="h-5 w-5" />
                                            )}
                                            {isSubmitting ? "Submitting..." : "Submit Return Request"}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                        <>
                    {/* Tabs */}
                    <div className="flex bg-muted/30 p-1 rounded-xl border border-black/5">
                        <button
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'pending'
                                    ? 'bg-white text-primary shadow-sm border border-black/5'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => { setActiveTab('pending'); setStatusFilter('ALL'); setSearchQuery(''); }}
                        >
                            Pending Returns
                        </button>
                        <button
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'history'
                                    ? 'bg-white text-primary shadow-sm border border-black/5'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => { setActiveTab('history'); setStatusFilter('ALL'); setSearchQuery(''); }}
                        >
                            Return History
                        </button>
                    </div>

                    {/* Filters & Search UI */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                            <Input
                                placeholder="Search by SKU, Reference..."
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
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-32 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <Card className="border-dashed h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                            <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                                <RotateCcw className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <CardTitle className="text-xl mb-2 text-muted-foreground">
                                {activeTab === 'pending' ? "No Pending Returns" : "No Return History"}
                            </CardTitle>
                            <CardDescription className="max-w-xs mx-auto">
                                {activeTab === 'pending' 
                                    ? "There are no pending returns. Click New Return to initiate a return to the warehouse."
                                    : "No completed or rejected return transfers found."}
                            </CardDescription>
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
                                        <TableHead className="w-[130px]">Status</TableHead>
                                        <TableHead className="min-w-[300px]">Description / Items</TableHead>
                                        <TableHead className="w-[180px]">Destination</TableHead>
                                        <TableHead className="text-right w-[80px]">Qty</TableHead>
                                        <TableHead className="text-right w-[160px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedRequests.map((group) => (
                                        <React.Fragment key={group.date}>
                                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                                                <TableCell colSpan={6} className="py-2">
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
                                                            {request.status === 'COMPLETED' ? (
                                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200 text-[10px] font-bold">
                                                                    Completed
                                                                </Badge>
                                                            ) : request.status === 'APPROVED' || request.status === 'SOURCE_APPROVED' ? (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 text-[10px] font-bold">
                                                                    Approved
                                                                </Badge>
                                                            ) : request.status === 'REJECTED' ? (
                                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 text-[10px] font-bold">
                                                                    Rejected
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 text-[10px] font-bold">
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-semibold text-sm leading-tight text-gray-800">
                                                                        {totalItemsCount > 1
                                                                          ? `Return Transfer Note (${totalItemsCount} Products)`
                                                                          : firstItem?.description || "Return Items"}
                                                                    </span>
                                                                    <BrandBadge brand={brandName} />
                                                                </div>
                                                                {totalItemsCount > 1 ? (
                                                                    <div className="flex flex-col gap-1 mt-1.5 w-full">
                                                                        {(request.items || []).slice(0, 3).map((i: any, idx: number) => (
                                                                            <div key={i.id || idx} className="flex justify-between items-center text-[10px] bg-gray-50/80 p-1 px-1.5 rounded border border-gray-100">
                                                                                <span className="truncate flex-1 mr-2 text-gray-600 font-medium" title={i.item?.description}>
                                                                                    {i.item?.description || "Unknown Item"}
                                                                                    {i.item?.uniqueNo ? ` (${i.item.uniqueNo})` : i.item?.barCode ? ` (${i.item.barCode})` : ''}
                                                                                </span>
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
                                                                {request.notes && <span className="text-[10px] text-primary/70 font-medium line-clamp-1 mt-1 bg-primary/5 p-1 px-2 rounded w-fit" title={request.notes}>Notes: {request.notes}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {request.fromWarehouse?.name || request.warehouse?.name || "Main Warehouse"}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-primary">
                                                            {totalQty}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {activeTab === 'pending' && (request.status === 'PENDING') && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-3 text-xs bg-primary hover:bg-primary/90"
                                                                        disabled={isAccepting === request.id || !hasPermission('pos.inventory.returns.approve')}
                                                                        onClick={() => handleAccept(request.id)}
                                                                    >
                                                                        {isAccepting === request.id ? <RefreshCcw className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                                        Approve
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-3 text-xs"
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
                            <SmartPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
