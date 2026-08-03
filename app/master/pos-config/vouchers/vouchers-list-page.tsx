"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect, useCallback } from "react";
import { addTransitionType } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
    Loader2, Info, Plus, Gift, 
    RefreshCw, CreditCard, Building2, MapPin, Ticket, Copy,
    Search, Calendar, ChevronLeft, ChevronRight, Filter, X
} from "lucide-react";
import { toast } from "sonner";
import { Voucher, VoucherType, voidVoucher, updateVoucherExpiry, getVouchers } from "@/lib/actions/vouchers";
import { getLocations, Location } from "@/lib/actions/location";
import { cn, formatCurrency } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props { 
    initialData?: {
        vouchers: Voucher[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
    };
}

const formatForDateTimeLocal = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const pad = (num: number) => String(num).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const VOUCHER_TYPES: { value: VoucherType; label: string; icon: React.ElementType; color: string }[] = [
    { value: "GIFT",        label: "Gift",        icon: Gift,      color: "text-emerald-600" },
    { value: "EXCHANGE",    label: "Exchange",    icon: RefreshCw, color: "text-blue-600"    },
    { value: "CREDIT",      label: "Credit",      icon: CreditCard,color: "text-violet-600"  },
    { value: "CORPORATE",   label: "Corporate",   icon: Building2, color: "text-amber-600"   },
    { value: "OUTLET_GIFT", label: "Outlet Gift", icon: MapPin,    color: "text-rose-600"    },
    { value: "REFUND",      label: "Refund",      icon: Ticket,    color: "text-red-600"     },
];

const isClaimVoucher = (v: Voucher) => {
    if (v.claims && v.claims.length > 0) return true;
    if (v.description && /approved claim/i.test(v.description)) return true;
    return false;
};

const CLAIM_TYPE_INFO = { value: "CLAIM" as any, label: "Claim", icon: Ticket, color: "text-purple-600" };

function getVoucherDescription(v: Voucher) {
    if (v.description) return v.description;
    
    if (v.voucherType === "CORPORATE" && (v.companyName || v.companyGlCode)) {
        return `${v.companyName ?? ""}${v.companyGlCode ? ` (${v.companyGlCode})` : ""}`.trim();
    }
    
    if (v.voucherType === "EXCHANGE" && v.sourceOrder) {
        const ref = v.sourceOrder.returnNumber || v.sourceOrder.refundNumber || v.sourceOrder.orderNumber;
        if (ref) return `Return Ref: ${ref}`;
    }
    
    if (v.voucherType === "CREDIT" && v.customerId) {
        return `Customer ID: ${v.customerId}`;
    }
    
    if (v.claims && v.claims.length > 0) {
        return `Claim: ${v.claims.map(c => c.claimNumber).join(", ")}`;
    }
    
    return "—";
}

export function VouchersListPage({ initialData }: Props) {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [isPending, startTransition] = useTransition();

    // Data state
    const [vouchers, setVouchers] = useState<Voucher[]>(initialData?.vouchers || []);
    const [pagination, setPagination] = useState(initialData?.pagination || { page: 1, limit: 25, total: initialData?.vouchers?.length || 0, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(false);

    // Filter states
    const [activeTab, setActiveTab] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [search, setSearch] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
    const [locations, setLocations] = useState<Location[]>([]);

    // Dialog states
    const [voidId, setVoidId] = useState<string | null>(null);
    const [editExpiryVoucher, setEditExpiryVoucher] = useState<Voucher | null>(null);
    const [expiryValue, setExpiryValue] = useState<string>("");

    const canCreate = hasPermission("pos.voucher.create");
    const canVoid = hasPermission("pos.voucher.void");
    const canEditExpiry = canCreate || canVoid;

    // Load locations
    useEffect(() => {
        getLocations().then(res => {
            if (res.status && res.data) setLocations(res.data);
        });
    }, []);

    // Fetch data with server-side filters & pagination
    const loadVouchersData = useCallback(async (page: number = 1) => {
        setIsLoading(true);
        try {
            const res = await getVouchers({
                voucherType: activeTab !== "ALL" ? activeTab : undefined,
                status: statusFilter !== "ALL" ? statusFilter : undefined,
                locationId: selectedLocationId !== "ALL" ? selectedLocationId : undefined,
                search: search.trim() !== "" ? search.trim() : undefined,
                startDate: startDate !== "" ? startDate : undefined,
                endDate: endDate !== "" ? endDate : undefined,
                page,
                limit: pagination.limit,
            });

            if (res.status && res.data) {
                setVouchers(res.data);
                if (res.pagination) {
                    setPagination(res.pagination);
                }
            } else {
                toast.error(res.message || "Failed to load vouchers");
            }
        } catch {
            toast.error("Failed to load vouchers");
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, statusFilter, selectedLocationId, search, startDate, endDate, pagination.limit]);

    // Initial and filter-change fetch
    useEffect(() => {
        loadVouchersData(1);
    }, [loadVouchersData]);

    const handleSaveExpiry = () => {
        if (!editExpiryVoucher) return;
        startTransition(async () => {
            const formattedDate = expiryValue ? new Date(expiryValue).toISOString() : null;
            const result = await updateVoucherExpiry(editExpiryVoucher.id, formattedDate);
            if (result.status) {
                toast.success("Voucher expiry updated");
                setEditExpiryVoucher(null);
                loadVouchersData(pagination.page);
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleVoid = () => {
        if (!voidId) return;
        startTransition(async () => {
            const result = await voidVoucher(voidId);
            if (result.status) {
                toast.success("Voucher voided");
                setVoidId(null);
                loadVouchersData(pagination.page);
            } else {
                toast.error(result.message);
            }
        });
    };

    const clearAllFilters = () => {
        setActiveTab("ALL");
        setStatusFilter("ALL");
        setSearch("");
        setStartDate("");
        setEndDate("");
        setSelectedLocationId("ALL");
    };

    const hasActiveFilters = activeTab !== "ALL" || statusFilter !== "ALL" || search !== "" || startDate !== "" || endDate !== "" || selectedLocationId !== "ALL";

    return (
        <div className="space-y-4">
            <Alert className="bg-muted/50 text-muted-foreground border-none">
                <Info className="h-4 w-4" />
                <AlertTitle>Vouchers Registry</AlertTitle>
                <AlertDescription>
                    Manage Gift, Credit, Corporate, Exchange, and Claim vouchers across all stores. Supports full pagination, date-range filtering, and real-time status queries for 50,000+ records.
                </AlertDescription>
            </Alert>

            {/* Top Bar: Voucher Type Tabs + Create Button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPagination(p => ({ ...p, page: 1 })); }} className="w-full md:w-auto">
                    <TabsList className="w-full md:w-auto flex flex-wrap h-auto">
                        <TabsTrigger value="ALL">All Types</TabsTrigger>
                        {VOUCHER_TYPES.map(({ value, label }) => (
                            <TabsTrigger key={value} value={value}>
                                {label}
                            </TabsTrigger>
                        ))}
                        <TabsTrigger value="CLAIM">Claim</TabsTrigger>
                    </TabsList>
                </Tabs>

                {canCreate && (
                    <Button
                        className="gap-2 shrink-0 self-end md:self-auto"
                        onClick={() => {
                            startTransition(() => {
                                addTransitionType("nav-forward");
                                router.push("/master/pos-config/vouchers/new");
                            });
                        }}
                    >
                        <Plus className="h-4 w-4" /> Issue Voucher
                    </Button>
                )}
            </div>

            {/* Filter Toolbar */}
            <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search code, customer, trader ID, description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="w-[150px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="REDEEMED">Redeemed</SelectItem>
                                <SelectItem value="VOIDED">Voided</SelectItem>
                                <SelectItem value="EXPIRED">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Location Filter */}
                    <div className="w-[180px]">
                        <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="All Locations" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                <SelectItem value="ALL">All Stores</SelectItem>
                                {locations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                        {loc.shortCode || loc.code} - {loc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Pickers */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>From:</span>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-9 text-xs w-[130px]"
                        />
                        <span>To:</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-9 text-xs w-[130px]"
                        />
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                        >
                            <X className="h-3.5 w-3.5" /> Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-lg border overflow-hidden bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead>Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description / Customer</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead>Issuing Location</TableHead>
                            <TableHead>Created / Expires</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="text-xs font-medium">Loading vouchers from database...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : vouchers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                                    No vouchers found matching your filters
                                </TableCell>
                            </TableRow>
                        ) : vouchers.map((v) => {
                            const isExpired = v.expiresAt ? new Date(v.expiresAt) < new Date() : false;
                            
                            let statusLabel = "Active";
                            let statusCls = "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400";
                            
                            if (v.voucherType === "REFUND") {
                                statusLabel = "Cash Refunded";
                                statusCls = "bg-red-500/10 text-red-700 border-red-300";
                            } else if (v.isDeleted || !v.isActive) {
                                statusLabel = "Voided";
                                statusCls = "bg-muted text-muted-foreground border-border";
                            } else if (v.isRedeemed) {
                                statusLabel = "Redeemed";
                                statusCls = "bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400";
                            } else if (isExpired) {
                                statusLabel = "Expired";
                                statusCls = "bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400";
                            }

                            const isClaim = isClaimVoucher(v);
                            const typeInfo = isClaim ? CLAIM_TYPE_INFO : VOUCHER_TYPES.find(t => t.value === v.voucherType);
                            const Icon = typeInfo?.icon ?? Ticket;

                            return (
                                <TableRow key={v.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-primary text-sm">{v.code}</span>
                                            <button onClick={() => {
                                                navigator.clipboard?.writeText(v.code);
                                                toast.success(`Copied: ${v.code}`);
                                            }} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy code">
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn("flex items-center gap-1.5 text-xs font-medium", typeInfo?.color)}>
                                            <Icon className="w-3.5 h-3.5" />
                                            {typeInfo?.label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={getVoucherDescription(v)}>
                                        <div className="font-medium text-foreground">{getVoucherDescription(v)}</div>
                                        {v.customer && (
                                            <div className="text-[11px] text-muted-foreground">
                                                Cust: {v.customer.name} {v.customer.contactNo ? `(${v.customer.contactNo})` : ""}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        <div className="font-semibold text-sm">{formatCurrency(Number(v.faceValue))}</div>
                                        {v.discount !== undefined && Number(v.discount) > 0 && (
                                            <div className="text-[10px] text-muted-foreground">
                                                Disc: {formatCurrency(Number(v.discount))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            {v.issuedByLocation ? (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {v.issuedByLocation.shortCode || v.issuedByLocation.code}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-[11px]">All Locations</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <div>Created: {new Date(v.createdAt).toLocaleDateString("en-PK")}</div>
                                        <div>Exp: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-PK") : "No Expiry"}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("text-[10px] font-semibold", statusCls)}>
                                            {statusLabel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {canEditExpiry && v.isActive && !v.isRedeemed && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground"
                                                    onClick={() => {
                                                        setEditExpiryVoucher(v);
                                                        setExpiryValue(formatForDateTimeLocal(v.expiresAt));
                                                    }}
                                                >
                                                    Expiry
                                                </Button>
                                            )}
                                            {canVoid && v.isActive && !v.isRedeemed && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                                    onClick={() => setVoidId(v.id)}
                                                >
                                                    Void
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1">
                <div className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{" "}
                    <span className="font-semibold text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                    <span className="font-semibold text-foreground">{pagination.total.toLocaleString()}</span> vouchers
                </div>

                <div className="flex items-center gap-3">
                    {/* Rows Per Page */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Per page:</span>
                        <Select
                            value={String(pagination.limit)}
                            onValueChange={(val) => {
                                const newLimit = Number(val);
                                setPagination(p => ({ ...p, limit: newLimit, page: 1 }));
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Page Navigation Buttons */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={pagination.page <= 1 || isLoading}
                            onClick={() => loadVouchersData(pagination.page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground px-2 font-medium">
                            Page {pagination.page} of {pagination.totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={pagination.page >= pagination.totalPages || isLoading}
                            onClick={() => loadVouchersData(pagination.page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Void Voucher Alert Dialog */}
            <AlertDialog open={!!voidId} onOpenChange={() => setVoidId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Void Voucher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to void this voucher? This action cannot be undone and the voucher will no longer be redeemable.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleVoid}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? "Voiding..." : "Void Voucher"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Expiry Dialog */}
            <Dialog open={!!editExpiryVoucher} onOpenChange={() => setEditExpiryVoucher(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Voucher Expiry</DialogTitle>
                        <DialogDescription>
                            Update the expiration date for voucher <span className="font-mono font-bold text-foreground">{editExpiryVoucher?.code}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="expiry-input" className="text-xs">Expiration Date & Time</Label>
                        <Input
                            id="expiry-input"
                            type="datetime-local"
                            value={expiryValue}
                            onChange={(e) => setExpiryValue(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Leave blank if the voucher should never expire.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditExpiryVoucher(null)}>Cancel</Button>
                        <Button onClick={handleSaveExpiry} disabled={isPending}>
                            {isPending ? "Saving..." : "Save Expiry"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
