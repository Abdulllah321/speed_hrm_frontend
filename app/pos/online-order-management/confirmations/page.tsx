'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Phone,
    PhoneCall,
    MessageCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    RefreshCw,
    Loader2,
    Filter,
    ChevronDown,
    SlidersHorizontal,
    ShoppingBag,
    AlertCircle,
    Check,
    X,
    FileText,
    ArrowUpDown,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { OnlineOrderNav } from '@/components/online-orders/online-order-nav';
import { OrderConfirmationModal } from '@/components/online-orders/order-confirmation-modal';
import { format } from 'date-fns';

interface OrderItem {
    sku: string;
    name?: string;
    qty: number;
    price: number;
    stock?: {
        available: number;
        isAvailable: boolean;
    };
    [key: string]: any;
}

interface CallingOrder {
    orderNumber: string;
    orderId?: string;
    orderedAt?: string;
    customerName: string;
    phone: string;
    email?: string;
    city: string;
    address?: string;
    paymentMethod: string;
    marketplace?: string;
    note?: string;
    confirmationStatus: string;
    status: string; // itemStatus
    salesOrderId?: string;
    orderTotal: number;
    items: OrderItem[];
    allStockAvailable: boolean;
    financials: {
        grossSubtotal: number;
        itemDiscounts: number;
        voucherDeduction: number;
        shippingCharges: number;
        netGrandTotal: number;
        totalUnits: number;
    };
}

const normalizeConfirmationStatus = (status?: string | null): string => {
    if (!status) return 'NEEDS_CONFIRMATION';
    const s = status.trim().toUpperCase();
    if (['CONFIRMED', 'APPROVED', 'VERIFIED'].includes(s)) return 'CONFIRMED';
    if (['CALL_BACK', 'CALLBACK', 'RETRY'].includes(s)) return 'CALL_BACK';
    if (['CANCELLED', 'CANCELED', 'REJECTED'].includes(s)) return 'CANCELLED';
    return 'NEEDS_CONFIRMATION';
};

const PRESET_CALL_LOGS = [
    { label: '✓ Confirmed - Dispatch ASAP', status: 'CONFIRMED', note: 'Customer confirmed order verbally. Requested dispatch ASAP.' },
    { label: '📞 Ringing / No Answer', status: 'CALL_BACK', note: 'Phone is ringing but no answer.' },
    { label: '📞 Phone Switched Off / Busy', status: 'CALL_BACK', note: 'Number is unreachable / power off / busy line.' },
    { label: '📞 Call Back Requested', status: 'CALL_BACK', note: 'Customer asked to call back in evening / tomorrow.' },
    { label: '✕ Cancelled - Customer Mind Changed', status: 'CANCELLED', note: 'Customer decided not to proceed with order.' },
    { label: '✕ Cancelled - Wrong Item / Duplicate', status: 'CANCELLED', note: 'Customer placed duplicate order or wrong size.' },
];

export default function OrderConfirmationsPage() {
    const [orders, setOrders] = useState<CallingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_CONFIRMATION' | 'CALL_BACK' | 'CONFIRMED' | 'CANCELLED'>('NEEDS_CONFIRMATION');
    const [selectedOrderNumbers, setSelectedOrderNumbers] = useState<Set<string>>(new Set());

    // Inline loading state per order number
    const [updatingOrderNum, setUpdatingOrderNum] = useState<string | null>(null);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Optional modal state for detailed typing
    const [activeModalOrder, setActiveModalOrder] = useState<CallingOrder | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await authFetch('/pos-sales/online-orders/bulk-upload');
            if (res.ok && res.data?.status && res.data?.data) {
                const formatted: CallingOrder[] = res.data.data.map((o: any) => {
                    const gross = Number(o.financials?.grossSubtotal ?? o.items?.reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0) ?? 0);
                    const itemDiscounts = Number(o.financials?.itemDiscounts ?? 0);
                    const voucherDeduction = Number(o.financials?.voucherDeduction ?? 0);
                    const shippingCharges = Number(o.financials?.shippingCharges ?? 0);
                    const netGrandTotal = Number(o.financials?.netGrandTotal ?? o.orderTotal ?? (gross - itemDiscounts + shippingCharges - voucherDeduction));

                    return {
                        ...o,
                        customerName: o.customerName || 'Customer',
                        phone: o.phone || '',
                        city: o.city || 'Unknown',
                        confirmationStatus: normalizeConfirmationStatus(o.confirmationStatus || o.realMarketStatus),
                        status: o.itemStatus || 'pending',
                        orderTotal: netGrandTotal,
                        financials: {
                            grossSubtotal: gross,
                            itemDiscounts,
                            voucherDeduction,
                            shippingCharges,
                            netGrandTotal,
                            totalUnits: o.financials?.totalUnits ?? o.items?.reduce((s: number, i: any) => s + Number(i.qty || 1), 0) ?? 0,
                        },
                    };
                });
                setOrders(formatted);
            } else {
                toast.error(res.data?.message || 'Failed to load orders for confirmation');
            }
        } catch (error: any) {
            console.error('Failed to fetch orders', error);
            toast.error(error.message || 'Error loading orders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // KPI Counts
    const counts = useMemo(() => {
        let total = orders.length;
        let needsConfirmation = 0;
        let confirmed = 0;
        let callBack = 0;
        let cancelled = 0;
        let shortage = 0;

        for (const o of orders) {
            const cStatus = o.confirmationStatus;
            if (cStatus === 'CONFIRMED') confirmed++;
            else if (cStatus === 'CALL_BACK') callBack++;
            else if (cStatus === 'CANCELLED') cancelled++;
            else needsConfirmation++;

            if (!o.allStockAvailable) shortage++;
        }

        return { total, needsConfirmation, confirmed, callBack, cancelled, shortage };
    }, [orders]);

    // Filtered orders list
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            // Status match
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'NEEDS_CONFIRMATION') {
                    if (o.confirmationStatus !== 'NEEDS_CONFIRMATION' && o.confirmationStatus !== 'CALL_BACK') return false;
                } else if (o.confirmationStatus !== statusFilter) {
                    return false;
                }
            }

            // Search match
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchesNum = o.orderNumber.toLowerCase().includes(q);
                const matchesCust = o.customerName.toLowerCase().includes(q);
                const matchesPhone = o.phone.toLowerCase().includes(q);
                const matchesCity = o.city.toLowerCase().includes(q);
                if (!matchesNum && !matchesCust && !matchesPhone && !matchesCity) return false;
            }

            return true;
        });
    }, [orders, statusFilter, searchTerm]);

    // Fast 1-Click Inline Status Update
    const handleInlineUpdate = async (orderNumber: string, status: string, customNote?: string) => {
        setUpdatingOrderNum(orderNumber);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/order/${orderNumber}/confirmation`, {
                method: 'PUT',
                body: JSON.stringify({
                    confirmationStatus: status,
                    notes: customNote || (status === 'CONFIRMED' ? 'Confirmed via 1-click calling hub' : undefined),
                }),
            });

            if (res.ok && res.data?.status) {
                toast.success(`Order #${orderNumber} marked as ${status}!`);
                setOrders(prev => prev.map(o => {
                    if (o.orderNumber === orderNumber) {
                        return {
                            ...o,
                            confirmationStatus: status,
                            note: customNote ? `${o.note || ''}\n[Call Log]: ${customNote}` : o.note,
                        };
                    }
                    return o;
                }));
            } else {
                toast.error(res.data?.message || 'Failed to update order status');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error updating order status');
        } finally {
            setUpdatingOrderNum(null);
        }
    };

    // Bulk Update Handler
    const handleBulkUpdate = async (status: string, note?: string) => {
        const orderNumbers = Array.from(selectedOrderNumbers);
        if (orderNumbers.length === 0) {
            toast.info("Please select at least one order.");
            return;
        }

        setIsBulkUpdating(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/bulk-confirm`, {
                method: 'POST',
                body: JSON.stringify({
                    orderNumbers,
                    confirmationStatus: status,
                    notes: note || `Bulk updated to ${status} via Calling Hub`,
                }),
            });

            if (res.ok && res.data?.status) {
                toast.success(`Successfully marked ${orderNumbers.length} orders as ${status}!`);
                setOrders(prev => prev.map(o => {
                    if (selectedOrderNumbers.has(o.orderNumber)) {
                        return {
                            ...o,
                            confirmationStatus: status,
                        };
                    }
                    return o;
                }));
                setSelectedOrderNumbers(new Set());
            } else {
                toast.error(res.data?.message || 'Bulk confirmation failed');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error occurred during bulk update');
        } finally {
            setIsBulkUpdating(false);
        }
    };

    // Bulk selection toggles
    const isAllFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderNumbers.has(o.orderNumber));
    const isSomeFilteredSelected = filteredOrders.some(o => selectedOrderNumbers.has(o.orderNumber));

    const toggleSelectAll = (checked: boolean) => {
        setSelectedOrderNumbers(prev => {
            const next = new Set(prev);
            if (checked) {
                filteredOrders.forEach(o => next.add(o.orderNumber));
            } else {
                filteredOrders.forEach(o => next.delete(o.orderNumber));
            }
            return next;
        });
    };

    const toggleSelectOrder = (orderNumber: string, checked: boolean) => {
        setSelectedOrderNumbers(prev => {
            const next = new Set(prev);
            if (checked) next.add(orderNumber);
            else next.delete(orderNumber);
            return next;
        });
    };

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Top Navigation */}
            <OnlineOrderNav counts={{
                totalOrders: counts.total,
                needsConfirmation: counts.needsConfirmation,
                stockShortage: counts.shortage
            }} />

            {/* Header & Quick Action */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                        <PhoneCall className="h-6 w-6 text-primary" />
                        <span>Telephonic Calling & Confirmation Hub</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Rapid dialer for customer verification. Confirm orders in 1-click without typing or opening modals.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrders(true)}
                        disabled={refreshing || loading}
                        className="gap-2 text-xs"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh List</span>
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card 
                    onClick={() => setStatusFilter('NEEDS_CONFIRMATION')}
                    className={`cursor-pointer transition border hover:shadow-sm ${
                        statusFilter === 'NEEDS_CONFIRMATION' ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : ''
                    }`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Needs Call
                            </span>
                            <div className="text-2xl font-black text-foreground">
                                {counts.needsConfirmation}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
                            <PhoneCall className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => setStatusFilter('CALL_BACK')}
                    className={`cursor-pointer transition border hover:shadow-sm ${
                        statusFilter === 'CALL_BACK' ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-500/5' : ''
                    }`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Call Back
                            </span>
                            <div className="text-2xl font-black text-amber-600">
                                {counts.callBack}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => setStatusFilter('CONFIRMED')}
                    className={`cursor-pointer transition border hover:shadow-sm ${
                        statusFilter === 'CONFIRMED' ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/5' : ''
                    }`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Confirmed
                            </span>
                            <div className="text-2xl font-black text-emerald-600">
                                {counts.confirmed}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => setStatusFilter('CANCELLED')}
                    className={`cursor-pointer transition border hover:shadow-sm ${
                        statusFilter === 'CANCELLED' ? 'border-rose-500 ring-1 ring-rose-500/30 bg-rose-500/5' : ''
                    }`}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Cancelled
                            </span>
                            <div className="text-2xl font-black text-muted-foreground">
                                {counts.cancelled}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
                            <XCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by customer name, phone, order # or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {(['NEEDS_CONFIRMATION', 'CALL_BACK', 'CONFIRMED', 'CANCELLED', 'ALL'] as const).map((tab) => {
                        const labels: Record<string, string> = {
                            NEEDS_CONFIRMATION: 'Needs Call',
                            CALL_BACK: 'Call Back',
                            CONFIRMED: 'Confirmed',
                            CANCELLED: 'Cancelled',
                            ALL: 'All Orders',
                        };

                        const isActive = statusFilter === tab;
                        return (
                            <Button
                                key={tab}
                                variant={isActive ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter(tab)}
                                className={`h-8 text-xs font-medium ${isActive ? 'shadow-xs' : 'text-muted-foreground'}`}
                            >
                                {labels[tab]}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedOrderNumbers.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background dark:bg-card dark:text-foreground border px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <span className="text-xs font-bold shrink-0">
                        {selectedOrderNumbers.size} order(s) selected
                    </span>

                    <div className="h-4 w-[1px] bg-border" />

                    <div className="flex items-center gap-2">
                        {/* 1-Click Bulk Confirm */}
                        <Button
                            size="sm"
                            disabled={isBulkUpdating}
                            onClick={() => handleBulkUpdate('CONFIRMED')}
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                        >
                            {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span>Bulk Confirm</span>
                        </Button>

                        {/* 1-Click Bulk Call Back */}
                        <Button
                            size="sm"
                            disabled={isBulkUpdating}
                            onClick={() => handleBulkUpdate('CALL_BACK')}
                            className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1.5 shadow-sm"
                        >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Bulk Call Back</span>
                        </Button>

                        {/* 1-Click Bulk Cancel */}
                        <Button
                            size="sm"
                            disabled={isBulkUpdating}
                            onClick={() => handleBulkUpdate('CANCELLED')}
                            variant="destructive"
                            className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-sm"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Bulk Cancel</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOrderNumbers(new Set())}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Deselect
                        </Button>
                    </div>
                </div>
            )}

            {/* Calling Table */}
            <Card className="border rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            <tr>
                                <th className="p-3 w-10 text-center">
                                    <Checkbox
                                        checked={isAllFilteredSelected ? true : isSomeFilteredSelected ? "indeterminate" : false}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </th>
                                <th className="p-3 min-w-[140px]">Order Details</th>
                                <th className="p-3 min-w-[170px]">Customer & City</th>
                                <th className="p-3 min-w-[200px]">Instant Contact</th>
                                <th className="p-3 min-w-[150px]">Items & Value</th>
                                <th className="p-3 min-w-[130px]">Call Status</th>
                                <th className="p-3 min-w-[260px] text-right">Lightning 1-Click Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                                        <span>Loading orders for calling verification...</span>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                        <p className="font-medium text-sm">No orders matching this filter.</p>
                                        <p className="text-xs mt-1">Try switching to another status tab or clearing search.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const isSelected = selectedOrderNumbers.has(order.orderNumber);
                                    const isUpdatingThis = updatingOrderNum === order.orderNumber;
                                    const cleanPhone = (order.phone || '').replace(/[^0-9+]/g, '');
                                    const waPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone.replace('+', '');
                                    
                                    const waGreeting = encodeURIComponent(
                                        `Assalam-o-Alaikum ${order.customerName}, this is regarding your order #${order.orderNumber} (Rs ${order.orderTotal.toLocaleString()}) from Speed Limit. Could you please confirm if you would like us to dispatch? Thank you!`
                                    );
                                    const waUrl = `https://wa.me/${waPhone}?text=${waGreeting}`;

                                    const isConfirmed = order.confirmationStatus === 'CONFIRMED';
                                    const isCallBack = order.confirmationStatus === 'CALL_BACK';
                                    const isCancelled = order.confirmationStatus === 'CANCELLED';

                                    return (
                                        <tr
                                            key={order.orderNumber}
                                            className={`transition-colors ${
                                                isSelected
                                                    ? 'bg-primary/5'
                                                    : isConfirmed
                                                    ? 'hover:bg-emerald-500/5'
                                                    : isCallBack
                                                    ? 'hover:bg-amber-500/5'
                                                    : 'hover:bg-muted/40'
                                            }`}
                                        >
                                            {/* Select Checkbox */}
                                            <td className="p-3 text-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => toggleSelectOrder(order.orderNumber, !!checked)}
                                                    aria-label={`Select order ${order.orderNumber}`}
                                                />
                                            </td>

                                            {/* Order Number & Timestamp */}
                                            <td className="p-3 space-y-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-foreground text-sm font-mono">
                                                        #{order.orderNumber}
                                                    </span>
                                                    {order.marketplace && (
                                                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-1">
                                                            {order.marketplace}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                                    <span>
                                                        {order.orderedAt ? format(new Date(order.orderedAt), 'dd MMM yyyy, hh:mm a') : 'Recent'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Customer & Address */}
                                            <td className="p-3 space-y-0.5">
                                                <div className="font-semibold text-foreground text-xs truncate max-w-[160px]">
                                                    {order.customerName}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-1 font-medium">
                                                        {order.city}
                                                    </Badge>
                                                    {order.address && (
                                                        <span className="truncate max-w-[120px] text-[10px]" title={order.address}>
                                                            {order.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Instant Contact: Click-to-call & WhatsApp */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {/* Direct Call Anchor */}
                                                    <a
                                                        href={`tel:${cleanPhone}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 font-mono text-xs font-bold transition shadow-xs"
                                                        title="Click to dial on phone or softphone"
                                                    >
                                                        <Phone className="h-3.5 w-3.5" />
                                                        <span>{cleanPhone || 'No Phone'}</span>
                                                    </a>

                                                    {/* WhatsApp 1-Click Message */}
                                                    {cleanPhone && (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 transition shadow-xs"
                                                            title="Send pre-filled WhatsApp confirmation message"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Items & COD Value */}
                                            <td className="p-3 space-y-0.5">
                                                <div className="font-bold text-sm text-foreground">
                                                    Rs {order.orderTotal.toLocaleString()}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {order.items?.length || 0} items ({order.financials.totalUnits} units) • <span className="font-medium">{order.paymentMethod}</span>
                                                </div>
                                            </td>

                                            {/* Current Call Status Badge */}
                                            <td className="p-3">
                                                {isConfirmed ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-[11px] py-0.5 px-2 font-semibold">
                                                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                                                    </Badge>
                                                ) : isCallBack ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-[11px] py-0.5 px-2 font-semibold">
                                                        <Clock className="h-3 w-3" /> Call Back
                                                    </Badge>
                                                ) : isCancelled ? (
                                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 gap-1 text-[11px] py-0.5 px-2 font-semibold">
                                                        <XCircle className="h-3 w-3" /> Cancelled
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 gap-1 text-[11px] py-0.5 px-2 font-semibold animate-pulse">
                                                        <PhoneCall className="h-3 w-3" /> Needs Call
                                                    </Badge>
                                                )}

                                                {order.note && (
                                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic max-w-[150px]" title={order.note}>
                                                        {order.note.split('\n').pop()}
                                                    </p>
                                                )}
                                            </td>

                                            {/* LIGHTNING 1-CLICK ACTION BUTTONS */}
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {/* 1-Click Confirm */}
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleInlineUpdate(order.orderNumber, 'CONFIRMED')}
                                                        disabled={isUpdatingThis || isConfirmed}
                                                        className={`h-7 px-2.5 text-xs font-semibold gap-1 transition ${
                                                            isConfirmed
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                                        }`}
                                                        title="1-Click Mark Confirmed (Zero typing needed)"
                                                    >
                                                        {isUpdatingThis ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Check className="h-3 w-3" />
                                                        )}
                                                        <span>{isConfirmed ? 'Confirmed' : 'Confirm'}</span>
                                                    </Button>

                                                    {/* 1-Click Call Back */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleInlineUpdate(order.orderNumber, 'CALL_BACK')}
                                                        disabled={isUpdatingThis || isCallBack}
                                                        className={`h-7 px-2 text-xs font-semibold gap-1 ${
                                                            isCallBack
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                                                : 'text-amber-700 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                                        }`}
                                                        title="1-Click Mark Call Back (Zero typing needed)"
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        <span>Call Back</span>
                                                    </Button>

                                                    {/* Quick Preset Notes Dropdown */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                title="Quick Preset Call Logs"
                                                            >
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 text-xs">
                                                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                                1-Click Log Presets
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {PRESET_CALL_LOGS.map((preset, idx) => (
                                                                <DropdownMenuItem
                                                                    key={idx}
                                                                    onClick={() => handleInlineUpdate(order.orderNumber, preset.status, preset.note)}
                                                                    className="cursor-pointer text-xs py-1.5"
                                                                >
                                                                    {preset.label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setActiveModalOrder(order);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="cursor-pointer text-xs font-semibold text-primary"
                                                            >
                                                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                                                Type Custom Note / Modal...
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Optional Custom Modal if user specifically clicks custom note */}
            {activeModalOrder && (
                <OrderConfirmationModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    order={activeModalOrder}
                    onConfirmed={(orderNum, newStatus, newNotes) => {
                        setOrders(prev => prev.map(o => {
                            if (o.orderNumber === orderNum) {
                                return {
                                    ...o,
                                    confirmationStatus: newStatus,
                                    note: newNotes ? `${o.note || ''}\n${newNotes}` : o.note,
                                };
                            }
                            return o;
                        }));
                    }}
                />
            )}
        </div>
    );
}
