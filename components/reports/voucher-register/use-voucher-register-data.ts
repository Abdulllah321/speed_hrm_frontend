import { useMemo, useState, useCallback } from "react";
import { VoucherRegisterItem, VoucherRegisterReportData, VoucherRegisterTotals } from "./types";

export interface UseVoucherRegisterDataReturn {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sortColumn: keyof VoucherRegisterItem;
  sortDirection: "asc" | "desc";
  handleSort: (col: keyof VoucherRegisterItem) => void;
  filteredItems: VoucherRegisterItem[];
  totals: VoucherRegisterTotals;
  resetClientFilters: () => void;
}

export function useVoucherRegisterData(
  reportData: VoucherRegisterReportData | null,
  activeTab: string = "ALL",
): UseVoucherRegisterDataReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortColumn, setSortColumn] = useState<keyof VoucherRegisterItem>("dateTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const resetClientFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("ALL");
  }, []);

  const handleSort = useCallback(
    (col: keyof VoucherRegisterItem) => {
      if (sortColumn === col) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(col);
        setSortDirection("desc");
      }
    },
    [sortColumn],
  );

  const filteredItems = useMemo(() => {
    if (!reportData?.items || !Array.isArray(reportData.items)) return [];

    let list = reportData.items;

    // Filter by Voucher Type Tab
    if (activeTab && activeTab !== "ALL") {
      const targetType = activeTab.toUpperCase();
      if (targetType === "GIFT") {
        list = list.filter(
          (item) => item.voucherType === "GIFT" || item.voucherType === "OUTLET_GIFT",
        );
      } else {
        list = list.filter((item) => item.voucherType?.toUpperCase() === targetType);
      }
    }

    // Filter by status dropdown
    if (statusFilter && statusFilter !== "ALL") {
      list = list.filter((item) => item.status?.toUpperCase() === statusFilter.toUpperCase());
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        return (
          item.voucherNumber?.toLowerCase().includes(q) ||
          item.voucherType?.toLowerCase().includes(q) ||
          item.companyName?.toLowerCase().includes(q) ||
          item.companyGlCode?.toLowerCase().includes(q) ||
          item.customerDetail?.toLowerCase().includes(q) ||
          item.customerName?.toLowerCase().includes(q) ||
          item.customerPhone?.toLowerCase().includes(q) ||
          item.outletName?.toLowerCase().includes(q) ||
          item.baseCashMemo?.toLowerCase().includes(q) ||
          item.settledInCashMemo?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q) ||
          item.slipNo?.toLowerCase().includes(q) ||
          item.merchantName?.toLowerCase().includes(q) ||
          item.paymentMode?.toLowerCase().includes(q)
        );
      });
    }

    // Sorting
    return [...list].sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [reportData?.items, activeTab, statusFilter, searchQuery, sortColumn, sortDirection]);

  // Aggregate Totals dynamically computed over current filtered dataset
  const totals: VoucherRegisterTotals = useMemo(() => {
    let totalFaceValue = 0;
    let totalDiscount = 0;
    let totalNetValue = 0;
    let totalSettledAmount = 0;
    let totalOutstandingAmount = 0;
    let totalOutstandingCount = 0;
    let totalRedeemedCount = 0;
    let totalActiveCount = 0;
    let totalExpiredCount = 0;

    const typeBreakdown: Record<string, number> = {};
    const typeBreakdownDetails: Record<
      string,
      {
        count: number;
        faceValue: number;
        discount: number;
        settledAmount: number;
        outstandingAmount: number;
      }
    > = {};

    const statusBreakdown: Record<string, number> = {
      ACTIVE: 0,
      REDEEMED: 0,
      EXPIRED: 0,
    };

    for (const item of filteredItems) {
      const faceVal = Number(item.faceValue || 0);
      const disc = Number(item.discountAmount || 0);
      const net = Number(item.netValue || Math.max(0, faceVal - disc));
      const settled = Number(item.settledAmount || 0);
      const outstanding = Number(item.outstandingAmount || (item.status === "REDEEMED" ? 0 : faceVal));

      totalFaceValue += faceVal;
      totalDiscount += disc;
      totalNetValue += net;
      totalSettledAmount += settled;
      totalOutstandingAmount += outstanding;

      const vType = item.voucherType || "GIFT";
      typeBreakdown[vType] = (typeBreakdown[vType] || 0) + 1;

      if (!typeBreakdownDetails[vType]) {
        typeBreakdownDetails[vType] = {
          count: 0,
          faceValue: 0,
          discount: 0,
          settledAmount: 0,
          outstandingAmount: 0,
        };
      }
      typeBreakdownDetails[vType].count += 1;
      typeBreakdownDetails[vType].faceValue += faceVal;
      typeBreakdownDetails[vType].discount += disc;
      typeBreakdownDetails[vType].settledAmount += settled;
      typeBreakdownDetails[vType].outstandingAmount += outstanding;

      if (item.status === "REDEEMED") {
        totalRedeemedCount += 1;
        statusBreakdown.REDEEMED = (statusBreakdown.REDEEMED || 0) + 1;
      } else if (item.status === "EXPIRED") {
        totalExpiredCount += 1;
        totalOutstandingCount += 1;
        statusBreakdown.EXPIRED = (statusBreakdown.EXPIRED || 0) + 1;
      } else {
        totalActiveCount += 1;
        totalOutstandingCount += 1;
        statusBreakdown.ACTIVE = (statusBreakdown.ACTIVE || 0) + 1;
      }
    }

    return {
      totalVouchers: filteredItems.length,
      totalFaceValue: Math.round(totalFaceValue * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalNetValue: Math.round(totalNetValue * 100) / 100,
      totalSettledAmount: Math.round(totalSettledAmount * 100) / 100,
      totalOutstandingAmount: Math.round(totalOutstandingAmount * 100) / 100,
      totalOutstandingCount,
      totalRedeemedCount,
      totalActiveCount,
      totalExpiredCount,
      typeBreakdown,
      typeBreakdownDetails,
      statusBreakdown,
    };
  }, [filteredItems]);

  return {
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
  };
}
