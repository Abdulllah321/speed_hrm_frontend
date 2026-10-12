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
    CheckCheck,
    Building2,
    Store,
    ArrowRight,
    X,
    MapPin,
    Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
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
import { Location } from "@/lib/actions/location";
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
    locations?: Location[];
    initialFilters?: {
        warehouseId?: string;
        fromLocationId?: string;
        toLocationId?: string;
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
    locations = [],
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

    // Unified Location / Facility Model combining Warehouses and Outlets into one seamless pool
    const unifiedFacilities = React.useMemo(() => {
        const list: Array<{
            id: string;
            name: string;
            code: string;
            type: "WAREHOUSE" | "OUTLET";
            city?: string;
            label: string;
        }> = [];

        warehouses.forEach((w) => {
            list.push({
                id: w.id,
                name: w.name,
                code: w.code,
                type: "WAREHOUSE",
                label: `${w.name} (${w.code})`,
            });
        });

        locations.forEach((loc) => {
            list.push({
                id: loc.id,
                name: loc.name,
                code: loc.code || loc.shortCode || "",
                type: "OUTLET",
                city: loc.city?.name,
                label: `${loc.name}${loc.code ? ` (${loc.code})` : ""}${loc.city?.name ? ` - ${loc.city.name}` : ""}`,
            });
        });

        return list;
    }, [warehouses, locations]);

    const warehouseFacilities = React.useMemo(
        () => unifiedFacilities.filter((f) => f.type === "WAREHOUSE"),
        [unifiedFacilities]
    );
    const outletFacilities = React.useMemo(
        () => unifiedFacilities.filter((f) => f.type === "OUTLET"),
        [unifiedFacilities]
    );

    // Filter states
    const [search, setSearch] = React.useState(initialFilters?.search || "");
    const [status, setStatus] = React.useState(initialFilters?.status || "all");
    const [transferType, setTransferType] = React.useState(initialFilters?.transferType || "all");
    const [dispatchTypeFilter, setDispatchTypeFilter] = React.useState(initialFilters?.dispatchType || "all");
    const [fromLocationId, setFromLocationId] = React.useState(initialFilters?.fromLocationId || initialFilters?.warehouseId || "all");
    const [toLocationId, setToLocationId] = React.useState(initialFilters?.toLocationId || "all");
    const [dateFrom, setDateFrom] = React.useState(initialFilters?.dateFrom || "");
    const [dateTo, setDateTo] = React.useState(initialFilters?.dateTo || "");
    const [sorting, setSorting] = React.useState<SortingState>(
        initialFilters?.sortBy
            ? [{ id: initialFilters.sortBy, desc: initialFilters.sortOrder === "desc" }]
            : []
    );

    // Active route metadata
    const fromFacility = React.useMemo(
        () => unifiedFacilities.find((f) => f.id === fromLocationId),
        [unifiedFacilities, fromLocationId]
    );
    const toFacility = React.useMemo(
        () => unifiedFacilities.find((f) => f.id === toLocationId),
        [unifiedFacilities, toLocationId]
    );
    const isRouteActive = fromLocationId !== "all" || toLocationId !== "all";

    const handleSwapLocations = () => {
        const prevFrom = fromLocationId;
        const prevTo = toLocationId;
        setFromLocationId(prevTo);
        setToLocationId(prevFrom);
    };

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
            const activeFromLocationId = extraFilters?.fromLocationId !== undefined ? extraFilters.fromLocationId : fromLocationId;
            const activeToLocationId = extraFilters?.toLocationId !== undefined ? extraFilters.toLocationId : toLocationId;
            const activeDateFrom = extraFilters?.dateFrom !== undefined ? extraFilters.dateFrom : dateFrom;
            const activeDateTo = extraFilters?.dateTo !== undefined ? extraFilters.dateTo : dateTo;
            const activeSorting = extraFilters?.sorting !== undefined ? extraFilters.sorting : sorting;

            const activeFilters = {
                search: activeSearch.trim() || undefined,
                status: activeStatus !== "all" ? activeStatus : undefined,
                transferType: activeTransferType !== "all" ? activeTransferType : undefined,
                dispatchType: activeDispatchType !== "all" ? activeDispatchType : undefined,
                fromLocationId: activeFromLocationId !== "all" ? activeFromLocationId : undefined,
                toLocationId: activeToLocationId !== "all" ? activeToLocationId : undefined,
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
                if (activeFilters.fromLocationId) params.set("fromLocationId", activeFilters.fromLocationId);
                if (activeFilters.toLocationId) params.set("toLocationId", activeFilters.toLocationId);
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
        setFromLocationId("all");
        setToLocationId("all");
        setDateFrom("");
        setDateTo("");
        setSorting([]);
        await fetchPage(1, meta.limit, {
            search: "",
            status: "all",
            transferType: "all",
            dispatchType: "all",
            fromLocationId: "all",
            toLocationId: "all",
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
                fromLocationId: fromLocationId !== "all" ? fromLocationId : undefined,
                toLocationId: toLocationId !== "all" ? toLocationId : undefined,
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

    const getTransferTypeBadge = (type: string) => {
        switch (type) {
            case 'OUTLET_TO_WAREHOUSE':
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 text-[10px] gap-1 font-semibold py-0.5 w-fit">
                        <RotateCcw className="h-3 w-3 text-amber-600 shrink-0" /> Outlet ➔ WH (Return)
                    </Badge>
                );
            case 'WAREHOUSE_TO_WAREHOUSE':
                return (
                    <Badge variant="outline" className="bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 text-[10px] gap-1 font-semibold py-0.5 w-fit">
                        <Building2 className="h-3 w-3 text-purple-600 shrink-0" /> Inter-Warehouse
                    </Badge>
                );
            case 'OUTLET_TO_OUTLET':
                return (
                    <Badge variant="outline" className="bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 text-[10px] gap-1 font-semibold py-0.5 w-fit">
                        <Store className="h-3 w-3 text-teal-600 shrink-0" /> Outlet ➔ Outlet
                    </Badge>
                );
            case 'WAREHOUSE_TO_OUTLET':
            default:
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 text-[10px] gap-1 font-semibold py-0.5 w-fit">
                        <Building2 className="h-3 w-3 text-blue-600 shrink-0" /> Warehouse ➔ Outlet
                    </Badge>
                );
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
                    <div>
                        <div className="font-mono font-bold text-sm flex items-center gap-2">
                            {transfer.transferType === 'OUTLET_TO_WAREHOUSE' && (
                                <RotateCcw className="h-4 w-4 text-orange-600 shrink-0" title="Outlet Return" />
                            )}
                            <HighlightText text={transfer.requestNo || ""} />
                        </div>
                        {(transfer.outboundNo || transfer.inboundNo) && (
                            <div className="flex flex-col gap-0.5 mt-1">
                            {transfer.outboundNo && (
                                <span className="text-[11px] font-mono font-semibold text-orange-600 bg-orange-50 px-1 py-0.5 rounded w-fit">
                                    OUT: {transfer.outboundNo}
                                </span>
                            )}
                            {transfer.inboundNo && (
                                <span className="text-[11px] font-mono font-semibold text-teal-600 bg-teal-50 px-1 py-0.5 rounded w-fit">
                                    IN: {transfer.inboundNo}
                                </span>
                            )}
                        </div>
                    )}
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
            id: "route",
            header: "Transfer Route (From ➔ To)",
            cell: ({ row }) => {
                const transfer = row.original;
                const originName = transfer.transferType === 'OUTLET_TO_WAREHOUSE'
                    ? (transfer.fromLocation?.name || 'Outlet')
                    : (transfer.fromWarehouse?.name || transfer.fromLocation?.name || 'Warehouse');
                const originCode = transfer.transferType === 'OUTLET_TO_WAREHOUSE'
                    ? transfer.fromLocation?.code
                    : (transfer.fromWarehouse?.code || transfer.fromLocation?.code);
                const isOriginOutlet = transfer.transferType === 'OUTLET_TO_WAREHOUSE' || transfer.transferType === 'OUTLET_TO_OUTLET';

                const destName = transfer.transferType === 'OUTLET_TO_WAREHOUSE'
                    ? (transfer.toWarehouse?.name || transfer.fromWarehouse?.name || 'Warehouse')
                    : (transfer.toLocation?.name || transfer.toWarehouse?.name || 'Destination');
                const destCode = transfer.transferType === 'OUTLET_TO_WAREHOUSE'
                    ? (transfer.toWarehouse?.code || transfer.fromWarehouse?.code)
                    : (transfer.toLocation?.code || transfer.toWarehouse?.code);
                const isDestWarehouse = transfer.transferType === 'OUTLET_TO_WAREHOUSE' || transfer.transferType === 'WAREHOUSE_TO_WAREHOUSE';

                return (
                    <div className="flex flex-col gap-1.5 min-w-[210px]">
                        <div>
                            {getTransferTypeBadge(transfer.transferType)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                                FROM
                            </span>
                            <span className="flex items-center gap-1 font-medium text-foreground truncate" title={originName}>
                                {isOriginOutlet ? <Store className="h-3 w-3 text-emerald-600 shrink-0" /> : <Building2 className="h-3 w-3 text-primary shrink-0" />}
                                <span className="truncate">{originName}</span>
                                {originCode && <span className="text-[10px] text-muted-foreground font-mono">({originCode})</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                TO
                            </span>
                            <span className="flex items-center gap-1 font-bold text-foreground truncate" title={destName}>
                                {isDestWarehouse ? <Building2 className="h-3 w-3 text-primary shrink-0" /> : <Store className="h-3 w-3 text-emerald-600 shrink-0" />}
                                <span className="truncate">{destName}</span>
                                {destCode && <span className="text-[10px] text-muted-foreground font-mono font-normal">({destCode})</span>}
                            </span>
                        </div>
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
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {isRouteActive ? "Route Deliveries" : "Total Delivery Notes"}
                            </p>
                            <h3 className="text-2xl font-extrabold tracking-tight mt-1">{totalCount}</h3>
                            <span className="text-[11px] font-semibold text-primary">
                                {isRouteActive ? "Filtered Route Volume" : "Across All Facilities"}
                            </span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {isRouteActive ? <Boxes className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed Delivery</p>
                            <h3 className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1">{completedCount}</h3>
                            <span className="text-[11px] text-muted-foreground">Received on current page</span>
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
                            <span className="text-[11px] text-muted-foreground">With tracking info</span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                            <Truck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {isRouteActive ? "Route Units (Page)" : "Qty Delivered (Page)"}
                            </p>
                            <h3 className="text-2xl font-extrabold text-indigo-600 tracking-tight mt-1">{totalQtyDelivered}</h3>
                            <span className="text-[11px] text-muted-foreground">Units in line items</span>
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
                    {/* Unified Route Intelligence Filter (Origin ➔ Destination) */}
                    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/5 p-4 shadow-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold tracking-tight flex items-center gap-2">
                                        Route Filter
                                        <Badge variant="outline" className="text-[10px] font-semibold bg-background border-primary/30 text-primary">
                                            Unified Facilities Model
                                        </Badge>
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        Check transfers from/into any Warehouse 🏢 or Outlet 🏬 across all directions
                                    </p>
                                </div>
                            </div>

                            {isRouteActive && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 font-bold text-xs gap-1.5 py-1 px-2.5">
                                        <Boxes className="h-3.5 w-3.5" />
                                        {meta.total} {meta.total === 1 ? 'Transfer Found' : 'Transfers Found'}
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFromLocationId("all");
                                            setToLocationId("all");
                                        }}
                                        className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                                    >
                                        <X className="h-3.5 w-3.5 mr-1" /> Reset Route
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Route Selector Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
                            {/* Origin / From Facility */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-orange-500 inline-block"></span>
                                    Origin (From Location / Warehouse)
                                </Label>
                                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                                    <SelectTrigger className="h-10 bg-background font-medium">
                                        <SelectValue placeholder="All Origins (Any Facility)" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80">
                                        <SelectItem value="all" className="font-semibold text-muted-foreground">
                                            🌐 All Origins (Any Warehouse or Outlet)
                                        </SelectItem>
                                        {warehouseFacilities.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                                                    <Building2 className="h-3.5 w-3.5" /> Central Warehouses ({warehouseFacilities.length})
                                                </SelectLabel>
                                                {warehouseFacilities.map((fac) => (
                                                    <SelectItem key={`from-wh-${fac.id}`} value={fac.id}>
                                                        🏢 {fac.name} ({fac.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                        {outletFacilities.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase">
                                                    <Store className="h-3.5 w-3.5" /> Retail Outlets / Stores ({outletFacilities.length})
                                                </SelectLabel>
                                                {outletFacilities.map((fac) => (
                                                    <SelectItem key={`from-out-${fac.id}`} value={fac.id}>
                                                        🏬 {fac.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Swap Button */}
                            <div className="flex md:flex-col items-center justify-center pt-2 md:pt-5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleSwapLocations}
                                    disabled={fromLocationId === "all" && toLocationId === "all"}
                                    title="Swap Origin and Destination"
                                    className="h-9 w-9 rounded-full border-2 border-primary/20 hover:border-primary hover:bg-primary/10 transition-all shadow-xs"
                                >
                                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                                </Button>
                            </div>

                            {/* Destination / To Facility */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                                    Destination (Into Location / Warehouse)
                                </Label>
                                <Select value={toLocationId} onValueChange={setToLocationId}>
                                    <SelectTrigger className="h-10 bg-background font-medium">
                                        <SelectValue placeholder="All Destinations (Any Facility)" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80">
                                        <SelectItem value="all" className="font-semibold text-muted-foreground">
                                            🌐 All Destinations (Any Warehouse or Outlet)
                                        </SelectItem>
                                        {warehouseFacilities.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                                                    <Building2 className="h-3.5 w-3.5" /> Central Warehouses ({warehouseFacilities.length})
                                                </SelectLabel>
                                                {warehouseFacilities.map((fac) => (
                                                    <SelectItem key={`to-wh-${fac.id}`} value={fac.id}>
                                                        🏢 {fac.name} ({fac.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                        {outletFacilities.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase">
                                                    <Store className="h-3.5 w-3.5" /> Retail Outlets / Stores ({outletFacilities.length})
                                                </SelectLabel>
                                                {outletFacilities.map((fac) => (
                                                    <SelectItem key={`to-out-${fac.id}`} value={fac.id}>
                                                        🏬 {fac.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Active Route Intelligence Summary Banner */}
                        {isRouteActive && (
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-background/90 rounded-lg p-3 border shadow-xs text-xs">
                                <div className="flex flex-wrap items-center gap-2 font-medium">
                                    <span className="text-muted-foreground font-semibold">Active Filtered Route:</span>
                                    <span className="font-bold flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200">
                                        {fromFacility ? (
                                            <>
                                                {fromFacility.type === "WAREHOUSE" ? <Building2 className="h-3.5 w-3.5 text-orange-600" /> : <Store className="h-3.5 w-3.5 text-orange-600" />}
                                                {fromFacility.name}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground italic">Any Origin</span>
                                        )}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                    <span className="font-bold flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                        {toFacility ? (
                                            <>
                                                {toFacility.type === "WAREHOUSE" ? <Building2 className="h-3.5 w-3.5 text-emerald-600" /> : <Store className="h-3.5 w-3.5 text-emerald-600" />}
                                                {toFacility.name}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground italic">Any Destination</span>
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="text-muted-foreground font-medium">
                                        Transfers on Route: <strong className="text-foreground font-bold">{meta.total}</strong>
                                    </span>
                                    <span className="text-muted-foreground font-medium">
                                        Units (Page): <strong className="text-primary font-bold">{totalQtyDelivered}</strong>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Secondary Filter Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
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
                                    <SelectItem value="WAREHOUSE_TO_WAREHOUSE">Warehouse to Warehouse</SelectItem>
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
