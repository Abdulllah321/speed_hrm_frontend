"use client";

import { useMemo, useState, useCallback } from "react";
import {
  SalesReturnListReportData,
  SalesReturnNode,
  SalesReturnTotals,
  SalesReturnMatrixRow,
  SalesReturnFlatRecord,
  ReturnSubType,
} from "./types";
import { DateRange } from "@/components/ui/date-range-picker";

export function createEmptyReturnTotals(): SalesReturnTotals {
  return {
    returnCount: 0,
    totalItems: 0,
    grossAmount: 0,
    wostAmount: 0,
    discountAmount: 0,
    discountWostAmount: 0,
    amountAfterDiscount: 0,
    taxAmount: 0,
    netAmount: 0,
    cashRefund: 0,
    cardRefund: 0,
    voucherIssuedAmount: 0,
    exchangeVoucherAmount: 0,
    creditVoucherAmount: 0,
    claimVoucherAmount: 0,
    rewardVoucherAmount: 0,
  };
}

export function addReturnTotals(target: SalesReturnTotals, src: SalesReturnTotals) {
  target.returnCount += src.returnCount;
  target.totalItems += src.totalItems;
  target.grossAmount = Number((target.grossAmount + src.grossAmount).toFixed(2));
  target.wostAmount = Number((target.wostAmount + src.wostAmount).toFixed(2));
  target.discountAmount = Number((target.discountAmount + src.discountAmount).toFixed(2));
  target.discountWostAmount = Number((target.discountWostAmount + src.discountWostAmount).toFixed(2));
  target.amountAfterDiscount = Number((target.amountAfterDiscount + src.amountAfterDiscount).toFixed(2));
  target.taxAmount = Number((target.taxAmount + src.taxAmount).toFixed(2));
  target.netAmount = Number((target.netAmount + src.netAmount).toFixed(2));
  target.cashRefund = Number((target.cashRefund + src.cashRefund).toFixed(2));
  target.cardRefund = Number((target.cardRefund + src.cardRefund).toFixed(2));
  target.voucherIssuedAmount = Number((target.voucherIssuedAmount + src.voucherIssuedAmount).toFixed(2));
  target.exchangeVoucherAmount = Number((target.exchangeVoucherAmount + src.exchangeVoucherAmount).toFixed(2));
  target.creditVoucherAmount = Number((target.creditVoucherAmount + src.creditVoucherAmount).toFixed(2));
  target.claimVoucherAmount = Number((target.claimVoucherAmount + src.claimVoucherAmount).toFixed(2));
  target.rewardVoucherAmount = Number((target.rewardVoucherAmount + src.rewardVoucherAmount).toFixed(2));
}

interface UseSalesReturnListDataOptions {
  reportType: "merged" | "separate";
  selectedLocationIds?: string[];
  selectedCashierId?: string;
  subTypeFilter?: ReturnSubType;
  refundModeFilter?: string;
  subDateRange?: DateRange;
  searchQuery?: string;
}

export function useSalesReturnListData(
  reportData: SalesReturnListReportData | null,
  options: UseSalesReturnListDataOptions,
) {
  const {
    reportType,
    selectedLocationIds = [],
    selectedCashierId,
    subTypeFilter = "ALL",
    refundModeFilter = "all",
    subDateRange,
    searchQuery = "",
  } = options;

  // Track expanded state for node headers and return rows
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Grouping hierarchy levels
  const [groupingLevels, setGroupingLevels] = useState<{
    bySubType: boolean;
    byLocation: boolean;
  }>({
    bySubType: false,
    byLocation: reportType === "separate",
  });

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandAll = useCallback(() => {
    if (!reportData) return;
    const next: Record<string, boolean> = {};
    for (const ret of reportData.returns) {
      next[`ret:${ret.id}`] = true;
      next[`sub:${ret.subType}`] = true;
      if (ret.locationId) next[`loc:${ret.locationId}`] = true;
    }
    setExpandedNodes(next);
  }, [reportData]);

  const collapseAll = useCallback(() => {
    setExpandedNodes({});
  }, []);

  const handleToggleLevel = useCallback((level: "bySubType" | "byLocation") => {
    setGroupingLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  }, []);

  // ── Step 1: Filter In-Memory Return Nodes ──
  const filteredReturns = useMemo(() => {
    if (!reportData || !reportData.returns) return [];

    let list = reportData.returns;

    // Filter by Sub Type
    if (subTypeFilter && subTypeFilter !== "ALL") {
      list = list.filter((r) => r.subType === subTypeFilter);
    }

    // Filter by Refund Mode (VOUCHER | CASH)
    if (refundModeFilter && refundModeFilter.toUpperCase() !== "ALL") {
      list = list.filter((r) => (r.refundMode || "").toUpperCase() === refundModeFilter.toUpperCase());
    }

    // Filter by Location
    if (selectedLocationIds.length > 0) {
      const locSet = new Set(selectedLocationIds);
      list = list.filter((r) => r.locationId && locSet.has(r.locationId));
    }

    // Filter by Cashier
    if (selectedCashierId && selectedCashierId !== "all") {
      list = list.filter((r) => r.cashierUserId === selectedCashierId);
    }

    // Filter by Date Range
    if (subDateRange?.from) {
      const fromDate = new Date(subDateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const fromTime = fromDate.getTime();

      const toDate = subDateRange.to ? new Date(subDateRange.to) : new Date(subDateRange.from);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();

      list = list.filter((r) => {
        if (!r.createdAt) return true;
        const retTime = new Date(r.createdAt).getTime();
        return retTime >= fromTime && retTime <= toTime;
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const matchHeader =
          r.returnNumber.toLowerCase().includes(q) ||
          r.originalOrderNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          (r.customerCnic || "").toLowerCase().includes(q) ||
          (r.customerCode || "").toLowerCase().includes(q) ||
          r.cashierName.toLowerCase().includes(q) ||
          (r.voucherCode || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q);

        const matchItems = r.items.some(
          (it) =>
            it.sku.toLowerCase().includes(q) ||
            it.barCode.toLowerCase().includes(q) ||
            it.description.toLowerCase().includes(q)
        );

        return matchHeader || matchItems;
      });
    }

    return list;
  }, [
    reportData,
    subTypeFilter,
    refundModeFilter,
    selectedLocationIds,
    selectedCashierId,
    subDateRange,
    searchQuery,
  ]);

  // ── Step 2: Calculate Grand Totals ──
  const grandTotals = useMemo(() => {
    const totals = createEmptyReturnTotals();
    for (const ret of filteredReturns) {
      addReturnTotals(totals, ret.totals);
    }
    
    const hasActiveFilters = 
      (subTypeFilter && subTypeFilter !== "ALL") ||
      (refundModeFilter && refundModeFilter.toUpperCase() !== "ALL") ||
      selectedLocationIds.length > 0 ||
      (selectedCashierId && selectedCashierId !== "all") ||
      !!subDateRange?.from ||
      searchQuery.trim().length > 0;

    if (!hasActiveFilters && reportData?.grandTotals) {
      return reportData.grandTotals;
    }

    return totals;
  }, [
    filteredReturns,
    reportData,
    subTypeFilter,
    refundModeFilter,
    selectedLocationIds,
    selectedCashierId,
    subDateRange,
    searchQuery,
  ]);

  // ── Step 3: Helper to Generate Flat Items for Excel Export ──
  const getFilteredFlatItems = useCallback((): SalesReturnFlatRecord[] => {
    const result: SalesReturnFlatRecord[] = [];
    for (const ret of filteredReturns) {
      const itemsToMap = ret.items && ret.items.length > 0 ? ret.items : [{
        id: ret.id,
        returnNumber: ret.returnNumber,
        originalOrderNumber: ret.originalOrderNumber,
        sku: "-",
        barCode: "-",
        description: "Return Summary",
        sizeName: "-",
        colorName: "-",
        quantity: ret.totals.totalItems || 1,
        unitPrice: ret.totals.grossAmount || 0,
        priceWost: Number(((ret.totals.grossAmount || 0) / 1.18).toFixed(2)),
        valueExcl: Number(((ret.totals.grossAmount || 0) / 1.18).toFixed(2)),
        discountPercent: 0,
        discountAmount: ret.totals.discountAmount || 0,
        discountAmountWost: Number(((ret.totals.discountAmount || 0) / 1.18).toFixed(2)),
        amountAfterDiscount: Number(((ret.totals.grossAmount || 0) / 1.18).toFixed(2)),
        taxPercent: 0,
        taxAmount: ret.totals.taxAmount || 0,
        lineTotal: ret.totals.netAmount || 0,
        returnReason: ret.reason || "-",
      }];

      for (const it of itemsToMap) {
        result.push({
          id: `${ret.id}-${it.id}`,
          returnNumber: ret.returnNumber,
          originalOrderNumber: ret.originalOrderNumber,
          returnDate: ret.createdAt,
          subType: ret.subType,
          subTypeLabel: ret.subTypeLabel,
          locationName: ret.locationName || "-",
          locationId: ret.locationId,
          cashierName: ret.cashierName,
          customerName: ret.customerName,
          customerPhone: ret.customerPhone,
          customerCnic: ret.customerCnic,
          customerCode: ret.customerCode,
          refundMode: ret.refundMode,
          returnReason: it.returnReason || ret.reason || "-",
          claimStatus: ret.claimStatus,
          voucherCode: ret.voucherCode || "-",
          voucherAmount: ret.voucherAmount || 0,
          sku: it.sku,
          barCode: it.barCode,
          description: it.description,
          sizeName: it.sizeName,
          colorName: it.colorName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          priceWost: it.priceWost,
          valueExcl: it.valueExcl,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          discountAmountWost: it.discountAmountWost,
          amountAfterDiscount: it.amountAfterDiscount,
          taxPercent: it.taxPercent,
          taxAmount: it.taxAmount,
          lineTotal: it.lineTotal,
          cashRefund: ret.totals.cashRefund,
          cardRefund: ret.totals.cardRefund,
          voucherIssuedAmount: ret.totals.voucherIssuedAmount,
        });
      }
    }
    return result;
  }, [filteredReturns]);

  // ── Step 4: Build Flattened Virtual Table Matrix Rows ──
  const flatRows = useMemo(() => {
    const rows: SalesReturnMatrixRow[] = [];

    // Mode A: Grouped by SubType
    if (groupingLevels.bySubType) {
      const subTypeMap = new Map<string, SalesReturnNode[]>();
      subTypeMap.set("EXCHANGE_SR", []);
      subTypeMap.set("REFUND_RF", []);
      subTypeMap.set("CLAIM_CLM", []);

      for (const ret of filteredReturns) {
        const arr = subTypeMap.get(ret.subType) || [];
        arr.push(ret);
        subTypeMap.set(ret.subType, arr);
      }

      for (const [stKey, returnsInType] of subTypeMap.entries()) {
        if (returnsInType.length === 0) continue;

        const subTotals = createEmptyReturnTotals();
        for (const r of returnsInType) addReturnTotals(subTotals, r.totals);

        const subId = `sub:${stKey}`;
        const isSubExpanded = expandedNodes[subId] ?? true;
        const subLabel =
          stKey === "EXCHANGE_SR"
            ? "Exchange (Return - _SR)"
            : stKey === "REFUND_RF"
            ? "Refund (RF)"
            : "Claim (_CLM)";

        rows.push({
          type: "subType-header",
          id: subId,
          subType: stKey as any,
          subTypeLabel: subLabel,
          itemCount: returnsInType.length,
          totals: subTotals,
          isExpanded: isSubExpanded,
          depth: 0,
        });

        if (isSubExpanded) {
          for (const ret of returnsInType) {
            const retId = `ret:${ret.id}`;
            const isRetExpanded = expandedNodes[retId] ?? false;

            rows.push({
              type: "return-row",
              id: retId,
              data: ret,
              isExpanded: isRetExpanded,
              depth: 1,
            });

            if (isRetExpanded) {
              for (const it of ret.items) {
                rows.push({
                  type: "item-row",
                  id: `it:${ret.id}-${it.id}`,
                  data: it,
                  parentReturn: ret,
                  depth: 2,
                });
              }
            }
          }
        }
      }
      return rows;
    }

    // Mode B: Grouped by Location
    if (groupingLevels.byLocation || reportType === "separate") {
      const locMap = new Map<string, { name: string; returns: SalesReturnNode[] }>();

      for (const ret of filteredReturns) {
        const key = ret.locationId || "main-outlet";
        const entry = locMap.get(key) || { name: ret.locationName || "Main Store", returns: [] };
        entry.returns.push(ret);
        locMap.set(key, entry);
      }

      for (const [locKey, { name, returns }] of locMap.entries()) {
        if (returns.length === 0) continue;

        const locTotals = createEmptyReturnTotals();
        for (const r of returns) addReturnTotals(locTotals, r.totals);

        const hasActiveFilters = 
          (subTypeFilter && subTypeFilter !== "ALL") ||
          (refundModeFilter && refundModeFilter.toUpperCase() !== "ALL") ||
          selectedLocationIds.length > 0 ||
          (selectedCashierId && selectedCashierId !== "all") ||
          !!subDateRange?.from ||
          searchQuery.trim().length > 0;

        let finalLocTotals = locTotals;
        if (!hasActiveFilters && reportData?.locations) {
          const backendLoc = reportData.locations.find((l: any) => l.locationKey === locKey);
          if (backendLoc && backendLoc.totals) {
            finalLocTotals = { ...backendLoc.totals };
          }
        }

        const locId = `loc:${locKey}`;
        const isLocExpanded = expandedNodes[locId] ?? true;

        rows.push({
          type: "location-header",
          id: locId,
          locationKey: locKey,
          locationName: name,
          itemCount: returns.length,
          totals: finalLocTotals,
          isExpanded: isLocExpanded,
          depth: 0,
        });

        if (isLocExpanded) {
          for (const ret of returns) {
            const retId = `ret:${ret.id}`;
            const isRetExpanded = expandedNodes[retId] ?? false;

            rows.push({
              type: "return-row",
              id: retId,
              data: ret,
              isExpanded: isRetExpanded,
              depth: 1,
            });

            if (isRetExpanded) {
              for (const it of ret.items) {
                rows.push({
                  type: "item-row",
                  id: `it:${ret.id}-${it.id}`,
                  data: it,
                  parentReturn: ret,
                  depth: 2,
                });
              }
            }
          }
        }
      }
      return rows;
    }

    // Mode C: Direct Returns List
    for (const ret of filteredReturns) {
      const retId = `ret:${ret.id}`;
      const isRetExpanded = expandedNodes[retId] ?? false;

      rows.push({
        type: "return-row",
        id: retId,
        data: ret,
        isExpanded: isRetExpanded,
        depth: 0,
      });

      if (isRetExpanded) {
        for (const it of ret.items) {
          rows.push({
            type: "item-row",
            id: `it:${ret.id}-${it.id}`,
            data: it,
            parentReturn: ret,
            depth: 1,
          });
        }
      }
    }

    return rows;
  }, [
    filteredReturns,
    groupingLevels,
    reportType,
    expandedNodes,
  ]);

  return {
    filteredReturns,
    getFilteredFlatItems,
    grandTotals,
    flatRows,
    matrixRows: flatRows,
    groupingLevels,
    handleToggleLevel,
    toggleNode,
    toggleRow: toggleNode,
    expandAll,
    collapseAll,
  };
}
