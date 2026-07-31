"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Printer, Download, Eye, CheckCircle2, XCircle, Store, Building2 } from "lucide-react";
import { ReceiptVoucher, updateReceiptVoucherStatus, queueReceiptVouchersExport } from "@/lib/actions/receipt-voucher";
import { RetailSaleReceiptVoucherPrint } from "./retail-sale-receipt-voucher-print";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import DataTable from "@/components/common/data-table";
import { ColumnDef } from "@tanstack/react-table";

export function RetailSaleReceiptVoucherList({
    initialData,
    permissions,
}: {
    initialData: ReceiptVoucher[];
    permissions?: {
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canApprove: boolean;
    };
}) {
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
    const [toDate, setToDate] = useState<Date | undefined>(undefined);
    const [vouchers, setVouchers] = useState<ReceiptVoucher[]>(initialData);
    const [printingVoucher, setPrintingVoucher] = useState<ReceiptVoucher | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setVouchers(initialData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, [initialData]);

    useEffect(() => {
        const handleAfterPrint = () => setPrintingVoucher(null);
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    const handlePrint = (voucher: ReceiptVoucher) => {
        setPrintingVoucher(voucher);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await queueReceiptVouchersExport({
                type: "rs_rv",
                dateFrom: fromDate ? fromDate.toISOString().split("T")[0] : undefined,
                dateTo: toDate ? toDate.toISOString().split("T")[0] : undefined,
            });
            if (result.status) {
                toast.success("Export queued! You'll receive a notification when ready.");
            } else {
                toast.error(result.message || "Failed to queue export.");
            }
        } catch {
            toast.error("An unexpected error occurred while queuing export.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
        try {
            const res = await updateReceiptVoucherStatus(id, newStatus);
            if (res.status) {
                toast.success(`Voucher ${newStatus} successfully`);
                setVouchers(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
            } else {
                toast.error(res.message || "Failed to update status");
            }
        } catch {
            toast.error("An unexpected error occurred");
        }
    };

    const filteredData = vouchers.filter(v => {
        if (fromDate) {
            const vDate = new Date(v.rvDate);
            if (vDate < fromDate) return false;
        }
        if (toDate) {
            const vDate = new Date(v.rvDate);
            if (vDate > toDate) return false;
        }
        return true;
    });

    const columns: ColumnDef<ReceiptVoucher>[] = [
        {
            accessorKey: "rvNo",
            header: "RSRV No",
            cell: ({ row }) => (
                <div className="font-semibold text-blue-700 font-mono text-xs">
                    {row.original.rvNo}
                    {row.original.folio && (
                        <div className="text-[10px] text-gray-500 font-sans">
                            Folio: <span className="font-mono text-gray-700">{row.original.folio}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "outlet",
            header: "Outlet / Location",
            cell: ({ row }) => {
                const outletTag = row.original.details?.find(d => d.tagAccountCode || d.tagAccountName);
                const code = outletTag?.tagAccountCode;
                const name = outletTag?.tagAccountName;
                if (!code && !name) {
                    return <span className="text-gray-400 text-xs">—</span>;
                }
                return (
                    <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div className="text-xs">
                            {code && <span className="font-bold text-gray-800 mr-1">[{code}]</span>}
                            <span className="font-medium text-gray-700">{name || "Outlet"}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "rvDate",
            header: "Date",
            cell: ({ row }) => (
                <div className="text-xs font-medium text-gray-700">
                    {row.original.rvDate ? format(new Date(row.original.rvDate), "dd-MMM-yyyy") : "—"}
                </div>
            ),
        },
        {
            accessorKey: "debitAmount",
            header: () => <div className="text-right">Amount (PKR)</div>,
            cell: ({ row }) => {
                const total = row.original.details?.reduce((sum, d) => sum + (Number(d.debit) || 0), 0) || row.original.debitAmount || 0;
                return (
                    <div className="text-right font-semibold text-xs tabular-nums">
                        {total.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </div>
                );
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const st = row.original.status;
                let badgeClass = "bg-gray-100 text-gray-800 border-gray-300";
                if (st === "approved") badgeClass = "bg-green-50 text-green-700 border-green-200";
                if (st === "rejected") badgeClass = "bg-red-50 text-red-700 border-red-200";
                if (st === "pending_check" || st === "pending_approval") badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeClass}`}>
                        {st.replace(/_/g, " ").toUpperCase()}
                    </span>
                );
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const v = row.original;
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-600 hover:text-blue-600"
                            onClick={() => handlePrint(v)}
                            title="Print RSRV"
                        >
                            <Printer className="h-3.5 w-3.5" />
                        </Button>
                        {permissions?.canApprove && v.status !== "approved" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:bg-green-50"
                                onClick={() => handleUpdateStatus(v.id, "approved")}
                                title="Approve RSRV"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <Card className="shadow-sm border border-gray-200">
                <CardHeader className="pb-3 border-b bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                Retail Sale Receipt Vouchers (RSRV)
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Daily POS outlet reconciliation receipt vouchers
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={isExporting}
                                className="h-8 text-xs gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export Excel
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-600">Date Range:</span>
                            <DateRangePicker
                                from={fromDate}
                                to={toDate}
                                onSelect={(range) => {
                                    setFromDate(range?.from);
                                    setToDate(range?.to);
                                }}
                            />
                        </div>
                        {(fromDate || toDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                onClick={() => {
                                    setFromDate(undefined);
                                    setToDate(undefined);
                                }}
                            >
                                Clear Dates
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        searchKey="rvNo"
                        placeholder="Search RSRV number or details..."
                    />
                </CardContent>
            </Card>

            {/* Print Container */}
            {mounted && printingVoucher && createPortal(
                <div className="fixed inset-0 bg-white z-[9999] overflow-auto p-8 print:p-0 print:static">
                    <RetailSaleReceiptVoucherPrint voucher={printingVoucher} />
                </div>,
                document.body
            )}
        </div>
    );
}
