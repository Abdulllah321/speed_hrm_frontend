"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
    Clock,
    CheckCircle2,
    XCircle,
    Package,
    ArrowRightLeft,
    Calendar,
    Hash,
    Printer,
    RotateCcw,
    Loader2,
    Download,
    Search,
    RefreshCw,
    ChevronDown,
    FileSpreadsheet,
    FileText,
    Truck,
    User,
    Bike,
    Save,
    TrendingUp,
    AlertCircle,
    CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getStockTransfers, queueDeliveryNotesExport, checkDeliveryNotesExportStatus } from "@/lib/actions/stock-transfer";
import { updateTransferDispatchDetails } from "@/lib/actions/transfer-request";
import { Warehouse } from "@/lib/actions/warehouse";
import { cn } from "@/lib/utils";
import DataTable, { HighlightText } from "@/components/common/data-table";
import { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";

interface StockTransferHistoryListProps {
    initialEntries: any[];
    initialMeta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    warehouses?: Warehouse[];
    initialFilters?: {
        warehouseId?: string;
        status?: string;
        transferType?: string;
        dispatchType?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number | string;
        limit?: number | string;
        sortBy?: string;
        sortOrder?: string;
    };
}

const COMMON_COURIERS = [
    "Leopard Courier",
    "TCS",
    "M&P Express",
    "CallCourier",
    "Trax Courier",
    "PostEx",
    "Pakistan Post",
    "DHL",
    "Other Courier",
];

export function StockTransferHistoryList({ 
    initialEntries,
    initialMeta,
    warehouses = [],
    initialFilters
}: StockTransferHistoryListProps) {
    const router = useRouter();
    const [entries, setEntries] = React.useState<any[]>(initialEntries);
    const [meta, setMeta] = React.useState<{
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>({
        total: initialMeta?.total ?? initialEntries.length,
        page: initialMeta?.page ?? (initialFilters?.page ? Number(initialFilters.page) : 1),
        limit: initialMeta?.limit ?? (initialFilters?.limit ? Number(initialFilters.limit) : 100),
        totalPages: initialMeta?.totalPages ?? 1,
    });
    const [loading, setLoading] = React.useState(false);

    // Export state tracking per AGENTS.md rules
    const [exportState, setExportState] = React.useState<'idle' | 'queueing' | 'generating' | 'completed' | 'failed'>('idle');
    const [exportJobId, setExportJobId] = React.useState<string | null>(null);
    const [exportProgress, setExportProgress] = React.useState<number>(0);

    // Filter states
    const [search, setSearch] = React.useState(initialFilters?.search || "");
    const [status, setStatus] = React.useState(initialFilters?.status || "all");
    const [transferType, setTransferType] = React.useState(initialFilters?.transferType || "all");
    const [dispatchTypeFilter, setDispatchTypeFilter] = React.useState(initialFilters?.dispatchType || "all");
    const [warehouseId, setWarehouseId] = React.useState(initialFilters?.warehouseId || "all");
    const [dateFrom, setDateFrom] = React.useState(initialFilters?.dateFrom || "");
    const [dateTo, setDateTo] = React.useState(initialFilters?.dateTo || "");
    const [sorting, setSorting] = React.useState<SortingState>(
        initialFilters?.sortBy
            ? [{ id: initialFilters.sortBy, desc: initialFilters.sortOrder === "desc" }]
            : []
    );

    // Dispatch Modal State
    const [isDispatchModalOpen, setIsDispatchModalOpen] = React.useState(false);
    const [selectedTransfer, setSelectedTransfer] = React.useState<any | null>(null);
    const [savingDispatch, setSavingDispatch] = React.useState(false);
    const [dispatchForm, setDispatchForm] = React.useState({
        dispatchType: "COURIER",
        courierName: "Leopard Courier",
        customCourierName: "",
        trackingNumber: "",
        dispatchDate: "",
        estimatedDeliveryDate: "",
        riderName: "",
        riderPhone: "",
        vehicleNumber: "",
        receiverPerson: "",
        shippingCost: "",
        dispatchNotes: "",
    });

    // Keep state in sync with initialEntries and initialMeta when props update
    React.useEffect(() => {
        setEntries(initialEntries);
        if (initialMeta) {
            setMeta(initialMeta);
        }
    }, [initialEntries, initialMeta]);

    // Poll export status every 2 seconds when generating
    React.useEffect(() => {
        if (!exportJobId || exportState !== 'generating') return;

        const interval = setInterval(async () => {
            try {
                const res = await checkDeliveryNotesExportStatus(exportJobId);
                if (res.status && res.data) {
                    const { state, progress } = res.data;
                    setExportProgress(progress || 0);

                    if (state === 'completed' || progress >= 100) {
                        setExportState('completed');
                        clearInterval(interval);
                        toast.success("Delivery Note export ready to download!");
                    } else if (state === 'failed') {
                        setExportState('failed');
                        clearInterval(interval);
                        toast.error("Delivery Note export generation failed.");
                    }
                }
            } catch (err) {
                console.error("Export status polling error:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [exportJobId, exportState]);

    const fetchPage = async (targetPage: number, targetLimit: number, extraFilters?: any) => {
        setLoading(true);
        try {
            const activeSearch = extraFilters?.search !== undefined ? extraFilters.search : search;
            const activeStatus = extraFilters?.status !== undefined ? extraFilters.status : status;
            const activeTransferType = extraFilters?.transferType !== undefined ? extraFilters.transferType : transferType;
            const activeDispatchType = extraFilters?.dispatchType !== undefined ? extraFilters.dispatchType : dispatchTypeFilter;
            const activeWarehouseId = extraFilters?.warehouseId !== undefined ? extraFilters.warehouseId : warehouseId;
            const activeDateFrom = extraFilters?.dateFrom !== undefined ? extraFilters.dateFrom : dateFrom;
            const activeDateTo = extraFilters?.dateTo !== undefined ? extraFilters.dateTo : dateTo;
            const activeSorting = extraFilters?.sorting !== undefined ? extraFilters.sorting : sorting;

            const activeFilters = {
                search: activeSearch.trim() || undefined,
                status: activeStatus !== "all" ? activeStatus : undefined,
                transferType: activeTransferType !== "all" ? activeTransferType : undefined,
                dispatchType: activeDispatchType !== "all" ? activeDispatchType : undefined,
                warehouseId: activeWarehouseId !== "all" ? activeWarehouseId : undefined,
                dateFrom: activeDateFrom || undefined,
                dateTo: activeDateTo || undefined,
                page: targetPage,
                limit: targetLimit,
                sortBy: activeSorting?.[0]?.id,
                sortOrder: activeSorting?.[0] ? (activeSorting[0].desc ? "desc" : "asc") : undefined,
            };

            const res = await getStockTransfers(activeFilters);
            if (res.status) {
                setEntries(res.data || []);
                if (res.meta) {
                    setMeta(res.meta);
                }

                const params = new URLSearchParams();
                if (activeFilters.search) params.set("search", activeFilters.search);
                if (activeFilters.status) params.set("status", activeFilters.status);
                if (activeFilters.transferType) params.set("transferType", activeFilters.transferType);
                if (activeFilters.dispatchType) params.set("dispatchType", activeFilters.dispatchType);
                if (activeFilters.warehouseId) params.set("warehouseId", activeFilters.warehouseId);
                if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
                if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
                if (activeFilters.sortBy) params.set("sortBy", activeFilters.sortBy);
                if (activeFilters.sortOrder) params.set("sortOrder", activeFilters.sortOrder);
                params.set("page", String(targetPage));
                params.set("limit", String(targetLimit));

                const qs = params.toString();
                router.replace(`/erp/inventory/transactions/delivery-note${qs ? `?${qs}` : ""}`, { scroll: false });
            } else {
                toast.error(res.message || "Failed to fetch delivery notes");
            }
        } catch (error) {
            console.error("Error fetching delivery notes:", error);
            toast.error("Failed to fetch delivery notes");
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = async () => {
        await fetchPage(1, meta.limit);
        toast.success("Filters applied successfully");
    };

    const resetFilters = async () => {
        setSearch("");
        setStatus("all");
        setTransferType("all");
        setDispatchTypeFilter("all");
        setWarehouseId("all");
        setDateFrom("");
        setDateTo("");
        setSorting([]);
        await fetchPage(1, meta.limit, {
            search: "",
            status: "all",
            transferType: "all",
            dispatchType: "all",
            warehouseId: "all",
            dateFrom: "",
            dateTo: "",
            sorting: [],
        });
        toast.success("Filters reset successfully");
    };

    const openDispatchModal = (transfer: any) => {
        setSelectedTransfer(transfer);
        const existingCourierName = transfer.courierName || "Leopard Courier";
        const isStandard = COMMON_COURIERS.includes(existingCourierName);
        setDispatchForm({
            dispatchType: transfer.dispatchType || "COURIER",
            courierName: isStandard ? existingCourierName : "Other Courier",
            customCourierName: isStandard ? "" : existingCourierName,
            trackingNumber: transfer.trackingNumber || "",
            dispatchDate: transfer.dispatchDate ? new Date(transfer.dispatchDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            estimatedDeliveryDate: transfer.estimatedDeliveryDate ? new Date(transfer.estimatedDeliveryDate).toISOString().slice(0, 10) : "",
            riderName: transfer.riderName || "",
            riderPhone: transfer.riderPhone || "",
            vehicleNumber: transfer.vehicleNumber || "",
            receiverPerson: transfer.receiverPerson || "",
            shippingCost: transfer.shippingCost ? String(transfer.shippingCost) : "",
            dispatchNotes: transfer.dispatchNotes || "",
        });
        setIsDispatchModalOpen(true);
    };

    const handleSaveDispatchDetails = async () => {
        if (!selectedTransfer) return;
        setSavingDispatch(true);
        try {
            const finalCourierName = dispatchForm.dispatchType === "COURIER"
                ? (dispatchForm.courierName === "Other Courier" ? dispatchForm.customCourierName : dispatchForm.courierName)
                : undefined;

            const res = await updateTransferDispatchDetails(selectedTransfer.id, {
                dispatchType: dispatchForm.dispatchType,
                courierName: finalCourierName,
                trackingNumber: dispatchForm.trackingNumber || undefined,
                dispatchDate: dispatchForm.dispatchDate || undefined,
                estimatedDeliveryDate: dispatchForm.estimatedDeliveryDate || undefined,
                riderName: dispatchForm.riderName || undefined,
                riderPhone: dispatchForm.riderPhone || undefined,
                vehicleNumber: dispatchForm.vehicleNumber || undefined,
                receiverPerson: dispatchForm.receiverPerson || undefined,
                shippingCost: dispatchForm.shippingCost ? parseFloat(dispatchForm.shippingCost) : undefined,
                dispatchNotes: dispatchForm.dispatchNotes || undefined,
            });

            if (res.status) {
                toast.success("Courier & Dispatch details updated!");
                setIsDispatchModalOpen(false);
                setEntries(prev => prev.map(item => item.id === selectedTransfer.id ? { ...item, ...res.data } : item));
            } else {
                toast.error(res.message || "Failed to update dispatch details");
            }
        } catch (err: any) {
            console.error("Save dispatch details error:", err);
            toast.error("An error occurred while saving dispatch details");
        } finally {
            setSavingDispatch(false);
        }
    };

    const handleExport = async (reportType: 'summary' | 'detailed' = 'detailed') => {
        if (exportState === 'completed' && exportJobId) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
            const downloadUrl = `${apiBase}/api/transfer-request/export/${exportJobId}/download`;
            window.open(downloadUrl, "_blank");
            setExportState('idle');
            setExportJobId(null);
            setExportProgress(0);
            return;
        }

        setExportState('queueing');
        setExportProgress(0);
        const toastId = toast.loading(`Queuing ${reportType === 'summary' ? 'summary preview' : 'detailed'} export job...`);
        try {
            const activeFilters = {
                reportType,
                search: search.trim() || undefined,
                status: status !== "all" ? status : undefined,
                transferType: transferType !== "all" ? transferType : undefined,
                dispatchType: dispatchTypeFilter !== "all" ? dispatchTypeFilter : undefined,
                warehouseId: warehouseId !== "all" ? warehouseId : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            };

            const result = await queueDeliveryNotesExport(activeFilters);
            toast.dismiss(toastId);
            if (result.status && result.data?.jobId) {
                setExportJobId(result.data.jobId);
                setExportState('generating');
                toast.info(`Exporting ${reportType === 'summary' ? 'summary preview' : 'detailed line items'} in background...`);
            } else {
                setExportState('failed');
                toast.error(result.message || "Failed to queue export job.");
            }
        } catch (error: any) {
            toast.dismiss(toastId);
            setExportState('failed');
            toast.error(error.message || "Export failed. Please try again.");
        }
    };

    const getStatusBadge = (statusStr: string) => {
        switch (statusStr.toUpperCase()) {
            case 'PENDING':
                return (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 gap-1 capitalize">
                        <Clock className="h-3 w-3" /> {statusStr.toLowerCase()}
                    </Badge>
                );
            case 'COMPLETED':
                return (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 gap-1 capitalize">
                        <CheckCircle2 className="h-3 w-3" /> {statusStr.toLowerCase()}
                    </Badge>
                );
            case 'CANCELLED':
                return (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 gap-1 capitalize">
                        <XCircle className="h-3 w-3" /> {statusStr.toLowerCase()}
                    </Badge>
                );
            default:
                return <Badge variant="outline" className="capitalize">{statusStr.toLowerCase()}</Badge>;
        }
    };

    const getDispatchBadge = (transfer: any) => {
        const dType = transfer.dispatchType || 'UNASSIGNED';
        if (dType === 'COURIER') {
            return (
                <div className="flex flex-col gap-0.5">
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 gap-1 w-fit">
                        <Truck className="h-3 w-3" /> {transfer.courierName || 'Courier'}
                    </Badge>
                    {transfer.trackingNumber && (
                        <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                            CN: <HighlightText text={transfer.trackingNumber} />
                        </span>
                    )}
                </div>
            );
        } else if (dType === 'RIDER') {
            return (
                <div className="flex flex-col gap-0.5">
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 gap-1 w-fit">
                        <Bike className="h-3 w-3" /> {transfer.riderName || 'Rider'}
                    </Badge>
                    {transfer.riderPhone && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                            {transfer.riderPhone}
                        </span>
                    )}
                </div>
            );
        } else if (dType === 'SELF') {
            return (
                <div className="flex flex-col gap-0.5">
                    <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 gap-1 w-fit">
                        <User className="h-3 w-3" /> Self Handover
                    </Badge>
                    {transfer.receiverPerson && (
                        <span className="text-[11px] text-muted-foreground">
                            {transfer.receiverPerson}
                        </span>
                    )}
                </div>
            );
        }
        return (
            <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                Unassigned
            </Badge>
        );
    };

    // Calculate metrics for KPI summary cards
    const totalCount = meta.total;
    const completedCount = entries.filter((e) => e.status === "COMPLETED").length;
    const courierCount = entries.filter((e) => e.dispatchType === "COURIER").length;
    const totalQtyDelivered = entries.reduce((sum, e) => {
        return sum + (e.items?.reduce((iSum: number, item: any) => iSum + Number(item.quantity || 0), 0) || 0);
    }, 0);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "requestNo",
            header: "Request No",
            cell: ({ row }) => {
                const transfer = row.original;
                return (
                    <div className="font-mono font-bold text-sm flex items-center gap-2">
                        {transfer.transferType === 'OUTLET_TO_WAREHOUSE' && (
                            <RotateCcw className="h-4 w-4 text-orange-600 shrink-0" title="Outlet Return" />
                        )}
                        <HighlightText text={transfer.requestNo || ""} />
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ row }) => (
                <span className="text-sm font-medium text-muted-foreground">
                    {format(new Date(row.original.createdAt), "dd MMM yyyy, HH:mm")}
                </span>
            ),
        },
        {
            id: "path",
            header: "Transfer Path",
            cell: ({ row }) => {
                const transfer = row.original;
                return (
                    <div className="flex flex-col gap-1">
                        {transfer.transferType === 'OUTLET_TO_WAREHOUSE' ? (
                            <>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Badge variant="outline" className="px-1.5 py-0 h-5 bg-orange-50 text-orange-700 border-orange-200">FROM</Badge>
                                    <span className="text-muted-foreground">{transfer.fromLocation?.name || 'Outlet'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Badge variant="outline" className="px-1.5 py-0 h-5 bg-primary/5 text-primary border-primary/20">TO</Badge>
                                    <span className="font-bold">{transfer.fromWarehouse?.name || 'Main Warehouse'}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Badge variant="outline" className="px-1.5 py-0 h-5 bg-background">FROM</Badge>
                                    <span className="text-muted-foreground">{transfer.fromLocation?.name || transfer.fromWarehouse?.name || '—'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Badge variant="outline" className="px-1.5 py-0 h-5 bg-primary/5 text-primary border-primary/20">TO</Badge>
                                    <span className="font-bold">{transfer.toLocation?.name || transfer.toWarehouse?.name}</span>
                                </div>
                            </>
                        )}
                    </div>
                );
            },
        },
        {
            id: "dispatch",
            header: "Courier / Dispatch",
            cell: ({ row }) => getDispatchBadge(row.original),
        },
        {
            id: "itemDetails",
            header: "Item Details",
            cell: ({ row }) => {
                const items = row.original.items || [];
                return (
                    <div className="space-y-1">
                        {items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col">
                                <span className="font-bold text-sm leading-tight">{item.item?.description}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                    SKU: <HighlightText text={item.item?.sku || ""} />
                                    {item.item?.color?.name && ` • Color: ${item.item.color.name}`}
                                    {item.item?.size?.name && ` • Size: ${item.item.size.name}`}
                                </span>
                            </div>
                        ))}
                        {items.length > 3 && (
                            <span className="text-[11px] text-primary font-semibold">
                                + {items.length - 3} more item(s)
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: "totalQty",
            header: "Total Qty",
            cell: ({ row }) => {
                const total = (row.original.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
                return (
                    <div className="text-center font-black text-primary text-base">
                        {total}
                    </div>
                );
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const transfer = row.original;
                return (
                    <div className="flex justify-end gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDispatchModal(transfer)}
                            className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
                        >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            Dispatch
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-8">
                            <Link href={`/erp/inventory/transactions/stock-transfer/slip/${transfer.id}`} target="_blank">
                                <Printer className="h-3.5 w-3.5 mr-1" />
                                Print
                            </Link>
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Delivery Notes</p>
                            <h3 className="text-2xl font-extrabold tracking-tight mt-1">{totalCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed Delivery</p>
                            <h3 className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1">{completedCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <CheckCheck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Courier Dispatched</p>
                            <h3 className="text-2xl font-extrabold text-purple-600 tracking-tight mt-1">{courierCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                            <Truck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty Delivered (Page)</p>
                            <h3 className="text-2xl font-extrabold text-indigo-600 tracking-tight mt-1">{totalQtyDelivered}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                            <Package className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="border-2 shadow-xs">
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
                        <div className="space-y-1.5 lg:col-span-1">
                            <Label htmlFor="search" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Request / CN</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="TR-... or Leopard CN"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") applyFilters();
                                    }}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transfer Type</Label>
                            <Select value={transferType} onValueChange={setTransferType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Transfer Types</SelectItem>
                                    <SelectItem value="WAREHOUSE_TO_OUTLET">Warehouse to Outlet</SelectItem>
                                    <SelectItem value="OUTLET_TO_WAREHOUSE">Outlet to Warehouse</SelectItem>
                                    <SelectItem value="OUTLET_TO_OUTLET">Outlet to Outlet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dispatch Mode</Label>
                            <Select value={dispatchTypeFilter} onValueChange={setDispatchTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Modes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Modes</SelectItem>
                                    <SelectItem value="COURIER">Courier (Leopard / TCS)</SelectItem>
                                    <SelectItem value="RIDER">Rider / Driver</SelectItem>
                                    <SelectItem value="SELF">Self Handover</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source Warehouse</Label>
                            <Select value={warehouseId} onValueChange={setWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Warehouses</SelectItem>
                                    {warehouses?.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name} ({w.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="dateFrom" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date From</Label>
                            <Input
                                id="dateFrom"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="dateTo" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date To</Label>
                            <Input
                                id="dateTo"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-dashed">
                        <div className="flex gap-2">
                            <Button onClick={applyFilters} disabled={loading} size="sm" className="font-semibold shadow-xs">
                                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                                {loading ? "Applying..." : "Apply Filters"}
                            </Button>
                            <Button onClick={resetFilters} variant="outline" size="sm" className="font-semibold shadow-xs" disabled={loading}>
                                Reset
                            </Button>
                        </div>

                        {exportState === 'queueing' || exportState === 'generating' ? (
                            <Button variant="outline" disabled size="sm" className="border-emerald-500/40 text-emerald-700 font-bold shadow-xs">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {exportState === 'queueing' ? "Queueing..." : `Generating ${exportProgress}%`}
                            </Button>
                        ) : exportState === 'completed' ? (
                            <Button
                                variant="default"
                                onClick={() => handleExport('detailed')}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download Excel
                            </Button>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={entries.length === 0}
                                        size="sm"
                                        className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 font-bold shadow-xs gap-1"
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        {exportState === 'failed' ? "Retry Export" : "Export to Excel"}
                                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60">
                                    <DropdownMenuItem onClick={() => handleExport('summary')} className="cursor-pointer font-medium p-2.5">
                                        <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">Summary / Preview</span>
                                            <span className="text-[10px] text-muted-foreground">1 row per Delivery Note (STN, Courier, Status, Qty)</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('detailed')} className="cursor-pointer font-medium p-2.5">
                                        <FileText className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">Detailed Breakdown</span>
                                            <span className="text-[10px] text-muted-foreground">Line items with Courier & Tracking Info</span>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Redesigned DataTable with SSR Pagination & Sorting */}
            <DataTable
                tableId="delivery-note-history-table"
                columns={columns}
                data={entries}
                isLoading={loading}
                manualPagination={true}
                rowCount={meta.total}
                pageCount={meta.totalPages}
                initialPageSize={meta.limit}
                manualSorting={true}
                sortingColumns={sorting}
                onSortingChange={(newSorting) => {
                    setSorting(newSorting);
                    fetchPage(1, meta.limit, { sorting: newSorting });
                }}
                onPaginationChange={(newPagination: PaginationState) => {
                    const targetPage = newPagination.pageIndex + 1;
                    const targetLimit = newPagination.pageSize;
                    fetchPage(targetPage, targetLimit);
                }}
                rowClassName={(row) => row.transferType === 'OUTLET_TO_WAREHOUSE' ? 'bg-orange-50/30 dark:bg-orange-950/20' : ''}
                canBulkEdit={false}
                canBulkDelete={false}
                canRowEdit={false}
                canRowDelete={false}
            />

            {/* Dispatch / Courier Details Modal */}
            <Dialog open={isDispatchModalOpen} onOpenChange={setIsDispatchModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Truck className="h-5 w-5 text-purple-600" />
                            Courier & Dispatch Information
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTransfer && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg text-sm border">
                                <div>
                                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider block">Request No</span>
                                    <span className="font-mono font-bold text-base">{selectedTransfer.requestNo}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider block">Status</span>
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dispatch Mode</Label>
                                <Select
                                    value={dispatchForm.dispatchType}
                                    onValueChange={(val) => setDispatchForm(prev => ({ ...prev, dispatchType: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Dispatch Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="COURIER">Courier Service (Leopard / TCS / M&P)</SelectItem>
                                        <SelectItem value="RIDER">Internal Rider / Company Driver</SelectItem>
                                        <SelectItem value="SELF">Self Handover / Direct Pickup</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {dispatchForm.dispatchType === "COURIER" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Courier Service Name</Label>
                                        <Select
                                            value={dispatchForm.courierName}
                                            onValueChange={(val) => setDispatchForm(prev => ({ ...prev, courierName: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Courier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COMMON_COURIERS.map((c) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {dispatchForm.courierName === "Other Courier" && (
                                        <div className="space-y-1.5">
                                            <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Custom Courier Name</Label>
                                            <Input
                                                placeholder="Enter courier name"
                                                value={dispatchForm.customCourierName}
                                                onChange={(e) => setDispatchForm(prev => ({ ...prev, customCourierName: e.target.value }))}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tracking Number / Consignment (CN)</Label>
                                        <Input
                                            placeholder="e.g. 10293847561"
                                            value={dispatchForm.trackingNumber}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {dispatchForm.dispatchType === "RIDER" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Rider / Driver Name</Label>
                                        <Input
                                            placeholder="Rider Name"
                                            value={dispatchForm.riderName}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, riderName: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Rider Phone</Label>
                                        <Input
                                            placeholder="0300-1234567"
                                            value={dispatchForm.riderPhone}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, riderPhone: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Vehicle / Bike Number</Label>
                                        <Input
                                            placeholder="e.g. LEB-1234"
                                            value={dispatchForm.vehicleNumber}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {dispatchForm.dispatchType === "SELF" && (
                                <div className="space-y-1.5">
                                    <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Receiver Person Name</Label>
                                    <Input
                                        placeholder="Handover receiver name"
                                        value={dispatchForm.receiverPerson}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, receiverPerson: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dispatch Date</Label>
                                    <Input
                                        type="date"
                                        value={dispatchForm.dispatchDate}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, dispatchDate: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Est. Delivery Date</Label>
                                    <Input
                                        type="date"
                                        value={dispatchForm.estimatedDeliveryDate}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Shipping / Freight Cost (Rs.)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={dispatchForm.shippingCost}
                                    onChange={(e) => setDispatchForm(prev => ({ ...prev, shippingCost: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dispatch Notes</Label>
                                <Textarea
                                    rows={2}
                                    placeholder="Optional notes..."
                                    value={dispatchForm.dispatchNotes}
                                    onChange={(e) => setDispatchForm(prev => ({ ...prev, dispatchNotes: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDispatchModalOpen(false)} disabled={savingDispatch}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveDispatchDetails} disabled={savingDispatch} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                            {savingDispatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Dispatch Details
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
