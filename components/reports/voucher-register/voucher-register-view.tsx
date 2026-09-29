"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { getLocations, Location } from "@/lib/actions/location";
import { getVoucherRegisterReport } from "@/lib/actions/voucher-register";
import { MultiSelectOption } from "@/components/ui/multi-select";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth, format, subDays, endOfDay } from "date-fns";
import { toast } from "sonner";
import {
  VoucherRegisterReportData,
  VoucherRegisterItem,
  VoucherReportMode,
  getCurrentFiscalYearRange,
} from "./types";
import { useVoucherRegisterData } from "./use-voucher-register-data";
import { VoucherRegisterHeader } from "./voucher-register-header";
import { VoucherRegisterFilters } from "./voucher-register-filters";
import { VoucherRegisterTable } from "./voucher-register-table";
import { VoucherDetailModal } from "./voucher-detail-modal";
import { generateVoucherRegisterExcel } from "./excel-export";
import { generateVoucherRegisterPdf } from "./pdf-export";
import { Ticket, Store } from "lucide-react";

export function VoucherRegisterView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [mode, setMode] = useState<VoucherReportMode>("outstanding");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<DateRange>(() => getCurrentFiscalYearRange());
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const [reportData, setReportData] = useState<VoucherRegisterReportData | null>(null);
  const [selectedItem, setSelectedItem] = useState<VoucherRegisterItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Infinite Scroll & Fetch All state
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);

  // Client export states
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Load Locations on mount
  useEffect(() => {
    async function fetchLocs() {
      try {
        const res = await getLocations();
        if (Array.isArray(res)) setLocations(res);
        else if (res?.status && Array.isArray(res.data)) setLocations(res.data);
      } catch (err) {
        console.error("Failed to load locations:", err);
      }
    }
    fetchLocs();
  }, []);

  const locationOptions: MultiSelectOption[] = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.id,
        label: loc.name,
        description: loc.code ? `Code: ${loc.code}` : undefined,
      })),
    [locations],
  );

  const locationParam = useMemo(
    () => (selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined),
    [selectedLocationIds],
  );

  const activeSelectionNames = useMemo(() => {
    if (selectedLocationIds.length > 0)
      return locations
        .filter((l) => selectedLocationIds.includes(l.id))
        .map((l) => l.name)
        .join(", ");
    return "All Outlets";
  }, [selectedLocationIds, locations]);

  // Client Data Hook
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortColumn,
    sortDirection,
    handleSort,
    filteredItems,
    totals,
    resetClientFilters,
  } = useVoucherRegisterData(reportData, activeTab);

  // Fetch initial page 1 on filter changes
  const fetchReport = useCallback(() => {
    startTransition(async () => {
      const isOutstanding = mode === "outstanding";
      const result = await getVoucherRegisterReport({
        voucherType: isAllLoaded ? "ALL" : activeTab,
        status: isAllLoaded ? "ALL" : statusFilter,
        locationId: locationParam ?? "",
        startDate: !isOutstanding && dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: !isOutstanding && dateRange.to ? dateRange.to.toISOString() : undefined,
        asOfDate: isOutstanding ? asOfDate.toISOString() : undefined,
        isOutstandingOnly: isOutstanding,
        page: 1,
        limit: 100,
        sortBy: sortColumn,
        sortDirection,
      });

      if (result && result.status && result.data) {
        setReportData(result.data);
        if (result.data.pagination) {
          setIsAllLoaded(!result.data.pagination.hasMore);
        }
      } else {
        setReportData(null);
        toast.error(result?.message || "Failed to load Voucher Register dataset");
      }
    });
  }, [locationParam, mode, dateRange, asOfDate, activeTab, statusFilter, sortColumn, sortDirection, isAllLoaded]);

  useEffect(() => {
    fetchReport();
  }, [locationParam, mode, dateRange, asOfDate, activeTab, statusFilter, sortColumn, sortDirection]);

  // Load More chunks on scroll
  const handleLoadMore = useCallback(async () => {
    if (
      isFetchingMore ||
      isFetchingAll ||
      isPending ||
      !reportData?.pagination?.hasMore ||
      isAllLoaded
    ) {
      return;
    }

    const nextPage = (reportData.pagination.page || 1) + 1;
    setIsFetchingMore(true);
    try {
      const isOutstanding = mode === "outstanding";
      const result = await getVoucherRegisterReport({
        voucherType: activeTab,
        status: statusFilter,
        locationId: locationParam ?? "",
        startDate: !isOutstanding && dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: !isOutstanding && dateRange.to ? dateRange.to.toISOString() : undefined,
        asOfDate: isOutstanding ? asOfDate.toISOString() : undefined,
        isOutstandingOnly: isOutstanding,
        page: nextPage,
        limit: 100,
        sortBy: sortColumn,
        sortDirection,
      });

      if (result && result.status && result.data) {
        setReportData((prev) => {
          if (!prev) return result.data!;
          const existingIds = new Set(prev.items.map((i) => i.id));
          const newUniqueItems = (result.data?.items || []).filter((i) => !existingIds.has(i.id));
          return {
            ...result.data!,
            items: [...prev.items, ...newUniqueItems],
            pagination: result.data!.pagination,
          };
        });

        if (result.data.pagination && !result.data.pagination.hasMore) {
          setIsAllLoaded(true);
        }
      }
    } catch (err) {
      console.error("Failed to load more vouchers:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [
    isFetchingMore,
    isFetchingAll,
    isPending,
    reportData,
    isAllLoaded,
    mode,
    dateRange,
    asOfDate,
    activeTab,
    statusFilter,
    locationParam,
    sortColumn,
    sortDirection,
  ]);

  // Fetch All into Memory
  const handleFetchAll = useCallback(async () => {
    if (isFetchingAll || isPending) return;

    setIsFetchingAll(true);
    const toastId = toast.loading("Fetching all vouchers into memory...");
    try {
      const isOutstanding = mode === "outstanding";
      const result = await getVoucherRegisterReport({
        voucherType: "ALL",
        status: "ALL",
        locationId: locationParam ?? "",
        startDate: !isOutstanding && dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: !isOutstanding && dateRange.to ? dateRange.to.toISOString() : undefined,
        asOfDate: isOutstanding ? asOfDate.toISOString() : undefined,
        isOutstandingOnly: isOutstanding,
        limit: 0, // 0 = fetch all
      });

      if (result && result.status && result.data) {
        setReportData(result.data);
        setIsAllLoaded(true);
        toast.success(
          `✓ Loaded all ${result.data.items.length.toLocaleString()} vouchers into local memory! Instant search & sort active.`,
          { id: toastId },
        );
      } else {
        toast.error(result?.message || "Failed to fetch all vouchers", { id: toastId });
      }
    } catch (err: any) {
      console.error("Fetch all error:", err);
      toast.error("Error fetching all records", { id: toastId });
    } finally {
      setIsFetchingAll(false);
    }
  }, [isFetchingAll, isPending, locationParam, mode, dateRange, asOfDate]);

  // Client Excel Export
  const handleExportExcel = async () => {
    if (!reportData || filteredItems.length === 0) {
      toast.warning("No voucher records to export.");
      return;
    }

    setIsExportingExcel(true);
    try {
      const { excelBuffer, fileName } = await generateVoucherRegisterExcel({
        items: filteredItems,
        totals,
        dateRange,
        asOfDate,
        mode,
        locationNames: activeSelectionNames,
      });

      const url = URL.createObjectURL(excelBuffer);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel report exported successfully.");
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast.error("Failed to generate Excel export file.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Client PDF Export / Print
  const handleExportPdf = () => {
    if (!reportData || filteredItems.length === 0) {
      toast.warning("No voucher records to print.");
      return;
    }

    setIsExportingPdf(true);
    try {
      generateVoucherRegisterPdf({
        items: filteredItems,
        totals,
        dateRange,
        asOfDate,
        mode,
        locationNames: activeSelectionNames,
      });
      toast.success("Print document opened.");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF document.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleModeChange = (newMode: VoucherReportMode) => {
    setMode(newMode);
    if (newMode === "period") {
      setDateRange(getCurrentFiscalYearRange());
    } else {
      setAsOfDate(new Date());
    }
  };

  const handleReset = () => {
    setSelectedLocationIds([]);
    setActiveTab("ALL");
    resetClientFilters();
    setIsAllLoaded(false);
    if (mode === "outstanding") {
      setAsOfDate(new Date());
    } else {
      setDateRange(getCurrentFiscalYearRange());
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1750px] mx-auto min-h-screen">
      {/* Page Title & Store Selection Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Ticket className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Voucher Register & Liability Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-normal">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            Corporate, Gift, Refund, Exchange & Claim Vouchers • <span className="font-semibold text-foreground">{activeSelectionNames}</span>
          </p>
        </div>
      </div>

      {/* Metric Cards Header */}
      <VoucherRegisterHeader
        totals={totals}
        mode={mode}
        asOfDateStr={asOfDate ? format(asOfDate, "dd MMM yyyy") : undefined}
        totalVouchersInDataset={reportData?.kpis?.totalVouchers}
      />

      {/* Filter Toolbar & Tab Switcher */}
      <VoucherRegisterFilters
        mode={mode}
        setMode={handleModeChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        locationOptions={locationOptions}
        selectedLocationIds={selectedLocationIds}
        setSelectedLocationIds={setSelectedLocationIds}
        dateRange={dateRange}
        setDateRange={setDateRange}
        asOfDate={asOfDate}
        setAsOfDate={setAsOfDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isPending={isPending}
        onRefresh={fetchReport}
        onReset={handleReset}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        typeBreakdown={reportData?.kpis?.typeBreakdown}
        totalCount={reportData?.kpis?.totalVouchers || 0}
      />

      {/* Synchronized Virtualized Table */}
      <VoucherRegisterTable
        items={filteredItems}
        totals={totals}
        mode={mode}
        isPending={isPending}
        onSelectItem={(item) => setSelectedItem(item)}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        totalCount={reportData?.pagination?.total || reportData?.kpis?.totalVouchers || 0}
        hasMore={Boolean(reportData?.pagination?.hasMore)}
        isFetchingMore={isFetchingMore}
        isFetchingAll={isFetchingAll}
        isAllLoaded={isAllLoaded}
        onLoadMore={handleLoadMore}
        onFetchAll={handleFetchAll}
      />

      {/* Voucher Detail Audit Modal */}
      <VoucherDetailModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
