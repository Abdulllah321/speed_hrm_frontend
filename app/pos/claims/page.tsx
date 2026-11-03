"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  Store,
  UserRound,
  Phone,
  Copy,
  Tag,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FilterX,
  ExternalLink,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocations, Location } from "@/lib/actions/location";
import { PrintClaimReceipt } from "@/components/pos/print-claim-receipt";

// ── Status metadata ─────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; badgeCls: string; dotCls: string; icon: any }
> = {
  SUBMITTED: {
    label: "Submitted",
    badgeCls:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotCls: "bg-blue-500",
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeCls:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotCls: "bg-amber-500",
    icon: AlertTriangle,
  },
  APPROVED: {
    label: "Approved",
    badgeCls:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotCls: "bg-emerald-500",
    icon: CheckCircle2,
  },
  PARTIALLY_APPROVED: {
    label: "Partially Approved",
    badgeCls:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    dotCls: "bg-cyan-500",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Acknowledged",
    badgeCls:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
    dotCls: "bg-green-500",
    icon: CheckCircle2,
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    badgeCls:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
    dotCls: "bg-green-500",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    badgeCls:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    dotCls: "bg-red-500",
    icon: XCircle,
  },
  MENDED: {
    label: "Mended",
    badgeCls:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    dotCls: "bg-purple-500",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    badgeCls:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    dotCls: "bg-zinc-400",
    icon: XCircle,
  },
};

const ITEM_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-muted text-muted-foreground" },
  APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
  PARTIALLY_APPROVED: { label: "Partial", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" },
  MENDED: { label: "Mended", cls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300" },
};

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE: "Defective / Damaged",
  WRONG_ITEM: "Wrong Item",
  SIZE_ISSUE: "Size / Fit Issue",
  QUALITY: "Quality Issue",
  CUSTOMER_CHANGE_MIND: "Customer Change Mind",
  OTHER: "Other",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCustomerInfo(claim: any) {
  let name = claim?.salesOrder?.customer?.name;
  let phone = claim?.salesOrder?.customer?.contactNo;
  if (!name || !phone) {
    const match = claim?.reasonNotes?.match(
      /\[Customer:\s*([^|]+)\s*\|\s*Phone:\s*([^\]]+)\]/
    );
    if (match) {
      const parsedName = match[1]?.trim();
      const parsedPhone = match[2]?.trim();
      if (!name && parsedName && parsedName !== "-") name = parsedName;
      if (!phone && parsedPhone && parsedPhone !== "-") phone = parsedPhone;
    }
  }
  return { name: name || "Walk-in Customer", phone: phone || "—" };
}

function cleanReasonNotes(notes?: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/\[Customer:\s*[^|]+\s*\|\s*Phone:\s*[^\]]+\]/g, "")
    .trim();
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function PosClaimsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // Location context
  const currentStoreLocationId =
    (user as any)?.terminal?.location?.id ||
    (user as any)?.terminal?.locationId ||
    user?.locationId ||
    "";
  const currentStoreName =
    (user as any)?.terminal?.location?.name || "Terminal Store";

  // Initialize location filter once to the logged-in store ("mine only") by default
  const hasInitializedLocationRef = useRef(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    currentStoreLocationId || "ALL"
  );

  // Set default to current store when session data resolves (runs only once on mount)
  useEffect(() => {
    if (currentStoreLocationId && !hasInitializedLocationRef.current) {
      setSelectedLocationId(currentStoreLocationId);
      hasInitializedLocationRef.current = true;
    }
  }, [currentStoreLocationId]);

  // Data states
  const [claims, setClaims] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Drawer & Receipt states
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [printClaim, setPrintClaim] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Load locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await getLocations(false);
        const locArray = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];
        if (locArray.length > 0) {
          setLocations(locArray);
        } else {
          const resActive = await getLocations(true);
          const activeLocArray = Array.isArray(resActive)
            ? resActive
            : Array.isArray((resActive as any)?.data)
            ? (resActive as any).data
            : [];
          if (activeLocArray.length > 0) {
            setLocations(activeLocArray);
          }
        }
      } catch (err) {
        console.error("Failed to load locations:", err);
      }
    }
    fetchLocations();
  }, []);

  // Dynamically merge any locations discovered in claims into locations list so they are always selectable
  useEffect(() => {
    if (claims.length > 0) {
      setLocations((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const newLocs: Location[] = [];
        claims.forEach((c) => {
          const loc = c.salesOrder?.location;
          if (loc && loc.id && !existingIds.has(loc.id)) {
            existingIds.add(loc.id);
            newLocs.push(loc);
          }
        });
        return newLocs.length > 0 ? [...prev, ...newLocs] : prev;
      });
    }
  }, [claims]);

  // Compute date range for dateFilter
  const dateParams = useMemo(() => {
    if (dateFilter === "ALL") return {};
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (dateFilter === "TODAY") {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateFilter === "WEEK") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return { startDate: past.toISOString().split("T")[0], endDate: todayStr };
    }
    if (dateFilter === "MONTH") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      return { startDate: past.toISOString().split("T")[0], endDate: todayStr };
    }
    return {};
  }, [dateFilter]);

  // Fetch claims with filters and pagination
  const fetchClaims = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const params: Record<string, any> = {
          page: currentPage,
          limit: pageSize,
        };

        if (statusFilter !== "ALL") params.status = statusFilter;
        if (selectedLocationId && selectedLocationId !== "ALL") {
          params.locationId = selectedLocationId;
        }
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (dateParams.startDate) params.startDate = dateParams.startDate;
        if (dateParams.endDate) params.endDate = dateParams.endDate;

        const res = await authFetch("/pos-claims", { params });
        if (res.ok && res.data?.status) {
          setClaims(res.data.data || []);
          setTotalCount(res.data.meta?.total || 0);
        } else {
          toast.error(res.data?.message || "Failed to load claims");
        }
      } catch (err) {
        toast.error("Network error while loading claims");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      currentPage,
      pageSize,
      statusFilter,
      selectedLocationId,
      searchQuery,
      dateParams,
    ]
  );

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Reset pagination on filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (range: string) => {
    setDateFilter(range);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setSelectedLocationId(currentStoreLocationId || "ALL");
    setDateFilter("ALL");
    setCurrentPage(1);
  };

  // Open Claim Detail Drawer
  const openClaimDetail = async (claimSummary: any) => {
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const res = await authFetch(`/pos-claims/${claimSummary.id}`);
      if (res.ok && res.data?.status) {
        setSelectedClaim(res.data.data);
      } else {
        setSelectedClaim(claimSummary);
      }
    } catch {
      setSelectedClaim(claimSummary);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Trigger Print Receipt
  const handlePrint = async (claim: any) => {
    if (claim.items && claim.items.length > 0 && claim.salesOrder) {
      setPrintClaim(claim);
      return;
    }
    // Otherwise fetch full details before printing
    try {
      toast.info("Preparing claim receipt...");
      const res = await authFetch(`/pos-claims/${claim.id}`);
      if (res.ok && res.data?.status) {
        setPrintClaim(res.data.data);
      } else {
        setPrintClaim(claim);
      }
    } catch {
      setPrintClaim(claim);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // KPI Calculations from current claims list
  const metrics = useMemo(() => {
    let submitted = 0;
    let underReview = 0;
    let approved = 0;
    let acknowledged = 0;
    let rejected = 0;
    let totalClaimedSum = 0;

    claims.forEach((c) => {
      totalClaimedSum += Number(c.claimedAmount || 0);
      const st = c.status;
      if (st === "SUBMITTED") submitted++;
      else if (st === "UNDER_REVIEW") underReview++;
      else if (st === "APPROVED" || st === "PARTIALLY_APPROVED") approved++;
      else if (st === "COMPLETED" || st === "ACKNOWLEDGED") acknowledged++;
      else if (st === "REJECTED" || st === "CANCELLED") rejected++;
    });

    return {
      total: totalCount,
      totalClaimedSum,
      submitted,
      underReview,
      approved,
      acknowledged,
      rejected,
    };
  }, [claims, totalCount]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-screen">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Warranty & Return Claims
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <span>POS Claims Management</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  Terminal: {currentStoreName}
                </span>
                <span>•</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-normal px-2 py-0 border shadow-2xs",
                    selectedLocationId === "ALL"
                      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-semibold"
                      : "border-primary/30 text-primary bg-primary/5 font-semibold"
                  )}
                >
                  Scope: {selectedLocationId === "ALL"
                    ? "Overall (All Outlets)"
                    : selectedLocationId === currentStoreLocationId
                    ? `This Store (${currentStoreName})`
                    : locations.find(l => l.id === selectedLocationId)?.name || currentStoreName}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClaims(true)}
            disabled={isLoading || isRefreshing}
            className="gap-2 shadow-xs"
          >
            <RefreshCw
              className={cn("h-4 w-4", (isLoading || isRefreshing) && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            asChild
          >
            <Link href="/pos/sales/returns?mode=claim" transitionTypes={["nav-forward"]}>
              <Plus className="h-4 w-4" />
              <span>New Claim</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Claims */}
        <Card
          onClick={() => handleStatusFilterChange("ALL")}
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50 shadow-xs",
            statusFilter === "ALL" && "ring-2 ring-primary/40 border-primary"
          )}
        >
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">
                Total Claims
              </span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {metrics.total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              All claims on record
            </p>
          </CardContent>
        </Card>

        {/* Submitted (Pending) */}
        <Card
          onClick={() => handleStatusFilterChange("SUBMITTED")}
          className={cn(
            "cursor-pointer transition-all hover:border-blue-400 shadow-xs",
            statusFilter === "SUBMITTED" && "ring-2 ring-blue-500/40 border-blue-500"
          )}
        >
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Submitted
              </span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
              {metrics.submitted}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        {/* Under Review */}
        <Card
          onClick={() => handleStatusFilterChange("UNDER_REVIEW")}
          className={cn(
            "cursor-pointer transition-all hover:border-amber-400 shadow-xs",
            statusFilter === "UNDER_REVIEW" && "ring-2 ring-amber-500/40 border-amber-500"
          )}
        >
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Under Review
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
              {metrics.underReview}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Being inspected
            </p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card
          onClick={() => handleStatusFilterChange("APPROVED")}
          className={cn(
            "cursor-pointer transition-all hover:border-emerald-400 shadow-xs",
            statusFilter === "APPROVED" && "ring-2 ring-emerald-500/40 border-emerald-500"
          )}
        >
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Approved
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
              {metrics.approved}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Ready for voucher/exchange
            </p>
          </CardContent>
        </Card>

        {/* Acknowledged / Completed */}
        <Card
          onClick={() => handleStatusFilterChange("ACKNOWLEDGED")}
          className={cn(
            "cursor-pointer transition-all hover:border-green-400 shadow-xs",
            statusFilter === "ACKNOWLEDGED" && "ring-2 ring-green-500/40 border-green-500"
          )}
        >
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">
                Acknowledged
              </span>
              <Receipt className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-green-700 dark:text-green-300">
              {metrics.acknowledged}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Goods received & closed
            </p>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card
          onClick={() => handleStatusFilterChange("REJECTED")}
          className={cn(
            "cursor-pointer transition-all hover:border-red-400 shadow-xs",
            statusFilter === "REJECTED" && "ring-2 ring-red-500/40 border-red-500"
          )}
        >
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">
                Rejected
              </span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-red-700 dark:text-red-300">
              {metrics.rejected}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Declined claims
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────────────── */}
      <Card className="shadow-xs border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by Claim #, Order #, Customer, Phone, or SKU..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 bg-background h-9.5 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-full md:w-[170px] h-9.5 bg-background">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PARTIALLY_APPROVED">Partially Approved</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Location Selector (All Outlets vs Current Store vs Specific Outlets) */}
            <Select
              value={selectedLocationId}
              onValueChange={handleLocationChange}
            >
              <SelectTrigger className="w-full md:w-[220px] h-9.5 bg-background">
                <SelectValue placeholder="All Outlets (Overall)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Outlets (Overall)</SelectItem>
                {currentStoreLocationId && (
                  <SelectItem value={currentStoreLocationId}>
                    Current Store ({currentStoreName})
                  </SelectItem>
                )}
                {locations
                  .filter((loc) => loc.id !== currentStoreLocationId)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} {loc.code ? `(${loc.code})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Date Range Preset */}
            <Select
              value={dateFilter}
              onValueChange={handleDateFilterChange}
            >
              <SelectTrigger className="w-full md:w-[150px] h-9.5 bg-background">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Time</SelectItem>
                <SelectItem value="TODAY">Today</SelectItem>
                <SelectItem value="WEEK">Last 7 Days</SelectItem>
                <SelectItem value="MONTH">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear All Filters */}
            {(searchQuery ||
              statusFilter !== "ALL" ||
              dateFilter !== "ALL" ||
              (currentStoreLocationId
                ? selectedLocationId !== currentStoreLocationId
                : selectedLocationId !== "ALL")) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-3"
              >
                <FilterX className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Claims Data Table ────────────────────────────────────────────────── */}
      <Card className="shadow-xs border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[170px] font-semibold text-xs uppercase tracking-wider">
                  Claim Reference
                </TableHead>
                <TableHead className="w-[150px] font-semibold text-xs uppercase tracking-wider">
                  Order & Branch
                </TableHead>
                <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider">
                  Customer
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Claimed Items
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-right">
                  Claim Amount
                </TableHead>
                <TableHead className="w-[130px] font-semibold text-xs uppercase tracking-wider text-center">
                  Status
                </TableHead>
                <TableHead className="w-[140px] font-semibold text-xs uppercase tracking-wider">
                  Voucher
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-xs uppercase tracking-wider text-right pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="py-4">
                      <div className="flex items-center gap-4 animate-pulse">
                        <div className="h-4 bg-muted rounded w-28" />
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-4 bg-muted rounded flex-1" />
                        <div className="h-4 bg-muted rounded w-16" />
                        <div className="h-4 bg-muted rounded w-20" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : claims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-72 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60">
                        <ShieldAlert className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">
                          No claims found
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          {searchQuery || statusFilter !== "ALL"
                            ? "No claims match your current filters. Try adjusting your search query or status filter."
                            : "There are currently no return or warranty claims filed for this outlet."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 gap-2"
                        asChild
                      >
                        <Link href="/pos/sales/returns?mode=claim">
                          <Plus className="h-4 w-4" />
                          <span>File New Claim</span>
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                claims.map((claim) => {
                  const cust = getCustomerInfo(claim);
                  const statusMeta =
                    STATUS_META[claim.status] || {
                      label: claim.status,
                      badgeCls: "bg-muted text-muted-foreground border-border",
                      dotCls: "bg-muted-foreground",
                      icon: Clock,
                    };
                  const itemCount = claim.items?.length || 0;
                  const firstItem = claim.items?.[0]?.item;
                  const voucher = claim.voucher;

                  return (
                    <TableRow
                      key={claim.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Claim Reference & Date */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight text-foreground">
                            <span>{claim.claimNumber}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 font-normal uppercase tracking-wider text-muted-foreground"
                            >
                              {claim.claimType || "RETURN"}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(claim.createdAt)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Order & Location */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1">
                          <div className="font-medium text-xs text-foreground flex items-center gap-1">
                            <span>
                              {claim.salesOrder?.orderNumber || "No Order"}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Store className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px] font-medium text-foreground/80">
                              {claim.salesOrder?.location?.name ||
                                claim.salesOrder?.location?.code ||
                                (claim.salesOrder?.locationId
                                  ? `Branch (${claim.salesOrder.locationId.slice(0, 8)})`
                                  : "Overall")}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1">
                          <div className="font-medium text-xs text-foreground flex items-center gap-1">
                            <UserRound className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {cust.name}
                            </span>
                          </div>
                          {cust.phone && cust.phone !== "—" && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{cust.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Claimed Items */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1 max-w-[280px]">
                          <div className="text-xs font-medium text-foreground truncate">
                            {firstItem?.description ||
                              `${itemCount} item(s) claimed`}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {firstItem?.sku && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono px-1.5 py-0"
                              >
                                {firstItem.sku}
                              </Badge>
                            )}
                            {itemCount > 1 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                +{itemCount - 1} more
                              </Badge>
                            )}
                            {claim.reasonCode && (
                              <span className="text-[11px] text-muted-foreground">
                                • {REASON_LABELS[claim.reasonCode] || claim.reasonCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Claim Amount */}
                      <TableCell className="align-top py-3.5 text-right font-medium text-xs">
                        <div className="space-y-0.5">
                          <div className="text-foreground font-semibold">
                            Rs. {formatCurrency(claim.claimedAmount || 0)}
                          </div>
                          {Number(claim.approvedAmount || 0) > 0 && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              App: Rs. {formatCurrency(claim.approvedAmount)}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="align-top py-3.5 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 border shadow-2xs",
                            statusMeta.badgeCls
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              statusMeta.dotCls
                            )}
                          />
                          <span>{statusMeta.label}</span>
                        </Badge>
                      </TableCell>

                      {/* Voucher */}
                      <TableCell className="align-top py-3.5">
                        {voucher ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono px-1.5 py-0 bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                              >
                                {voucher.code}
                              </Badge>
                              <button
                                onClick={() =>
                                  copyToClipboard(voucher.code, "Voucher code")
                                }
                                title="Copy voucher code"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {voucher.isRedeemed ? (
                                <span className="text-muted-foreground">
                                  Redeemed
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium">
                                  Active (Rs. {formatCurrency(voucher.faceValue || 0)})
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="align-top py-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openClaimDetail(claim)}
                            title="View Claim Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            onClick={() => handlePrint(claim)}
                            title="Print Thermal Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Table Footer & Pagination ────────────────────────────────────────── */}
        {!isLoading && totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/50 bg-muted/10">
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-medium text-foreground">{totalCount}</span>{" "}
              claims
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs px-2 font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Claim Detail Sheet ───────────────────────────────────────────────── */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-xl md:max-w-2xl w-full flex flex-col p-0 overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl font-bold tracking-tight">
                    {selectedClaim?.claimNumber || "Claim Details"}
                  </SheetTitle>
                  {selectedClaim?.status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5 border font-medium",
                        STATUS_META[selectedClaim.status]?.badgeCls
                      )}
                    >
                      {STATUS_META[selectedClaim.status]?.label ||
                        selectedClaim.status}
                    </Badge>
                  )}
                </div>
                <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>
                    Filed on {formatDateTime(selectedClaim?.createdAt)}
                  </span>
                  <span>•</span>
                  <span>Type: {selectedClaim?.claimType || "RETURN"}</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Sheet Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoadingDetail ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-muted rounded-xl" />
                <div className="h-40 bg-muted rounded-xl" />
                <div className="h-40 bg-muted rounded-xl" />
              </div>
            ) : selectedClaim ? (
              <>
                {/* 1. Customer & Order Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5 text-primary" />
                      <span>Customer Details</span>
                    </div>
                    {(() => {
                      const cust = getCustomerInfo(selectedClaim);
                      return (
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-foreground">
                            {cust.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{cust.phone}</span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      <span>Order Reference</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-foreground">
                        {selectedClaim.salesOrder?.orderNumber || "No Order"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        <span>
                          {selectedClaim.salesOrder?.location?.name ||
                            selectedClaim.salesOrder?.location?.code ||
                            (selectedClaim.salesOrder?.locationId
                              ? `Branch (${selectedClaim.salesOrder.locationId.slice(0, 8)})`
                              : "—")}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Reason & Notes */}
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Claim Reason
                    </span>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {REASON_LABELS[selectedClaim.reasonCode] ||
                        selectedClaim.reasonCode ||
                        "Standard Claim"}
                    </Badge>
                  </div>
                  {cleanReasonNotes(selectedClaim.reasonNotes) ? (
                    <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 leading-relaxed">
                      {cleanReasonNotes(selectedClaim.reasonNotes)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No additional notes entered by cashier.
                    </p>
                  )}
                </div>

                {/* 3. Review Decisions (if reviewed) */}
                {selectedClaim.reviewedAt && (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Inspection & Review Decision</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTime(selectedClaim.reviewedAt)}
                      </span>
                    </div>
                    {selectedClaim.reviewNotes && (
                      <p className="text-xs text-foreground bg-background/80 p-2.5 rounded-lg border border-border/40">
                        {selectedClaim.reviewNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Voucher Information (if generated) */}
                {selectedClaim.voucher && (
                  <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                        <Tag className="h-3.5 w-3.5" />
                        <span>Claim Voucher Issued</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium",
                          selectedClaim.voucher.isRedeemed
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                        )}
                      >
                        {selectedClaim.voucher.isRedeemed
                          ? "Redeemed"
                          : "Active / Available"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/60">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Voucher Code
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-violet-700 dark:text-violet-300">
                            {selectedClaim.voucher.code}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                selectedClaim.voucher.code,
                                "Voucher Code"
                              )
                            }
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Value
                        </span>
                        <div className="text-base font-bold text-foreground">
                          Rs. {formatCurrency(selectedClaim.voucher.faceValue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Claimed Items Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Claim Items Breakdown ({selectedClaim.items?.length || 0})
                    </h3>
                  </div>

                  <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Item</TableHead>
                          <TableHead className="text-xs font-semibold text-center w-20">
                            Qty
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-right w-24">
                            Price
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-right w-28">
                            Claim Total
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center w-24">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClaim.items?.map((line: any) => {
                          const itemStatusMeta =
                            ITEM_STATUS_META[line.itemStatus] || {
                              label: line.itemStatus || "Pending",
                              cls: "bg-muted text-muted-foreground",
                            };
                          const brandName =
                            line.item?.brand?.name || line.item?.brand;
                          const sizeName =
                            line.item?.size?.name || line.item?.size;
                          const colorName =
                            line.item?.color?.name || line.item?.color;

                          return (
                            <TableRow key={line.id} className="text-xs">
                              <TableCell className="py-3">
                                <div className="space-y-1">
                                  <p className="font-semibold text-foreground leading-snug">
                                    {line.item?.description || "Unknown Item"}
                                  </p>
                                  <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground font-mono">
                                    {line.item?.sku && <span>SKU: {line.item.sku}</span>}
                                    {line.item?.barCode && <span>• Barcode: {line.item.barCode}</span>}
                                  </div>
                                  {(brandName || sizeName || colorName) && (
                                    <div className="flex flex-wrap gap-1 text-[10px]">
                                      {brandName && (
                                        <Badge variant="outline" className="px-1 py-0 font-normal">
                                          {brandName}
                                        </Badge>
                                      )}
                                      {sizeName && (
                                        <Badge variant="outline" className="px-1 py-0 font-normal">
                                          Size: {sizeName}
                                        </Badge>
                                      )}
                                      {colorName && (
                                        <Badge variant="outline" className="px-1 py-0 font-normal">
                                          {colorName}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {line.reviewNotes && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 italic pt-1">
                                      Note: {line.reviewNotes}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-3">
                                <span className="font-bold">{line.claimedQty}</span>
                                {line.approvedQty !== undefined &&
                                  line.approvedQty !== line.claimedQty && (
                                    <span className="block text-[10px] text-emerald-600">
                                      (App: {line.approvedQty})
                                    </span>
                                  )}
                              </TableCell>
                              <TableCell className="text-right py-3 font-mono">
                                Rs. {formatCurrency(line.unitPaidPrice || 0)}
                              </TableCell>
                              <TableCell className="text-right py-3 font-mono font-semibold">
                                Rs. {formatCurrency(line.claimedAmount || 0)}
                              </TableCell>
                              <TableCell className="text-center py-3">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 font-medium",
                                    itemStatusMeta.cls
                                  )}
                                >
                                  {itemStatusMeta.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 6. Total Summary Bar */}
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/60">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      Total Claimed Value
                    </span>
                    <p className="text-lg font-bold text-foreground">
                      Rs. {formatCurrency(selectedClaim.claimedAmount || 0)}
                    </p>
                  </div>
                  {Number(selectedClaim.approvedAmount || 0) > 0 && (
                    <div className="text-right space-y-0.5">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Approved Value
                      </span>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {formatCurrency(selectedClaim.approvedAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Sheet Footer */}
          <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
            >
              Close
            </Button>
            {selectedClaim && (
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handlePrint(selectedClaim)}
              >
                <Printer className="h-4 w-4" />
                <span>Print Thermal Receipt</span>
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Thermal Receipt Dialog ───────────────────────────────────────────── */}
      {printClaim && (
        <PrintClaimReceipt
          claim={printClaim}
          onClose={() => setPrintClaim(null)}
        />
      )}
    </div>
  );
}

