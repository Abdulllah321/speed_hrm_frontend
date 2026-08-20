"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Download, Plus, CreditCard, Wallet, Eye, CheckCircle2, XCircle, FileCheck, Send, Loader2, RotateCcw } from "lucide-react";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { PaymentVoucher, updatePaymentVoucherStatus, markPaymentVoucherAsPrinted, unapprovePaymentVoucher } from "@/lib/actions/payment-voucher";
import { queuePaymentVouchersExport } from "@/lib/actions/payment-voucher";
import { PaymentVoucherPrint } from "./payment-voucher-print";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { toast } from "sonner";
import DataTable from "@/components/common/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface LocalDraft {
    voucherNo: string;
    updatedAt: string;
    formValues: {
        description?: string;
        type?: string;
        pvDate?: string | Date;
        details?: { accountId?: string; debit?: number; credit?: number }[];
    };
}

export function PaymentVoucherList({
    initialData,
    pagination,
    initialFilters,
    accounts,
    permissions,
}: {
    initialData: PaymentVoucher[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    initialFilters?: {
        type?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
        accountId?: string;
        search?: string;
        page?: number;
        limit?: number;
    };
    accounts: ChartOfAccount[];
    permissions?: {
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canApprove: boolean;
    };
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [type, setType] = useState<"bank" | "cash">(
        (searchParams.get("type") as "bank" | "cash") || (initialFilters?.type as "bank" | "cash") || "bank"
    );
    const [fromDate, setFromDate] = useState<Date | undefined>(
        searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : initialFilters?.fromDate ? new Date(initialFilters.fromDate) : undefined
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : initialFilters?.toDate ? new Date(initialFilters.toDate) : undefined
    );
    const [selectedAccount, setSelectedAccount] = useState<string>(
        searchParams.get("accountId") || initialFilters?.accountId || "all"
    );
    const [status, setStatus] = useState<string>(
        searchParams.get("status") || initialFilters?.status || "all"
    );
    const [vouchers, setVouchers] = useState<PaymentVoucher[]>(initialData);
    const [showFilterInfo, setShowFilterInfo] = useState(false);
    const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);
    const [printingVoucher, setPrintingVoucher] = useState<PaymentVoucher | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(
        searchParams.get("search") || initialFilters?.search || ""
    );

    const updateUrlParams = (updates: Record<string, string | null | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, val]) => {
            if (val === undefined || val === null || val === "" || val === "all") {
                params.delete(key);
            } else {
                params.set(key, val);
            }
        });
        if (!("page" in updates)) {
            params.delete("page");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setVouchers(initialData);
    }, [initialData]);

    useEffect(() => {
        const s = searchParams.get("status") || initialFilters?.status || "all";
        setStatus(s);
        const t = (searchParams.get("type") as "bank" | "cash") || (initialFilters?.type as "bank" | "cash") || "bank";
        setType(t);
        const acc = searchParams.get("accountId") || initialFilters?.accountId || "all";
        setSelectedAccount(acc);
        const q = searchParams.get("search") || initialFilters?.search || "";
        setSearchTerm(q);
        const fd = searchParams.get("fromDate") || initialFilters?.fromDate;
        setFromDate(fd ? new Date(fd) : undefined);
        const td = searchParams.get("toDate") || initialFilters?.toDate;
        setToDate(td ? new Date(td) : undefined);
    }, [searchParams, initialFilters]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await queuePaymentVouchersExport({
                type:        type,
                status:      status !== "all" ? status : undefined,
                dateFrom:    fromDate ? fromDate.toISOString().split("T")[0] : undefined,
                dateTo:      toDate   ? toDate.toISOString().split("T")[0]   : undefined,
                accountId:   selectedAccount !== "" && selectedAccount !== "all" ? selectedAccount : undefined,
                search:      searchTerm.trim() ? searchTerm.trim() : undefined,
                ids:         selectedVoucherIds.length > 0 ? selectedVoucherIds : undefined,
            });
            if (result.status) {
                toast.success(
                    selectedVoucherIds.length > 0
                        ? `Export queued for ${selectedVoucherIds.length} selected voucher(s)!`
                        : "Export queued! You'll receive a notification when your file is ready."
                );
            } else {
                toast.error(result.message || "Failed to queue export.");
            }
        } catch {
            toast.error("An unexpected error occurred while queuing export.");
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const handleAfterPrint = () => {
            setPrintingVoucher(null);
        };
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    const handlePrint = async (voucher: PaymentVoucher) => {
        setPrintingVoucher(voucher);
        setTimeout(() => {
            window.print();
        }, 100);
        try {
            const res = await markPaymentVoucherAsPrinted(voucher.id);
            if (res.status && res.data?.lastPrintedAt) {
                setVouchers(prev =>
                    prev.map(v => v.id === voucher.id ? { ...v, lastPrintedAt: res.data.lastPrintedAt } : v)
                );
            }
        } catch {}
    };

    useEffect(() => {
        const draftsJson = localStorage.getItem("payment-voucher-drafts");
        if (draftsJson) {
            try {
                const parsed = JSON.parse(draftsJson);
                setTimeout(() => {
                    setLocalDrafts(Object.values(parsed));
                }, 0);
            } catch {}
        }
    }, []);

    const handleDiscardDraft = (draftId: string) => {
        const draftsJson = localStorage.getItem("payment-voucher-drafts");
        if (draftsJson) {
            try {
                const parsed = JSON.parse(draftsJson);
                delete parsed[draftId];
                localStorage.setItem("payment-voucher-drafts", JSON.stringify(parsed));
                setLocalDrafts(Object.values(parsed));
                toast.success("Draft discarded");
            } catch {}
        }
    };

    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const mostRecentlyPrintedVoucher = useMemo(() => {
        const printed = vouchers.filter(v => v.lastPrintedAt);
        if (printed.length === 0) return null;
        return printed.reduce((latest, current) => {
            return new Date(current.lastPrintedAt!).getTime() > new Date(latest.lastPrintedAt!).getTime()
                ? current
                : latest;
        });
    }, [vouchers]);

    // Use initial data directly as it comes from the server
    useEffect(() => {
        setTimeout(() => {
            setVouchers(initialData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }, 0);
    }, [initialData]);

    const handleUpdateStatus = async (id: string, newStatus: "draft" | "pending_check" | "pending_approval" | "approved" | "rejected") => {
        if (updatingStatusId) return;
        try {
            setUpdatingStatusId(id);
            const res = await updatePaymentVoucherStatus(id, newStatus);
            if (res.status) {
                toast.success(`Payment Voucher ${newStatus} successfully`);
                setVouchers(prev => prev.map(v => v.id === id ? { ...v, status: newStatus as const } : v));
            } else {
                toast.error(res.message || "Failed to update voucher status");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleUnapprove = async (id: string) => {
        if (updatingStatusId) return;
        try {
            setUpdatingStatusId(id);
            const res = await unapprovePaymentVoucher(id);
            if (res.status) {
                toast.success("Payment Voucher unapproved & unposted successfully");
                setVouchers(prev => prev.map(v => v.id === id ? { ...v, status: "pending_check" as const } : v));
            } else {
                toast.error(res.message || "Failed to unapprove voucher");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const columns = useMemo<ColumnDef<PaymentVoucher>[]>(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "pvNo",
            header: "P.V. No.",
            cell: ({ row }) => (
                <Link
                    href={`/erp/finance/payment-voucher/${row.original.id}`}
                    className="font-mono font-medium text-primary hover:underline"
                    transitionTypes={["nav-forward"]}
                >
                    {row.original.pvNo}
                </Link>
            )
        },
        {
            accessorKey: "pvDate",
            header: "P.V. Date",
            cell: ({ row }) => format(new Date(row.original.pvDate), "dd-MM-yyyy")
        },
        {
            accessorKey: "refBillNo",
            header: "Ref / Bill No.",
            cell: ({ row }) => row.original.refBillNo || "-"
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => <div className="truncate max-w-[150px]">{row.original.description || "-"}</div>
        },
        {
            id: "details",
            header: "Debit / Credit",
            cell: ({ row }) => {
                const debitLines  = row.original.details.filter(d => Number(d.debit)  > 0);
                const creditLines = row.original.details.filter(d => Number(d.credit) > 0);
                return (
                    <div className="flex flex-col">
                        <div className="space-y-0.5 min-w-[280px] max-h-36 overflow-y-auto pr-1.5 border border-muted/20 rounded-md p-1.5 bg-muted/10">
                            {/* Debit lines */}
                            {debitLines.map((d, di) => (
                                <div key={`dr-${di}`} className="space-y-0.5">
                                    <div className="flex justify-between text-xs gap-3">
                                        <span className="text-blue-600 font-medium truncate max-w-[200px]">
                                            {d.accountCode ? `${d.accountCode} ` : ""}{d.accountName}
                                        </span>
                                        <span className="font-bold tabular-nums shrink-0">
                                            {Number(d.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {(d.tagAccountCode || d.tagAccountName) && (
                                        <span className="block text-[9px] text-muted-foreground uppercase pl-2">
                                            ↳ {d.tagAccountCode ? `${d.tagAccountCode} ` : ""}{d.tagAccountName}
                                        </span>
                                    )}
                                    {d.narration && (
                                        <span className="block text-[10px] text-muted-foreground italic pl-2">
                                            {d.narration}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {/* Divider */}
                            <div className="border-t border-dashed border-border my-0.5" />
                            {/* Credit lines — from details if present, else fallback to header */}
                            {creditLines.length > 0
                                ? creditLines.map((d, ci) => (
                                    <div key={`cr-${ci}`} className="space-y-0.5 opacity-70 italic">
                                        <div className="flex justify-between text-xs gap-3">
                                            <span className="text-green-600 truncate max-w-[200px]">
                                                (Cr: {d.accountCode ? `${d.accountCode} ` : ""}{d.accountName})
                                            </span>
                                            <span className="tabular-nums shrink-0">
                                                {Number(d.credit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {(d.tagAccountCode || d.tagAccountName) && (
                                            <span className="block text-[9px] text-muted-foreground uppercase pl-4">
                                                ↳ {d.tagAccountCode ? `${d.tagAccountCode} ` : ""}{d.tagAccountName}
                                            </span>
                                        )}
                                        {d.narration && (
                                            <span className="block text-[10px] text-muted-foreground pl-2">
                                                {d.narration}
                                            </span>
                                        )}
                                    </div>
                                ))
                                : (
                                    <div className="flex justify-between text-xs opacity-70 italic">
                                        <span className="text-green-600 truncate max-w-[200px]">
                                            (Cr: {row.original.creditAccountName})
                                        </span>
                                        <span className="tabular-nums shrink-0">
                                            {Number(row.original.creditAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )
                            }
                        </div>
                        {row.original.details.length > 5 && (
                            <div className="text-[10px] text-muted-foreground font-semibold mt-1 text-center">
                                Total {row.original.details.length} lines (scroll to see all)
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const st = (row.original.status || "draft").toLowerCase();
                const isApproved = st === "approved";
                const isPendingApproval = st === "pending_approval";
                const isPendingCheck = st === "pending_check" || st === "pending";
                const isDraft = st === "draft";

                const badgeClass = isApproved
                    ? "bg-green-600 text-white"
                    : isPendingApproval
                        ? "bg-blue-600 text-white"
                        : isPendingCheck
                            ? "bg-amber-500 text-white"
                            : isDraft
                                ? "bg-slate-500 text-white"
                                : "bg-red-600 text-white";
                const label = isApproved
                    ? "APPROVED"
                    : isPendingApproval
                        ? "PENDING APPROVAL"
                        : isPendingCheck
                            ? "PENDING CHECK"
                            : isDraft
                                ? "DRAFT"
                                : "REJECTED";
                return (
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white whitespace-nowrap",
                        badgeClass
                    )}>
                        {label}
                    </span>
                );
            }
        },
        {
            accessorKey: "lastPrintedAt",
            header: "Last Printed At",
            cell: ({ row }) => {
                const lp = row.original.lastPrintedAt;
                const isMostRecent = mostRecentlyPrintedVoucher?.id === row.original.id;

                if (!lp) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted/40 text-muted-foreground italic border border-muted/30">
                            Not Printed
                        </span>
                    );
                }

                return (
                    <div className="flex flex-col gap-1 items-start">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium border shadow-xs transition-colors whitespace-nowrap",
                            isMostRecent
                                ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700 font-semibold"
                                : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                        )}>
                            <Printer className={cn("h-3 w-3", isMostRecent ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400")} />
                            {format(new Date(lp), "dd-MMM-yyyy hh:mm a")}
                        </span>
                        {isMostRecent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white dark:bg-blue-500 dark:text-slate-950 shadow-xs tracking-wider whitespace-nowrap">
                                ★ Last Printed
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const st = (row.original.status || "draft").toLowerCase();
                const isDraft = st === "draft";
                const isPendingCheck = st === "pending_check" || st === "pending";
                const isApproved = st === "approved";
                const isRejected = st === "rejected";

                return (
                    <div className="flex items-center gap-1.5">
                        <Link
                            href={`/erp/finance/payment-voucher/${row.original.id}`}
                            transitionTypes={["nav-forward"]}
                        >
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details">
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrint(row.original)}
                            className="h-7 w-7 hover:bg-muted text-primary"
                            title="Print Voucher"
                        >
                            <Printer className="h-3.5 w-3.5" />
                        </Button>
                        {isDraft && (
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingStatusId === row.original.id}
                                onClick={() => handleUpdateStatus(row.original.id, "pending_check")}
                                className="h-7 w-7 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600"
                                title="Submit for Check"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {isPendingCheck && (
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingStatusId === row.original.id}
                                onClick={() => handleUpdateStatus(row.original.id, "pending_approval")}
                                className="h-7 w-7 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600"
                                title="Check & Verify"
                            >
                                <FileCheck className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {isApproved && (
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingStatusId === row.original.id}
                                onClick={() => handleUnapprove(row.original.id)}
                                className="h-7 w-7 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600"
                                title="Unapprove & Unpost Voucher"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {!isApproved && !isRejected && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={updatingStatusId === row.original.id}
                                    onClick={() => handleUpdateStatus(row.original.id, "approved")}
                                    className="h-7 w-7 hover:bg-green-50 dark:hover:bg-green-950/20 text-green-600"
                                    title="Authorize & Approve"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={updatingStatusId === row.original.id}
                                    onClick={() => handleUpdateStatus(row.original.id, "rejected")}
                                    className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                                    title="Reject Voucher"
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                </Button>
                            </>
                        )}
                    </div>
                );
            }
        }
    ], [permissions, handlePrint, handleUpdateStatus, handleUnapprove, updatingStatusId, mostRecentlyPrintedVoucher]);

    return (
        <div className="space-y-6">
            {localDrafts.length > 0 && (
                <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/50 rounded-xl p-5 backdrop-blur-md shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/30 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm uppercase tracking-wider">
                                Unsaved Drafts ({localDrafts.length})
                            </h3>
                        </div>
                        <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                            Saved locally in your browser to prevent data loss
                        </p>
                    </div>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                        {localDrafts.map((draft) => (
                            <div
                                key={draft.voucherNo}
                                className="flex items-center justify-between p-3.5 rounded-lg border border-amber-200/40 bg-white/70 dark:bg-muted/30 dark:border-amber-900/20 shadow-sm transition-all duration-200 hover:shadow"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                                            {draft.voucherNo}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {format(new Date(draft.updatedAt), "dd MMM yyyy, hh:mm a")}
                                        </span>
                                        <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                            {draft.formValues?.type || "bank"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                                        {draft.formValues?.description || "No description provided"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/erp/finance/payment-voucher/create?draftId=${draft.voucherNo}`}>
                                        <Button size="sm" variant="secondary" className="bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 font-semibold h-8">
                                            Resume
                                        </Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDiscardDraft(draft.voucherNo)}
                                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    >
                                        Discard
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {mostRecentlyPrintedVoucher && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 shadow-xs">
                    <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>
                            <strong>Last Printed Voucher:</strong>{" "}
                            <Link
                                href={`/erp/finance/payment-voucher/${mostRecentlyPrintedVoucher.id}`}
                                className="font-mono font-bold underline hover:text-blue-700 dark:hover:text-blue-100"
                            >
                                {mostRecentlyPrintedVoucher.pvNo}
                            </Link>{" "}
                            was printed on{" "}
                            <span className="font-mono font-semibold">
                                {format(new Date(mostRecentlyPrintedVoucher.lastPrintedAt!), "dd-MMM-yyyy 'at' hh:mm a")}
                            </span>
                        </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white shrink-0">
                        Most Recent
                    </span>
                </div>
            )}
            <Tabs value={type} onValueChange={(val) => { const newType = val as "bank" | "cash"; setType(newType); updateUrlParams({ type: newType }); }} className="w-full">
                <Card>
                    <CardHeader className="border-b dark:border-border space-y-4">
                        <div className="flex items-center justify-between w-full">
                            <div className="space-y-1">
                                <CardTitle>Payment Vouchers</CardTitle>
                                <p className="text-sm text-muted-foreground">Manage your bank and cash payments</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {permissions?.canCreate && (
                                    <Link href="/erp/finance/payment-voucher/create" transitionTypes={["nav-forward"]}>
                                        <Button size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Payment Voucher
                                        </Button>
                                    </Link>
                                )}
                                <Button variant="outline" size="sm">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                                    {isExporting
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        : <Download className="mr-2 h-4 w-4" />}
                                    {isExporting
                                        ? "Queuing..."
                                        : selectedVoucherIds.length > 0
                                            ? `Export Selected (${selectedVoucherIds.length})`
                                            : "Export (xlsx)"}
                                </Button>
                            </div>
                        </div>
                        <TabsList variant="card" className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="bank" className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Bank Payment Vouchers
                            </TabsTrigger>
                            <TabsTrigger value="cash" className="flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Cash Payment Vouchers
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 rounded-lg border dark:border-border">
                            <div className="space-y-1.5 overflow-hidden">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Date Range</Label>
                                <DateRangePicker
                                    initialDateFrom={fromDate}
                                    initialDateTo={toDate}
                                    onUpdate={(values) => {
                                        setFromDate(values.range.from);
                                        setToDate(values.range.to);
                                        updateUrlParams({
                                            fromDate: values.range.from ? values.range.from.toISOString().split("T")[0] : undefined,
                                            toDate: values.range.to ? values.range.to.toISOString().split("T")[0] : undefined,
                                        });
                                    }}
                                    align="start"
                                    locale="en-GB"
                                    showCompare={false}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Account head</Label>
                                <Autocomplete
                                    options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                                    value={selectedAccount}
                                    onValueChange={(val) => {
                                        setSelectedAccount(val);
                                        updateUrlParams({ accountId: val });
                                    }}
                                    placeholder="Select Account"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Voucher Status</Label>
                                <Select value={status} onValueChange={(val) => {
                                    setStatus(val);
                                    updateUrlParams({ status: val });
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="pending_check">Pending Check</SelectItem>
                                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowFilterInfo(true)}
                                >
                                    View Range Wise Data Filter
                                </Button>
                            </div>
                        </div>

                        {showFilterInfo && fromDate && toDate && (
                            <div className="text-sm font-bold italic text-slate-800 dark:text-slate-200 py-2 border-b dark:border-border">
                                {type === "bank" ? "Bank" : "Cash"} Payment Voucher List From :
                                <span className="text-red-600 ml-1 font-mono">{format(fromDate, "dd-MM-yyyy")}</span>
                                <span className="mx-1">Between To</span>
                                <span className="text-red-600 font-mono">{format(toDate, "dd-MM-yyyy")}</span>
                            </div>
                        )}

                        <DataTable
                            columns={columns}
                            data={vouchers}
                            manualPagination={true}
                            rowCount={pagination?.total ?? vouchers.length}
                            pageCount={pagination?.totalPages ?? 1}
                            onPaginationChange={(pageState) => {
                                updateUrlParams({
                                    page: String(pageState.pageIndex + 1),
                                    limit: String(pageState.pageSize),
                                });
                            }}
                            manualFiltering={true}
                            onSearchChange={(searchVal) => {
                                setSearchTerm(searchVal);
                                updateUrlParams({ search: searchVal });
                            }}
                            searchFields={[{ key: "pvNo", label: "PV Number" }, { key: "description", label: "Description" }]}
                            tableId="payment-voucher-list"
                            enableRowSelection
                            onSelectionChange={setSelectedVoucherIds}
                        />
                    </CardContent>
                </Card>
            </Tabs>

            {/* Hidden Print Section */}
            {mounted && typeof window !== "undefined" && printingVoucher && createPortal(
                <>
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                          html, body {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            color: black !important;
                          }
                          body > *:not(#pv-print-section) {
                            display: none !important;
                          }
                          #pv-print-section, #pv-print-section * {
                            visibility: visible !important;
                          }
                          #pv-print-section {
                            display: block !important;
                            position: relative !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            color: black !important;
                            z-index: 99999 !important;
                          }
                          tr {
                            page-break-inside: avoid;
                            break-inside: avoid;
                          }
                          thead {
                            display: table-header-group;
                          }
                          tfoot {
                            display: table-row-group;
                          }
                          @page {
                            margin: 10mm;
                            size: A4 portrait;
                          }
                        }
                    `}} />
                    <div 
                        id="pv-print-section" 
                        style={{
                            position: "fixed",
                            left: "-9999px",
                            top: 0,
                            pointerEvents: "none",
                        }}
                        aria-hidden="true"
                    >
                        <PaymentVoucherPrint voucher={printingVoucher} />
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
