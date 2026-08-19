"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Gift, RefreshCw, CreditCard, Building2, MapPin,
    Plus, Copy, XCircle, CheckCircle2, Ticket, Layers,
    Download, ChevronDown, Printer, Trash2, Loader2, User,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";
import type { Voucher, VoucherType, MerchantConfig } from "@/lib/actions/vouchers";
import { getLocations } from "@/lib/actions/location";
import type { Location } from "@/lib/actions/location";
import { LocationMultiSelect } from "@/app/master/pos-config/_components/location-multi-select";
import { PrintVoucherReceipt } from "@/components/pos/print-voucher-receipt";
import { getCustomers } from "@/lib/actions/customer";
import type { Customer } from "@/lib/actions/customer";

// ── Constants ────────────────────────────────────────────────────────────────

const VOUCHER_TYPES: { value: VoucherType; label: string; icon: React.ElementType; color: string }[] = [
    { value: "GIFT",        label: "Gift",        icon: Gift,      color: "text-emerald-600" },
    { value: "EXCHANGE",    label: "Exchange",    icon: RefreshCw, color: "text-blue-600"    },
    { value: "CREDIT",      label: "Credit",      icon: CreditCard,color: "text-violet-600"  },
    { value: "CORPORATE",   label: "Corporate",   icon: Building2, color: "text-amber-600"   },
    { value: "OUTLET_GIFT", label: "Outlet Gift", icon: MapPin,    color: "text-rose-600"    },
    { value: "REFUND",      label: "Refund",      icon: Ticket,    color: "text-red-600"     },
];

// Types available for manual issuance (Only GIFT vouchers can be manually issued)
const ISSUABLE_TYPES = VOUCHER_TYPES.filter(t => t.value === "GIFT");

const isClaimVoucher = (v: Voucher) => {
    if (v.claims && v.claims.length > 0) return true;
    if (v.description && /approved claim/i.test(v.description)) return true;
    return false;
};

const CLAIM_TYPE_INFO = { value: "CLAIM" as any, label: "Claim", icon: Ticket, color: "text-purple-600" };

function voucherStatus(v: Voucher) {
    if (v.voucherType === "REFUND") return { label: "Cash Refunded", cls: "bg-red-500/10 text-red-700 border-red-300" };
    if (v.isDeleted) return { label: "Voided", cls: "bg-muted text-muted-foreground border-border" };
    if (v.isRedeemed) return { label: "Redeemed", cls: "bg-blue-500/10 text-blue-700 border-blue-300" };
    if (!v.isActive)  return { label: "Voided",   cls: "bg-muted text-muted-foreground border-border" };
    if (v.expiresAt && new Date(v.expiresAt) < new Date())
        return { label: "Expired", cls: "bg-amber-500/10 text-amber-700 border-amber-300" };
    return { label: "Active", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-300" };
}

function fmtDate(d?: string) {
    if (!d) return "No expiry";
    return new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PosVouchersPage() {
    const { hasPermission, user } = useAuth();
    const canCreate = hasPermission("pos.voucher.create");
    const canVoid   = hasPermission("pos.voucher.void");
    const currentLocationId = user?.locationId || user?.terminal?.location?.id;

    useEffect(() => {
        if (currentLocationId) {
            setSingleLocationIds(prev => prev.length === 0 ? [currentLocationId] : prev);
            setBulkLocationIds(prev => prev.length === 0 ? [currentLocationId] : prev);
        }
    }, [currentLocationId]);

    const [vouchers,   setVouchers]   = useState<Voucher[]>([]);
    const [isLoading,  setIsLoading]  = useState(true);
    const [activeTab,  setActiveTab]  = useState<string>("ALL");
    const [showVoided, setShowVoided] = useState(false);
    const [restoreId,  setRestoreId]  = useState<string | null>(null);

    // ── Locations ────────────────────────────────────────────────
    const [locations, setLocations] = useState<Location[]>([]);

    // ── Single issue modal ───────────────────────────────────────
    const [showSingle,   setShowSingle]   = useState(false);
    const [singleType,   setSingleType]   = useState<VoucherType>("GIFT");
    const [singleAmount, setSingleAmount] = useState<number | "">("");
    const [singleDiscount, setSingleDiscount] = useState<number | "">("");
    const [singleDesc,   setSingleDesc]   = useState("");
    const [singleCo,     setSingleCo]     = useState("");
    const [singleCoGl,   setSingleCoGl]   = useState("");
    const [singleExp,    setSingleExp]    = useState("");
    const [singleLocationIds, setSingleLocationIds] = useState<string[]>([]);
    const [issuingSingle, setIssuingSingle] = useState(false);
    const [issuedVoucher, setIssuedVoucher] = useState<Voucher | null>(null);

    // ── Bulk issue modal ─────────────────────────────────────────
    const [showBulk,    setShowBulk]    = useState(false);
    const [bulkType,    setBulkType]    = useState<VoucherType>("GIFT");
    const [bulkAmount,  setBulkAmount]  = useState<number | "">("");
    const [bulkQty,     setBulkQty]     = useState<number | "">(10);
    const [bulkDiscount, setBulkDiscount] = useState<number | "">("");
    const [bulkDesc,    setBulkDesc]    = useState("");
    const [bulkCo,      setBulkCo]      = useState("");
    const [bulkCoGl,    setBulkCoGl]    = useState("");
    const [bulkExp,     setBulkExp]     = useState("");
    const [bulkLocationIds, setBulkLocationIds] = useState<string[]>([]);
    const [issuingBulk, setIssuingBulk] = useState(false);
    const [bulkResult,  setBulkResult]  = useState<{ count: number; codes: string[] } | null>(null);
    const [customers,   setCustomers]   = useState<Customer[]>([]);

    // ── Customer selection state ──────────────────────────────────
    const [singleSelectedCustomer, setSingleSelectedCustomer] = useState<Customer | null>(null);
    const [singleCustomerSearch, setSingleCustomerSearch] = useState("");
    const [singleShowCustomerDropdown, setSingleShowCustomerDropdown] = useState(false);
    const [singleRequireMatch, setSingleRequireMatch] = useState(false);

    const [bulkSelectedCustomer, setBulkSelectedCustomer] = useState<Customer | null>(null);
    const [bulkCustomerSearch, setBulkCustomerSearch] = useState("");
    const [bulkShowCustomerDropdown, setBulkShowCustomerDropdown] = useState(false);
    const [bulkRequireMatch, setBulkRequireMatch] = useState(false);

    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [addCustomerModalTarget, setAddCustomerModalTarget] = useState<"single" | "bulk">("single");

    const filteredSingleCustomers = customers.filter(c => {
        if (!singleCustomerSearch.trim()) return true;
        const q = singleCustomerSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.contactNo && c.contactNo.toLowerCase().includes(q))
        );
    });

    const filteredBulkCustomers = customers.filter(c => {
        if (!bulkCustomerSearch.trim()) return true;
        const q = bulkCustomerSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.contactNo && c.contactNo.toLowerCase().includes(q))
        );
    });

    // ── Payment Mode state variables ──────────────────────────────
    const [singlePaymentMode, setSinglePaymentMode] = useState<"CASH" | "CARD">("CASH");
    const [singleMerchantId, setSingleMerchantId] = useState<string>("");
    const [singleCardholder, setSingleCardholder] = useState<string>("");
    const [singleCardLast4, setSingleCardLast4] = useState<string>("");
    const [singleSlipNo, setSingleSlipNo] = useState<string>("");

    const [bulkPaymentMode, setBulkPaymentMode] = useState<"CASH" | "CARD">("CASH");
    const [bulkMerchantId, setBulkMerchantId] = useState<string>("");
    const [bulkCardholder, setBulkCardholder] = useState<string>("");
    const [bulkCardLast4, setBulkCardLast4] = useState<string>("");
    const [bulkSlipNo, setBulkSlipNo] = useState<string>("");

    const [merchants, setMerchants] = useState<MerchantConfig[]>([]);
    const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);

    // ── Void confirm ─────────────────────────────────────────────
    const [voidId, setVoidId] = useState<string | null>(null);

    // ── Print voucher receipt ────────────────────────────────────
    const [vouchersToPrint, setVouchersToPrint] = useState<Voucher[] | null>(null);

    // ── Data ─────────────────────────────────────────────────────
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // ── Data ─────────────────────────────────────────────────────
    const fetchVouchers = useCallback(async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams();
            if (showVoided) {
                query.append("includeVoided", "true");
            }
            if (currentLocationId) {
                query.append("locationId", currentLocationId);
            }
            if (activeTab !== "ALL") {
                query.append("voucherType", activeTab);
            }
            if (statusFilter !== "ALL") {
                query.append("status", statusFilter);
            }
            if (search.trim() !== "") {
                query.append("search", search.trim());
            }
            query.append("page", String(page));
            query.append("limit", String(limit));

            const res = await authFetch(`/pos-config/vouchers?${query.toString()}`);
            if (res.ok && res.data?.status) {
                setVouchers(res.data.data || []);
                if (res.data.pagination) {
                    setTotal(res.data.pagination.total);
                    setTotalPages(res.data.pagination.totalPages);
                }
            }
        } catch { toast.error("Failed to load vouchers"); }
        finally { setIsLoading(false); }
    }, [showVoided, currentLocationId, activeTab, statusFilter, search, page, limit]);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    useEffect(() => {
        getLocations().then(res => {
            if (res.status && res.data) setLocations(res.data);
        });
        getCustomers().then(data => {
            setCustomers(data);
        });

        setIsLoadingMerchants(true);
        authFetch("/pos-config/merchants/for-location")
            .then(res => {
                if (res.ok && res.data?.status) setMerchants(res.data.data || []);
            })
            .catch(() => toast.error("Failed to load merchant terminals"))
            .finally(() => setIsLoadingMerchants(false));
    }, []);

    const filtered = activeTab === "ALL"
        ? vouchers
        : activeTab === "CLAIM"
        ? vouchers.filter(isClaimVoucher)
        : vouchers.filter(v => {
            if (activeTab === "EXCHANGE") {
                return v.voucherType === "EXCHANGE" && !isClaimVoucher(v);
            }
            return v.voucherType === activeTab;
        });

    // ── Handlers ─────────────────────────────────────────────────
    const handleSingleIssue = async () => {
        if (!singleAmount || Number(singleAmount) <= 0) { toast.error("Enter a valid amount"); return; }
        if (singleDiscount && (Number(singleDiscount) < 0 || Number(singleDiscount) > 100)) {
            toast.error("Discount percentage must be between 0 and 100");
            return;
        }
        if (singleType === "GIFT" && singlePaymentMode === "CARD") {
            if (!singleMerchantId) {
                toast.error("Merchant terminal is required for card payments");
                return;
            }
            if (singleCardLast4 && !/^\d{4}$/.test(singleCardLast4)) {
                toast.error("Card last 4 digits must be exactly 4 digits");
                return;
            }
        }
        if (singleType === "CORPORATE" && !singleCoGl) {
            toast.error("Please select a company/customer");
            return;
        }
        setIssuingSingle(true);
        try {
            const res = await authFetch("/pos-config/vouchers", {
                method: "POST",
                body: {
                    voucherType: singleType,
                    faceValue: Number(singleAmount),
                    discount: singleDiscount ? Number((Number(singleAmount) * (Number(singleDiscount) / 100)).toFixed(2)) : 0,
                    description: singleDesc || undefined,
                    companyName: singleType === "CORPORATE" ? singleCo || undefined : undefined,
                    companyGlCode: singleType === "CORPORATE" ? singleCoGl || undefined : undefined,
                    customerId: singleSelectedCustomer?.id || undefined,
                    requireCustomerMatch: singleSelectedCustomer ? singleRequireMatch : false,
                    expiresAt: singleExp || undefined,
                    locationIds: singleLocationIds,
                    paymentMode: singleType === "GIFT" ? singlePaymentMode : undefined,
                    merchantId: (singleType === "GIFT" && singlePaymentMode === "CARD") ? singleMerchantId : undefined,
                    cardholderName: (singleType === "GIFT" && singlePaymentMode === "CARD") ? singleCardholder || undefined : undefined,
                    cardLast4: (singleType === "GIFT" && singlePaymentMode === "CARD") ? singleCardLast4 || undefined : undefined,
                    slipNo: (singleType === "GIFT" && singlePaymentMode === "CARD") ? singleSlipNo || undefined : undefined,
                },
            });
            if (res.ok && res.data?.status) {
                setIssuedVoucher(res.data.data);
                setShowSingle(false);
                setSingleAmount(""); setSingleDiscount(""); setSingleDesc(""); setSingleCo(""); setSingleCoGl(""); setSingleExp(""); setSingleLocationIds(currentLocationId ? [currentLocationId] : []);
                setSinglePaymentMode("CASH"); setSingleMerchantId(""); setSingleCardholder(""); setSingleCardLast4(""); setSingleSlipNo("");
                setSingleSelectedCustomer(null); setSingleCustomerSearch(""); setSingleRequireMatch(false);
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to issue voucher");
            }
        } catch { toast.error("Failed to issue voucher"); }
        finally { setIssuingSingle(false); }
    };

    const handleBulkIssue = async () => {
        if (!bulkAmount || Number(bulkAmount) <= 0) { toast.error("Enter a valid amount"); return; }
        if (!bulkQty   || Number(bulkQty)   <= 0)  { toast.error("Enter a valid quantity"); return; }
        if (Number(bulkQty) > 500) { toast.error("Maximum 500 vouchers per batch"); return; }
        if (bulkDiscount && (Number(bulkDiscount) < 0 || Number(bulkDiscount) > 100)) {
            toast.error("Discount percentage must be between 0 and 100");
            return;
        }
        if (bulkType === "GIFT" && bulkPaymentMode === "CARD") {
            if (!bulkMerchantId) {
                toast.error("Merchant terminal is required for card payments");
                return;
            }
            if (bulkCardLast4 && !/^\d{4}$/.test(bulkCardLast4)) {
                toast.error("Card last 4 digits must be exactly 4 digits");
                return;
            }
        }
        if (bulkType === "CORPORATE" && !bulkCoGl) {
            toast.error("Please select a company/customer");
            return;
        }
        setIssuingBulk(true);
        try {
            const res = await authFetch("/pos-config/vouchers/bulk", {
                method: "POST",
                body: {
                    voucherType: bulkType,
                    faceValue: Number(bulkAmount),
                    quantity: Number(bulkQty),
                    discount: bulkDiscount ? Number((Number(bulkAmount) * (Number(bulkDiscount) / 100)).toFixed(2)) : 0,
                    description: bulkDesc || undefined,
                    companyName: bulkType === "CORPORATE" ? bulkCo || undefined : undefined,
                    companyGlCode: bulkType === "CORPORATE" ? bulkCoGl || undefined : undefined,
                    customerId: bulkSelectedCustomer?.id || undefined,
                    requireCustomerMatch: bulkSelectedCustomer ? bulkRequireMatch : false,
                    expiresAt: bulkExp || undefined,
                    locationIds: bulkLocationIds,
                    paymentMode: bulkType === "GIFT" ? bulkPaymentMode : undefined,
                    merchantId: (bulkType === "GIFT" && bulkPaymentMode === "CARD") ? bulkMerchantId : undefined,
                    cardholderName: (bulkType === "GIFT" && bulkPaymentMode === "CARD") ? bulkCardholder || undefined : undefined,
                    cardLast4: (bulkType === "GIFT" && bulkPaymentMode === "CARD") ? bulkCardLast4 || undefined : undefined,
                    slipNo: (bulkType === "GIFT" && bulkPaymentMode === "CARD") ? bulkSlipNo || undefined : undefined,
                },
            });
            if (res.ok && res.data?.status) {
                setBulkResult(res.data.data);
                setShowBulk(false);
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to issue vouchers");
            }
        } catch { toast.error("Failed to issue vouchers"); }
        finally { setIssuingBulk(false); }
    };

    const resetBulkForm = () => {
        setBulkAmount("");
        setBulkQty(10);
        setBulkDiscount("");
        setBulkDesc("");
        setBulkCo("");
        setBulkCoGl("");
        setBulkExp("");
        setBulkLocationIds(currentLocationId ? [currentLocationId] : []);
        setBulkPaymentMode("CASH");
        setBulkMerchantId("");
        setBulkCardholder("");
        setBulkCardLast4("");
        setBulkSlipNo("");
        setBulkSelectedCustomer(null);
        setBulkCustomerSearch("");
        setBulkRequireMatch(false);
    };

    const handlePrintBulk = () => {
        if (!bulkResult) return;
        const selectedLocations = locations
            .filter(loc => bulkLocationIds.includes(loc.id))
            .map(loc => ({
                id: Math.random().toString(),
                location: { id: loc.id, name: loc.name, code: loc.code },
            }));
        const createdVouchers: Voucher[] = bulkResult.codes.map(code => ({
            id: Math.random().toString(),
            code,
            voucherType: bulkType,
            faceValue: Number(bulkAmount),
            discount: bulkDiscount ? Number((Number(bulkAmount) * (Number(bulkDiscount) / 100)).toFixed(2)) : 0,
            description: bulkDesc || undefined,
            companyName: bulkCo || undefined,
            companyGlCode: bulkCoGl || undefined,
            customer: bulkSelectedCustomer ? { id: bulkSelectedCustomer.id, name: bulkSelectedCustomer.name, code: bulkSelectedCustomer.code, contactNo: bulkSelectedCustomer.contactNo } : null,
            requireCustomerMatch: bulkSelectedCustomer ? bulkRequireMatch : false,
            expiresAt: bulkExp || undefined,
            createdAt: new Date().toISOString(),
            isActive: true,
            isRedeemed: false,
            locations: selectedLocations,
        }));
        setVouchersToPrint(createdVouchers);
        setBulkResult(null);
        resetBulkForm();
    };

    const handleVoid = async () => {
        if (!voidId) return;
        try {
            const res = await authFetch(`/pos-config/vouchers/${voidId}/void`, { method: "PUT", body: {} });
            if (res.ok && res.data?.status) {
                toast.success("Voucher voided");
                setVoidId(null);
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to void");
            }
        } catch { toast.error("Failed to void voucher"); }
    };

    const handleRestore = async () => {
        if (!restoreId) return;
        try {
            const res = await authFetch(`/pos-config/vouchers/${restoreId}/restore`, { method: "PUT", body: {} });
            if (res.ok && res.data?.status) {
                toast.success("Voucher restored");
                setRestoreId(null);
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to restore");
            }
        } catch { toast.error("Failed to restore voucher"); }
    };

    const copyCode = (code: string) => {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(code).then(() => toast.success(`Copied: ${code}`));
        } else {
            const el = document.createElement("textarea");
            el.value = code;
            el.style.position = "fixed";
            el.style.opacity = "0";
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            toast.success(`Copied: ${code}`);
        }
    };

    const downloadCodes = (codes: string[]) => {
        const content = codes.join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vouchers-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const singleDiscountAmount = (singleAmount && singleDiscount)
        ? Number((Number(singleAmount) * (Number(singleDiscount) / 100)).toFixed(2))
        : 0;

    const bulkDiscountAmount = (bulkAmount && bulkDiscount)
        ? Number((Number(bulkAmount) * (Number(bulkDiscount) / 100)).toFixed(2))
        : 0;

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="p-6 space-y-5">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Vouchers</h1>
                    <p className="text-sm text-muted-foreground">Issue and manage vouchers</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={fetchVouchers} className="rounded-full" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    {canCreate && (
                        <Button variant="outline" onClick={() => setShowBulk(true)} className="gap-2">
                            <Layers className="w-4 h-4" /> Bulk Issue
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs + table */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                    <TabsList className="w-full md:w-auto flex flex-wrap h-auto">
                        <TabsTrigger value="ALL">All ({vouchers.length})</TabsTrigger>
                        {VOUCHER_TYPES.map(({ value, label }) => {
                            const count = vouchers.filter(v => {
                                if (value === "EXCHANGE") {
                                    return v.voucherType === "EXCHANGE" && !isClaimVoucher(v);
                                }
                                return v.voucherType === value;
                            }).length;
                            return (
                                <TabsTrigger key={value} value={value}>
                                    {label} ({count})
                                </TabsTrigger>
                            );
                        })}
                        <TabsTrigger value="CLAIM">
                            Claim ({vouchers.filter(isClaimVoucher).length})
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-2 self-end md:self-auto px-1">
                        <Switch
                            id="show-voided"
                            checked={showVoided}
                            onCheckedChange={setShowVoided}
                        />
                        <Label htmlFor="show-voided" className="text-sm cursor-pointer select-none font-medium">
                            Show Voided Vouchers
                        </Label>
                    </div>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {isLoading ? (
                            <p className="text-center text-muted-foreground py-12 text-sm">Loading...</p>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <Ticket className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground text-sm">No vouchers found</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Code</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Issued From</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Issued</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((v) => {
                                        const st       = voucherStatus(v);
                                        const isClaim  = isClaimVoucher(v);
                                        const typeInfo = isClaim ? CLAIM_TYPE_INFO : VOUCHER_TYPES.find(t => t.value === v.voucherType);
                                        const Icon     = typeInfo?.icon ?? Ticket;
                                        return (
                                            <TableRow key={v.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-primary">{v.code}</span>
                                                        <button onClick={() => copyCode(v.code)}
                                                            className="text-muted-foreground hover:text-foreground transition-colors">
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
                                                <TableCell className="text-sm">
                                                    {v.customer ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-semibold text-foreground truncate max-w-40" title={v.customer.name}>
                                                                {v.customer.name}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                                                <span>{v.customer.contactNo || v.customer.code}</span>
                                                                {v.requireCustomerMatch && (
                                                                    <span className="text-[9px] text-amber-600 font-sans font-bold bg-amber-500/10 px-1 py-0.5 rounded border border-amber-300/40">Matched</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : v.companyName ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-semibold text-foreground truncate max-w-40" title={v.companyName}>{v.companyName}</div>
                                                            {v.companyGlCode && <div className="text-[10px] text-muted-foreground font-mono">{v.companyGlCode}</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Walk-in</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                                                    {v.description ? v.description : "—"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {v.issuedByLocation ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-semibold text-foreground truncate max-w-40" title={v.issuedByLocation.name}>
                                                                {v.issuedByLocation.shortCode || v.issuedByLocation.name}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground font-mono">{v.issuedByLocation.code}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Global</span>
                                                    )}
                                                </TableCell>
                                                 <TableCell className="text-right font-mono">
                                                     <div className="font-semibold">{formatCurrency(Number(v.faceValue))}</div>
                                                     {v.discount !== undefined && Number(v.discount) > 0 && (
                                                         <div className="text-[10px] text-muted-foreground">
                                                             Disc: {formatCurrency(Number(v.discount))}
                                                         </div>
                                                     )}
                                                 </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{fmtDate(v.expiresAt)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{fmtDate(v.createdAt)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5", st.cls)}>
                                                        {st.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary"
                                                            onClick={() => setVouchersToPrint([v])}
                                                            title="Print voucher receipt"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </Button>
                                                        
                                                        {/* Void button - only for active, non-voided vouchers */}
                                                        {v.isActive && !v.isDeleted && !v.isRedeemed && canVoid && (
                                                            <Button variant="ghost" size="icon"
                                                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                                                                onClick={() => setVoidId(v.id)}
                                                                title="Void voucher">
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}

                                                        {/* Restore button - for voided/deleted vouchers */}
                                                        {v.isDeleted && !v.isRedeemed && canVoid && (
                                                            <Button variant="ghost" size="icon"
                                                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-emerald-600"
                                                                onClick={() => setRestoreId(v.id)}
                                                                title="Restore voucher">
                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ── Single Issue Modal ──────────────────────────────────── */}
            <Dialog open={showSingle} onOpenChange={open => { setShowSingle(open); if (!open) setSingleLocationIds(currentLocationId ? [currentLocationId] : []); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-primary" /> Issue Voucher
                        </DialogTitle>
                        <DialogDescription>A unique code will be generated automatically.</DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-5 py-2">
                        {/* Left — form fields */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={singleType} onValueChange={v => setSingleType(v as VoucherType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ISSUABLE_TYPES.map(({ value, label, icon: Icon }) => (
                                                <SelectItem key={value} value={value}>
                                                    <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount (Rs.) <span className="text-destructive">*</span></Label>
                                    <Input type="number" min="1" value={singleAmount}
                                        onChange={e => setSingleAmount(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="e.g. 1000" autoFocus />
                                </div>
                            </div>
                            {singleType === "GIFT" && (
                                <div className="space-y-3 rounded-lg border p-3 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Assigned Customer <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">Walk-in or Registered</span>
                                    </div>

                                    <div className="flex gap-2 relative">
                                        <div className="flex-1 relative">
                                            <Input
                                                placeholder="Search customer by name, phone or code..."
                                                value={singleCustomerSearch}
                                                onChange={(e) => {
                                                    setSingleCustomerSearch(e.target.value);
                                                    setSingleShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => setSingleShowCustomerDropdown(true)}
                                                onBlur={() => setTimeout(() => setSingleShowCustomerDropdown(false), 200)}
                                                className="w-full bg-background h-9 text-xs"
                                            />

                                            {singleShowCustomerDropdown && (
                                                <div className="absolute left-0 right-0 top-10 bg-popover border border-border shadow-lg rounded-md overflow-hidden z-[500] max-h-56 overflow-y-auto">
                                                    <ul className="flex flex-col">
                                                        <li
                                                            className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border/50 transition-colors text-xs font-semibold"
                                                            onMouseDown={() => {
                                                                setSingleSelectedCustomer(null);
                                                                setSingleCustomerSearch("");
                                                                setSingleShowCustomerDropdown(false);
                                                            }}
                                                        >
                                                            Walk-in Customer (Default)
                                                        </li>
                                                        {filteredSingleCustomers.length === 0 ? (
                                                            <div className="p-3 text-center text-xs text-muted-foreground italic">
                                                                No matching customers
                                                            </div>
                                                        ) : (
                                                            filteredSingleCustomers.map((c) => (
                                                                <li
                                                                    key={c.id}
                                                                    className="px-3 py-2 hover:bg-muted cursor-pointer flex flex-col border-b border-border/50 last:border-0 transition-colors text-left"
                                                                    onMouseDown={() => {
                                                                        setSingleSelectedCustomer(c);
                                                                        setSingleCustomerSearch("");
                                                                        setSingleShowCustomerDropdown(false);
                                                                    }}
                                                                >
                                                                    <span className="font-semibold text-xs">{c.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{c.contactNo || c.code}</span>
                                                                </li>
                                                            ))
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            className="h-9 px-3 shrink-0 text-xs gap-1"
                                            onClick={() => {
                                                setAddCustomerModalTarget("single");
                                                setShowAddCustomerModal(true);
                                            }}
                                            title="Add New Customer"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Customer
                                        </Button>
                                    </div>

                                    {singleSelectedCustomer ? (
                                        <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-emerald-700 leading-none truncate">{singleSelectedCustomer.name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{singleSelectedCustomer.contactNo || "No contact"} · {singleSelectedCustomer.code}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => setSingleSelectedCustomer(null)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-muted-foreground italic px-1">
                                            Issued as Walk-in Customer (usable by anyone)
                                        </div>
                                    )}

                                    {singleSelectedCustomer && (
                                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="single-require-match" className="text-xs font-medium cursor-pointer">
                                                    Require Customer Match
                                                </Label>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Only {singleSelectedCustomer.name} can redeem this voucher
                                                </p>
                                            </div>
                                            <Switch
                                                id="single-require-match"
                                                checked={singleRequireMatch}
                                                onCheckedChange={setSingleRequireMatch}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {singleType === "GIFT" && (
                                <div className="space-y-4 rounded-lg border p-3 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                                    <div className="space-y-2">
                                        <Label>Payment Method <span className="text-destructive">*</span></Label>
                                        <Select value={singlePaymentMode} onValueChange={v => setSinglePaymentMode(v as any)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="CARD">Credit Card</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {singlePaymentMode === "CARD" && (
                                        <div className="space-y-3 pt-2 border-t">
                                            <div className="space-y-2">
                                                <Label>Merchant / Bank Terminal <span className="text-destructive">*</span></Label>
                                                <Select value={singleMerchantId} onValueChange={setSingleMerchantId}>
                                                    <SelectTrigger>
                                                        {isLoadingMerchants ? "Loading terminals..." : <SelectValue placeholder="Select merchant terminal..." />}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {merchants.length === 0 && (
                                                            <div className="p-2 text-center text-xs text-muted-foreground italic">
                                                                No merchant terminals configured
                                                            </div>
                                                        )}
                                                        {merchants.map(m => (
                                                            <SelectItem key={m.id} value={m.id}>
                                                                {m.bankName} - {m.description} (#{m.merchantCode})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-2">
                                                    <Label>Cardholder Name</Label>
                                                    <Input value={singleCardholder} onChange={e => setSingleCardholder(e.target.value)} placeholder="Name on card" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Card # (last 4)</Label>
                                                    <Input value={singleCardLast4} maxLength={4} onChange={e => setSingleCardLast4(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>AUTH ID / Approval Code</Label>
                                                <Input value={singleSlipNo} onChange={e => setSingleSlipNo(e.target.value)} placeholder="Slip or reference number" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {singleType === "GIFT" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Label>Discount (%)</Label>
                                    <Input type="number" min="0" max="100" value={singleDiscount}
                                        onChange={e => setSingleDiscount(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="e.g. 10" />
                                </div>
                            )}
                            {singleType === "CORPORATE" && (
                                <div className="space-y-2">
                                    <Label>Company / ERP Customer <span className="text-destructive">*</span></Label>
                                    <Select 
                                        value={singleCoGl} 
                                        onValueChange={val => {
                                            setSingleCoGl(val);
                                            const cust = customers.find(c => c.code === val);
                                            if (cust) {
                                                setSingleCo(cust.name);
                                            } else {
                                                setSingleCo("");
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select ERP customer..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.length === 0 && (
                                                <div className="p-2 text-center text-xs text-muted-foreground italic">
                                                    No ERP customers found
                                                </div>
                                            )}
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.code}>
                                                    {c.name} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Input value={singleDesc} onChange={e => setSingleDesc(e.target.value)} placeholder="e.g. Birthday gift" />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date (Optional)</Label>
                                <DatePicker
                                    value={singleExp}
                                    onChange={val => setSingleExp(val)}
                                    placeholder="Pick expiry date"
                                    fromYear={new Date().getFullYear()}
                                />
                            </div>
                        </div>

                        {/* Right — location selector */}
                        <div className="w-64 shrink-0 space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                Redeemable At
                                <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                                Leave empty to allow redemption at all locations.
                            </p>
                            <LocationMultiSelect
                                locations={locations}
                                selected={singleLocationIds}
                                onChange={setSingleLocationIds}
                                disabled={issuingSingle}
                                maxHeight="280px"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowSingle(false)}>Cancel</Button>
                        <Button onClick={handleSingleIssue} disabled={issuingSingle} className="gap-2">
                            <Ticket className="w-4 h-4" />
                            {issuingSingle ? "Issuing..." : "Issue Voucher"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk Issue Modal ────────────────────────────────────── */}
            <Dialog open={showBulk} onOpenChange={open => { setShowBulk(open); if (!open) setBulkLocationIds(currentLocationId ? [currentLocationId] : []); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" /> Bulk Issue Vouchers
                        </DialogTitle>
                        <DialogDescription>
                            Generate multiple unique voucher codes at once — e.g. for pamphlets or campaigns.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-5 py-2">
                        {/* Left — form fields */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={bulkType} onValueChange={v => setBulkType(v as VoucherType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ISSUABLE_TYPES.map(({ value, label, icon: Icon }) => (
                                                <SelectItem key={value} value={value}>
                                                    <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount per Voucher (Rs.) <span className="text-destructive">*</span></Label>
                                    <Input type="number" min="1" value={bulkAmount}
                                        onChange={e => setBulkAmount(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="e.g. 500" autoFocus />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quantity <span className="text-destructive">*</span>
                                        <span className="text-muted-foreground font-normal ml-1">(max 500)</span>
                                    </Label>
                                    <Input type="number" min="1" max="500" value={bulkQty}
                                        onChange={e => setBulkQty(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="e.g. 100" />
                                </div>
                                {bulkType === "GIFT" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <Label>Discount per Voucher (%)</Label>
                                        <Input type="number" min="0" max="100" value={bulkDiscount}
                                            onChange={e => setBulkDiscount(e.target.value ? Number(e.target.value) : "")}
                                            placeholder="e.g. 10" />
                                    </div>
                                )}
                            </div>

                            {bulkType === "GIFT" && (
                                <div className="space-y-3 rounded-lg border p-3 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Assigned Customer <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">Walk-in or Registered</span>
                                    </div>

                                    <div className="flex gap-2 relative">
                                        <div className="flex-1 relative">
                                            <Input
                                                placeholder="Search customer by name, phone or code..."
                                                value={bulkCustomerSearch}
                                                onChange={(e) => {
                                                    setBulkCustomerSearch(e.target.value);
                                                    setBulkShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => setBulkShowCustomerDropdown(true)}
                                                onBlur={() => setTimeout(() => setBulkShowCustomerDropdown(false), 200)}
                                                className="w-full bg-background h-9 text-xs"
                                            />

                                            {bulkShowCustomerDropdown && (
                                                <div className="absolute left-0 right-0 top-10 bg-popover border border-border shadow-lg rounded-md overflow-hidden z-[500] max-h-56 overflow-y-auto">
                                                    <ul className="flex flex-col">
                                                        <li
                                                            className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border/50 transition-colors text-xs font-semibold"
                                                            onMouseDown={() => {
                                                                setBulkSelectedCustomer(null);
                                                                setBulkCustomerSearch("");
                                                                setBulkShowCustomerDropdown(false);
                                                            }}
                                                        >
                                                            Walk-in Customer (Default)
                                                        </li>
                                                        {filteredBulkCustomers.length === 0 ? (
                                                            <div className="p-3 text-center text-xs text-muted-foreground italic">
                                                                No matching customers
                                                            </div>
                                                        ) : (
                                                            filteredBulkCustomers.map((c) => (
                                                                <li
                                                                    key={c.id}
                                                                    className="px-3 py-2 hover:bg-muted cursor-pointer flex flex-col border-b border-border/50 last:border-0 transition-colors text-left"
                                                                    onMouseDown={() => {
                                                                        setBulkSelectedCustomer(c);
                                                                        setBulkCustomerSearch("");
                                                                        setBulkShowCustomerDropdown(false);
                                                                    }}
                                                                >
                                                                    <span className="font-semibold text-xs">{c.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{c.contactNo || c.code}</span>
                                                                </li>
                                                            ))
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            className="h-9 px-3 shrink-0 text-xs gap-1"
                                            onClick={() => {
                                                setAddCustomerModalTarget("bulk");
                                                setShowAddCustomerModal(true);
                                            }}
                                            title="Add New Customer"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Customer
                                        </Button>
                                    </div>

                                    {bulkSelectedCustomer ? (
                                        <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-emerald-700 leading-none truncate">{bulkSelectedCustomer.name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{bulkSelectedCustomer.contactNo || "No contact"} · {bulkSelectedCustomer.code}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => setBulkSelectedCustomer(null)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-muted-foreground italic px-1">
                                            Issued as Walk-in Customer (usable by anyone)
                                        </div>
                                    )}

                                    {bulkSelectedCustomer && (
                                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="bulk-require-match" className="text-xs font-medium cursor-pointer">
                                                    Require Customer Match
                                                </Label>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Only {bulkSelectedCustomer.name} can redeem these vouchers
                                                </p>
                                            </div>
                                            <Switch
                                                id="bulk-require-match"
                                                checked={bulkRequireMatch}
                                                onCheckedChange={setBulkRequireMatch}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {bulkType === "GIFT" && (
                                <div className="space-y-4 rounded-lg border p-3 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                                    <div className="space-y-2">
                                        <Label>Payment Method <span className="text-destructive">*</span></Label>
                                        <Select value={bulkPaymentMode} onValueChange={v => setBulkPaymentMode(v as any)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="CARD">Credit Card</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {bulkPaymentMode === "CARD" && (
                                        <div className="space-y-3 pt-2 border-t">
                                            <div className="space-y-2">
                                                <Label>Merchant / Bank Terminal <span className="text-destructive">*</span></Label>
                                                <Select value={bulkMerchantId} onValueChange={setBulkMerchantId}>
                                                    <SelectTrigger>
                                                        {isLoadingMerchants ? "Loading terminals..." : <SelectValue placeholder="Select merchant terminal..." />}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {merchants.length === 0 && (
                                                            <div className="p-2 text-center text-xs text-muted-foreground italic">
                                                                No merchant terminals configured
                                                            </div>
                                                        )}
                                                        {merchants.map(m => (
                                                            <SelectItem key={m.id} value={m.id}>
                                                                {m.bankName} - {m.description} (#{m.merchantCode})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-2">
                                                    <Label>Cardholder Name</Label>
                                                    <Input value={bulkCardholder} onChange={e => setBulkCardholder(e.target.value)} placeholder="Name on card" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Card # (last 4)</Label>
                                                    <Input value={bulkCardLast4} maxLength={4} onChange={e => setBulkCardLast4(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>AUTH ID / Approval Code</Label>
                                                <Input value={bulkSlipNo} onChange={e => setBulkSlipNo(e.target.value)} placeholder="Slip or reference number" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {bulkType === "CORPORATE" && (
                                <div className="space-y-2">
                                    <Label>Company / ERP Customer <span className="text-destructive">*</span></Label>
                                    <Select 
                                        value={bulkCoGl} 
                                        onValueChange={val => {
                                            setBulkCoGl(val);
                                            const cust = customers.find(c => c.code === val);
                                            if (cust) {
                                                setBulkCo(cust.name);
                                            } else {
                                                setBulkCo("");
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select ERP customer..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.length === 0 && (
                                                <div className="p-2 text-center text-xs text-muted-foreground italic">
                                                    No ERP customers found
                                                </div>
                                            )}
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.code}>
                                                    {c.name} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Input value={bulkDesc} onChange={e => setBulkDesc(e.target.value)}
                                    placeholder="e.g. Summer campaign 2026" />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date (Optional)</Label>
                                <Input type="date" value={bulkExp} onChange={e => setBulkExp(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]} />
                            </div>

                            {/* Summary preview */}
                            {bulkAmount && bulkQty && Number(bulkAmount) > 0 && Number(bulkQty) > 0 && (
                                <div className="rounded-lg bg-muted/40 border px-4 py-3 text-sm space-y-1">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Vouchers to generate</span>
                                        <span className="font-semibold text-foreground">{bulkQty}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Value each</span>
                                        <span className="font-semibold text-foreground">{formatCurrency(Number(bulkAmount))}</span>
                                    </div>
                                    {bulkType === "GIFT" && bulkDiscount && Number(bulkDiscount) > 0 && (
                                        <>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Discount each ({bulkDiscount}%)</span>
                                                <span className="font-semibold text-destructive">-{formatCurrency(bulkDiscountAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Net price each</span>
                                                <span className="font-semibold text-emerald-600">{formatCurrency(Number(bulkAmount) - bulkDiscountAmount)}</span>
                                            </div>
                                        </>
                                    )}
                                    <Separator className="my-1" />
                                    <div className="flex justify-between font-semibold">
                                        <span>Total face value</span>
                                        <span>{formatCurrency(Number(bulkAmount) * Number(bulkQty))}</span>
                                    </div>
                                    {bulkType === "GIFT" && bulkDiscount && Number(bulkDiscount) > 0 && (
                                        <div className="flex justify-between font-semibold text-emerald-600">
                                            <span>Total amount payable</span>
                                            <span>{formatCurrency((Number(bulkAmount) - bulkDiscountAmount) * Number(bulkQty))}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right — location selector */}
                        <div className="w-64 shrink-0 space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                Redeemable At
                                <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                                Leave empty to allow redemption at all locations.
                            </p>
                            <LocationMultiSelect
                                locations={locations}
                                selected={bulkLocationIds}
                                onChange={setBulkLocationIds}
                                disabled={issuingBulk}
                                maxHeight="280px"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowBulk(false)}>Cancel</Button>
                        <Button onClick={handleBulkIssue} disabled={issuingBulk} className="gap-2">
                            <Layers className="w-4 h-4" />
                            {issuingBulk ? `Generating...` : `Generate ${bulkQty || ""} Vouchers`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk Result Modal ───────────────────────────────────── */}
            {bulkResult && (
                <Dialog open onOpenChange={() => { setBulkResult(null); resetBulkForm(); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                {bulkResult.count} Vouchers Generated
                            </DialogTitle>
                            <DialogDescription>
                                All codes are now active and ready to distribute.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/30 p-3 my-3">
                            <div className="grid grid-cols-2 gap-1.5">
                                {bulkResult.codes.map(code => (
                                    <div key={code}
                                        className="flex items-center justify-between rounded px-2 py-1 bg-background border text-xs font-mono">
                                        <span className="font-bold text-primary">{code}</span>
                                        <button onClick={() => copyCode(code)}
                                            className="text-muted-foreground hover:text-foreground ml-1">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => downloadCodes(bulkResult.codes)} className="gap-2">
                                <Download className="w-4 h-4" /> Download .txt
                            </Button>
                            <Button onClick={handlePrintBulk} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Printer className="w-4 h-4" /> Print Receipts
                            </Button>
                            <Button onClick={() => { setBulkResult(null); resetBulkForm(); }}>Done</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* ── Void Confirm ────────────────────────────────────────── */}
            <AlertDialog open={!!voidId} onOpenChange={() => setVoidId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Void Voucher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently deactivate the voucher. It cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoid} className="bg-destructive hover:bg-destructive/90">
                            Void
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Restore Confirm ────────────────────────────────────────── */}
            <AlertDialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restore Voucher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reactivate the voucher. It will be usable again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} className="bg-emerald-600 hover:bg-emerald-600/90 text-white">
                            Restore
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Issued Voucher Success Dialog ──────────────────────── */}
            {issuedVoucher && (
                <Dialog open onOpenChange={() => setIssuedVoucher(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Voucher Issued Successfully
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="text-center space-y-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200">
                                <p className="text-sm text-muted-foreground">Voucher Code</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="font-mono font-black text-2xl text-emerald-700">{issuedVoucher.code}</p>
                                    <button onClick={() => copyCode(issuedVoucher.code)}
                                        className="text-emerald-600 hover:text-emerald-700">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm font-semibold">{formatCurrency(Number(issuedVoucher.faceValue))}</p>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setIssuedVoucher(null)}>Close</Button>
                            <Button onClick={() => {
                                setVouchersToPrint([issuedVoucher]);
                                setIssuedVoucher(null);
                            }} className="gap-2">
                                <Printer className="w-4 h-4" /> Print Receipt
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* ── Print Voucher Receipt ───────────────────────────────── */}
            {vouchersToPrint && (
                <PrintVoucherReceipt
                    vouchers={vouchersToPrint}
                    autoPrint={false}
                    onClose={() => setVouchersToPrint(null)}
                />
            )}

            {/* ── Add Customer Modal ────────────────────────────────────── */}
            <AddCustomerModal
                open={showAddCustomerModal}
                onOpenChange={setShowAddCustomerModal}
                onSuccess={(newCustomer) => {
                    getCustomers().then(data => setCustomers(data));
                    if (addCustomerModalTarget === "single") {
                        setSingleSelectedCustomer(newCustomer);
                    } else {
                        setBulkSelectedCustomer(newCustomer);
                    }
                }}
            />
        </div>
    );
}

// ─── Add Customer Modal ─────────────────────────────────────────────────
function AddCustomerModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customer: Customer) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactNo: "",
    email: "",
    cnicNo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const code = `CUST-${Date.now()}`;
      const res = await authFetch("/pos-sales/customers", {
        method: "POST",
        body: { ...formData, code },
      });
      if (res.ok && res.data?.status) {
        toast.success("Customer added successfully");
        onSuccess(res.data.data);
        onOpenChange(false);
        setFormData({ name: "", contactNo: "", email: "", cnicNo: "" });
      } else {
        toast.error(res.data?.message || "Failed to add customer");
      }
    } catch {
      toast.error("Failed to add customer. Check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Customer name"
              value={formData.name}
              onChange={(e) =>
                setFormData((d) => ({ ...d, name: e.target.value }))
              }
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              placeholder="e.g. 03001234567"
              value={formData.contactNo}
              onChange={(e) =>
                setFormData((d) => ({ ...d, contactNo: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="e.g. customer@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((d) => ({ ...d, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>CNIC</Label>
            <Input
              placeholder="e.g. 42201-1234567-1"
              value={formData.cnicNo}
              onChange={(e) =>
                setFormData((d) => ({ ...d, cnicNo: e.target.value }))
              }
              maxLength={15}
            />
            <p className="text-[11px] text-muted-foreground">
              Format: 42201-1234567-1
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
