"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Printer, Eye, ArrowLeft, ShoppingCart, BadgeDollarSign, Calendar as CalendarIcon,
} from "lucide-react";

import DataTable from "@/components/common/data-table";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { PrintReceipt } from "@/components/pos/print-receipt";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth";

function fmtCurrency(val: number) {
    return val.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalesHistoryPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rowCount, setRowCount] = useState(0);
    const [pageCount, setPageCount] = useState(0);

    // Filters & Pagination State
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 100,
    });

    // Modals
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showPrint, setShowPrint] = useState(false);

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authFetch("/pos-sales/orders", {
                params: {
                    page: pagination.pageIndex + 1,
                    limit: pagination.pageSize,
                    search: search.trim() || undefined,
                    startDate: dateRange.from?.toISOString(),
                    endDate: dateRange.to?.toISOString(),
                }
            });
            if (res.ok && res.data?.status) {
                setOrders(res.data.data || []);
                setRowCount(res.data.meta?.total || 0);
                setPageCount(res.data.meta?.totalPages || 0);
            }
        } catch (error) {
            toast.error("Failed to load sales history");
        } finally {
            setIsLoading(false);
        }
    }, [pagination.pageIndex, pagination.pageSize, search, dateRange]);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [search, dateRange]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: "orderNumber",
            header: "Order #",
            cell: ({ row }) => (
                <span className="font-mono font-bold text-primary">{row.getValue("orderNumber")}</span>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Date & Time",
            cell: ({ row }) => {
                const date = new Date(row.getValue("createdAt"));
                return (
                    <div className="text-sm">
                        {date.toLocaleDateString()}
                        <div className="text-[10px] text-muted-foreground">
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                );
            },
        },
        {
            id: "customer",
            header: "Customer",
            cell: () => <span className="text-sm italic text-muted-foreground">Walking Customer</span>,
        },
        {
            id: "itemsCount",
            header: () => <div className="text-right">Items</div>,
            cell: ({ row }) => <div className="text-right">{row.original.items?.length || 0}</div>,
        },
        {
            accessorKey: "grandTotal",
            header: () => <div className="text-right">Total</div>,
            cell: ({ row }) => (
                <div className="text-right font-bold">
                    Rs. {fmtCurrency(row.getValue("grandTotal"))}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return (
                    <Badge variant={
                        status === "completed" ? "default" :
                            status === "voided" ? "destructive" : "secondary"
                    } className="capitalize text-[10px] px-1.5 py-0 h-5">
                        {status}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50"
                        onClick={() => { setSelectedOrder(row.original); setShowDetails(true); }}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-primary hover:bg-primary/5"
                        onClick={() => { setSelectedOrder(row.original); setShowPrint(true); }}
                    >
                        <Printer className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ], []);

    return (
        <div className="flex flex-col h-full bg-[#1e2124] text-white overflow-hidden">
            {/* Custom Styles to target DataTable internals to match screenshot */}
            {/* <style dangerouslySetInnerHTML={{
                __html: `
                #pos-sales-history-card .rounded-md { border-radius: 24px !important; }
                #pos-sales-history-card input { border-radius: 9999px !important; background-color: #f3f4f6 !important; border: none !important; }
                #pos-sales-history-card button[aria-haspopup="menu"] { border-radius: 12px !important; border-color: #e5e7eb !important; }
                #pos-sales-history-card table thead tr { background-color: #71717a !important; }
                #pos-sales-history-card table thead th { color: #ffffff !important; font-weight: 600 !important; text-transform: uppercase !important; font-size: 0.75rem !important; }
                #pos-sales-history-card .flex.items-center.justify-between.gap-8 button { border-radius: 9999px !important; width: 32px !important; height: 32px !important; padding: 0 !important; }
                #pos-sales-history-card .flex.items-center.gap-2.order-3.md\\:order-1 .rounded-md { border-radius: 12px !important; }
                #pos-sales-history-card .bg-card\\/50 { background-color: white !important; }
            `}} /> */}

            {/* Header */}
            <div className="flex items-center justify-between p-6 px-10">
                <div className="flex items-center gap-4">

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
                        <p className="text-slate-400 text-sm">Manage and view all POS transactions.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-[300px]">
                        <DateRangePicker
                            onUpdate={(values) => setDateRange(values.range)}
                            initialDateFrom={dateRange.from}
                            initialDateTo={dateRange.to}
                            placeholder="Filter by date"
                        // className="bg-[#2a2d31] border-none text-slate-300 h-8 rounded-xl"
                        />
                    </div>
                    <Button
                        onClick={() => router.push("/pos/new-sale")}
                    // className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-2xl px-6 h-10 gap-2 font-semibold shadow-lg shadow-purple-500/20"
                    >
                        <ShoppingCart className="h-4 w-4" /> New Sale
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 px-10 overflow-hidden">
                <div id="pos-sales-history-card">
                    <DataTable
                        columns={columns}
                        data={orders}
                        isLoading={isLoading}
                        manualPagination={true}
                        rowCount={rowCount}
                        pageCount={pageCount}
                        onPaginationChange={setPagination}
                        searchFields={[{ key: "orderNumber", label: "Order #" }]}
                        onSearchChange={setSearch}
                        tableId="pos-sales-history"
                    />
                </div>
            </div>

            {/* Order Details Modal */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent showCloseButton={false}>
                    {(() => {
                        const totalPaid = selectedOrder?.tenders?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
                        const balanceDue = Math.max(0, (selectedOrder?.grandTotal || 0) - totalPaid);

                        return (
                            <>
                                <DialogHeader className="p-6 pb-2">
                                    <div className="flex items-center justify-between">
                                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                                            Order Details <Badge variant="outline" className="font-mono text-[10px] font-normal border-primary/20 text-primary">{selectedOrder?.orderNumber}</Badge>
                                        </DialogTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={balanceDue > 0 ? "outline" : "default"} className={cn("uppercase text-[10px] px-2 h-5", balanceDue > 0 ? "border-orange-500 text-orange-500" : "bg-emerald-600")}>
                                                {balanceDue > 0 ? "Partial" : "Fully Paid"}
                                            </Badge>
                                            <Badge variant={selectedOrder?.status === "completed" ? "default" : "destructive"} className="uppercase text-[10px] px-2 h-5">
                                                {selectedOrder?.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1 font-medium">Placed on {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                </DialogHeader>

                                <Separator className="opacity-50" />

                                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {/* Summary Grid - 4 Columns */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-muted/50 px-4 py-3 rounded-xl border border-border/50">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Subtotal</p>
                                            <p className="text-sm font-black tracking-tight">Rs. {fmtCurrency(selectedOrder?.subTotal || 0)}</p>
                                        </div>
                                        <div className="bg-primary/5 px-4 py-3 rounded-xl border border-primary/20">
                                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1.5">Discount</p>
                                            <p className="text-sm font-black tracking-tight text-primary">Rs. {fmtCurrency(selectedOrder?.discountAmount || 0)}</p>
                                        </div>
                                        <div className="bg-primary px-4 py-3 rounded-xl shadow-lg shadow-primary/20">
                                            <p className="text-[9px] font-black text-primary-foreground/70 uppercase tracking-widest mb-1.5">Grand Total</p>
                                            <p className="text-sm font-black tracking-tight text-primary-foreground">Rs. {fmtCurrency(selectedOrder?.grandTotal || 0)}</p>
                                        </div>
                                        <div className={cn("px-4 py-3 rounded-xl border shadow-lg", balanceDue > 0 ? "bg-orange-500/10 border-orange-500/30 text-orange-600" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600")}>
                                            <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-80">{balanceDue > 0 ? "Balance Due" : "Settled"}</p>
                                            <p className="text-sm font-black tracking-tight">Rs. {fmtCurrency(balanceDue)}</p>
                                        </div>
                                    </div>

                                    {/* Discount Sources & Notes */}
                                    {(selectedOrder?.promo || selectedOrder?.coupon || selectedOrder?.alliance || selectedOrder?.notes) && (
                                        <div className="bg-muted/30 rounded-2xl p-4 border border-border/40 space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOrder?.promo && (
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-3 rounded-lg">
                                                        <ShoppingCart className="h-3 w-3" />
                                                        Promo: <span className="font-black">{selectedOrder.promo.name || selectedOrder.promo.code}</span>
                                                    </Badge>
                                                )}
                                                {selectedOrder?.coupon && (
                                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5 py-1 px-3 rounded-lg">
                                                        <BadgeDollarSign className="h-3 w-3" />
                                                        Coupon: <span className="font-black">{selectedOrder.coupon.code}</span>
                                                    </Badge>
                                                )}
                                                {selectedOrder?.alliance && (
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 py-1 px-3 rounded-lg">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        Alliance: <span className="font-black">{selectedOrder.alliance.partnerName}</span>
                                                    </Badge>
                                                )}
                                            </div>
                                            {selectedOrder?.notes && (
                                                <div className="text-[11px] text-muted-foreground bg-background/50 p-2.5 rounded-xl border border-border/30 italic">
                                                    "{selectedOrder.notes}"
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Items Breakdown */}
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground/70">
                                            <ShoppingCart className="h-4 w-4 text-muted-foreground" /> Items Breakdown
                                        </h3>
                                        <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm bg-background">
                                            <Table>
                                                <TableHeader className="bg-muted/40 hover:bg-muted/40 border-b border-border/40">
                                                    <TableRow className="h-10 hover:bg-transparent">
                                                        <TableHead className="text-[10px] font-bold uppercase text-muted-foreground px-4">Item</TableHead>
                                                        <TableHead className="text-right text-[10px] font-bold uppercase text-muted-foreground">Qty</TableHead>
                                                        <TableHead className="text-right text-[10px] font-bold uppercase text-muted-foreground">Price</TableHead>
                                                        <TableHead className="text-right text-[10px] font-bold uppercase text-muted-foreground pr-4">Subtotal</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedOrder?.items?.map((item: any, i: number) => (
                                                        <TableRow key={i} className="hover:bg-muted/10 border-border/30 group">
                                                            <TableCell className="px-4 py-3">
                                                                <p className="font-black text-[13px] leading-tight text-foreground group-hover:text-primary transition-colors">{item.item?.description}</p>
                                                                <p className="text-[9px] text-muted-foreground font-mono mt-1 opacity-80 uppercase tracking-tighter">{item.item?.sku}</p>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs text-muted-foreground">{item.quantity}</TableCell>
                                                            <TableCell className="text-right font-bold text-xs font-mono text-muted-foreground/80">Rs. {fmtCurrency(item.unitPrice)}</TableCell>
                                                            <TableCell className="text-right font-black text-xs font-mono pr-4 text-foreground">Rs. {fmtCurrency((item.unitPrice - (item.discountAmount || 0)) * item.quantity)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground/70">
                                                <BadgeDollarSign className="h-4 w-4 text-muted-foreground" /> Payment Information
                                            </h3>
                                            <div className="text-[10px] font-black uppercase text-muted-foreground px-3 py-1 bg-muted/50 rounded-lg">
                                                Total Paid: <span className="text-foreground ml-1">Rs. {fmtCurrency(totalPaid)}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedOrder?.tenders?.map((t: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border/80 bg-secondary/5 shadow-sm hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 bg-background border border-border/40 rounded-lg shadow-sm">
                                                            <BadgeDollarSign className="h-3.5 w-3.5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">Method</p>
                                                            <p className="text-[11px] font-black capitalize leading-none">{t.method.replace("_", " ")}</p>
                                                        </div>
                                                        {t.cardLast4 && <span className="text-[9px] font-mono font-black text-primary ml-1 ring-1 ring-primary/20 px-1.5 py-0.5 rounded-md bg-primary/5">••••{t.cardLast4}</span>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">Paid</p>
                                                        <p className="text-[12px] font-black font-mono">Rs. {fmtCurrency(t.amount)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                <DialogFooter className="p-4 bg-muted/20">
                                    <Button variant="ghost" onClick={() => setShowDetails(false)} className="rounded-xl font-black text-[10px] uppercase hover:bg-muted/80 tracking-widest px-6 h-11">Close</Button>
                                    <Button
                                        onClick={() => { setShowDetails(false); setShowPrint(true); }}
                                        className="rounded-xl font-black text-[10px] uppercase px-8 h-11 shadow-lg shadow-primary/30 gap-2.5 tracking-widest"
                                    >
                                        <Printer className="h-4 w-4" /> Print Receipt
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {showPrint && selectedOrder && (
                <PrintReceipt
                    order={selectedOrder}
                    tenders={selectedOrder.tenders || []}
                    onClose={() => setShowPrint(false)}
                />
            )}
        </div>
    );
}
