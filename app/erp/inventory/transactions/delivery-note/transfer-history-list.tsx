"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    Save
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

interface StockTransferHistoryListProps {
    initialEntries: any[];
    warehouses?: Warehouse[];
    initialFilters?: {
        warehouseId?: string;
        status?: string;
        transferType?: string;
        dispatchType?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
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
    warehouses = [],
    initialFilters
}: StockTransferHistoryListProps) {
    const router = useRouter();
    const [entries, setEntries] = React.useState<any[]>(initialEntries);
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

    // Keep state in sync with initialEntries when props update
    React.useEffect(() => {
        setEntries(initialEntries);
    }, [initialEntries]);

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

    const applyFilters = async () => {
        setLoading(true);
        try {
            const activeFilters = {
                search: search.trim() || undefined,
                status: status !== "all" ? status : undefined,
                transferType: transferType !== "all" ? transferType : undefined,
                dispatchType: dispatchTypeFilter !== "all" ? dispatchTypeFilter : undefined,
                warehouseId: warehouseId !== "all" ? warehouseId : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            };

            const res = await getStockTransfers(activeFilters);
            if (res.status) {
                setEntries(res.data || []);
                
                const params = new URLSearchParams();
                if (activeFilters.search) params.set("search", activeFilters.search);
                if (activeFilters.status) params.set("status", activeFilters.status);
                if (activeFilters.transferType) params.set("transferType", activeFilters.transferType);
                if (activeFilters.dispatchType) params.set("dispatchType", activeFilters.dispatchType);
                if (activeFilters.warehouseId) params.set("warehouseId", activeFilters.warehouseId);
                if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
                if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
                
                const qs = params.toString();
                router.replace(`/erp/inventory/transactions/delivery-note${qs ? `?${qs}` : ""}`, { scroll: false });
                toast.success("Filters applied successfully");
            } else {
                toast.error(res.message || "Failed to fetch filtered delivery notes");
            }
        } catch (error) {
            console.error("Error applying filters:", error);
            toast.error("Failed to filter delivery notes");
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = async () => {
        setSearch("");
        setStatus("all");
        setTransferType("all");
        setDispatchTypeFilter("all");
        setWarehouseId("all");
        setDateFrom("");
        setDateTo("");
        setLoading(true);
        try {
            const res = await getStockTransfers();
            if (res.status) {
                setEntries(res.data || []);
                router.replace("/erp/inventory/transactions/delivery-note", { scroll: false });
                toast.success("Filters reset successfully");
            } else {
                toast.error(res.message || "Failed to reset delivery notes");
            }
        } catch (error) {
            console.error("Error resetting filters:", error);
            toast.error("Failed to reset filters");
        } finally {
            setLoading(false);
        }
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
                            CN: {transfer.trackingNumber}
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

    return (
        <div className="space-y-6">
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

            {/* Table */}
            <Card className="overflow-hidden shadow-xs border-2 py-0!">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-bold"><Hash className="h-4 w-4 inline mr-1" /> Request No</TableHead>
                                <TableHead className="font-bold"><Calendar className="h-4 w-4 inline mr-1" /> Date</TableHead>
                                <TableHead className="font-bold"><ArrowRightLeft className="h-4 w-4 inline mr-1" /> Transfer Path</TableHead>
                                <TableHead className="font-bold"><Truck className="h-4 w-4 inline mr-1" /> Courier / Dispatch</TableHead>
                                <TableHead className="font-bold"><Package className="h-4 w-4 inline mr-1" /> Item Details</TableHead>
                                <TableHead className="font-bold text-center">Qty</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="font-bold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No delivery notes found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((transfer) => (
                                    <TableRow key={transfer.id} className={`hover:bg-muted/50 transition-colors ${transfer.transferType === 'OUTLET_TO_WAREHOUSE' ? 'bg-orange-50/30' : ''}`}>
                                        <TableCell className="font-mono font-bold text-sm">
                                            <div className="flex items-center gap-2">
                                                {transfer.transferType === 'OUTLET_TO_WAREHOUSE' && (
                                                    <RotateCcw className="h-4 w-4 text-orange-600" />
                                                )}
                                                {transfer.requestNo}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {format(new Date(transfer.createdAt), "dd MMM yyyy, HH:mm")}
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell>
                                            {getDispatchBadge(transfer)}
                                        </TableCell>
                                        <TableCell>
                                            {transfer.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col mb-1.5 last:mb-0">
                                                    <span className="font-bold text-sm leading-tight">{item.item?.description}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                                        SKU: {item.item?.sku}
                                                        {item.item?.color?.name && ` • Color: ${item.item.color.name}`}
                                                        {item.item?.size?.name && ` • Size: ${item.item.size.name}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </TableCell>
                                        <TableCell className="text-center font-black text-primary">
                                            {transfer.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(transfer.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDispatchModal(transfer)}
                                                    className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
                                                >
                                                    <Truck className="h-3.5 w-3.5 mr-1" />
                                                    Courier / Dispatch
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/erp/inventory/transactions/stock-transfer/slip/${transfer.id}`} target="_blank">
                                                        <Printer className="h-4 w-4 mr-1" />
                                                        Print
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Courier & Dispatch Edit Modal */}
            <Dialog open={isDispatchModalOpen} onOpenChange={setIsDispatchModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-700">
                            <Truck className="h-5 w-5" />
                            Manage Courier & Dispatch Details
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            Update shipping, tracking invoice #, or rider info for transfer <span className="font-bold font-mono text-foreground">{selectedTransfer?.requestNo}</span>
                        </p>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Dispatch Mode</Label>
                            <Select
                                value={dispatchForm.dispatchType}
                                onValueChange={(val) => setDispatchForm(prev => ({ ...prev, dispatchType: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="COURIER">Courier (Leopard / TCS / M&P)</SelectItem>
                                    <SelectItem value="RIDER">Rider / Internal Driver</SelectItem>
                                    <SelectItem value="SELF">Self Handover / Pickup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dispatchForm.dispatchType === "COURIER" && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Courier Provider</Label>
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
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Custom Courier Name</Label>
                                        <Input
                                            placeholder="Enter courier name"
                                            value={dispatchForm.customCourierName}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, customCourierName: e.target.value }))}
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tracking / Invoice / CN Number</Label>
                                    <Input
                                        placeholder="e.g. LPD-98471203"
                                        value={dispatchForm.trackingNumber}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Dispatch Date</Label>
                                        <Input
                                            type="date"
                                            value={dispatchForm.dispatchDate}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, dispatchDate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Est. Delivery</Label>
                                        <Input
                                            type="date"
                                            value={dispatchForm.estimatedDeliveryDate}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {dispatchForm.dispatchType === "RIDER" && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Rider Name</Label>
                                        <Input
                                            placeholder="e.g. Muhammad Ali"
                                            value={dispatchForm.riderName}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, riderName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Rider Phone</Label>
                                        <Input
                                            placeholder="0300-1234567"
                                            value={dispatchForm.riderPhone}
                                            onChange={(e) => setDispatchForm(prev => ({ ...prev, riderPhone: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Vehicle / Bike No</Label>
                                    <Input
                                        placeholder="e.g. LEK-1234"
                                        value={dispatchForm.vehicleNumber}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}

                        {dispatchForm.dispatchType === "SELF" && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Receiver Person Name</Label>
                                    <Input
                                        placeholder="Handed over to..."
                                        value={dispatchForm.receiverPerson}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, receiverPerson: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Vehicle No (Optional)</Label>
                                    <Input
                                        placeholder="e.g. LEB-5678"
                                        value={dispatchForm.vehicleNumber}
                                        onChange={(e) => setDispatchForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Dispatch Notes / Remarks</Label>
                            <Textarea
                                placeholder="Any instructions or comments..."
                                value={dispatchForm.dispatchNotes}
                                onChange={(e) => setDispatchForm(prev => ({ ...prev, dispatchNotes: e.target.value }))}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDispatchModalOpen(false)} disabled={savingDispatch}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveDispatchDetails} disabled={savingDispatch} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                            {savingDispatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" /> Save Courier Info
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
