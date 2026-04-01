"use client";

import { useState, useCallback, useTransition } from "react";
import { StockLedgerEntry, MovementType } from "@/lib/api";
import { getStockLedger } from "@/lib/actions/stock-ledger";
import { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import DataTable from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Movement type config ────────────────────────────────────────────
const MOVEMENT_META: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
    INBOUND: {
        label: "Inbound",
        variant: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: <ArrowDownCircle className="h-3 w-3" />,
    },
    OUTBOUND: {
        label: "Outbound",
        variant: "bg-red-50 text-red-700 border-red-200",
        icon: <ArrowUpCircle className="h-3 w-3" />,
    },
    TRANSFER: {
        label: "Transfer",
        variant: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <ArrowLeftRight className="h-3 w-3" />,
    },
    ADJUSTMENT: {
        label: "Adjustment",
        variant: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <SlidersHorizontal className="h-3 w-3" />,
    },
    OPENING_BALANCE: {
        label: "Opening Balance",
        variant: "bg-purple-50 text-purple-700 border-purple-200",
        icon: <ArrowDownCircle className="h-3 w-3" />,
    },
};

// ─── Columns ─────────────────────────────────────────────────────────
const columns: ColumnDef<StockLedgerEntry>[] = [
    {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
            <span className="text-sm tabular-nums whitespace-nowrap">
                {format(new Date(row.original.createdAt), "dd MMM yyyy, HH:mm")}
            </span>
        ),
    },
    {
        accessorKey: "sku",
        header: "Item",
        accessorFn: (row) => row.item?.sku ?? row.itemId,
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium text-sm">{row.original.item?.sku || row.original.itemId}</span>
                {row.original.item?.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {row.original.item.description}
                    </span>
                )}
            </div>
        ),
    },
    {
        accessorKey: "warehouse",
        header: "Warehouse",
        accessorFn: (row) => row.warehouse?.name ?? row.warehouseId,
        cell: ({ row }) => (
            <span className="text-sm">{row.original.warehouse?.name || row.original.warehouseId}</span>
        ),
    },
    {
        accessorKey: "movementType",
        header: "Type",
        cell: ({ row }) => {
            const meta = MOVEMENT_META[row.original.movementType] ?? {
                label: row.original.movementType,
                variant: "bg-muted text-muted-foreground border-border",
                icon: null,
            };
            return (
                <Badge variant="outline" className={cn("flex items-center gap-1 w-fit text-xs", meta.variant)}>
                    {meta.icon}
                    {meta.label}
                </Badge>
            );
        },
    },
    {
        accessorKey: "qty",
        header: "Quantity",
        cell: ({ row }) => {
            const qty = Number(row.original.qty);
            const isOut = qty < 0;
            return (
                <span className={cn("font-semibold tabular-nums text-sm", isOut ? "text-red-600" : "text-emerald-600")}>
                    {isOut ? "" : "+"}{qty.toFixed(2)}
                </span>
            );
        },
    },
    {
        accessorKey: "unitCost",
        header: "Unit Cost (PKR)",
        cell: ({ row }) => (
            <span className="text-sm tabular-nums text-right block">
                {row.original.unitCost
                    ? Number(row.original.unitCost).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"}
            </span>
        ),
    },
    {
        accessorKey: "totalCost",
        header: "Total (PKR)",
        accessorFn: (row) => row.rate && row.qty ? Number(row.rate) * Number(row.qty) : null,
        cell: ({ row }) => {
            const total = row.original.rate && row.original.qty
                ? Math.abs(Number(row.original.rate) * Number(row.original.qty))
                : null;
            return (
                <span className="text-sm tabular-nums font-medium text-right block">
                    {total != null
                        ? total.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "—"}
                </span>
            );
        },
    },
    {
        accessorKey: "referenceType",
        header: "Ref. Type",
        cell: ({ row }) => (
            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                {row.original.referenceType}
            </span>
        ),
    },
    {
        accessorKey: "referenceId",
        header: "Reference",
        cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground">
                #{row.original.referenceId.slice(0, 8)}
            </span>
        ),
    },
];

// ─── Filter options ───────────────────────────────────────────────────
const MOVEMENT_FILTER_OPTIONS = [
    { label: "Inbound", value: MovementType.INBOUND },
    { label: "Outbound", value: MovementType.OUTBOUND },
    { label: "Transfer", value: MovementType.TRANSFER },
    { label: "Adjustment", value: MovementType.ADJUSTMENT },
    { label: "Opening Balance", value: MovementType.OPENING_BALANCE },
];

const REFERENCE_TYPE_OPTIONS = [
    { label: "GRN", value: "GRN" },
    { label: "POS Sale", value: "POS_SALE" },
    { label: "POS Return", value: "POS_RETURN" },
    { label: "POS Void", value: "POS_VOID" },
    { label: "Transfer", value: "TRANSFER" },
    { label: "Adjustment", value: "ADJUSTMENT" },
    { label: "Landed Cost", value: "LANDED_COST" },
    { label: "Opening Balance", value: "OPENING_BALANCE" },
];

interface StockReceivedListProps {
    initialEntries: StockLedgerEntry[];
    initialMeta?: { total: number; page: number; limit: number; totalPages: number };
}

export function StockReceivedList({ initialEntries, initialMeta }: StockReceivedListProps) {
    const [entries, setEntries] = useState<StockLedgerEntry[]>(initialEntries);
    const [meta, setMeta] = useState(initialMeta ?? { total: initialEntries.length, page: 1, limit: 50, totalPages: 1 });
    const [isPending, startTransition] = useTransition();

    // Active server-side filters
    const [activeMovementType, setActiveMovementType] = useState<string>("");
    const [activeReferenceType, setActiveReferenceType] = useState<string>("");

    const fetchPage = useCallback((pagination: PaginationState, movementType?: string, referenceType?: string) => {
        startTransition(async () => {
            const result = await getStockLedger({
                page: pagination.pageIndex + 1,
                limit: pagination.pageSize,
                movementType: (movementType && movementType !== "all") ? movementType as MovementType : undefined,
                referenceType: (referenceType && referenceType !== "all") ? referenceType : undefined,
            });
            if (result?.status !== false) {
                setEntries(result.data ?? []);
                setMeta(result.meta ?? meta);
            }
        });
    }, []);

    const handlePaginationChange = useCallback((pagination: PaginationState) => {
        fetchPage(pagination, activeMovementType, activeReferenceType);
    }, [activeMovementType, activeReferenceType, fetchPage]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        const newMovement = key === "movementType" ? value : activeMovementType;
        const newRefType = key === "referenceType" ? value : activeReferenceType;

        if (key === "movementType") setActiveMovementType(value);
        if (key === "referenceType") setActiveReferenceType(value);

        fetchPage({ pageIndex: 0, pageSize: meta.limit }, newMovement, newRefType);
    }, [activeMovementType, activeReferenceType, meta.limit, fetchPage]);

    return (
        <DataTable
            tableId="stock-ledger"
            title="Stock Ledger"
            columns={columns}
            data={entries}
            isLoading={isPending}
            searchFields={[
                { key: "sku", label: "SKU" },
                { key: "referenceType", label: "Ref. Type" },
            ]}
            filters={[
                {
                    key: "movementType",
                    label: "Movement",
                    options: MOVEMENT_FILTER_OPTIONS,
                },
                {
                    key: "referenceType",
                    label: "Reference Type",
                    options: REFERENCE_TYPE_OPTIONS,
                },
            ]}
            onFilterChange={handleFilterChange}
            manualPagination
            rowCount={meta.total}
            pageCount={meta.totalPages}
            onPaginationChange={handlePaginationChange}
        />
    );
}
