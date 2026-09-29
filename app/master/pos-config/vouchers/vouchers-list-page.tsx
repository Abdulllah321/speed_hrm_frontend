"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTransitionType } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Gift,
  RefreshCw,
  CreditCard,
  Building2,
  MapPin,
  Ticket,
  Copy,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  Ban,
  Receipt,
  Eye,
  ArrowLeftRight,
  Sparkles,
  Store,
  Layers,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Voucher,
  VoucherType,
  voidVoucher,
  updateVoucherExpiry,
  getVouchers,
} from "@/lib/actions/vouchers";
import { getLocations, Location } from "@/lib/actions/location";
import { cn, formatCurrency } from "@/lib/utils";

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

export const VOUCHER_CATEGORY_TABS: {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { id: "ALL", label: "All Vouchers", icon: Layers, color: "text-slate-700 dark:text-slate-300" },
  { id: "GIFT", label: "Gift Vouchers", icon: Gift, color: "text-emerald-600 dark:text-emerald-400" },
  { id: "CORPORATE", label: "Corporate", icon: Building2, color: "text-amber-600 dark:text-amber-400" },
  { id: "REFUND", label: "Refund Memo", icon: Ticket, color: "text-purple-600 dark:text-purple-400" },
  { id: "EXCHANGE", label: "Exchange", icon: ArrowLeftRight, color: "text-blue-600 dark:text-blue-400" },
  { id: "CLAIM", label: "Claims", icon: Receipt, color: "text-indigo-600 dark:text-indigo-400" },
  { id: "CREDIT", label: "Credit Notes", icon: CreditCard, color: "text-violet-600 dark:text-violet-400" },
];

const isClaimVoucher = (v: Voucher) => {
  if (v.claims && v.claims.length > 0) return true;
  if (v.description && /approved claim/i.test(v.description)) return true;
  return false;
};

/**
 * Accurate business status classification:
 * 1. REDEEMED: isRedeemed === true (settled at POS)
 * 2. REFUNDED: voucherType === 'REFUND'
 * 3. VOIDED: isDeleted === true (cancelled)
 * 4. EXPIRED: expiresAt has passed & unredeemed
 * 5. INACTIVE: explicitly inactive & unredeemed
 * 6. ACTIVE: valid and available for redemption
 */
export function getVoucherStatusInfo(v: Voucher): {
  status: "REDEEMED" | "REFUNDED" | "EXPIRED" | "ACTIVE" | "VOIDED" | "INACTIVE";
  label: string;
  className: string;
  dotColor: string;
  icon: React.ElementType;
} {
  const now = new Date();
  const isExpired = v.expiresAt ? new Date(v.expiresAt).getTime() < now.getTime() : false;

  // 1. Redeemed (Highest priority - settled vouchers must ALWAYS show Redeemed)
  if (v.isRedeemed) {
    return {
      status: "REDEEMED",
      label: "Redeemed",
      className:
        "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dotColor: "bg-blue-500",
      icon: CheckCircle2,
    };
  }

  // 2. Refund Voucher type
  if (v.voucherType === "REFUND") {
    return {
      status: "REFUNDED",
      label: "Refund Memo",
      className:
        "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      dotColor: "bg-purple-500",
      icon: Ticket,
    };
  }

  // 3. Voided / Deleted
  if (v.isDeleted) {
    return {
      status: "VOIDED",
      label: "Voided",
      className:
        "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dotColor: "bg-rose-500",
      icon: Ban,
    };
  }

  // 4. Expired (Past validity date & not redeemed)
  if (isExpired) {
    return {
      status: "EXPIRED",
      label: "Expired",
      className:
        "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotColor: "bg-amber-500",
      icon: Clock,
    };
  }

  // 5. Inactive / Suspended (explicitly deactivated while not expired)
  if (v.isActive === false) {
    return {
      status: "INACTIVE",
      label: "Inactive",
      className:
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      dotColor: "bg-slate-400",
      icon: Ban,
    };
  }

  // 6. Active (Ready to redeem)
  return {
    status: "ACTIVE",
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    icon: Sparkles,
  };
}

function getVoucherDescription(v: Voucher) {
  if (v.description) return v.description;

  if (v.voucherType === "CORPORATE" && (v.companyName || v.companyGlCode)) {
    return `${v.companyName ?? ""}${v.companyGlCode ? ` (${v.companyGlCode})` : ""}`.trim();
  }

  if (v.voucherType === "EXCHANGE" && v.sourceOrder) {
    const ref =
      v.sourceOrder.returnNumber ||
      v.sourceOrder.refundNumber ||
      v.sourceOrder.orderNumber;
    if (ref) return `Return Ref: ${ref}`;
  }

  if (v.voucherType === "CREDIT" && v.customerId) {
    return `Customer ID: ${v.customerId}`;
  }

  if (v.claims && v.claims.length > 0) {
    return `Claim: ${v.claims.map((c) => c.claimNumber).join(", ")}`;
  }

  return "—";
}

export function VouchersListPage({ initialData }: Props) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Data state
  const [vouchers, setVouchers] = useState<Voucher[]>(initialData?.vouchers || []);
  const [pagination, setPagination] = useState(
    initialData?.pagination || {
      page: 1,
      limit: 25,
      total: initialData?.vouchers?.length || 0,
      totalPages: 1,
    },
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
  const [locations, setLocations] = useState<Location[]>([]);

  // Dialog & Detail states
  const [voidId, setVoidId] = useState<string | null>(null);
  const [editExpiryVoucher, setEditExpiryVoucher] = useState<Voucher | null>(null);
  const [expiryValue, setExpiryValue] = useState<string>("");
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<Voucher | null>(null);

  const canCreate = hasPermission("pos.voucher.create");
  const canVoid = hasPermission("pos.voucher.void");
  const canEditExpiry = canCreate || canVoid;

  // Load locations
  useEffect(() => {
    getLocations().then((res) => {
      if (res.status && res.data) setLocations(res.data);
    });
  }, []);

  // Fetch data with server-side filters & pagination
  const loadVouchersData = useCallback(
    async (page: number = 1) => {
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
    },
    [
      activeTab,
      statusFilter,
      selectedLocationId,
      search,
      startDate,
      endDate,
      pagination.limit,
    ],
  );

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

  const hasActiveFilters =
    activeTab !== "ALL" ||
    statusFilter !== "ALL" ||
    search !== "" ||
    startDate !== "" ||
    endDate !== "" ||
    selectedLocationId !== "ALL";

  // Calculate quick stats on current page dataset
  const totalValueOnPage = vouchers.reduce((sum, v) => sum + Number(v.faceValue || 0), 0);
  const activeCountOnPage = vouchers.filter((v) => getVoucherStatusInfo(v).status === "ACTIVE").length;
  const redeemedCountOnPage = vouchers.filter((v) => v.isRedeemed).length;
  const expiredCountOnPage = vouchers.filter((v) => getVoucherStatusInfo(v).status === "EXPIRED").length;

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-10">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Ticket className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Voucher Management Registry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-normal">
            Enterprise issuance, validity control, lifecycle audit, and redemption monitoring across all outlets.
          </p>
        </div>

        {canCreate && (
          <Button
            className="gap-2 shrink-0 shadow-xs cursor-pointer"
            onClick={() => {
              startTransition(() => {
                addTransitionType("nav-forward");
                router.push("/master/pos-config/vouchers/new");
              });
            }}
          >
            <Plus className="h-4 w-4" /> Issue New Voucher
          </Button>
        )}
      </div>

      {/* KPI Stats Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border/70 bg-card/60 shadow-2xs rounded-xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Total Vouchers
              </div>
              <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                {pagination.total.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Layers className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/60 shadow-2xs rounded-xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Active Ready
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeCountOnPage.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">in page</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/60 shadow-2xs rounded-xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Redeemed
              </div>
              <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {redeemedCountOnPage.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">in page</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/60 shadow-2xs rounded-xl">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Expired Unsettled
              </div>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {expiredCountOnPage.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">in page</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs Pill Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-card p-2.5 rounded-xl border border-border/70 shadow-2xs">
        {VOUCHER_CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                  : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "opacity-90" : tab.color)} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Multi-Filter Toolbar */}
      <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code, company, customer, memo ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          {/* Status Filter */}
          <div className="w-[160px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active (Ready)</SelectItem>
                <SelectItem value="REDEEMED">Redeemed (Settled)</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="VOIDED">Voided (Deleted)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Filter */}
          <div className="w-[200px]">
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="ALL">All Stores</SelectItem>
                {locations.map((loc) => (
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
              className="h-9 text-xs w-[130px] bg-background"
            />
            <span>To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs w-[130px] bg-background"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[170px] text-xs font-semibold">Voucher Code</TableHead>
              <TableHead className="w-[140px] text-xs font-semibold">Type</TableHead>
              <TableHead className="text-xs font-semibold">Customer / Company Profile</TableHead>
              <TableHead className="text-right w-[150px] text-xs font-semibold">Face Value (PKR)</TableHead>
              <TableHead className="w-[140px] text-xs font-semibold">Issuing Store</TableHead>
              <TableHead className="w-[170px] text-xs font-semibold">Validity / Expiry</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold">Status</TableHead>
              <TableHead className="w-[120px] text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-medium">Fetching vouchers from database...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : vouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-16 text-xs">
                  No vouchers found matching the specified filters.
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((v) => {
                const statusInfo = getVoucherStatusInfo(v);
                const isClaim = isClaimVoucher(v);
                const typeTab = isClaim
                  ? VOUCHER_CATEGORY_TABS.find((t) => t.id === "CLAIM")
                  : VOUCHER_CATEGORY_TABS.find((t) => t.id === v.voucherType) ||
                    VOUCHER_CATEGORY_TABS.find((t) => t.id === "GIFT");
                const Icon = typeTab?.icon ?? Ticket;

                const isExpired = v.expiresAt ? new Date(v.expiresAt) < new Date() : false;
                const validTillStr = v.expiresAt
                  ? new Date(v.expiresAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "No Expiry";

                const createdStr = new Date(v.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <TableRow
                    key={v.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedVoucherForModal(v)}
                  >
                    {/* Code */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                          {v.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(v.code);
                            toast.success(`Copied: ${v.code}`);
                          }}
                          className="text-muted-foreground/60 hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                          title="Copy Code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", typeTab?.color)}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{typeTab?.label || v.voucherType}</span>
                      </span>
                    </TableCell>

                    {/* Customer / Company */}
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium text-xs text-foreground truncate" title={getVoucherDescription(v)}>
                        {getVoucherDescription(v)}
                      </div>
                      {v.customer && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{v.customer.name}</span>
                          {v.customer.contactNo && <span>• {v.customer.contactNo}</span>}
                        </div>
                      )}
                    </TableCell>

                    {/* Face Value */}
                    <TableCell className="text-right font-mono">
                      <div className="font-bold text-xs text-foreground">
                        {formatCurrency(Number(v.faceValue))}
                      </div>
                      {v.discount !== undefined && Number(v.discount) > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Disc: {formatCurrency(Number(v.discount))}
                        </div>
                      )}
                    </TableCell>

                    {/* Store */}
                    <TableCell>
                      {v.issuedByLocation ? (
                        <Badge variant="outline" className="text-[10px] font-mono font-medium">
                          {v.issuedByLocation.shortCode || v.issuedByLocation.code || v.issuedByLocation.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">All Locations</span>
                      )}
                    </TableCell>

                    {/* Validity */}
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">{validTillStr}</div>
                      <div className="text-[10px] text-muted-foreground">Issued: {createdStr}</div>
                    </TableCell>

                    {/* Accurate Status Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold py-0.5 px-2 gap-1 rounded-md border",
                          statusInfo.className,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                        <span>{statusInfo.label}</span>
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="View 360° Details"
                          onClick={() => setSelectedVoucherForModal(v)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {canEditExpiry && !v.isRedeemed && !v.isDeleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => {
                              setEditExpiryVoucher(v);
                              setExpiryValue(formatForDateTimeLocal(v.expiresAt));
                            }}
                          >
                            Expiry
                          </Button>
                        )}

                        {canVoid && !v.isRedeemed && !v.isDeleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            onClick={() => setVoidId(v.id)}
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1">
        <div className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagination.total.toLocaleString()}
          </span>{" "}
          vouchers
        </div>

        <div className="flex items-center gap-3">
          {/* Per Page Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Per page:</span>
            <Select
              value={String(pagination.limit)}
              onValueChange={(val) => {
                const newLimit = Number(val);
                setPagination((p) => ({ ...p, limit: newLimit, page: 1 }));
              }}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs bg-background">
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

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => loadVouchersData(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 font-medium font-mono">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => loadVouchersData(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 360° Voucher Detail Modal */}
      {selectedVoucherForModal && (
        <Dialog open={!!selectedVoucherForModal} onOpenChange={() => setSelectedVoucherForModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    Voucher 360° Audit Details
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Lifecycle metadata, customer binding, and redemption tracking.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Top Summary Card */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Voucher Code
                  </div>
                  <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                    {selectedVoucherForModal.code}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold py-1 px-2.5 gap-1 rounded-md border",
                    getVoucherStatusInfo(selectedVoucherForModal).className,
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      getVoucherStatusInfo(selectedVoucherForModal).dotColor,
                    )}
                  />
                  <span>{getVoucherStatusInfo(selectedVoucherForModal).label}</span>
                </Badge>
              </div>

              {/* Financial Attributes */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/60 bg-card">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Face Value</span>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {formatCurrency(Number(selectedVoucherForModal.faceValue))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Discount / Promo</span>
                  <div className="text-base font-bold font-mono text-muted-foreground mt-0.5">
                    {formatCurrency(Number(selectedVoucherForModal.discount || 0))}
                  </div>
                </div>
              </div>

              {/* Ownership & Association Details */}
              <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-card">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Voucher Category</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedVoucherForModal.voucherType}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Description / Ref</span>
                  <span className="font-medium text-foreground text-right">
                    {getVoucherDescription(selectedVoucherForModal)}
                  </span>
                </div>
                {selectedVoucherForModal.companyName && (
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Corporate Account</span>
                    <span className="font-medium text-foreground">
                      {selectedVoucherForModal.companyName}{" "}
                      {selectedVoucherForModal.companyGlCode ? `(${selectedVoucherForModal.companyGlCode})` : ""}
                    </span>
                  </div>
                )}
                {selectedVoucherForModal.customer && (
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Customer Profile</span>
                    <span className="font-medium text-foreground">
                      {selectedVoucherForModal.customer.name}{" "}
                      {selectedVoucherForModal.customer.contactNo ? `(${selectedVoucherForModal.customer.contactNo})` : ""}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Issuing Location</span>
                  <span className="font-medium text-foreground">
                    {selectedVoucherForModal.issuedByLocation?.name || "All Locations"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Creation Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedVoucherForModal.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground font-medium">Expiry Date</span>
                  <span className="font-medium text-foreground">
                    {selectedVoucherForModal.expiresAt
                      ? new Date(selectedVoucherForModal.expiresAt).toLocaleString("en-GB")
                      : "No Expiration Date"}
                  </span>
                </div>
              </div>

              {/* Redemptions List if settled */}
              {selectedVoucherForModal.redemptions && selectedVoucherForModal.redemptions.length > 0 && (
                <div className="p-3 rounded-lg border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 space-y-2">
                  <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    POS Redemptions
                  </div>
                  {selectedVoucherForModal.redemptions.map((r, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5 text-blue-950 dark:text-blue-200">
                      <span>Order ID: {r.orderId.slice(0, 8)}...</span>
                      <span className="font-mono font-bold">{formatCurrency(Number(r.amountUsed))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setSelectedVoucherForModal(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
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
              Update the expiration date for voucher{" "}
              <span className="font-mono font-bold text-foreground">
                {editExpiryVoucher?.code}
              </span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="expiry-input" className="text-xs">
              Expiration Date & Time
            </Label>
            <Input
              id="expiry-input"
              type="datetime-local"
              value={expiryValue}
              onChange={(e) => setExpiryValue(e.target.value)}
              className="bg-background text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave blank if the voucher should never expire.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditExpiryVoucher(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveExpiry} disabled={isPending} className="cursor-pointer">
              {isPending ? "Saving..." : "Save Expiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
