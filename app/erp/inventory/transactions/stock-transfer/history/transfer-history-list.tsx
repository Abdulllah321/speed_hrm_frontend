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
    Eye,
    RefreshCw,
    Search,
    TrendingUp,
    CheckCheck,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getStockTransfers } from "@/lib/actions/stock-transfer";
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
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number | string;
        limit?: number | string;
        sortBy?: string;
        sortOrder?: string;
    };
}

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

    // Filter states
    const [search, setSearch] = React.useState(initialFilters?.search || "");
    const [status, setStatus] = React.useState(initialFilters?.status || "all");
    const [transferType, setTransferType] = React.useState(initialFilters?.transferType || "all");
    const [warehouseId, setWarehouseId] = React.useState(initialFilters?.warehouseId || "all");
    const [dateFrom, setDateFrom] = React.useState(initialFilters?.dateFrom || "");
    const [dateTo, setDateTo] = React.useState(initialFilters?.dateTo || "");
    const [sorting, setSorting] = React.useState<SortingState>(
        initialFilters?.sortBy
            ? [{ id: initialFilters.sortBy, desc: initialFilters.sortOrder === "desc" }]
            : []
    );

    // Keep state in sync with initialEntries and initialMeta when props update from SSR
    React.useEffect(() => {
        setEntries(initialEntries);
        if (initialMeta) {
            setMeta(initialMeta);
        }
    }, [initialEntries, initialMeta]);

    const fetchPage = async (targetPage: number, targetLimit: number, extraFilters?: any) => {
        setLoading(true);
        try {
            const activeSearch = extraFilters?.search !== undefined ? extraFilters.search : search;
            const activeStatus = extraFilters?.status !== undefined ? extraFilters.status : status;
            const activeTransferType = extraFilters?.transferType !== undefined ? extraFilters.transferType : transferType;
            const activeWarehouseId = extraFilters?.warehouseId !== undefined ? extraFilters.warehouseId : warehouseId;
            const activeDateFrom = extraFilters?.dateFrom !== undefined ? extraFilters.dateFrom : dateFrom;
            const activeDateTo = extraFilters?.dateTo !== undefined ? extraFilters.dateTo : dateTo;
            const activeSorting = extraFilters?.sorting !== undefined ? extraFilters.sorting : sorting;

            const activeFilters = {
                search: activeSearch.trim() || undefined,
                status: activeStatus !== "all" ? activeStatus : undefined,
                transferType: activeTransferType !== "all" ? activeTransferType : undefined,
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

                // Update URL search params
                const params = new URLSearchParams();
                if (activeFilters.search) params.set("search", activeFilters.search);
                if (activeFilters.status) params.set("status", activeFilters.status);
                if (activeFilters.transferType) params.set("transferType", activeFilters.transferType);
                if (activeFilters.warehouseId) params.set("warehouseId", activeFilters.warehouseId);
                if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
                if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
                if (activeFilters.sortBy) params.set("sortBy", activeFilters.sortBy);
                if (activeFilters.sortOrder) params.set("sortOrder", activeFilters.sortOrder);
                params.set("page", String(targetPage));
                params.set("limit", String(targetLimit));

                const qs = params.toString();
                router.replace(`/erp/inventory/transactions/stock-transfer/history${qs ? `?${qs}` : ""}`, { scroll: false });
            } else {
                toast.error(res.message || "Failed to fetch stock transfers");
            }
        } catch (error) {
            console.error("Error fetching stock transfers:", error);
            toast.error("Failed to fetch stock transfers");
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
        setWarehouseId("all");
        setDateFrom("");
        setDateTo("");
        setSorting([]);
        await fetchPage(1, meta.limit, {
            search: "",
            status: "all",
            transferType: "all",
            warehouseId: "all",
            dateFrom: "",
            dateTo: "",
            sorting: [],
        });
        toast.success("Filters reset successfully");
    };

    const getStatusBadge = (statusStr: string) => {
        const s = statusStr.toUpperCase();
        switch (s) {
            case 'PENDING_CHECKER':
                return (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200 gap-1 capitalize">
                        <Clock className="h-3 w-3" /> pending checker
                    </Badge>
                );
            case 'PENDING_AUTHORIZER':
                return (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 gap-1 capitalize">
                        <Clock className="h-3 w-3" /> pending authorizer
                    </Badge>
                );
            case 'PENDING':
                return (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 gap-1 capitalize">
                        <Clock className="h-3 w-3" /> pending
                    </Badge>
                );
            case 'COMPLETED':
                return (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 gap-1 capitalize">
                        <CheckCircle2 className="h-3 w-3" /> completed
                    </Badge>
                );
            case 'REJECTED':
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

    // Calculate metrics for KPI summary cards
    const totalCount = meta.total;
    const completedCount = entries.filter((e) => e.status === "COMPLETED").length;
    const pendingCount = entries.filter((e) => e.status?.includes("PENDING")).length;
    const totalQtyTransferred = entries.reduce((sum, e) => {
        return sum + (e.items?.reduce((iSum: number, item: any) => iSum + Number(item.quantity || 0), 0) || 0);
    }, 0);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "requestNo",
            header: "Request No",
            cell: ({ row }) => {
                const transfer = row.original;
                return (
                    <div className="font-mono font-bold text-sm">
                        <HighlightText text={transfer.requestNo || ""} />
                        {transfer.stockRequisition && (
                            <div className="mt-1">
                                <Button variant="link" className="p-0 h-auto text-[10px] text-indigo-600 font-bold flex items-center" asChild>
                                    <Link href={`/erp/inventory/transactions/stock-requisition/slip/${transfer.stockRequisition.id}`} target="_blank">
                                        <Printer className="h-3 w-3 mr-1 inline" /> {transfer.stockRequisition.requisitionNo}
                                    </Link>
                                </Button>
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
            id: "path",
            header: "Transfer Path",
            cell: ({ row }) => {
                const transfer = row.original;
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Badge variant="outline" className="px-1.5 py-0 h-5 bg-background">FROM</Badge>
                            <span className="text-muted-foreground">{transfer.fromLocation?.name || transfer.fromWarehouse?.name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Badge variant="outline" className="px-1.5 py-0 h-5 bg-primary/5 text-primary border-primary/20">TO</Badge>
                            <span className="font-bold">{transfer.toLocation?.name || transfer.toWarehouse?.name}</span>
                        </div>
                    </div>
                );
            },
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
                        <Button variant="outline" size="sm" asChild className="h-8">
                            <Link href={`/erp/inventory/transactions/stock-transfer/slip/${transfer.id}`}>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                            </Link>
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
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Records</p>
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
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed Transfers</p>
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
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
                            <h3 className="text-2xl font-extrabold text-amber-600 tracking-tight mt-1">{pendingCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty Transferred (Page)</p>
                            <h3 className="text-2xl font-extrabold text-indigo-600 tracking-tight mt-1">{totalQtyTransferred}</h3>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                        <div className="space-y-1.5 lg:col-span-1">
                            <Label htmlFor="search" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Request / SKU</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="TR-... or SKU"
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
                                    <SelectItem value="PENDING_CHECKER">Pending Checker</SelectItem>
                                    <SelectItem value="PENDING_AUTHORIZER">Pending Authorizer</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
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

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-dashed">
                        <div className="flex gap-2">
                            <Button onClick={applyFilters} disabled={loading} size="sm" className="font-semibold shadow-xs">
                                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                                {loading ? "Applying..." : "Apply Filters"}
                            </Button>
                            <Button onClick={resetFilters} variant="outline" size="sm" className="font-semibold shadow-xs" disabled={loading}>
                                Reset
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Redesigned DataTable with SSR Pagination & Sorting */}
            <DataTable
                tableId="stock-transfer-history-table"
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
                canBulkEdit={false}
                canBulkDelete={false}
                canRowEdit={false}
                canRowDelete={false}
            />
        </div>
    );
}
