'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, PackageOpen, Play, Send, Eye, Loader2, CheckCircle2 } from 'lucide-react';
import { OnlineOrderBulkUploadModal } from '@/components/online-orders/online-order-bulk-upload-modal';
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
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

export function OnlineOrderList() {
    const { user } = useAuth();
    const router = useRouter();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [postingOrder, setPostingOrder] = useState<string | null>(null);
    const [isPostingAll, setIsPostingAll] = useState(false);
    
    // For Items Dialog
    const [viewItemsOrder, setViewItemsOrder] = useState<any | null>(null);

    // For Print Dialog
    const [printOrderData, setPrintOrderData] = useState<any>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload`);
            if (res.ok && res.data?.status && res.data?.data) {
                // Map to add 'id' for DataTable
                setOrders(res.data.data.map((o: any) => ({ ...o, id: o.orderNumber })));
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error("Failed to fetch online orders", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user && user.terminal) {
            const isOnline = user.terminal.location?.isOnline;
            if (!isOnline) {
                toast.error("This location is not configured for online orders.");
                router.replace("/pos");
                return;
            }
        }
        fetchOrders();
    }, [user, router]);

    const handlePostOrder = async (orderNumber: string) => {
        setPostingOrder(orderNumber);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/${orderNumber}/post`, {
                method: 'POST'
            });
            
            if (res.ok && res.data?.status) {
                toast.success(`Order ${orderNumber} posted successfully!`);
                setOrders(prev => prev.map(o => 
                    o.orderNumber === orderNumber ? { ...o, status: 'posted' } : o
                ));
                if (res.data.data && !isPostingAll) {
                    setPrintOrderData(res.data.data);
                    setIsPrintModalOpen(true);
                }
                return true;
            } else {
                toast.error(res.data?.message || 'Failed to post order. Check inventory.');
                return false;
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while posting.');
            return false;
        } finally {
            if (!isPostingAll) setPostingOrder(null);
        }
    };

    const handlePostAll = async () => {
        const unposted = orders.filter(o => o.status !== 'posted');
        if (unposted.length === 0) {
            toast.info("No unposted orders found.");
            return;
        }

        setIsPostingAll(true);
        let successCount = 0;
        for (const order of unposted) {
            setPostingOrder(order.orderNumber);
            const success = await handlePostOrder(order.orderNumber);
            if (success) successCount++;
            // Delay for UX to show row-by-row posting
            await new Promise(r => setTimeout(r, 600));
        }
        
        setPostingOrder(null);
        setIsPostingAll(false);
        toast.success(`Posted ${successCount} out of ${unposted.length} orders.`);
    };

    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            header: "Order No",
            accessorKey: "orderNumber",
            cell: ({ row }) => <span className="font-semibold"><HighlightText text={row.original.orderNumber} /></span>,
        },
        {
            header: "SKU",
            accessorKey: "sku",
            cell: ({ row }) => {
                const skus = Array.from(new Set(row.original.items?.map((i: any) => i.sku).filter(Boolean)));
                return (
                    <div className="flex flex-col gap-1">
                        {skus.map((sku: any, idx: number) => (
                            <span key={idx} className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border whitespace-nowrap" title={sku}>
                                {sku}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            header: "Date",
            accessorKey: "orderedAt",
            cell: ({ row }) => row.original.orderedAt ? format(new Date(row.original.orderedAt), 'MMM dd, yyyy') : '—',
        },
        {
            header: "Customer",
            accessorKey: "customerName",
            cell: ({ row }) => <HighlightText text={row.original.customerName || 'Unknown'} />,
        },
        {
            header: "City",
            accessorKey: "city",
            cell: ({ row }) => <HighlightText text={row.original.city || '—'} />,
        },
        {
            header: "Payment Mode",
            accessorKey: "paymentMethod",
            cell: ({ row }) => <span className="text-gray-600">{row.original.paymentMethod || '—'}</span>,
        },
        {
            header: "Total",
            accessorKey: "orderTotal",
            cell: ({ row }) => <span className="font-medium">Rs {row.original.orderTotal?.toLocaleString() || 0}</span>,
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: ({ row }) => {
                const status = row.original.status || 'Received';
                const isPosted = status === 'posted';
                return (
                    <Badge variant="outline" className={isPosted ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {isPosted ? 'Posted' : status}
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
                
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setViewItemsOrder(order)}
                            title="View Items"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        {!isPosted ? (
                            <Button
                                size="sm"
                                onClick={() => handlePostOrder(order.orderNumber)}
                                disabled={isCurrentlyPosting || isPostingAll}
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[90px]"
                            >
                                {isCurrentlyPosting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-1" /> Post
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" disabled className="text-green-600 border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Posted
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ], [postingOrder, isPostingAll]);

    const unpostedCount = orders.filter(o => o.status !== 'posted').length;

    return (
        <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7 px-0">
                <div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Online Orders</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and fulfill your bulk uploaded online orders
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handlePostAll} 
                        disabled={isPostingAll || unpostedCount === 0 || loading}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
                    >
                        {isPostingAll ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        {isPostingAll ? 'Posting...' : `Post All (${unpostedCount})`}
                    </Button>
                    <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 transition-all shadow-md">
                        <Upload className="h-4 w-4" /> Bulk Upload
                    </Button>
                </div>
            </CardHeader>
            
            {isPostingAll && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-800">Posting Orders...</span>
                        <span className="text-sm font-medium text-blue-800">
                            {orders.filter(o => o.status === 'posted').length} / {orders.length}
                        </span>
                    </div>
                    <Progress value={(orders.filter(o => o.status === 'posted').length / orders.length) * 100} className="h-2" />
                </div>
            )}

            <CardContent className="px-0">
                {loading && orders.length === 0 ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={orders}
                        searchFields={[
                            { key: "orderNumber", label: "Order Number" },
                            { key: "customerName", label: "Customer Name" },
                            { key: "city", label: "City" }
                        ]}
                        canBulkEdit={false}
                        canBulkDelete={false}
                        canRowDelete={false}
                        canRowEdit={false}
                        tableId="online-orders-table"
                    />
                )}
            </CardContent>

            <OnlineOrderBulkUploadModal
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                uploadId={activeUploadId}
                onUploadIdChange={setActiveUploadId}
                onSuccess={() => fetchOrders()}
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

            {/* View Items Dialog */}
            <Dialog open={!!viewItemsOrder} onOpenChange={(o) => !o && setViewItemsOrder(null)}>
                <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[90vw] md:max-w-4xl lg:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden p-4 md:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Order Details - {viewItemsOrder?.orderNumber}</span>
                            {viewItemsOrder?.items?.[0]?.itemStatus && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                                    {viewItemsOrder.items[0].itemStatus}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Viewing complete order details
                        </DialogDescription>
                    </DialogHeader>
                    {viewItemsOrder && (
                        <div className="mt-4 flex-1 overflow-hidden flex flex-col gap-4">
                            {/* Order Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg border text-sm">
                                <div>
                                    <p className="text-muted-foreground text-xs">Customer</p>
                                    <p className="font-medium">{viewItemsOrder.customerName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Phone</p>
                                    <p className="font-medium">{viewItemsOrder.items?.[0]?.phone || 'N/A'}</p>
                                </div>
                                <div className="md:col-span-2 overflow-hidden">
                                    <p className="text-muted-foreground text-xs">Email</p>
                                    <p className="font-medium break-all">{viewItemsOrder.items?.[0]?.email || 'N/A'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-muted-foreground text-xs">Address</p>
                                    <p className="font-medium">{viewItemsOrder.items?.[0]?.address || 'N/A'}, {viewItemsOrder.city}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Marketplace / Channel</p>
                                    <p className="font-medium">{viewItemsOrder.items?.[0]?.marketplace || 'N/A'} / {viewItemsOrder.items?.[0]?.channel || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Order Date</p>
                                    <p className="font-medium">
                                        {viewItemsOrder.items?.[0]?.orderedAt ? new Date(viewItemsOrder.items[0].orderedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Payment Method</p>
                                    <p className="font-medium">{viewItemsOrder.items?.[0]?.paymentMethod || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Tracking Number</p>
                                    <p className="font-medium">{viewItemsOrder.items?.[0]?.trackingNumber || 'N/A'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-muted-foreground text-xs">Note</p>
                                    <p className="font-medium">{viewItemsOrder.items?.[0]?.note || 'N/A'}</p>
                                </div>
                            </div>

                            <p className="font-semibold text-sm">Order Items</p>
                            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                {viewItemsOrder.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-start justify-between bg-muted/30 p-3 rounded-lg border shadow-sm gap-3 w-full">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="h-10 w-10 flex-shrink-0 bg-muted/50 border rounded-md flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                                                {item.brand ? item.brand.substring(0, 3).toUpperCase() : 'SKU'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm truncate">{item.name || item.sku || 'Unknown Item'}</p>
                                                <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground mt-1.5">
                                                    <span className="bg-background/80 border px-1.5 py-0.5 rounded break-words">SKU: {item.sku}</span>
                                                    {item.barcode && <span className="bg-background/80 border px-1.5 py-0.5 rounded text-blue-600 break-all">BC: {item.barcode}</span>}
                                                    {item.systemSku && <span className="bg-background/80 border px-1.5 py-0.5 rounded break-words">Sys SKU: {item.systemSku}</span>}
                                                    {item.size && <span className="bg-background/80 border px-1.5 py-0.5 rounded">Size: {item.size}</span>}
                                                    {item.couponCode && <span className="bg-background/80 border px-1.5 py-0.5 rounded text-green-600 font-medium">Coupon: {item.couponCode}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 whitespace-nowrap pt-0.5">
                                            <p className="font-bold text-sm">Rs {Number(item.price || 0).toLocaleString()} <span className="text-muted-foreground font-medium text-xs ml-0.5">x {item.qty}</span></p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">SubTotal: Rs {Number(item.subTotalPrice || 0).toLocaleString()}</p>
                                            {Number(item.skuDiscounted || 0) > 0 && (
                                                <p className="text-[11px] font-medium text-destructive">Disc: -Rs {Number(item.skuDiscounted).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t flex flex-wrap justify-end gap-6 text-sm bg-muted/10 rounded-b-lg p-4">
                                <div className="text-right">
                                    <p className="text-muted-foreground">Subtotal</p>
                                    <p className="font-medium">Rs {viewItemsOrder.items?.reduce((sum: number, item: any) => sum + Number(item.subTotalPrice || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-muted-foreground">Shipping</p>
                                    <p className="font-medium">Rs {Number(viewItemsOrder.items?.[0]?.shippingCharges || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-right pl-4 border-l">
                                    <p className="text-muted-foreground">Grand Total</p>
                                    <p className="font-bold text-lg text-primary">Rs {Number(viewItemsOrder.orderTotal || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
