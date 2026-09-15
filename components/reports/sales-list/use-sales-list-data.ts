import { useMemo, useState, useCallback } from "react";
import {
  SalesListReportData,
  SalesListTotals,
  GroupingLevels,
  SalesListTableRow,
  SalesListInvoiceNode,
  SalesListFlatRecord,
} from "./types";

export const createEmptyTotals = (): SalesListTotals => ({
  orderCount: 0,
  totalItems: 0,
  grossAmount: 0,
  discountAmount: 0,
  netAmount: 0,
  taxAmount: 0,
  paidAmount: 0,
  cashAmount: 0,
  cardAmount: 0,
  walletAmount: 0,
  creditAmount: 0,
  cashSale: 0,
  cashReturn: 0,
  cardSale: 0,
  creditSale: 0,
  giftVoucherAmount: 0,
  creditVoucherAmount: 0,
  exchangeVoucherAmount: 0,
  claimVoucherAmount: 0,
  giftVoucherCorporate: 0,
  creditVoucherIssuedAmount: 0,
  rewardVoucherAmount: 0,
  onCreditAmount: 0,
});

export const addTotals = (target: SalesListTotals, source: SalesListTotals) => {
  target.orderCount += source.orderCount;
  target.totalItems += source.totalItems;
  target.grossAmount += source.grossAmount;
  target.discountAmount += source.discountAmount;
  target.netAmount += source.netAmount;
  target.taxAmount += source.taxAmount;
  target.paidAmount += source.paidAmount;
  target.cashAmount += source.cashAmount;
  target.cardAmount += source.cardAmount;
  target.walletAmount += source.walletAmount;
  target.creditAmount += source.creditAmount;
  target.cashSale += source.cashSale;
  target.cashReturn += source.cashReturn;
  target.cardSale += source.cardSale;
  target.creditSale += source.creditSale;
  target.giftVoucherAmount += source.giftVoucherAmount;
  target.creditVoucherAmount += source.creditVoucherAmount;
  target.exchangeVoucherAmount += source.exchangeVoucherAmount;
  target.claimVoucherAmount += source.claimVoucherAmount;
  target.giftVoucherCorporate += source.giftVoucherCorporate;
  target.creditVoucherIssuedAmount += source.creditVoucherIssuedAmount;
  target.rewardVoucherAmount += source.rewardVoucherAmount;
  target.onCreditAmount += source.onCreditAmount;
};

export interface UseSalesListDataOptions {
  reportType: "merged" | "separate";
  selectedLocationIds?: string[];
  selectedCashierId?: string;
  subDateRange?: { from?: Date; to?: Date };
  paymentModeFilter?: string;
  fbrOnlyFilter?: boolean;
  searchQuery?: string;
}

export function useSalesListData(
  reportData: SalesListReportData | null,
  options?: UseSalesListDataOptions,
) {
  const {
    reportType = "merged",
    selectedLocationIds = [],
    selectedCashierId,
    subDateRange,
    paymentModeFilter = "all",
    fbrOnlyFilter = false,
    searchQuery = "",
  } = options || {};

  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    location: true,
    invoice: true,
    item: true,
  });

  // Expanded invoice nodes state (invoices start collapsed by default for performance and clean view)
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());
  // Collapsed locations state (locations start expanded by default)
  const [collapsedLocationIds, setCollapsedLocationIds] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((nodeId: string) => {
    if (nodeId.includes("-inv-")) {
      setExpandedInvoiceIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    } else {
      setCollapsedLocationIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    }
  }, []);


  // Check whether any in-memory filter is actually applied by the user
  const hasSubDateFilter = useMemo(() => {
    if (
      !subDateRange?.from ||
      !subDateRange?.to ||
      !reportData?.dateRange?.startDate ||
      !reportData?.dateRange?.endDate
    )
      return false;
    const repFrom = new Date(reportData.dateRange.startDate).getTime();
    const repTo = new Date(reportData.dateRange.endDate).getTime();
    const subFrom = new Date(subDateRange.from).getTime();
    const subTo = new Date(subDateRange.to).getTime();
    return subFrom - repFrom > 86400000 || repTo - subTo > 86400000;
  }, [subDateRange?.from, subDateRange?.to, reportData?.dateRange]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
      (selectedLocationIds && selectedLocationIds.length > 0) ||
      (selectedCashierId && selectedCashierId !== "all") ||
      fbrOnlyFilter ||
      (paymentModeFilter && paymentModeFilter !== "all") ||
      hasSubDateFilter
    );
  }, [
    searchQuery,
    selectedLocationIds,
    selectedCashierId,
    fbrOnlyFilter,
    paymentModeFilter,
    hasSubDateFilter,
  ]);

  // 1. In-memory Filtered Invoices (0ms latency, zero backend hits)
  const filteredInvoices = useMemo(() => {
    if (!reportData?.invoices) return [];
    if (!hasActiveFilters) return reportData.invoices;

    const q = searchQuery.toLowerCase().trim();
    const fromTime = subDateRange?.from ? new Date(subDateRange.from).getTime() : undefined;
    let toTime: number | undefined;
    if (subDateRange?.to) {
      const d = new Date(subDateRange.to);
      d.setHours(23, 59, 59, 999);
      toTime = d.getTime();
    }

    const hasLocationFilter = selectedLocationIds.length > 0;
    const hasCashierFilter = !!selectedCashierId && selectedCashierId !== "all";

    return reportData.invoices.filter((inv) => {
      // Date bounds within the year
      if (hasSubDateFilter && (fromTime || toTime)) {
        const invTime = new Date(inv.createdAt).getTime();
        if (fromTime && invTime < fromTime) return false;
        if (toTime && invTime > toTime) return false;
      }

      // Location match
      if (hasLocationFilter) {
        if (!inv.locationId || !selectedLocationIds.includes(inv.locationId)) return false;
      }

      // Cashier match
      if (hasCashierFilter) {
        if (inv.cashierUserId !== selectedCashierId) return false;
      }

      // FBR Synced filter
      if (fbrOnlyFilter && (!inv.fbrInvoiceNumber || inv.fbrInvoiceNumber === "-")) return false;

      // Payment Mode filter
      if (paymentModeFilter !== "all" && inv.paymentMethod !== paymentModeFilter.toUpperCase()) {
        return false;
      }

      // Search query across multiple attributes
      if (q) {
        const matchesOrderNo = inv.orderNumber.toLowerCase().includes(q);
        const matchesCustomer =
          inv.customerName.toLowerCase().includes(q) || inv.customerPhone.includes(q);
        const matchesCashier = inv.cashierName.toLowerCase().includes(q);
        const matchesFbr = inv.fbrInvoiceNumber.toLowerCase().includes(q);
        const matchesItem = inv.items.some(
          (i) =>
            i.sku.toLowerCase().includes(q) ||
            i.barCode.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q),
        );

        if (!matchesOrderNo && !matchesCustomer && !matchesCashier && !matchesFbr && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [
    reportData?.invoices,
    hasActiveFilters,
    hasSubDateFilter,
    selectedLocationIds,
    selectedCashierId,
    subDateRange?.from,
    subDateRange?.to,
    paymentModeFilter,
    fbrOnlyFilter,
    searchQuery,
  ]);

  // 2. Grand Totals: Return verified server totals if no in-memory filter, else recalculate
  const grandTotals = useMemo<SalesListTotals>(() => {
    if (!hasActiveFilters && reportData?.grandTotals) {
      return reportData.grandTotals;
    }
    const totals = createEmptyTotals();
    for (const inv of filteredInvoices) {
      addTotals(totals, inv.totals);
    }
    return totals;
  }, [filteredInvoices, hasActiveFilters, reportData?.grandTotals]);

  // 3. Dynamic Location Grouping for "Separate" Mode
  const locationGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        locationKey: string;
        locationId?: string;
        locationName: string;
        invoices: SalesListInvoiceNode[];
        totals: SalesListTotals;
      }
    >();

    for (const inv of filteredInvoices) {
      const key = inv.locationId ? `loc:${inv.locationId}` : "main-outlet";
      const name = inv.locationName || "Main Outlet";
      let group = map.get(key);
      if (!group) {
        group = {
          locationKey: key,
          locationId: inv.locationId,
          locationName: name,
          invoices: [],
          totals: createEmptyTotals(),
        };
        map.set(key, group);
      }
      group.invoices.push(inv);
      addTotals(group.totals, inv.totals);
    }

    return Array.from(map.values());
  }, [filteredInvoices]);

  // Expand all locations and all invoices
  const expandAll = useCallback(() => {
    setCollapsedLocationIds(new Set());
    const allInvIds = new Set<string>();
    if (reportType === "separate") {
      for (const loc of locationGroups) {
        for (const inv of loc.invoices) {
          allInvIds.add(`${loc.locationKey}-inv-${inv.id}`);
          allInvIds.add(inv.id);
        }
      }
    } else {
      for (const inv of filteredInvoices) {
        allInvIds.add(`merged-inv-${inv.id}`);
        allInvIds.add(inv.id);
      }
    }
    setExpandedInvoiceIds(allInvIds);
  }, [reportType, locationGroups, filteredInvoices]);

  // Collapse all invoices and locations
  const collapseAll = useCallback(() => {
    setExpandedInvoiceIds(new Set());
    const locSet = new Set<string>();
    if (reportType === "separate") {
      for (const loc of locationGroups) {
        locSet.add(`loc-${loc.locationKey}`);
      }
    }
    setCollapsedLocationIds(locSet);
  }, [reportType, locationGroups]);

  // 4. Flatten hierarchy into table rows respecting collapse state & search
  const flatRows = useMemo<SalesListTableRow[]>(() => {
    const rows: SalesListTableRow[] = [];
    if (!reportData || filteredInvoices.length === 0) return rows;

    const q = searchQuery.toLowerCase().trim();

    const flattenInvoices = (
      invoicesList: SalesListInvoiceNode[],
      depthOffset: number,
      prefix: string,
    ) => {
      for (const inv of invoicesList) {
        const invNodeId = `${prefix}-inv-${inv.id}`;
        const hasItems = inv.items.length > 0;
        const matchesItemSearch = Boolean(
          q &&
            inv.items.some(
              (i) =>
                i.sku.toLowerCase().includes(q) ||
                i.barCode.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q)
            )
        );
        const isInvExpanded =
          Boolean(
            expandedInvoiceIds.has(invNodeId) ||
              expandedInvoiceIds.has(inv.id) ||
              matchesItemSearch
          ) && groupingLevels.item;

        if (groupingLevels.invoice) {
          rows.push({
            type: "invoice",
            id: invNodeId,
            nodeId: invNodeId,
            orderNumber: inv.orderNumber,
            createdAt: inv.createdAt,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            cashierName: inv.cashierName,
            paymentMethod: inv.paymentMethod,
            merchant: inv.merchant,
            fbrInvoiceNumber: inv.fbrInvoiceNumber,
            fbrStatus: inv.fbrStatus,
            totals: inv.totals,
            tenderDetails: inv.tenderDetails,
            depth: depthOffset,
            hasChildren: hasItems && groupingLevels.item,
            isExpanded: isInvExpanded,
          });
        }

        const shouldRenderItems =
          groupingLevels.item && (!groupingLevels.invoice || isInvExpanded);

        if (shouldRenderItems) {
          for (const line of inv.items) {
            const lineSubTotal = line.subTotal || 0;
            const proratedTax =
              inv.totals.taxAmount > 0 && inv.totals.netAmount > 0
                ? (lineSubTotal / inv.totals.netAmount) * inv.totals.taxAmount
                : 0;
            const lineGross = line.unitPrice
              ? line.unitPrice * line.quantity
              : lineSubTotal + (line.discountAmount || 0);

            rows.push({
              type: "item",
              id: `${prefix}-item-${line.id}`,
              nodeId: `${prefix}-item-${line.id}`,
              orderNumber: inv.orderNumber,
              sku: line.sku,
              barCode: line.barCode,
              description: line.description,
              sizeName: line.sizeName,
              colorName: line.colorName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              subTotal: line.subTotal,
              totals: {
                orderCount: 0,
                totalItems: line.quantity,
                grossAmount: lineGross,
                discountAmount: line.discountAmount,
                netAmount: line.subTotal,
                taxAmount: proratedTax,
                paidAmount: line.subTotal,
                cashAmount:
                  inv.totals.cashAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cashAmount
                    : inv.totals.cashSale > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cashSale
                    : 0,
                cardAmount:
                  inv.totals.cardAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cardAmount
                    : inv.totals.cardSale > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cardSale
                    : 0,
                walletAmount:
                  inv.totals.walletAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.walletAmount
                    : 0,
                creditAmount:
                  inv.totals.creditAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.creditAmount
                    : 0,
                cashSale:
                  inv.totals.cashSale > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cashSale
                    : 0,
                cashReturn:
                  inv.totals.cashReturn > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cashReturn
                    : 0,
                cardSale:
                  inv.totals.cardSale > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.cardSale
                    : 0,
                creditSale:
                  inv.totals.creditSale > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.creditSale
                    : 0,
                giftVoucherAmount:
                  inv.totals.giftVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.giftVoucherAmount
                    : 0,
                creditVoucherAmount:
                  inv.totals.creditVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.creditVoucherAmount
                    : 0,
                exchangeVoucherAmount:
                  inv.totals.exchangeVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.exchangeVoucherAmount
                    : 0,
                claimVoucherAmount:
                  inv.totals.claimVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.claimVoucherAmount
                    : 0,
                giftVoucherCorporate:
                  inv.totals.giftVoucherCorporate > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.giftVoucherCorporate
                    : 0,
                creditVoucherIssuedAmount:
                  inv.totals.creditVoucherIssuedAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.creditVoucherIssuedAmount
                    : 0,
                rewardVoucherAmount:
                  inv.totals.rewardVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.rewardVoucherAmount
                    : 0,
                onCreditAmount:
                  inv.totals.onCreditAmount > 0 && inv.totals.netAmount > 0
                    ? (lineSubTotal / inv.totals.netAmount) * inv.totals.onCreditAmount
                    : 0,
              },
              tenderDetails: inv.tenderDetails,
              depth: depthOffset + 1,
              hasChildren: false,
              isExpanded: false,
            });
          }
        }
      }
    };

    if (reportType === "separate" && locationGroups.length > 0) {
      for (const loc of locationGroups) {
        const locId = `loc-${loc.locationKey}`;
        const isLocCollapsed = collapsedLocationIds.has(locId);
        const hasInvoices = loc.invoices.length > 0;

        if (groupingLevels.location) {
          rows.push({
            type: "location",
            id: locId,
            nodeId: locId,
            label: loc.locationName.toUpperCase(),
            totals: loc.totals,
            depth: 0,
            hasChildren: hasInvoices,
            isExpanded: !isLocCollapsed,
          });
        }

        if (!isLocCollapsed && hasInvoices) {
          flattenInvoices(loc.invoices, groupingLevels.location ? 1 : 0, loc.locationKey);
        }
      }
    } else {
      flattenInvoices(filteredInvoices, 0, "merged");
    }

    return rows;
  }, [
    reportData,
    filteredInvoices,
    locationGroups,
    reportType,
    groupingLevels,
    expandedInvoiceIds,
    collapsedLocationIds,
    searchQuery,
  ]);

  // 5. Lazy On-Demand Flat Items for Client-Side Excel Export (computed only when export is clicked)
  const getFilteredFlatItems = useCallback((): SalesListFlatRecord[] => {
    const records: SalesListFlatRecord[] = [];
    for (const inv of filteredInvoices) {
      for (const line of inv.items) {
        records.push({
          locationName: inv.locationName || "Main Outlet",
          orderNumber: inv.orderNumber,
          orderDate: inv.createdAt,
          cashierName: inv.cashierName,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          paymentMethod: inv.paymentMethod,
          merchant: inv.merchant,
          fbrInvoiceNumber: inv.fbrInvoiceNumber,
          fbrStatus: inv.fbrStatus,
          sku: line.sku,
          barCode: line.barCode,
          description: line.description,
          sizeName: line.sizeName,
          colorName: line.colorName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          subTotal: line.subTotal,
          orderGrossAmount: inv.totals.grossAmount,
          orderDiscountAmount: inv.totals.discountAmount,
          orderNetAmount: inv.totals.netAmount,
          orderTaxAmount: inv.totals.taxAmount,
          cashSale: inv.totals.cashSale,
          cashReturn: inv.totals.cashReturn,
          cardSale: inv.totals.cardSale,
          creditSale: inv.totals.creditSale,
          giftVoucherAmount: inv.totals.giftVoucherAmount,
          creditVoucherAmount: inv.totals.creditVoucherAmount,
          exchangeVoucherAmount: inv.totals.exchangeVoucherAmount,
          claimVoucherAmount: inv.totals.claimVoucherAmount,
          giftVoucherCorporate: inv.totals.giftVoucherCorporate,
          creditVoucherIssuedAmount: inv.totals.creditVoucherIssuedAmount,
          rewardVoucherAmount: inv.totals.rewardVoucherAmount,
          onCreditAmount: inv.totals.onCreditAmount,
        });
      }
    }
    return records;
  }, [filteredInvoices]);

  const handleToggleLevel = (level: keyof GroupingLevels, checked: boolean) => {
    setGroupingLevels((prev) => ({ ...prev, [level]: checked }));
  };

  return {
    filteredInvoices,
    filteredFlatItems: [] as SalesListFlatRecord[],
    getFilteredFlatItems,
    locationGroups,
    grandTotals,
    flatRows,
    groupingLevels,
    setGroupingLevels,
    handleToggleLevel,
    toggleNode,
    expandAll,
    collapseAll,
  };
}
