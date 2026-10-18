'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Upload,
    PackageOpen,
    Play,
    Send,
    Eye,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Trash2,
    Printer,
    RefreshCw,
    ShoppingBag,
    Tag,
    Layers,
    DollarSign,
    CreditCard,
    Truck,
    PackageCheck,
    CheckSquare,
    Square,
    Check,
    X,
    ExternalLink,
    Pencil,
    Phone,
    PhoneCall,
    MessageCircle,
    Clock,
    Warehouse,
    Store
} from 'lucide-react';
import { OnlineOrderBulkUploadModal } from '@/components/online-orders/online-order-bulk-upload-modal';
import { EditOnlineOrderModal } from '@/components/online-orders/edit-online-order-modal';
import { OrderConfirmationModal } from '@/components/online-orders/order-confirmation-modal';
import { InventorySourcingModal } from '@/components/online-orders/inventory-sourcing-modal';
import { OnlineOrderNav } from '@/components/online-orders/online-order-nav';
import { authFetch } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PrintReceipt } from '@/components/pos/print-receipt';
import { toast } from 'sonner';
import DataTable, { HighlightText } from "@/components/common/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LocationStockItem {
    id: string;
    name: string;
    type: string;
    qty: number;
}

interface OrderItem {
    id?: string;
    itemId?: string;
    sku: string;
    systemSku?: string;
    barcode?: string;
    name?: string;
    brand?: string;
    size?: string;
    qty: number;
    price: number;
    subTotalPrice?: number;
    skuDiscounted?: number;
    skuActualDiscount?: number;
    discountPercent?: number;
    discountAmount?: number;
    netItemTotal?: number;
    shippingCharges?: number;
    couponCode?: string;
    itemStatus?: string;
    stock?: {
        available: number;
        companyAvailable?: number;
        localAvailable?: number;
        isAvailable: boolean;
        isCompanyAvailable?: boolean;
        isLocallyAvailable?: boolean;
        requiresSourcing?: boolean;
        locations?: LocationStockItem[];
    };
    [key: string]: any;
}

interface FinancialBreakdown {
    grossSubtotal: number;
    itemDiscounts: number;
    discountPercent?: number;
    voucherDeduction: number;
    shippingCharges: number;
    netGrandTotal: number;
    remainingPayable: number;
    totalUnits: number;
}

interface VoucherInfo {
    code: string;
    type: 'VOUCHER' | 'COUPON' | 'ALLIANCE';
    partnerName?: string;
    voucherType?: string;
    amount: number;
    balance?: number;
    isValid: boolean;
    reason?: string;
}

interface GroupedOrder {
    id: string;
    orderNumber: string;
    customerName: string;
    city: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentMethod: string;
    status: string;
    confirmationStatus?: string;
    note?: string;
    orderedAt?: string;
    trackingNumber?: string;
    marketplace?: string;
    channel?: string;
    salesOrderId?: string;
    financials: FinancialBreakdown;
    voucherInfo?: VoucherInfo;
    items: OrderItem[];
    allStockAvailable: boolean;
    hasLocalStock?: boolean;
    requiresSourcing?: boolean;
    orderTotal: number;
}

type TabFilter = 'all' | 'needs_confirmation' | 'confirmed' | 'ready' | 'sourcing' | 'stock_warning' | 'posted' | 'with_vouchers' | 'cancelled';

export function OnlineOrderList() {
    const { user } = useAuth();
    const router = useRouter();

    // Data State
    const [orders, setOrders] = useState<GroupedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter & Selection State
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [selectedOrderNumbers, setSelectedOrderNumbers] = useState<Set<string>>(new Set());

    // Execution & Progress State
    const [postingOrder, setPostingOrder] = useState<string | null>(null);
    const [isPostingSelected, setIsPostingSelected] = useState(false);
    const [isPostingAll, setIsPostingAll] = useState(false);

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [viewItemsOrder, setViewItemsOrder] = useState<GroupedOrder | null>(null);
    const [printOrderData, setPrintOrderData] = useState<any>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit Order Modal State
    const [orderToEdit, setOrderToEdit] = useState<GroupedOrder | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Customer Telephonic Confirmation Modal State
    const [orderToConfirm, setOrderToConfirm] = useState<GroupedOrder | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Multi-Location Inventory Sourcing & Transfer Modal State
    const [orderToSource, setOrderToSource] = useState<GroupedOrder | null>(null);
    const [isSourcingModalOpen, setIsSourcingModalOpen] = useState(false);

    // Bulk Post Results Dialog
    const [bulkResults, setBulkResults] = useState<{
        summary: { total: number; posted: number; failed: number };
        results: Array<{
            orderNumber: string;
            success: boolean;
            salesOrderId?: string;
            salesOrderNumber?: string;
            error?: string;
            salesOrder?: any;
        }>;
    } | null>(null);
    const [isBulkResultsModalOpen, setIsBulkResultsModalOpen] = useState(false);
    const [isBulkConfirming, setIsBulkConfirming] = useState(false);

    // Fetch orders from backend
    const fetchOrders = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload`);
            if (res.ok && res.data?.status && res.data?.data) {
                const formatted: GroupedOrder[] = res.data.data.map((o: any) => {
                    const gross = Number(
                        o.financials?.grossSubtotal ??
                        o.grossSubtotal ??
                        o.items?.reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0) ??
                        0
                    );

                    // Compute true discount in Rupees (not percentage sum)
                    let itemDiscounts = Number(o.financials?.itemDiscounts ?? o.totalDiscount ?? 0);
                    if (!itemDiscounts && o.items) {
                        itemDiscounts = o.items.reduce((s: number, i: any) => {
                            const p = Number(i.price || 0);
                            const q = Number(i.qty || 1);
                            const pct = Number(i.skuActualDiscount || i.skuDiscounted || 0);
                            return s + (p * q * (pct / 100));
                        }, 0);
                    }

                    const discountPercent = gross > 0
                        ? Number(o.financials?.discountPercent ?? Math.round((itemDiscounts / gross) * 100))
                        : 0;

                    const voucherDeduction = Number(o.financials?.voucherDeduction ?? o.voucherRedeemed ?? 0);
                    const shippingCharges = Number(o.financials?.shippingCharges ?? o.shippingCharges ?? o.items?.[0]?.shippingCharges ?? 0);
                    const netGrandTotal = Number(o.financials?.netGrandTotal ?? o.orderTotal ?? (gross - itemDiscounts + shippingCharges - voucherDeduction));
                    const remainingPayable = Number(o.financials?.remainingPayable ?? o.payableAfterVoucher ?? netGrandTotal);
                    const totalUnits = Number(o.financials?.totalUnits ?? o.items?.reduce((s: number, i: any) => s + Number(i.qty || 1), 0) ?? 0);

                    return {
                        ...o,
                        id: o.orderNumber,
                        confirmationStatus: (o.confirmationStatus || o.realMarketStatus || 'NEEDS_CONFIRMATION').toUpperCase(),
                        note: o.note,
                        financials: {
                            grossSubtotal: gross,
                            itemDiscounts,
                            discountPercent,
                            voucherDeduction,
                            shippingCharges,
                            netGrandTotal,
                            remainingPayable,
                            totalUnits
                        },
                        allStockAvailable: o.allStockAvailable ?? true,
                        hasLocalStock: o.hasLocalStock ?? false,
                        requiresSourcing: o.requiresSourcing ?? false,
                    };
                });
                setOrders(formatted);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error("Failed to fetch online orders", error);
            toast.error("Failed to load online orders");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = orders.length;
        const posted = orders.filter(o => o.status === 'posted').length;
        const pending = orders.filter(o => o.status !== 'posted').length;
        const needsConfirmation = orders.filter(o => o.status !== 'posted' && (!o.confirmationStatus || o.confirmationStatus === 'NEEDS_CONFIRMATION' || o.confirmationStatus === 'CALL_BACK')).length;
        const confirmed = orders.filter(o => o.status !== 'posted' && o.confirmationStatus === 'CONFIRMED').length;
        const ready = orders.filter(o => o.status !== 'posted' && o.confirmationStatus === 'CONFIRMED' && o.allStockAvailable).length;
        const sourcingNeeded = orders.filter(o => o.status !== 'posted' && o.allStockAvailable && o.requiresSourcing).length;
        const stockWarning = orders.filter(o => o.status !== 'posted' && !o.allStockAvailable).length;
        const cancelled = orders.filter(o => o.confirmationStatus === 'CANCELLED').length;
        const withVouchers = orders.filter(o => o.voucherInfo && o.voucherInfo.isValid).length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.financials.netGrandTotal || 0), 0);
        const totalVoucherValue = orders.reduce((sum, o) => sum + (o.financials.voucherDeduction || 0), 0);

        return {
            total,
            posted,
            pending,
            needsConfirmation,
            confirmed,
            ready,
            sourcingNeeded,
            stockWarning,
            cancelled,
            withVouchers,
            totalRevenue,
            totalVoucherValue,
        };
    }, [orders]);

    // Filtered orders for table
    const filteredOrders = useMemo(() => {
        switch (activeTab) {
            case 'needs_confirmation':
                return orders.filter(o => o.status !== 'posted' && (!o.confirmationStatus || o.confirmationStatus === 'NEEDS_CONFIRMATION' || o.confirmationStatus === 'CALL_BACK'));
            case 'confirmed':
                return orders.filter(o => o.status !== 'posted' && o.confirmationStatus === 'CONFIRMED');
            case 'ready':
                return orders.filter(o => o.status !== 'posted' && o.confirmationStatus === 'CONFIRMED' && o.allStockAvailable);
            case 'sourcing':
                return orders.filter(o => o.status !== 'posted' && o.allStockAvailable && o.requiresSourcing);
            case 'stock_warning':
                return orders.filter(o => o.status !== 'posted' && !o.allStockAvailable);
            case 'posted':
                return orders.filter(o => o.status === 'posted');
            case 'with_vouchers':
                return orders.filter(o => o.voucherInfo && o.voucherInfo.isValid);
            case 'cancelled':
                return orders.filter(o => o.confirmationStatus === 'CANCELLED');
            default:
                return orders;
        }
    }, [orders, activeTab]);

    // Selected orders summary
    const selectedOrdersList = useMemo(() => {
        return orders.filter(o => selectedOrderNumbers.has(o.orderNumber));
    }, [orders, selectedOrderNumbers]);

    const selectedTotalAmount = useMemo(() => {
        return selectedOrdersList.reduce((sum, o) => sum + (o.financials.netGrandTotal || 0), 0);
    }, [selectedOrdersList]);

    const selectedOutOfStockCount = useMemo(() => {
        return selectedOrdersList.filter(o => !o.allStockAvailable).length;
    }, [selectedOrdersList]);

    // Single order post
    const handlePostOrder = async (orderNumber: string) => {
        setPostingOrder(orderNumber);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/${orderNumber}/post`, {
                method: 'POST'
            });

            if (res.ok && res.data?.status) {
                const salesOrder = res.data.data;
                toast.success(`Order ${orderNumber} posted successfully! Invoice #${salesOrder?.orderNumber || ''}`);
                
                // Update local state without requiring reload
                setOrders(prev => prev.map(o =>
                    o.orderNumber === orderNumber
                        ? { ...o, status: 'posted', salesOrderId: salesOrder?.id }
                        : o
                ));
                setSelectedOrderNumbers(prev => {
                    const next = new Set(prev);
                    next.delete(orderNumber);
                    return next;
                });

                if (salesOrder) {
                    setPrintOrderData(salesOrder);
                    setIsPrintModalOpen(true);
                }
                return true;
            } else {
                toast.error(res.data?.message || 'Failed to post order. Check inventory & voucher validity.');
                return false;
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while posting.');
            return false;
        } finally {
            setPostingOrder(null);
        }
    };

    // Bulk Post Handler (for Selected or All)
    const handleBulkPost = async (targetOrderNumbers: string[]) => {
        if (targetOrderNumbers.length === 0) {
            toast.info("No orders selected for posting.");
            return;
        }

        setIsPostingSelected(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/bulk-post`, {
                method: 'POST',
                body: JSON.stringify({ orderNumbers: targetOrderNumbers }),
            });

            const payload = res.data?.data || res.data;
            if (res.ok && (res.data?.status || payload?.status) && payload) {
                const summary = payload.summary || {
                    total: payload.total || targetOrderNumbers.length,
                    posted: payload.successCount ?? payload.posted ?? 0,
                    failed: payload.failedCount ?? payload.failed ?? 0,
                };
                const results = payload.results || [];
                const formattedData = { summary, results };
                setBulkResults(formattedData);
                setIsBulkResultsModalOpen(true);

                // Update orders in local state
                const successfulOrderNumbers = new Set(
                    results.filter((r: any) => r.success || r.status === 'success').map((r: any) => r.orderNumber)
                );

                setOrders(prev => prev.map(o => {
                    if (successfulOrderNumbers.has(o.orderNumber)) {
                        const result = results.find((r: any) => r.orderNumber === o.orderNumber);
                        return {
                            ...o,
                            status: 'posted',
                            salesOrderId: result?.salesOrderId || result?.data?.id || o.salesOrderId
                        };
                    }
                    return o;
                }));

                // Deselect successfully posted orders
                setSelectedOrderNumbers(prev => {
                    const next = new Set(prev);
                    successfulOrderNumbers.forEach(num => next.delete(num as string));
                    return next;
                });

                if (summary.posted > 0) {
                    toast.success(`Batch completed: ${summary.posted} orders posted successfully!`);
                }
                if (summary.failed > 0) {
                    toast.warning(`${summary.failed} orders could not be posted. Inspect results for details.`);
                }
            } else {
                toast.error(res.data?.message || payload?.message || "Failed to process bulk posting.");
            }
        } catch (error: any) {
            console.error("Bulk post error", error);
            toast.error(error.message || "Failed to process bulk posting.");
        } finally {
            setIsPostingSelected(false);
            setIsPostingAll(false);
        }
    };

    const handlePostSelected = () => {
        const unpostedSelected = selectedOrdersList
            .filter(o => o.status !== 'posted')
            .map(o => o.orderNumber);
        
        if (unpostedSelected.length === 0) {
            toast.info("All selected orders are already posted.");
            return;
        }
        handleBulkPost(unpostedSelected);
    };

    const handlePostAllPending = () => {
        const unposted = orders.filter(o => o.status !== 'posted').map(o => o.orderNumber);
        if (unposted.length === 0) {
            toast.info("No pending orders found.");
            return;
        }
        setIsPostingAll(true);
        handleBulkPost(unposted);
    };

    // Print Receipt for an already posted order
    const handlePrintReceipt = async (order: GroupedOrder) => {
        if (order.salesOrderId) {
            try {
                const res = await authFetch(`/pos-sales/orders/${order.salesOrderId}`);
                if (res.ok && res.data?.status && res.data?.data) {
                    setPrintOrderData({
                        ...res.data.data,
                        shippingCharges: order.financials?.shippingCharges ?? res.data.data?.shippingCharges ?? 0,
                    });
                    setIsPrintModalOpen(true);
                    return;
                }
            } catch (e) {}
        }

        // Fallback to minimal receipt formatting if direct salesOrder fetch fails
        setPrintOrderData({
            orderNumber: order.orderNumber,
            totalAmount: order.financials.netGrandTotal,
            subtotal: order.financials.grossSubtotal,
            discount: order.financials.itemDiscounts,
            items: order.items,
            tenders: [{ paymentMethod: order.paymentMethod, amount: order.financials.remainingPayable }],
            createdAt: order.orderedAt || new Date().toISOString(),
            shippingCharges: order.financials.shippingCharges || 0,
        });
        setIsPrintModalOpen(true);
    };

    // Delete single order
    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/order/${orderToDelete}`, {
                method: 'DELETE',
            });
            if (res.ok && res.data?.status) {
                toast.success(`Order ${orderToDelete} deleted successfully.`);
                setOrders(prev => prev.filter(o => o.orderNumber !== orderToDelete));
                setSelectedOrderNumbers(prev => {
                    const next = new Set(prev);
                    next.delete(orderToDelete);
                    return next;
                });
                if (viewItemsOrder?.orderNumber === orderToDelete) {
                    setViewItemsOrder(null);
                }
            } else {
                toast.error(res.data?.message || 'Failed to delete order.');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while deleting.');
        } finally {
            setIsDeleting(false);
            setOrderToDelete(null);
        }
    };

    // Edit Order Handlers
    const handleEditOrder = (order: GroupedOrder) => {
        setOrderToEdit(order);
        setIsEditModalOpen(true);
    };

    const handleOrderUpdated = (updatedOrder: any) => {
        const gross = Number(
            updatedOrder.financials?.grossSubtotal ??
            updatedOrder.grossSubtotal ??
            updatedOrder.items?.reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0) ??
            0
        );

        let itemDiscounts = Number(updatedOrder.financials?.itemDiscounts ?? updatedOrder.totalDiscount ?? 0);
        if (!itemDiscounts && updatedOrder.items) {
            itemDiscounts = updatedOrder.items.reduce((s: number, i: any) => {
                const p = Number(i.price || 0);
                const q = Number(i.qty || 1);
                const pct = Number(i.skuActualDiscount || i.skuDiscounted || 0);
                return s + (p * q * (pct / 100));
            }, 0);
        }

        const discountPercent = gross > 0
            ? Number(updatedOrder.financials?.discountPercent ?? Math.round((itemDiscounts / gross) * 100))
            : 0;

        const voucherDeduction = Number(updatedOrder.financials?.voucherDeduction ?? updatedOrder.voucherRedeemed ?? 0);
        const shippingCharges = Number(updatedOrder.financials?.shippingCharges ?? updatedOrder.shippingCharges ?? 0);
        const netGrandTotal = Number(updatedOrder.financials?.netGrandTotal ?? updatedOrder.orderTotal ?? (gross - itemDiscounts + shippingCharges - voucherDeduction));
        const remainingPayable = Number(updatedOrder.financials?.remainingPayable ?? updatedOrder.payableAfterVoucher ?? netGrandTotal);
        const totalUnits = Number(updatedOrder.financials?.totalUnits ?? updatedOrder.items?.reduce((s: number, i: any) => s + Number(i.qty || 1), 0) ?? 0);

        const formatted: GroupedOrder = {
            ...updatedOrder,
            id: updatedOrder.orderNumber,
            financials: {
                grossSubtotal: gross,
                itemDiscounts,
                discountPercent,
                voucherDeduction,
                shippingCharges,
                netGrandTotal,
                remainingPayable,
                totalUnits,
            },
            allStockAvailable: updatedOrder.allStockAvailable ?? true,
        };

        setOrders(prev => prev.map(o => o.orderNumber === formatted.orderNumber ? formatted : o));
        if (viewItemsOrder?.orderNumber === formatted.orderNumber) {
            setViewItemsOrder(formatted);
        }
    };

    // 1-Click Fast Inline Confirmation Handler (No modal or typing needed)
    const handleFastInlineConfirm = async (orderNumber: string, status: string) => {
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/order/${orderNumber}/confirmation`, {
                method: 'PUT',
                body: JSON.stringify({
                    confirmationStatus: status,
                    notes: `Updated via 1-click action to ${status}`,
                }),
            });

            if (res.ok && res.data?.status) {
                toast.success(`Order #${orderNumber} marked as ${status}!`);
                setOrders(prev => prev.map(o => {
                    if (o.orderNumber === orderNumber) {
                        return {
                            ...o,
                            confirmationStatus: status,
                        };
                    }
                    return o;
                }));
            } else {
                toast.error(res.data?.message || 'Failed to update confirmation status');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error updating order status');
        }
    };

    // Bulk Confirmation Handler (Confirms multiple selected orders at once)
    const handleBulkConfirmSelected = async () => {
        const list = Array.from(selectedOrderNumbers);
        if (list.length === 0) return;
        setIsBulkConfirming(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/bulk-confirm`, {
                method: 'POST',
                body: JSON.stringify({
                    orderNumbers: list,
                    confirmationStatus: 'CONFIRMED',
                }),
            });

            if (res.ok && res.data?.status) {
                toast.success(`Marked ${list.length} orders as CONFIRMED!`);
                setOrders(prev => prev.map(o => {
                    if (selectedOrderNumbers.has(o.orderNumber)) {
                        return { ...o, confirmationStatus: 'CONFIRMED' };
                    }
                    return o;
                }));
            } else {
                toast.error(res.data?.message || 'Failed to bulk confirm orders');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error occurred during bulk confirm');
        } finally {
            setIsBulkConfirming(false);
        }
    };

    // Bulk Call Back Handler
    const handleBulkCallBackSelected = async () => {
        const list = Array.from(selectedOrderNumbers);
        if (list.length === 0) return;
        setIsBulkConfirming(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/bulk-confirm`, {
                method: 'POST',
                body: JSON.stringify({
                    orderNumbers: list,
                    confirmationStatus: 'CALL_BACK',
                }),
            });

            if (res.ok && res.data?.status) {
                toast.success(`Marked ${list.length} orders as CALL BACK!`);
                setOrders(prev => prev.map(o => {
                    if (selectedOrderNumbers.has(o.orderNumber)) {
                        return { ...o, confirmationStatus: 'CALL_BACK' };
                    }
                    return o;
                }));
            } else {
                toast.error(res.data?.message || 'Failed to bulk update orders');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error occurred during bulk update');
        } finally {
            setIsBulkConfirming(false);
        }
    };

    // Define table columns
    const columns = useMemo<ColumnDef<GroupedOrder>[]>(() => [
        {
            id: "select",
            header: ({ table }) => {
                const unpostedRows = table.getRowModel().rows.filter(r => r.original.status !== 'posted');
                const isAllSelected = unpostedRows.length > 0 && unpostedRows.every(r => selectedOrderNumbers.has(r.original.orderNumber));
                const isSomeSelected = unpostedRows.some(r => selectedOrderNumbers.has(r.original.orderNumber));

                return (
                    <div className="flex items-center justify-center px-1">
                        <Checkbox
                            checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                            disabled={unpostedRows.length === 0}
                            onCheckedChange={(checked) => {
                                setSelectedOrderNumbers(prev => {
                                    const next = new Set(prev);
                                    if (checked) {
                                        unpostedRows.forEach(r => next.add(r.original.orderNumber));
                                    } else {
                                        unpostedRows.forEach(r => next.delete(r.original.orderNumber));
                                    }
                                    return next;
                                });
                            }}
                            aria-label="Select all unposted"
                            className="cursor-pointer"
                        />
                    </div>
                );
            },
            cell: ({ row }) => {
                const isPosted = row.original.status === 'posted';
                const isSelected = selectedOrderNumbers.has(row.original.orderNumber);

                return (
                    <div className="flex items-center justify-center px-1">
                        <Checkbox
                            checked={isSelected}
                            disabled={isPosted}
                            onCheckedChange={(checked) => {
                                setSelectedOrderNumbers(prev => {
                                    const next = new Set(prev);
                                    if (checked) {
                                        next.add(row.original.orderNumber);
                                    } else {
                                        next.delete(row.original.orderNumber);
                                    }
                                    return next;
                                });
                            }}
                            aria-label={`Select ${row.original.orderNumber}`}
                            className={isPosted ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                        />
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
            size: 40,
        },
        {
            header: "Order & Channel",
            accessorKey: "orderNumber",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div className="flex flex-col gap-1 min-w-[140px]">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            <HighlightText text={order.orderNumber} />
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium bg-muted text-muted-foreground border">
                                {order.marketplace || order.channel || 'Online'}
                            </Badge>
                            {order.trackingNumber && (
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]" title={order.trackingNumber}>
                                    TRK: {order.trackingNumber}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            header: "Date",
            accessorKey: "orderedAt",
            cell: ({ row }) => {
                const date = row.original.orderedAt ? new Date(row.original.orderedAt) : null;
                return (
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {date ? format(date, 'MMM dd, yyyy') : '—'}
                    </div>
                );
            },
        },
        {
            header: "Customer",
            accessorKey: "customerName",
            cell: ({ row }) => {
                const order = row.original;
                const phone = (order.phone || order.items?.[0]?.phone || '').replace(/[^0-9+]/g, '');
                const cleanPhone = phone.startsWith('0') ? '92' + phone.substring(1) : phone.replace('+', '');
                const totalAmount = order.financials?.netGrandTotal ?? order.orderTotal ?? 0;
                const whatsappGreeting = encodeURIComponent(
                    `Assalam-o-Alaikum ${order.customerName || 'Customer'}, regarding your Order #${order.orderNumber} (Rs ${totalAmount.toLocaleString()}) from Speed Limit. Please confirm if we can dispatch your parcel?`
                );

                return (
                    <div className="flex flex-col text-xs max-w-[170px] gap-0.5">
                        <span className="font-semibold text-foreground truncate">
                            <HighlightText text={order.customerName || 'Walk-in / Online'} />
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground truncate">
                            <span>{order.city || '—'}</span>
                            {order.phone && <span>• {order.phone}</span>}
                        </div>
                        {phone && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                                <a
                                    href={`tel:${phone}`}
                                    className="p-1 rounded bg-muted/60 hover:bg-emerald-50 hover:text-emerald-600 text-muted-foreground transition inline-flex items-center gap-1 text-[10px]"
                                    title="Call Customer"
                                >
                                    <Phone className="h-3 w-3" />
                                </a>
                                <a
                                    href={`https://wa.me/${cleanPhone}?text=${whatsappGreeting}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-muted/60 hover:bg-emerald-50 hover:text-emerald-600 text-muted-foreground transition inline-flex items-center gap-1 text-[10px]"
                                    title="WhatsApp Customer"
                                >
                                    <MessageCircle className="h-3 w-3 text-emerald-600" />
                                </a>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Verification",
            accessorKey: "confirmationStatus",
            cell: ({ row }) => {
                const order = row.original;
                const confStatus = order.confirmationStatus || 'NEEDS_CONFIRMATION';

                let badge = null;
                if (confStatus === 'CONFIRMED') {
                    badge = (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Confirmed
                        </Badge>
                    );
                } else if (confStatus === 'CALL_BACK') {
                    badge = (
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 text-[10px] font-semibold gap-1">
                            <Clock className="h-3 w-3" /> Call Back
                        </Badge>
                    );
                } else if (confStatus === 'CANCELLED') {
                    badge = (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-semibold gap-1">
                            <X className="h-3 w-3" /> Cancelled
                        </Badge>
                    );
                } else {
                    badge = (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-semibold gap-1">
                            <PhoneCall className="h-3 w-3 text-amber-600" /> Awaiting Call
                        </Badge>
                    );
                }

                const isConfirmed = order.confirmationStatus === 'CONFIRMED';
                const isCallBack = order.confirmationStatus === 'CALL_BACK';

                return (
                    <div className="flex flex-col gap-1.5 items-start min-w-[130px]">
                        {badge}
                        {order.status !== 'posted' && (
                            <div className="flex items-center gap-1 mt-0.5">
                                {/* 1-Click Fast Confirm */}
                                <button
                                    type="button"
                                    disabled={isConfirmed}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await handleFastInlineConfirm(order.orderNumber, 'CONFIRMED');
                                    }}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                                        isConfirmed
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                                    }`}
                                    title="1-Click Confirm (No typing required)"
                                >
                                    <Check className="h-2.5 w-2.5" />
                                    <span>Confirm</span>
                                </button>

                                {/* 1-Click Fast Call Back */}
                                <button
                                    type="button"
                                    disabled={isCallBack}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await handleFastInlineConfirm(order.orderNumber, 'CALL_BACK');
                                    }}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                                        isCallBack
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                                    }`}
                                    title="1-Click Call Back"
                                >
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>Call</span>
                                </button>

                                {/* Optional Note Modal Trigger */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOrderToConfirm(order);
                                        setIsConfirmModalOpen(true);
                                    }}
                                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium cursor-pointer p-0.5"
                                    title="Open Detailed Call Log Dialog"
                                >
                                    <Pencil className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Items & Inventory",
            accessorKey: "items",
            cell: ({ row }) => {
                const order = row.original;
                const itemCount = order.items?.length || 0;
                const totalUnits = order.financials.totalUnits;
                const isAllStock = order.allStockAvailable;
                const hasLocal = order.hasLocalStock;
                const reqSourcing = order.requiresSourcing;

                return (
                    <div className="flex flex-col gap-1.5 min-w-[170px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-foreground">
                                {itemCount} {itemCount === 1 ? 'item' : 'items'} ({totalUnits} pcs)
                            </span>
                            {order.status !== 'posted' && (
                                hasLocal ? (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 px-1.5 py-0 flex items-center gap-0.5 font-medium">
                                        <CheckCircle2 className="h-3 w-3" /> In Stock (Local)
                                    </Badge>
                                ) : isAllStock ? (
                                    <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 px-1.5 py-0 flex items-center gap-0.5 font-medium">
                                        <CheckCircle2 className="h-3 w-3" /> In Network Stock
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0 flex items-center gap-0.5 font-medium">
                                        <AlertTriangle className="h-3 w-3" /> Out of Stock
                                    </Badge>
                                )
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {order.items?.slice(0, 2).map((item, idx) => (
                                <span
                                    key={idx}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap font-mono ${
                                        item.stock && !item.stock.isAvailable
                                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                            : item.stock?.requiresSourcing
                                            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
                                            : 'bg-muted/60 text-muted-foreground border-border/60'
                                    }`}
                                    title={`${item.sku} - Company Stock: ${item.stock?.companyAvailable ?? item.stock?.available ?? 'N/A'} (Local: ${item.stock?.localAvailable ?? 0})`}
                                >
                                    {item.sku}
                                </span>
                            ))}
                            {itemCount > 2 && (
                                <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                                    +{itemCount - 2} more
                                </span>
                            )}
                        </div>

                        {/* Route Stock Trigger Button */}
                        {order.status !== 'posted' && (!hasLocal || !isAllStock) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setOrderToSource(order);
                                    setIsSourcingModalOpen(true);
                                }}
                                className="h-6 text-[10px] px-2 text-sky-700 border-sky-300 bg-sky-50/50 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 gap-1 w-fit mt-0.5 font-medium cursor-pointer"
                                title="Locate items across company warehouses & outlets"
                            >
                                <Layers className="h-3 w-3" /> View & Route Stock
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Voucher / Promo",
            accessorKey: "voucherInfo",
            cell: ({ row }) => {
                const voucher = row.original.voucherInfo;
                if (!voucher || !voucher.code) {
                    return <span className="text-xs text-muted-foreground">—</span>;
                }

                if (voucher.isValid) {
                    return (
                        <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-mono font-medium gap-1 px-1.5 py-0.5">
                                <Tag className="h-3 w-3" /> {voucher.code}
                            </Badge>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                -Rs {row.original.financials.voucherDeduction.toLocaleString()}
                            </span>
                        </div>
                    );
                } else {
                    return (
                        <div className="flex flex-col gap-0.5" title={voucher.reason}>
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-[11px] font-mono gap-1 px-1.5 py-0.5">
                                <AlertCircle className="h-3 w-3" /> {voucher.code}
                            </Badge>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium truncate max-w-[130px]">
                                {voucher.reason || 'Invalid voucher'}
                            </span>
                        </div>
                    );
                }
            },
        },
        {
            header: "Financial Breakdown",
            accessorKey: "financials",
            cell: ({ row }) => {
                const fin = row.original.financials;
                return (
                    <div className="flex flex-col text-xs min-w-[130px]">
                        <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                            <span>Gross:</span>
                            <span>Rs {fin.grossSubtotal.toLocaleString()}</span>
                        </div>
                        {fin.itemDiscounts > 0 && (
                            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 text-[11px]">
                                <span>Disc{fin.discountPercent && fin.discountPercent > 0 ? ` (${fin.discountPercent}%)` : ''}:</span>
                                <span>-Rs {fin.itemDiscounts.toLocaleString()}</span>
                            </div>
                        )}
                        {fin.voucherDeduction > 0 && (
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 text-[11px]">
                                <span>Voucher:</span>
                                <span>-Rs {fin.voucherDeduction.toLocaleString()}</span>
                            </div>
                        )}
                        {fin.shippingCharges > 0 && (
                            <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                                <span>Ship:</span>
                                <span>+Rs {fin.shippingCharges.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center font-bold text-foreground text-sm border-t border-border/50 pt-0.5 mt-0.5">
                            <span>Total:</span>
                            <span className="text-primary">Rs {fin.netGrandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            header: "Tender / Pay Mode",
            accessorKey: "paymentMethod",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div className="flex flex-col text-xs gap-0.5">
                        <Badge variant="outline" className="w-fit text-[11px] font-medium bg-muted/40">
                            {order.paymentMethod || 'COD'}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                            Collect: <strong className="text-foreground font-semibold">Rs {order.financials.remainingPayable.toLocaleString()}</strong>
                        </span>
                    </div>
                );
            },
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: ({ row }) => {
                const order = row.original;
                const isPosted = order.status === 'posted';

                if (isPosted) {
                    return (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1 font-semibold px-2 py-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Posted
                        </Badge>
                    );
                }

                if (!order.allStockAvailable) {
                    return (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 gap-1 font-medium px-2 py-0.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Out of Stock
                        </Badge>
                    );
                }

                if (order.requiresSourcing) {
                    return (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 gap-1 font-medium px-2 py-0.5">
                            <PackageCheck className="h-3.5 w-3.5 text-sky-600" /> In Network
                        </Badge>
                    );
                }

                return (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1 font-medium px-2 py-0.5">
                        <PackageCheck className="h-3.5 w-3.5 text-emerald-600" /> In Stock
                    </Badge>
                );
            }
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const order = row.original;
                const isPosted = order.status === 'posted';
                const isCurrentlyPosting = postingOrder === order.orderNumber;
                const isCancelled = order.confirmationStatus === 'CANCELLED';

                return (
                    <div className="flex items-center gap-1">
                        {/* Call / Confirm Dialog */}
                        {!isPosted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => {
                                    setOrderToConfirm(order);
                                    setIsConfirmModalOpen(true);
                                }}
                                title="Customer Confirmation & Call Log"
                            >
                                <PhoneCall className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Multi-Location Inventory Sourcing & Transfer Routing */}
                        {!isPosted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-primary/80 hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                    setOrderToSource(order);
                                    setIsSourcingModalOpen(true);
                                }}
                                title="Locate Barcodes across Stores & 1-Click Transfer"
                            >
                                <Layers className="h-4 w-4" />
                            </Button>
                        )}

                        {/* View Items & Ledger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={() => setViewItemsOrder(order)}
                            title="View Order Details & Financial Audit"
                        >
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>

                        {/* Edit unposted order */}
                        {!isPosted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-primary/80 hover:text-primary"
                                onClick={() => handleEditOrder(order)}
                                title="Edit Order, Vouchers, & Items"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Print Receipt if posted */}
                        {isPosted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handlePrintReceipt(order)}
                                title="Print POS Receipt"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Post Order */}
                        {!isPosted ? (
                            <Button
                                size="sm"
                                onClick={() => handlePostOrder(order.orderNumber)}
                                disabled={isCurrentlyPosting || isPostingSelected || isPostingAll || isCancelled}
                                className={`h-8 px-2.5 font-medium text-xs shadow-xs ${
                                    isCancelled
                                        ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                                title={
                                    isCancelled
                                        ? "Order cancelled by customer"
                                        : !order.allStockAvailable
                                        ? "Warning: Inventory is below ordered quantity"
                                        : "Post Order to POS Sales"
                                }
                            >
                                {isCurrentlyPosting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5 mr-1" /> Post
                                    </>
                                )}
                            </Button>
                        ) : null}

                        {/* Delete unposted order */}
                        {!isPosted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setOrderToDelete(order.orderNumber)}
                                title="Delete Unposted Order"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ], [selectedOrderNumbers, postingOrder, isPostingSelected, isPostingAll]);

    const unpostedCount = metrics.pending;

    return (
        <div className="w-full space-y-6">
            {/* Top Sub-Navigation across modules */}
            <OnlineOrderNav counts={{
                totalOrders: orders.length,
                needsConfirmation: metrics.needsConfirmation,
                stockShortage: metrics.stockWarning,
            }} />

            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ShoppingBag className="h-7 w-7 text-primary" /> Online Order Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Audit step-by-step financials, validate coupon/voucher balances, and batch-post marketplace orders into POS Sales.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrders(true)}
                        disabled={refreshing || loading}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="gap-1.5"
                    >
                        <Upload className="h-4 w-4 text-primary" /> Bulk Upload Orders
                    </Button>

                    <Button
                        size="sm"
                        onClick={handlePostAllPending}
                        disabled={isPostingAll || isPostingSelected || unpostedCount === 0 || loading}
                        className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                    >
                        {isPostingAll ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4 fill-white" />
                        )}
                        {isPostingAll ? 'Posting All...' : `Post All Pending (${unpostedCount})`}
                    </Button>
                </div>
            </div>

            {/* KPI Executive Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-medium">Total Orders</span>
                            <Layers className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-foreground">{metrics.total}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">Imported portfolio</span>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                            <span className="text-xs font-medium">Awaiting Call</span>
                            <PhoneCall className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{metrics.needsConfirmation}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">Needs confirmation</span>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                            <span className="text-xs font-medium">Confirmed</span>
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{metrics.confirmed}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">Ready for fulfillment</span>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1">
                            <span className="text-xs font-medium">In Network (Sourcing)</span>
                            <Layers className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">{metrics.sourcingNeeded}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">Available in company stock</span>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                            <span className="text-xs font-medium">Out of Stock</span>
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{metrics.stockWarning}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">0 available enterprise-wide</span>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                            <span className="text-xs font-medium">Ready to Post</span>
                            <PackageCheck className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{metrics.ready}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">Confirmed & available</span>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60 shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-medium">Posted</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-foreground">{metrics.posted}</div>
                        <span className="text-[11px] text-muted-foreground mt-1">Invoiced into POS</span>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs & Floating Selection Action Bar */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-1.5 rounded-xl border border-border/60">
                    <div className="flex items-center gap-1 flex-wrap">
                        <Button
                            variant={activeTab === 'all' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('all')}
                            className="text-xs h-8 rounded-lg"
                        >
                            All ({orders.length})
                        </Button>
                        <Button
                            variant={activeTab === 'needs_confirmation' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('needs_confirmation')}
                            className="text-xs h-8 rounded-lg text-amber-700 dark:text-amber-400"
                        >
                            Needs Call ({metrics.needsConfirmation})
                        </Button>
                        <Button
                            variant={activeTab === 'confirmed' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('confirmed')}
                            className="text-xs h-8 rounded-lg text-blue-700 dark:text-blue-400"
                        >
                            Confirmed ({metrics.confirmed})
                        </Button>
                        <Button
                            variant={activeTab === 'ready' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('ready')}
                            className="text-xs h-8 rounded-lg text-emerald-700 dark:text-emerald-400"
                        >
                            Ready to Post ({metrics.ready})
                        </Button>
                        <Button
                            variant={activeTab === 'sourcing' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('sourcing')}
                            className="text-xs h-8 rounded-lg text-sky-700 dark:text-sky-400"
                        >
                            In Network ({metrics.sourcingNeeded})
                        </Button>
                        <Button
                            variant={activeTab === 'stock_warning' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('stock_warning')}
                            className="text-xs h-8 rounded-lg text-rose-700 dark:text-rose-400"
                        >
                            Out of Stock ({metrics.stockWarning})
                        </Button>
                        <Button
                            variant={activeTab === 'with_vouchers' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('with_vouchers')}
                            className="text-xs h-8 rounded-lg"
                        >
                            With Vouchers ({metrics.withVouchers})
                        </Button>
                        <Button
                            variant={activeTab === 'posted' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('posted')}
                            className="text-xs h-8 rounded-lg"
                        >
                            Posted ({metrics.posted})
                        </Button>
                        {metrics.cancelled > 0 && (
                            <Button
                                variant={activeTab === 'cancelled' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('cancelled')}
                                className="text-xs h-8 rounded-lg text-muted-foreground"
                            >
                                Cancelled ({metrics.cancelled})
                            </Button>
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground px-2">
                        Showing {filteredOrders.length} of {orders.length} orders
                    </div>
                </div>

                {/* Floating Selection Bar */}
                {selectedOrderNumbers.size > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/10 border border-primary/25 rounded-xl p-3 px-4 shadow-sm animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-primary text-primary-foreground font-bold px-2.5 py-1">
                                {selectedOrderNumbers.size} Orders Selected
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                                Total Payable: <strong className="text-primary font-bold">Rs {selectedTotalAmount.toLocaleString()}</strong>
                            </span>
                            {selectedOutOfStockCount > 0 && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-xs gap-1 py-0.5">
                                    <AlertTriangle className="h-3 w-3" /> {selectedOutOfStockCount} order(s) have low stock
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrderNumbers(new Set())}
                                className="text-xs text-muted-foreground hover:text-foreground h-8"
                            >
                                Clear Selection
                            </Button>

                            {/* 1-Click Bulk Confirm */}
                            <Button
                                size="sm"
                                disabled={isBulkConfirming || selectedOrderNumbers.size === 0}
                                onClick={handleBulkConfirmSelected}
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs gap-1.5"
                                title="Confirm all selected orders in 1-click (Zero typing)"
                            >
                                {isBulkConfirming ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>Bulk Confirm ({selectedOrderNumbers.size})</span>
                            </Button>

                            {/* 1-Click Bulk Call Back */}
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isBulkConfirming || selectedOrderNumbers.size === 0}
                                onClick={handleBulkCallBackSelected}
                                className="h-8 text-amber-700 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold text-xs shadow-xs gap-1.5"
                                title="Mark all selected orders as Call Back in 1-click"
                            >
                                <Clock className="h-3.5 w-3.5" />
                                <span>Bulk Call Back</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={handlePostSelected}
                                disabled={isPostingSelected || selectedOrderNumbers.size === 0}
                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs gap-1.5"
                            >
                                {isPostingSelected ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Play className="h-3.5 w-3.5 fill-white" />
                                )}
                                {isPostingSelected ? 'Posting Selected...' : `Post Selected (${selectedOrderNumbers.size})`}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Orders Table */}
            <Card className="border border-border/60 shadow-xs">
                <CardContent className="p-0">
                    {loading && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading online orders & validating stock...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
                            <div className="p-3 bg-muted rounded-full">
                                <PackageOpen className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">No Online Orders Found</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    No imported orders are currently waiting. Use the Bulk Upload button to import an Excel or CSV file.
                                </p>
                            </div>
                            <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2 mt-2">
                                <Upload className="h-4 w-4" /> Bulk Upload Orders
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={filteredOrders}
                            searchFields={[
                                { key: "orderNumber", label: "Order No" },
                                { key: "customerName", label: "Customer" },
                                { key: "city", label: "City" },
                                { key: "phone", label: "Phone" },
                                { key: "paymentMethod", label: "Payment Method" },
                                { key: "trackingNumber", label: "Tracking" },
                            ]}
                            canBulkEdit={false}
                            canBulkDelete={false}
                            canRowDelete={false}
                            canRowEdit={false}
                            tableId="pos-online-orders-master"
                        />
                    )}
                </CardContent>
            </Card>

            {/* Bulk Upload Modal */}
            <OnlineOrderBulkUploadModal
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                uploadId={activeUploadId}
                onUploadIdChange={setActiveUploadId}
                onSuccess={() => fetchOrders(false)}
            />

            {/* Print Receipt Modal */}
            {isPrintModalOpen && printOrderData && (
                <PrintReceipt
                    order={printOrderData}
                    tenders={printOrderData.tenders || []}
                    creditVouchers={printOrderData.creditVouchers || []}
                    onClose={() => {
                        setIsPrintModalOpen(false);
                        setPrintOrderData(null);
                    }}
                />
            )}

            {/* Bulk Post Execution Results Modal */}
            <Dialog open={isBulkResultsModalOpen} onOpenChange={setIsBulkResultsModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <CheckCircle2 className="h-6 w-6 text-blue-600" /> Bulk Posting Execution Report
                        </DialogTitle>
                        <DialogDescription>
                            Summary of sales order creation, voucher redemptions, and inventory updates.
                        </DialogDescription>
                    </DialogHeader>

                    {bulkResults && (
                        <div className="space-y-4 my-2 flex-1 overflow-hidden flex flex-col">
                            {/* Summary stat cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-muted/40 rounded-lg border text-center">
                                    <span className="text-xs text-muted-foreground">Total Processed</span>
                                    <p className="text-2xl font-bold mt-0.5">{bulkResults.summary.total}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Successfully Posted</span>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {bulkResults.summary.posted}
                                    </p>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 text-center">
                                    <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">Failed / Skipped</span>
                                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                        {bulkResults.summary.failed}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed breakdown list */}
                            <div className="flex-1 overflow-hidden flex flex-col border rounded-lg">
                                <div className="bg-muted/60 p-2.5 px-3 border-b text-xs font-semibold text-muted-foreground flex justify-between">
                                    <span>Processed Orders</span>
                                    <span>Status & Outcome</span>
                                </div>
                                <ScrollArea className="flex-1 max-h-[380px]">
                                    <div className="divide-y text-xs">
                                        {bulkResults.results.map((res: any, i) => {
                                            const isSuccess = res.success || res.status === 'success';
                                            const invoiceNo = res.salesOrderNumber || res.salesOrder?.orderNumber || res.data?.orderNumber;
                                            const errMsg = res.error || (res.status === 'failed' && res.message);
                                            const printableOrder = res.salesOrder || res.data;

                                            return (
                                                <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/30 gap-4">
                                                    <div className="space-y-0.5 min-w-0">
                                                        <span className="font-bold text-foreground">{res.orderNumber}</span>
                                                        {invoiceNo && (
                                                            <p className="text-muted-foreground text-[11px]">
                                                                Invoice: <span className="font-mono text-foreground font-semibold">{invoiceNo}</span>
                                                            </p>
                                                        )}
                                                        {errMsg && (
                                                            <p className="text-rose-600 dark:text-rose-400 font-medium text-[11px] break-words">
                                                                {errMsg}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {isSuccess ? (
                                                            <>
                                                                <Badge className="bg-emerald-500 text-white gap-1 text-[11px]">
                                                                    <Check className="h-3 w-3" /> Posted
                                                                </Badge>
                                                                {printableOrder && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 text-xs gap-1"
                                                                        onClick={() => {
                                                                            setPrintOrderData(printableOrder);
                                                                            setIsPrintModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Printer className="h-3 w-3" /> Print
                                                                    </Button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Badge variant="destructive" className="gap-1 text-[11px]">
                                                                <X className="h-3 w-3" /> Failed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button onClick={() => setIsBulkResultsModalOpen(false)} className="w-full sm:w-auto">
                            Close & Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Order Details & Financial Ledger Modal */}
            <Dialog open={!!viewItemsOrder} onOpenChange={(o) => !o && setViewItemsOrder(null)}>
                <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[90vw] md:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden p-5 md:p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <span>Order #{viewItemsOrder?.orderNumber}</span>
                                <Badge variant="outline" className="text-xs bg-muted">
                                    {viewItemsOrder?.marketplace || viewItemsOrder?.channel || 'Online'}
                                </Badge>
                                {viewItemsOrder?.status === 'posted' ? (
                                    <Badge className="bg-emerald-500 text-white text-xs gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Posted
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        Pending Fulfillment
                                    </Badge>
                                )}
                            </DialogTitle>
                        </div>
                        <DialogDescription>
                            Complete order details, step-by-step financial ledger, and real-time inventory validation.
                        </DialogDescription>
                    </DialogHeader>

                    {viewItemsOrder && (
                        <div className="mt-3 flex-1 overflow-hidden flex flex-col gap-4">
                            {/* Top Info Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-muted/20 rounded-xl border text-xs">
                                <div>
                                    <p className="text-muted-foreground font-medium">Customer</p>
                                    <p className="font-semibold text-foreground text-sm mt-0.5">{viewItemsOrder.customerName || 'N/A'}</p>
                                    <p className="text-muted-foreground">{viewItemsOrder.phone || viewItemsOrder.items?.[0]?.phone || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-medium">Delivery Destination</p>
                                    <p className="font-semibold text-foreground mt-0.5">{viewItemsOrder.city || '—'}</p>
                                    <p className="text-muted-foreground truncate" title={viewItemsOrder.address || viewItemsOrder.items?.[0]?.address}>
                                        {viewItemsOrder.address || viewItemsOrder.items?.[0]?.address || 'No address specified'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-medium">Payment & Tracking</p>
                                    <p className="font-semibold text-foreground mt-0.5">{viewItemsOrder.paymentMethod || 'COD'}</p>
                                    <p className="text-muted-foreground font-mono truncate">
                                        TRK: {viewItemsOrder.trackingNumber || 'Pending'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-medium">Order Date</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {viewItemsOrder.orderedAt ? format(new Date(viewItemsOrder.orderedAt), 'PPp') : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Step-by-Step Financial Ledger Card */}
                            <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <DollarSign className="h-4 w-4 text-primary" /> Step-by-Step Financial Breakdown
                                    </h4>
                                    {viewItemsOrder.voucherInfo && (
                                        <Badge
                                            variant="outline"
                                            className={
                                                viewItemsOrder.voucherInfo.isValid
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-mono"
                                                    : "bg-rose-50 text-rose-700 border-rose-300 text-xs font-mono"
                                            }
                                        >
                                            {viewItemsOrder.voucherInfo.isValid ? '✓ Valid Voucher Applied' : '⚠️ Invalid Voucher'}
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground">1. Gross Subtotal</span>
                                        <p className="font-semibold text-foreground text-sm">
                                            Rs {viewItemsOrder.financials.grossSubtotal.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground">2. Line Discounts</span>
                                        <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">
                                            -Rs {viewItemsOrder.financials.itemDiscounts.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground">3. Shipping Charges</span>
                                        <p className="font-semibold text-foreground text-sm">
                                            +Rs {viewItemsOrder.financials.shippingCharges.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground">4. Voucher Applied</span>
                                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                            -Rs {viewItemsOrder.financials.voucherDeduction.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5 bg-primary/10 p-2 rounded-lg border border-primary/20 col-span-2">
                                        <span className="text-primary text-[11px] font-bold">5. Net Grand Total (Payable)</span>
                                        <p className="font-extrabold text-primary text-base">
                                            Rs {viewItemsOrder.financials.netGrandTotal.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {viewItemsOrder.voucherInfo && (
                                    <div className="bg-background/80 p-2.5 rounded-lg border text-xs flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-primary" />
                                            <span className="font-mono font-bold">{viewItemsOrder.voucherInfo.code}</span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {viewItemsOrder.voucherInfo.voucherType || viewItemsOrder.voucherInfo.type}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                (Original Value: Rs {viewItemsOrder.voucherInfo.amount.toLocaleString()})
                                            </span>
                                        </div>
                                        <span className={viewItemsOrder.voucherInfo.isValid ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                                            {viewItemsOrder.voucherInfo.isValid ? "Verified & Balance Deducted" : viewItemsOrder.voucherInfo.reason}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Itemized Table with Inventory Stock Check */}
                            <div className="flex-1 overflow-hidden flex flex-col border rounded-xl">
                                <div className="bg-muted/50 p-2.5 px-4 border-b flex items-center justify-between text-xs font-bold text-muted-foreground">
                                    <span>Order Items & Terminal Stock Verification</span>
                                    <span>{viewItemsOrder.items?.length || 0} Products ({viewItemsOrder.financials.totalUnits} Units)</span>
                                </div>
                                <ScrollArea className="flex-1 max-h-[320px]">
                                    <div className="divide-y text-xs">
                                        {viewItemsOrder.items?.map((item, idx) => {
                                            const isAvailable = item.stock?.isAvailable ?? true;
                                            const availUnits = item.stock?.available ?? 0;

                                            return (
                                                <div key={idx} className="p-3.5 flex items-start justify-between gap-4 hover:bg-muted/20">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <div className="h-10 w-10 shrink-0 bg-muted border rounded-md flex items-center justify-center font-bold text-[10px] text-muted-foreground">
                                                            {item.brand ? item.brand.substring(0, 3).toUpperCase() : 'SKU'}
                                                        </div>
                                                        <div className="space-y-1 min-w-0 flex-1">
                                                            <p className="font-semibold text-foreground text-sm truncate">
                                                                {item.name || item.sku}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                <span className="bg-muted px-1.5 py-0.5 rounded border font-mono">
                                                                    SKU: {item.sku}
                                                                </span>
                                                                {item.systemSku && (
                                                                    <span className="bg-muted px-1.5 py-0.5 rounded border font-mono">
                                                                        Sys SKU: {item.systemSku}
                                                                    </span>
                                                                )}
                                                                {item.barcode && (
                                                                    <span className="bg-muted px-1.5 py-0.5 rounded border font-mono">
                                                                        BC: {item.barcode}
                                                                    </span>
                                                                )}
                                                                {item.size && (
                                                                    <span className="bg-muted px-1.5 py-0.5 rounded border">
                                                                        Size: {item.size}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Dual Stock Badges & Location Breakdown */}
                                                            <div className="pt-1.5 flex flex-col gap-1.5">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {item.stock?.isLocallyAvailable ? (
                                                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 font-medium">
                                                                            <CheckCircle2 className="h-3 w-3" /> Local Store: {item.stock?.localAvailable ?? 0} pcs (Requires {item.qty})
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 gap-1 font-medium">
                                                                            <AlertCircle className="h-3 w-3" /> Local Store: {item.stock?.localAvailable ?? 0} pcs
                                                                        </Badge>
                                                                    )}

                                                                    {item.stock?.isCompanyAvailable ? (
                                                                        <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 gap-1 font-semibold">
                                                                            <CheckCircle2 className="h-3 w-3" /> Company Available Stock: {item.stock?.companyAvailable ?? item.stock?.available ?? 0} pcs
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 gap-1 font-medium">
                                                                            <AlertCircle className="h-3 w-3" /> Out of Stock in Enterprise: {item.stock?.companyAvailable ?? 0} pcs
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                {/* Location Breakdown Table */}
                                                                {item.stock?.locations && item.stock.locations.length > 0 && (
                                                                    <div className="w-full mt-1 p-2 bg-muted/40 rounded-lg border text-[11px] space-y-1">
                                                                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                                                            <Store className="h-3 w-3 text-sky-600" /> Stock Locations across Outlets & Warehouses:
                                                                        </span>
                                                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                                                            {item.stock.locations.slice(0, 4).map((loc: any, lIdx: number) => (
                                                                                <div key={lIdx} className="flex justify-between items-center bg-background/80 px-2 py-0.5 rounded border text-[10px]">
                                                                                    <span className="truncate max-w-[140px]" title={loc.name}>{loc.name}</span>
                                                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{loc.qty} pcs</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        {item.stock.locations.length > 4 && (
                                                                            <p className="text-[10px] text-muted-foreground italic">
                                                                                +{item.stock.locations.length - 4} more stores/warehouses holding stock
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <p className="font-bold text-sm text-foreground">
                                                            Rs {Number(item.price || 0).toLocaleString()} <span className="text-muted-foreground text-xs font-normal">x {item.qty}</span>
                                                        </p>
                                                        <p className="text-muted-foreground text-[11px] mt-0.5">
                                                            Subtotal: Rs {Number(item.lineGross || (Number(item.price || 0) * Number(item.qty || 1))).toLocaleString()}
                                                        </p>
                                                        {(Number(item.discountPercent || item.skuActualDiscount || item.skuDiscounted || 0) > 0) && (
                                                            <>
                                                                <p className="text-rose-600 font-medium text-[11px]">
                                                                    Disc ({Number(item.discountPercent || item.skuActualDiscount || item.skuDiscounted)}%): -Rs {Math.round(Number(item.discountAmount ?? ((Number(item.price || 0) * Number(item.qty || 1)) * (Number(item.discountPercent || item.skuActualDiscount || item.skuDiscounted || 0) / 100)))).toLocaleString()}
                                                                </p>
                                                                <p className="text-emerald-600 font-semibold text-[11px]">
                                                                    Net: Rs {Math.round(Number(item.netTotal ?? ((Number(item.price || 0) * Number(item.qty || 1)) - ((Number(item.price || 0) * Number(item.qty || 1)) * (Number(item.discountPercent || item.skuActualDiscount || item.skuDiscounted || 0) / 100))))).toLocaleString()}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
                        <Button variant="outline" onClick={() => setViewItemsOrder(null)}>
                            Close
                        </Button>

                        <div className="flex items-center gap-2 flex-wrap">
                            {viewItemsOrder && viewItemsOrder.status !== 'posted' && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setOrderToConfirm(viewItemsOrder);
                                        setIsConfirmModalOpen(true);
                                    }}
                                    className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                    <PhoneCall className="h-4 w-4" /> Call / Confirm
                                </Button>
                            )}

                            {viewItemsOrder && viewItemsOrder.status !== 'posted' && !viewItemsOrder.allStockAvailable && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setOrderToSource(viewItemsOrder);
                                        setIsSourcingModalOpen(true);
                                    }}
                                    className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                >
                                    <Layers className="h-4 w-4" /> Locate & Route Stock
                                </Button>
                            )}

                            {viewItemsOrder && viewItemsOrder.status !== 'posted' && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        handleEditOrder(viewItemsOrder);
                                    }}
                                    className="gap-1.5"
                                >
                                    <Pencil className="h-4 w-4 text-primary" /> Edit Order
                                </Button>
                            )}

                            {viewItemsOrder && viewItemsOrder.status !== 'posted' && (
                                <Button
                                    onClick={async () => {
                                        const success = await handlePostOrder(viewItemsOrder.orderNumber);
                                        if (success) {
                                            setViewItemsOrder(null);
                                        }
                                    }}
                                    disabled={postingOrder === viewItemsOrder.orderNumber || viewItemsOrder.confirmationStatus === 'CANCELLED'}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                >
                                    {postingOrder === viewItemsOrder.orderNumber ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    Post Order Now
                                </Button>
                            )}

                            {viewItemsOrder && viewItemsOrder.status === 'posted' && (
                                <Button
                                    variant="outline"
                                    onClick={() => handlePrintReceipt(viewItemsOrder)}
                                    className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                >
                                    <Printer className="h-4 w-4" /> Print Receipt
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Customer Order Confirmation & Call Log Modal */}
            <OrderConfirmationModal
                open={isConfirmModalOpen}
                onOpenChange={setIsConfirmModalOpen}
                order={orderToConfirm}
                onConfirmed={(orderNum, status, notes) => {
                    setOrders(prev => prev.map(o => o.orderNumber === orderNum ? {
                        ...o,
                        confirmationStatus: status,
                        note: notes ? (o.note ? `${o.note}\n${notes}` : notes) : o.note,
                    } : o));
                    if (viewItemsOrder?.orderNumber === orderNum) {
                        setViewItemsOrder(prev => prev ? {
                            ...prev,
                            confirmationStatus: status,
                            note: notes ? (prev.note ? `${prev.note}\n${notes}` : notes) : prev.note,
                        } : null);
                    }
                }}
            />

            {/* Multi-Location Inventory Sourcing & 1-Click Transfer Routing Modal */}
            <InventorySourcingModal
                open={isSourcingModalOpen}
                onOpenChange={setIsSourcingModalOpen}
                order={orderToSource}
                currentLocationId={user?.terminal?.location?.id || (user as any)?.locationId}
                onTransferCreated={(orderNum, transferData) => {
                    toast.info(`Transfer Request ${transferData.requestNo} initiated for Order #${orderNum}`);
                }}
            />

            {/* Edit Online Order Modal */}
            <EditOnlineOrderModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                order={orderToEdit}
                onSuccess={handleOrderUpdated}
            />

            {/* Confirm Delete Order Dialog */}
            <AlertDialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove order <strong>{orderToDelete}</strong> from the online orders queue.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOrder}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Delete Order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
