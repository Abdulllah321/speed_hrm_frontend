"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

// Icons
import {
    Printer,
    Download,
    Eye,
    Pencil,
    CheckCircle2,
    XCircle,
    Store,
    Building2,
    Plus,
    FileCheck,
    CheckSquare,
    Loader2,
    RotateCcw,
    RefreshCw,
    SlidersHorizontal,
    Filter,
    Calendar,
    Banknote,
    CreditCard,
    Percent,
    X,
    ChevronDown,
    Search,
    Receipt,
    Wallet,
    TrendingUp,
    ShieldCheck,
    Clock,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import DataTable from "@/components/common/data-table";

// Actions & Types
import {
    ReceiptVoucher,
    updateReceiptVoucherStatus,
    bulkUpdateReceiptVoucherStatus,
    queueReceiptVouchersExport,
    unapproveReceiptVoucher,
    getRsrvVouchers,
} from "@/lib/actions/receipt-voucher";
import { Location } from "@/lib/actions/location";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { RetailSaleReceiptVoucherPrint } from "./retail-sale-receipt-voucher-print";

export interface RetailSaleReceiptVoucherListProps {
    initialData: ReceiptVoucher[];
    locations?: Location[];
    accounts?: ChartOfAccount[];
    permissions?: {
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canApprove: boolean;
    };
}

type DatePreset =
    | "all_time"
    | "today"
    | "yesterday"
    | "last_7_days"
    | "this_month"
    | "last_month"
    | "last_30_days"
    | "custom";

export function RetailSaleReceiptVoucherList({
    initialData,
    locations = [],
    accounts = [],
    permissions,
}: RetailSaleReceiptVoucherListProps) {
    const [vouchers, setVouchers] = useState<ReceiptVoucher[]>(initialData);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters state
    const [statusTab, setStatusTab] = useState<string>("all");
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
    const [toDate, setToDate] = useState<Date | undefined>(undefined);
    const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>("all_time");

    const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
    const [selectedChannel, setSelectedChannel] = useState<string>("all");
    const [minAmount, setMinAmount] = useState<string>("");
    const [maxAmount, setMaxAmount] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Selection & Bulk Processing
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    // Export & Print
    const [isExporting, setIsExporting] = useState(false);
    const [printingVoucher, setPrintingVoucher] = useState<ReceiptVoucher | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setVouchers([...initialData].sort((a: ReceiptVoucher, b: ReceiptVoucher) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, [initialData]);

    useEffect(() => {
        const handleAfterPrint = () => setPrintingVoucher(null);
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    // Refresh data from server
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await getRsrvVouchers();
            if (res.status && res.data) {
                setVouchers([...res.data].sort((a: ReceiptVoucher, b: ReceiptVoucher) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                toast.success("Voucher list refreshed successfully");
            } else {
                toast.error("Failed to refresh voucher data");
            }
        } catch {
            toast.error("An error occurred while refreshing");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Print handler
    const handlePrint = (voucher: ReceiptVoucher) => {
        setPrintingVoucher(voucher);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    // Export handler (with current active filters)
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await queueReceiptVouchersExport({
                type: "rs_rv",
                status: statusTab !== "all" ? statusTab : undefined,
                dateFrom: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
                dateTo: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
                search: searchQuery.trim() || undefined,
                ids: selectedIds.length > 0 ? selectedIds : undefined,
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

    // Status Updates
    const handleUpdateStatus = async (
        id: string,
        newStatus: "draft" | "pending_check" | "pending_approval" | "approved" | "rejected"
    ) => {
        try {
            setUpdatingStatusId(id);
            const res = await updateReceiptVoucherStatus(id, newStatus);
            if (res.status) {
                toast.success(`Voucher status updated to ${newStatus.replace(/_/g, " ")}`);
                setVouchers(prev => prev.map(v => (v.id === id ? { ...v, status: newStatus } : v)));
            } else {
                toast.error(res.message || "Failed to update status");
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
            const res = await unapproveReceiptVoucher(id);
            if (res.status) {
                toast.success("Retail Sale Receipt Voucher unapproved & unposted successfully");
                setVouchers(prev => prev.map(v => (v.id === id ? { ...v, status: "pending_check" as const } : v)));
            } else {
                toast.error(res.message || "Failed to unapprove voucher");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleBulkUpdateStatus = async (
        newStatus: "pending_approval" | "approved" | "rejected"
    ) => {
        if (selectedIds.length === 0) return;
        setIsBulkProcessing(true);
        try {
            const res = await bulkUpdateReceiptVoucherStatus(selectedIds, newStatus);
            if (res.status) {
                toast.success(res.message);
                setVouchers(prev =>
                    prev.map(v => (selectedIds.includes(v.id) ? { ...v, status: newStatus } : v))
                );
                setSelectedIds([]);
            } else {
                toast.error(res.message || "Bulk update failed");
            }
        } catch {
            toast.error("An error occurred during bulk operation");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    // Available Outlets (extracted from passed locations and vouchers details)
    const outletsList = useMemo(() => {
        const map = new Map<string, { code: string; name: string }>();

        // From locations API
        locations.forEach(loc => {
            if (loc.code) {
                map.set(loc.code.toUpperCase(), {
                    code: loc.code.toUpperCase(),
                    name: loc.name || loc.code,
                });
            }
        });

        // From voucher details
        vouchers.forEach(v => {
            v.details?.forEach(d => {
                const code = d.tagAccountCode || d.tagAccount?.code;
                const name = d.tagAccountName || d.tagAccount?.name;
                if (code) {
                    const upper = code.toUpperCase();
                    if (!map.has(upper)) {
                        map.set(upper, {
                            code: upper,
                            name: name || code,
                        });
                    }
                }
            });
        });

        return Array.from(map.values()).sort(
            (a: { code: string; name: string }, b: { code: string; name: string }) =>
                a.code.localeCompare(b.code)
        );
    }, [locations, vouchers]);

    // Apply quick date preset
    const handleApplyDatePreset = (preset: DatePreset) => {
        setActiveDatePreset(preset);
        const now = new Date();

        if (preset === "all_time") {
            setFromDate(undefined);
            setToDate(undefined);
            return;
        }

        if (preset === "today") {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            setFromDate(start);
            setToDate(end);
            return;
        }

        if (preset === "yesterday") {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
            const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
            setFromDate(start);
            setToDate(end);
            return;
        }

        if (preset === "last_7_days") {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            setFromDate(start);
            setToDate(end);
            return;
        }

        if (preset === "this_month") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            setFromDate(start);
            setToDate(end);
            return;
        }

        if (preset === "last_month") {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            setFromDate(start);
            setToDate(end);
            return;
        }

        if (preset === "last_30_days") {
            const start = new Date(now);
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            setFromDate(start);
            setToDate(end);
            return;
        }
    };

    // Reset all filters
    const handleResetAllFilters = () => {
        setStatusTab("all");
        setFromDate(undefined);
        setToDate(undefined);
        setActiveDatePreset("all_time");
        setSelectedOutlet("all");
        setSelectedChannel("all");
        setMinAmount("");
        setMaxAmount("");
        setSearchQuery("");
        setSelectedIds([]);
    };

    // Calculate voucher breakdown (Cash, Card, Commission)
    const getVoucherBreakdown = (v: ReceiptVoucher) => {
        let cash = 0;
        let card = 0;
        let commission = 0;

        v.details?.forEach(d => {
            const debit = Number(d.debit) || 0;
            if (debit <= 0) return;

            const accName = (d.accountName || d.account?.name || "").toLowerCase();
            const accCode = (d.accountCode || d.account?.code || "").toLowerCase();
            const narration = (d.narration || "").toLowerCase();

            if (accCode === "80210001" || narration.includes("commission")) {
                commission += debit;
            } else if (accCode === "31090001" || accName.includes("cash") || narration.includes("cash")) {
                cash += debit;
            } else if (
                accName.includes("bank") ||
                accName.includes("card") ||
                narration.includes("credit card") ||
                narration.includes("card sales")
            ) {
                card += debit;
            }
        });

        return { cash, card, commission };
    };

    // Filter data calculation
    const filteredData = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const minVal = minAmount !== "" && !isNaN(Number(minAmount)) ? Number(minAmount) : null;
        const maxVal = maxAmount !== "" && !isNaN(Number(maxAmount)) ? Number(maxAmount) : null;

        return vouchers.filter(v => {
            const st = (v.status || "draft").toLowerCase();

            // Status tab filter
            if (statusTab === "pending_check" && st !== "pending_check" && st !== "pending") return false;
            if (statusTab === "pending_approval" && st !== "pending_approval") return false;
            if (statusTab === "approved" && st !== "approved") return false;
            if (statusTab === "rejected" && st !== "rejected") return false;
            if (statusTab === "draft" && st !== "draft") return false;

            // Date Range
            if (fromDate) {
                const vDate = new Date(v.rvDate);
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);
                vDate.setHours(0, 0, 0, 0);
                if (vDate < from) return false;
            }
            if (toDate) {
                const vDate = new Date(v.rvDate);
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                vDate.setHours(0, 0, 0, 0);
                if (vDate > to) return false;
            }

            // Outlet / Location filter
            if (selectedOutlet && selectedOutlet !== "all") {
                const sel = selectedOutlet.toUpperCase();
                const outletMatch =
                    v.details?.some(d => {
                        const code = (d.tagAccountCode || d.tagAccount?.code || "").toUpperCase();
                        const name = (d.tagAccountName || d.tagAccount?.name || "").toUpperCase();
                        return code === sel || name.includes(sel);
                    }) ||
                    (v.description && v.description.toUpperCase().includes(sel)) ||
                    (v.remarks && v.remarks.toUpperCase().includes(sel));

                if (!outletMatch) return false;
            }

            // Payment Channel filter
            if (selectedChannel && selectedChannel !== "all") {
                const breakdown = getVoucherBreakdown(v);
                if (selectedChannel === "cash" && breakdown.cash <= 0) return false;
                if (selectedChannel === "card" && breakdown.card <= 0) return false;
                if (selectedChannel === "commission" && breakdown.commission <= 0) return false;
            }

            // Total Amount calculation & range filter
            const total =
                v.details?.reduce((sum, d) => sum + (Number(d.debit) || 0), 0) || Number(v.debitAmount) || 0;
            if (minVal !== null && total < minVal) return false;
            if (maxVal !== null && total > maxVal) return false;

            // Search query
            if (q) {
                const matchRvNo = v.rvNo?.toLowerCase().includes(q);
                const matchFolio = v.folio?.toLowerCase().includes(q);
                const matchDesc = v.description?.toLowerCase().includes(q);
                const matchRemarks = v.remarks?.toLowerCase().includes(q);
                const matchStatus = st.includes(q);
                const matchAmount =
                    total.toString().includes(q) ||
                    Math.round(total).toLocaleString().replace(/,/g, "").includes(q);
                const matchDetails = v.details?.some(d =>
                    (d.tagAccountName?.toLowerCase().includes(q) ||
                    d.tagAccountCode?.toLowerCase().includes(q) ||
                    d.accountName?.toLowerCase().includes(q) ||
                    d.accountCode?.toLowerCase().includes(q) ||
                    d.narration?.toLowerCase().includes(q))
                );

                if (!matchRvNo && !matchFolio && !matchDesc && !matchRemarks && !matchDetails && !matchStatus && !matchAmount) {
                    return false;
                }
            }

            return true;
        });
    }, [vouchers, statusTab, fromDate, toDate, selectedOutlet, selectedChannel, minAmount, maxAmount, searchQuery]);

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (fromDate || toDate) count++;
        if (selectedOutlet !== "all") count++;
        if (selectedChannel !== "all") count++;
        if (minAmount !== "") count++;
        if (maxAmount !== "") count++;
        if (searchQuery.trim() !== "") count++;
        return count;
    }, [fromDate, toDate, selectedOutlet, selectedChannel, minAmount, maxAmount, searchQuery]);

    // Global KPI Summary Metrics (calculated from all loaded vouchers)
    const metrics = useMemo(() => {
        let totalCount = 0;
        let totalPkr = 0;
        let pendingCheckCount = 0;
        let pendingCheckPkr = 0;
        let pendingApprovalCount = 0;
        let pendingApprovalPkr = 0;
        let approvedCount = 0;
        let approvedPkr = 0;
        let rejectedCount = 0;
        let rejectedPkr = 0;

        vouchers.forEach(v => {
            const st = (v.status || "draft").toLowerCase();
            const total =
                v.details?.reduce((sum, d) => sum + (Number(d.debit) || 0), 0) || Number(v.debitAmount) || 0;

            totalCount++;
            totalPkr += total;

            if (st === "pending_check" || st === "pending") {
                pendingCheckCount++;
                pendingCheckPkr += total;
            } else if (st === "pending_approval") {
                pendingApprovalCount++;
                pendingApprovalPkr += total;
            } else if (st === "approved") {
                approvedCount++;
                approvedPkr += total;
            } else if (st === "rejected") {
                rejectedCount++;
                rejectedPkr += total;
            }
        });

        // Filtered sum
        const filteredPkr = filteredData.reduce((sum, v) => {
            const val =
                v.details?.reduce((s, d) => s + (Number(d.debit) || 0), 0) || Number(v.debitAmount) || 0;
            return sum + val;
        }, 0);

        return {
            totalCount,
            totalPkr,
            pendingCheckCount,
            pendingCheckPkr,
            pendingApprovalCount,
            pendingApprovalPkr,
            approvedCount,
            approvedPkr,
            rejectedCount,
            rejectedPkr,
            filteredPkr,
        };
    }, [vouchers, filteredData]);

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredData.map(v => v.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const isAllSelected = filteredData.length > 0 && selectedIds.length === filteredData.length;

    const canCreate = permissions?.canCreate ?? true;
    const canUpdate = permissions?.canUpdate ?? true;
    const canApprove = permissions?.canApprove ?? true;

    // Table Columns definition
    const columns: ColumnDef<ReceiptVoucher>[] = [
        {
            id: "select",
            header: () => (
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={checked => handleSelectAll(!!checked)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedIds.includes(row.original.id)}
                    onCheckedChange={checked => handleSelectOne(row.original.id, !!checked)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "rvNo",
            header: "RSRV No",
            cell: ({ row }) => (
                <div className="font-semibold text-blue-700 font-mono text-xs">
                    <Link
                        href={`/erp/finance/retail-sale-receipt-voucher/${row.original.id}`}
                        className="hover:underline flex items-center gap-1"
                    >
                        {row.original.rvNo}
                    </Link>
                    {row.original.folio && (
                        <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                            Folio: <span className="font-mono text-gray-700">{row.original.folio}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: "outlet",
            accessorFn: row => {
                const outletTag = row.details?.find(d => d.tagAccountCode || d.tagAccountName);
                return outletTag?.tagAccountName || outletTag?.tagAccountCode || "";
            },
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
                            {code && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[10px] mr-1.5 font-mono">
                                    {code}
                                </span>
                            )}
                            <span className="font-medium text-gray-800">{name || "Outlet"}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "rvDate",
            header: "Date",
            cell: ({ row }) => (
                <div className="text-xs font-medium text-gray-700 whitespace-nowrap">
                    {row.original.rvDate ? format(new Date(row.original.rvDate), "dd-MMM-yyyy") : "—"}
                </div>
            ),
        },
        {
            id: "channelBreakdown",
            header: "Payment Channels",
            cell: ({ row }) => {
                const { cash, card, commission } = getVoucherBreakdown(row.original);
                const hasCash = cash > 0;
                const hasCard = card > 0;
                const hasCommission = commission > 0;

                if (!hasCash && !hasCard && !hasCommission) {
                    return <span className="text-gray-400 text-xs">—</span>;
                }

                return (
                    <div className="flex flex-wrap gap-1 items-center max-w-[220px]">
                        {hasCash && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                                title={`Cash: PKR ${Math.round(cash).toLocaleString()}`}
                            >
                                <Banknote className="w-2.5 h-2.5" />
                                <span>{Math.round(cash).toLocaleString()}</span>
                            </span>
                        )}
                        {hasCard && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-medium"
                                title={`Card / Bank: PKR ${Math.round(card).toLocaleString()}`}
                            >
                                <CreditCard className="w-2.5 h-2.5" />
                                <span>{Math.round(card).toLocaleString()}</span>
                            </span>
                        )}
                        {hasCommission && (
                            <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200"
                                title={`Card Commission: PKR ${Math.round(commission).toLocaleString()}`}
                            >
                                <Percent className="w-2.5 h-2.5" />
                                <span>{Math.round(commission).toLocaleString()}</span>
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "description",
            header: "Description / Remarks",
            cell: ({ row }) => {
                const desc = row.original.description || row.original.remarks;
                if (!desc) {
                    return <span className="text-gray-400 text-xs">—</span>;
                }
                return (
                    <div className="text-xs text-gray-700 max-w-[200px] truncate font-medium" title={desc}>
                        {desc}
                    </div>
                );
            },
        },
        {
            accessorKey: "debitAmount",
            header: () => <div className="text-right">Total Amount (PKR)</div>,
            cell: ({ row }) => {
                const total =
                    row.original.details?.reduce((sum, d) => sum + (Number(d.debit) || 0), 0) ||
                    Number(row.original.debitAmount) ||
                    0;
                return (
                    <div className="text-right font-bold text-xs tabular-nums text-gray-900">
                        {Math.round(total).toLocaleString("en-PK")}
                    </div>
                );
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const st = (row.original.status || "draft").toLowerCase();
                const isApproved = st === "approved";
                const isPendingApproval = st === "pending_approval";
                const isPendingCheck = st === "pending_check" || st === "pending";
                const isRejected = st === "rejected";

                let badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
                let label = "DRAFT";

                if (isApproved) {
                    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold";
                    label = "APPROVED";
                } else if (isPendingApproval) {
                    badgeClass = "bg-blue-50 text-blue-700 border-blue-300 font-bold";
                    label = "PENDING APPROVAL";
                } else if (isPendingCheck) {
                    badgeClass = "bg-amber-50 text-amber-700 border-amber-300 font-bold";
                    label = "PENDING CHECK";
                } else if (isRejected) {
                    badgeClass = "bg-red-50 text-red-700 border-red-300 font-bold";
                    label = "REJECTED";
                }

                return (
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] tracking-wider uppercase border ${badgeClass}`}
                    >
                        {label}
                    </span>
                );
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const v = row.original;
                const st = (v.status || "draft").toLowerCase();
                const isPendingCheck = st === "pending_check" || st === "pending" || st === "draft";
                const isApproved = st === "approved";

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Link href={`/erp/finance/retail-sale-receipt-voucher/${v.id}`}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-600 hover:text-blue-600"
                                title="View Details"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                        {canUpdate && !isApproved && (
                            <Link href={`/erp/finance/retail-sale-receipt-voucher/${v.id}/edit`}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-600 hover:text-amber-600"
                                    title="Edit RSRV"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-600 hover:text-blue-600"
                            onClick={() => handlePrint(v)}
                            title="Print RSRV"
                        >
                            <Printer className="h-3.5 w-3.5" />
                        </Button>

                        {/* Unapprove & Unpost */}
                        {isApproved && canApprove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingStatusId === v.id}
                                onClick={() => handleUnapprove(v.id)}
                                className="h-7 w-7 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                title="Unapprove & Unpost RSRV"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {/* Step 1: Check / Verify */}
                        {isPendingCheck && canApprove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingStatusId === v.id}
                                onClick={() => handleUpdateStatus(v.id, "pending_approval")}
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                title="Verify / Mark Checked"
                            >
                                <FileCheck className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {/* Step 2: Final Approve */}
                        {canApprove && !isApproved && (
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingStatusId === v.id}
                                onClick={() => handleUpdateStatus(v.id, "approved")}
                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                title="Approve RSRV"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {/* Reject */}
                        {canApprove && !isApproved && st !== "rejected" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:bg-red-50"
                                onClick={() => handleUpdateStatus(v.id, "rejected")}
                                title="Reject RSRV"
                            >
                                <XCircle className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            {/* Header & Primary Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Retail Sale Receipt Vouchers (RSRV)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage, verify, and post daily POS outlet reconciliation receipt vouchers across all retail branches
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="h-8 text-xs gap-1.5"
                        title="Refresh voucher records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="h-8 text-xs gap-1.5"
                    >
                        {isExporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )}
                        Export Excel
                    </Button>
                    {canCreate && (
                        <Link href="/erp/finance/retail-sale-receipt-voucher/create">
                            <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-3.5 h-3.5" />
                                Create RSRV
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total RSRV Volume */}
                <Card
                    onClick={() => setStatusTab("all")}
                    className={`cursor-pointer transition-all hover:shadow-md border ${
                        statusTab === "all"
                            ? "ring-2 ring-blue-500 bg-blue-50/20 border-blue-200"
                            : "bg-white hover:border-gray-300"
                    }`}
                >
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Vouchers
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-extrabold text-gray-900 font-mono">
                                    {metrics.totalCount}
                                </span>
                                <span className="text-xs text-gray-500 font-medium font-mono">
                                    PKR {Math.round(metrics.totalPkr).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Pending Verification (Pending Check) */}
                <Card
                    onClick={() => setStatusTab("pending_check")}
                    className={`cursor-pointer transition-all hover:shadow-md border ${
                        statusTab === "pending_check"
                            ? "ring-2 ring-amber-500 bg-amber-50/30 border-amber-300"
                            : "bg-white hover:border-gray-300"
                    }`}
                >
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                                Pending Check
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-extrabold text-amber-800 font-mono">
                                    {metrics.pendingCheckCount}
                                </span>
                                <span className="text-xs text-amber-600 font-medium font-mono">
                                    PKR {Math.round(metrics.pendingCheckPkr).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Pending Approval */}
                <Card
                    onClick={() => setStatusTab("pending_approval")}
                    className={`cursor-pointer transition-all hover:shadow-md border ${
                        statusTab === "pending_approval"
                            ? "ring-2 ring-indigo-500 bg-indigo-50/30 border-indigo-300"
                            : "bg-white hover:border-gray-300"
                    }`}
                >
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                                Pending Approval
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-extrabold text-indigo-800 font-mono">
                                    {metrics.pendingApprovalCount}
                                </span>
                                <span className="text-xs text-indigo-600 font-medium font-mono">
                                    PKR {Math.round(metrics.pendingApprovalPkr).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Approved & Posted */}
                <Card
                    onClick={() => setStatusTab("approved")}
                    className={`cursor-pointer transition-all hover:shadow-md border ${
                        statusTab === "approved"
                            ? "ring-2 ring-emerald-500 bg-emerald-50/30 border-emerald-300"
                            : "bg-white hover:border-gray-300"
                    }`}
                >
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                                Approved & Posted
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-extrabold text-emerald-800 font-mono">
                                    {metrics.approvedCount}
                                </span>
                                <span className="text-xs text-emerald-600 font-medium font-mono">
                                    PKR {Math.round(metrics.approvedPkr).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Card */}
            <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-4 space-y-4">
                    {/* Status Tabs Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full md:w-auto">
                            <TabsList className="grid grid-cols-5 w-full md:w-auto text-xs h-9">
                                <TabsTrigger value="all" className="text-xs px-3">
                                    All ({metrics.totalCount})
                                </TabsTrigger>
                                <TabsTrigger value="pending_check" className="text-xs px-3">
                                    Check ({metrics.pendingCheckCount})
                                </TabsTrigger>
                                <TabsTrigger value="pending_approval" className="text-xs px-3">
                                    Approval ({metrics.pendingApprovalCount})
                                </TabsTrigger>
                                <TabsTrigger value="approved" className="text-xs px-3">
                                    Approved ({metrics.approvedCount})
                                </TabsTrigger>
                                <TabsTrigger value="rejected" className="text-xs px-3">
                                    Rejected ({metrics.rejectedCount})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Filter Summary Stats */}
                        <div className="text-xs text-gray-500 font-medium flex items-center gap-2 self-end md:self-auto">
                            <span>Showing:</span>
                            <span className="font-bold text-gray-800">{filteredData.length} vouchers</span>
                            <span className="text-gray-300">|</span>
                            <span className="font-bold text-blue-700 font-mono">
                                PKR {Math.round(metrics.filteredPkr).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Quick Date Presets Row */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            Date Presets:
                        </span>
                        <Button
                            variant={activeDatePreset === "all_time" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "all_time"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("all_time")}
                        >
                            All Dates
                        </Button>
                        <Button
                            variant={activeDatePreset === "today" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "today"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("today")}
                        >
                            Today
                        </Button>
                        <Button
                            variant={activeDatePreset === "yesterday" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "yesterday"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("yesterday")}
                        >
                            Yesterday
                        </Button>
                        <Button
                            variant={activeDatePreset === "last_7_days" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "last_7_days"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("last_7_days")}
                        >
                            Last 7 Days
                        </Button>
                        <Button
                            variant={activeDatePreset === "this_month" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "this_month"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("this_month")}
                        >
                            This Month
                        </Button>
                        <Button
                            variant={activeDatePreset === "last_month" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "last_month"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("last_month")}
                        >
                            Last Month
                        </Button>
                        <Button
                            variant={activeDatePreset === "last_30_days" ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs rounded-md ${
                                activeDatePreset === "last_30_days"
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleApplyDatePreset("last_30_days")}
                        >
                            Last 30 Days
                        </Button>
                    </div>

                    {/* Rich Multi-Filter Control Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-200">
                        {/* 1. Date Range Picker (Fixed Props!) */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Date Range</span>
                                {(fromDate || toDate) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFromDate(undefined);
                                            setToDate(undefined);
                                            setActiveDatePreset("all_time");
                                        }}
                                        className="text-red-500 hover:underline text-[10px] font-normal"
                                    >
                                        Clear
                                    </button>
                                )}
                            </label>
                            <DateRangePicker
                                initialDateFrom={fromDate}
                                initialDateTo={toDate}
                                range={{ from: fromDate, to: toDate }}
                                onUpdate={({ range }) => {
                                    setFromDate(range.from);
                                    setToDate(range.to);
                                    setActiveDatePreset("custom");
                                }}
                                align="start"
                                showCompare={false}
                                placeholder="All Dates"
                                className="h-9 w-full text-xs"
                            />
                        </div>

                        {/* 2. Outlet / Location Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Outlet / Location</span>
                                {selectedOutlet !== "all" && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOutlet("all")}
                                        className="text-red-500 hover:underline text-[10px] font-normal"
                                    >
                                        Clear
                                    </button>
                                )}
                            </label>
                            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Outlets" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[280px]">
                                    <SelectItem value="all">All Outlets ({outletsList.length})</SelectItem>
                                    {outletsList.map(outlet => (
                                        <SelectItem key={outlet.code} value={outlet.code}>
                                            <span className="font-mono font-bold mr-1.5">[{outlet.code}]</span>
                                            {outlet.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Payment Channel Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Payment Channel</span>
                                {selectedChannel !== "all" && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel("all")}
                                        className="text-red-500 hover:underline text-[10px] font-normal"
                                    >
                                        Clear
                                    </button>
                                )}
                            </label>
                            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Channels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Channels</SelectItem>
                                    <SelectItem value="cash">
                                        <div className="flex items-center gap-1.5">
                                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Cash Sales</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="card">
                                        <div className="flex items-center gap-1.5">
                                            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Card / Bank Sales</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="commission">
                                        <div className="flex items-center gap-1.5">
                                            <Percent className="w-3.5 h-3.5 text-amber-600" />
                                            <span>With Card Commission</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. Amount Range & Clear Action */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Amount Range (PKR)</span>
                                {(minAmount !== "" || maxAmount !== "") && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMinAmount("");
                                            setMaxAmount("");
                                        }}
                                        className="text-red-500 hover:underline text-[10px] font-normal"
                                    >
                                        Clear
                                    </button>
                                )}
                            </label>
                            <div className="flex items-center gap-1.5">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={minAmount}
                                    onChange={e => setMinAmount(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                                <span className="text-gray-400 text-xs">—</span>
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={maxAmount}
                                    onChange={e => setMaxAmount(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                                {activeFiltersCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetAllFilters}
                                        className="h-9 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0 border-red-200"
                                        title="Reset all filters to default"
                                    >
                                        <X className="w-3.5 h-3.5 mr-1" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Badges Row */}
                    {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-xs text-gray-500 font-medium mr-1">Active filters:</span>

                            {(fromDate || toDate) && (
                                <Badge
                                    variant="secondary"
                                    className="gap-1 text-[11px] py-0.5 px-2 bg-blue-50 text-blue-800 border-blue-200"
                                >
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {fromDate ? format(fromDate, "dd-MMM-yyyy") : "Start"} →{" "}
                                        {toDate ? format(toDate, "dd-MMM-yyyy") : "End"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFromDate(undefined);
                                            setToDate(undefined);
                                            setActiveDatePreset("all_time");
                                        }}
                                        className="hover:text-red-600 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )}

                            {selectedOutlet !== "all" && (
                                <Badge
                                    variant="secondary"
                                    className="gap-1 text-[11px] py-0.5 px-2 bg-purple-50 text-purple-800 border-purple-200"
                                >
                                    <Store className="w-3 h-3" />
                                    <span>Outlet: [{selectedOutlet}]</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOutlet("all")}
                                        className="hover:text-red-600 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )}

                            {selectedChannel !== "all" && (
                                <Badge
                                    variant="secondary"
                                    className="gap-1 text-[11px] py-0.5 px-2 bg-emerald-50 text-emerald-800 border-emerald-200"
                                >
                                    {selectedChannel === "cash" && <Banknote className="w-3 h-3" />}
                                    {selectedChannel === "card" && <CreditCard className="w-3 h-3" />}
                                    {selectedChannel === "commission" && <Percent className="w-3 h-3" />}
                                    <span className="capitalize">{selectedChannel} Sales</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel("all")}
                                        className="hover:text-red-600 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )}

                            {minAmount !== "" && (
                                <Badge
                                    variant="secondary"
                                    className="gap-1 text-[11px] py-0.5 px-2 bg-slate-100 text-slate-800 border-slate-300 font-mono"
                                >
                                    <span>Min PKR: {Number(minAmount).toLocaleString()}</span>
                                    <button
                                        type="button"
                                        onClick={() => setMinAmount("")}
                                        className="hover:text-red-600 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )}

                            {maxAmount !== "" && (
                                <Badge
                                    variant="secondary"
                                    className="gap-1 text-[11px] py-0.5 px-2 bg-slate-100 text-slate-800 border-slate-300 font-mono"
                                >
                                    <span>Max PKR: {Number(maxAmount).toLocaleString()}</span>
                                    <button
                                        type="button"
                                        onClick={() => setMaxAmount("")}
                                        className="hover:text-red-600 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )}

                            {searchQuery.trim() !== "" && (
                                <Badge
                                    variant="secondary"
                                    className="gap-1 text-[11px] py-0.5 px-2 bg-amber-50 text-amber-800 border-amber-200"
                                >
                                    <Search className="w-3 h-3" />
                                    <span>Search: &quot;{searchQuery}&quot;</span>
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="hover:text-red-600 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetAllFilters}
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            >
                                Clear All
                            </Button>
                        </div>
                    )}

                    {/* Bulk Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-xs gap-2">
                            <div className="flex items-center gap-2 font-medium text-blue-900">
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                <span>
                                    <strong>{selectedIds.length}</strong> voucher(s) selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkUpdateStatus("pending_approval")}
                                    disabled={isBulkProcessing}
                                    className="h-7 text-xs bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                                >
                                    {isBulkProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    ) : (
                                        <FileCheck className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    Verify Selected
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleBulkUpdateStatus("approved")}
                                    disabled={isBulkProcessing}
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {isBulkProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    Approve & Post Selected
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkUpdateStatus("rejected")}
                                    disabled={isBulkProcessing}
                                    className="h-7 text-xs bg-white text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                    Reject Selected
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Data Table */}
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        searchFields={[
                            { key: "rvNo", label: "RSRV No" },
                            { key: "description", label: "Description / Remarks" },
                            { key: "outlet", label: "Outlet" },
                        ]}
                        onSearchChange={searchVal => setSearchQuery(searchVal)}
                    />
                </CardContent>
            </Card>

            {/* Print Portal Container */}
            {mounted &&
                printingVoucher &&
                createPortal(
                    <>
                        <style
                            dangerouslySetInnerHTML={{
                                __html: `
                        @media print {
                          body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            color: black !important;
                          }
                          body > *:not(#rsrv-print-section) {
                            display: none !important;
                          }
                          #rsrv-print-section, #rsrv-print-section * {
                            visibility: visible !important;
                          }
                          #rsrv-print-section {
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
                    `,
                            }}
                        />
                        <div
                            id="rsrv-print-section"
                            style={{
                                position: "fixed",
                                left: "-9999px",
                                top: 0,
                                pointerEvents: "none",
                            }}
                            aria-hidden="true"
                        >
                            <RetailSaleReceiptVoucherPrint voucher={printingVoucher} />
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
}
