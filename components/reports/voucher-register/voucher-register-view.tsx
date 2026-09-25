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
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 90),
    to: endOfDay(new Date()),
  });
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const [reportData, setReportData] = useState<VoucherRegisterReportData | null>(null);
  const [selectedItem, setSelectedItem] = useState<VoucherRegisterItem | null>(null);
  const [isPending, startTransition] = useTransition();

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

  // Fetch complete dataset for date/mode from Backend once
  const fetchReport = useCallback(() => {
    startTransition(async () => {
      const isOutstanding = mode === "outstanding";
      const result = await getVoucherRegisterReport({
        voucherType: "ALL", // Load all types so client-side tabs filter instantly with exact counts
        locationId: locationParam ?? "",
        startDate: !isOutstanding && dateRange.from ? dateRange.from.toISOString() : undefined,
        endDate: !isOutstanding && dateRange.to ? dateRange.to.toISOString() : undefined,
        asOfDate: isOutstanding ? asOfDate.toISOString() : undefined,
        isOutstandingOnly: isOutstanding,
      });

      if (result && result.status && result.data) {
        setReportData(result.data);
      } else {
        setReportData(null);
        toast.error(result?.message || "Failed to load Voucher Register dataset");
      }
    });
  }, [locationParam, mode, dateRange, asOfDate]);

  useEffect(() => {
    fetchReport();
  }, [locationParam, mode, dateRange, asOfDate]);

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

  const handleReset = () => {
    setSelectedLocationIds([]);
    setActiveTab("ALL");
    resetClientFilters();
    if (mode === "outstanding") {
      setAsOfDate(new Date());
    } else {
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
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
        setMode={setMode}
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
