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

  // Collapsed nodes state
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  // 1. In-memory Filtered Invoices (0ms latency, zero backend hits)
  const filteredInvoices = useMemo(() => {
    if (!reportData?.invoices) return [];

    const q = searchQuery.toLowerCase().trim();
    const fromTime = subDateRange?.from ? new Date(subDateRange.from).getTime() : undefined;
    const toTime = subDateRange?.to
      ? new Date(subDateRange.to).setHours(23, 59, 59, 999)
      : undefined;

    const hasLocationFilter = selectedLocationIds.length > 0;
    const hasCashierFilter = !!selectedCashierId && selectedCashierId !== "all";

    return reportData.invoices.filter((inv) => {
      // Date bounds within the year
      if (fromTime || toTime) {
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
    selectedLocationIds,
    selectedCashierId,
    subDateRange?.from,
    subDateRange?.to,
    paymentModeFilter,
    fbrOnlyFilter,
    searchQuery,
  ]);

  // 2. Dynamic Grand Totals Recalculation based on active filtered invoices
  const grandTotals = useMemo<SalesListTotals>(() => {
    const totals = createEmptyTotals();
    for (const inv of filteredInvoices) {
      addTotals(totals, inv.totals);
    }
    return totals;
  }, [filteredInvoices]);

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

  // 4. Flatten hierarchy into table rows respecting collapse state & search
  const flatRows = useMemo<SalesListTableRow[]>(() => {
    const rows: SalesListTableRow[] = [];
    if (!reportData || filteredInvoices.length === 0) return rows;

    const flattenInvoices = (
      invoicesList: SalesListInvoiceNode[],
      depthOffset: number,
      prefix: string,
    ) => {
      for (const inv of invoicesList) {
        const invNodeId = `${prefix}-inv-${inv.id}`;
        const isInvCollapsed = collapsedNodes.has(invNodeId);
        const hasItems = inv.items.length > 0;

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
            hasChildren: hasItems,
            isExpanded: !isInvCollapsed,
          });
        }

        if (!isInvCollapsed && groupingLevels.item) {
          for (const line of inv.items) {
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
                grossAmount: line.unitPrice * line.quantity,
                discountAmount: line.discountAmount,
                netAmount: line.subTotal,
                taxAmount: 0,
                paidAmount: line.subTotal,
                cashAmount:
                  inv.totals.cashAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashAmount
                    : inv.totals.cashSale > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashSale
                    : 0,
                cardAmount:
                  inv.totals.cardAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cardAmount
                    : inv.totals.cardSale > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cardSale
                    : 0,
                walletAmount:
                  inv.totals.walletAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.walletAmount
                    : 0,
                creditAmount:
                  inv.totals.creditAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditAmount
                    : 0,
                cashSale:
                  inv.totals.cashSale > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashSale
                    : 0,
                cashReturn:
                  inv.totals.cashReturn > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashReturn
                    : 0,
                cardSale:
                  inv.totals.cardSale > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.cardSale
                    : 0,
                creditSale:
                  inv.totals.creditSale > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditSale
                    : 0,
                giftVoucherAmount:
                  inv.totals.giftVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.giftVoucherAmount
                    : 0,
                creditVoucherAmount:
                  inv.totals.creditVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditVoucherAmount
                    : 0,
                exchangeVoucherAmount:
                  inv.totals.exchangeVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.exchangeVoucherAmount
                    : 0,
                claimVoucherAmount:
                  inv.totals.claimVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.claimVoucherAmount
                    : 0,
                giftVoucherCorporate:
                  inv.totals.giftVoucherCorporate > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.giftVoucherCorporate
                    : 0,
                creditVoucherIssuedAmount:
                  inv.totals.creditVoucherIssuedAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditVoucherIssuedAmount
                    : 0,
                rewardVoucherAmount:
                  inv.totals.rewardVoucherAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.rewardVoucherAmount
                    : 0,
                onCreditAmount:
                  inv.totals.onCreditAmount > 0 && inv.totals.netAmount > 0
                    ? (line.subTotal / inv.totals.netAmount) * inv.totals.onCreditAmount
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
        const isLocCollapsed = collapsedNodes.has(locId);
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
  }, [reportData, filteredInvoices, locationGroups, reportType, groupingLevels, collapsedNodes]);

  const collapseAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    for (const loc of locationGroups) {
      allNodeIds.add(`loc-${loc.locationKey}`);
    }
    for (const inv of filteredInvoices) {
      allNodeIds.add(`merged-inv-${inv.id}`);
      if (inv.locationId) {
        allNodeIds.add(`loc:${inv.locationId}-inv-${inv.id}`);
      }
    }
    setCollapsedNodes(allNodeIds);
  }, [locationGroups, filteredInvoices]);

  // 5. Filtered Flat Items for Client-Side Excel Export
  const filteredFlatItems = useMemo<SalesListFlatRecord[]>(() => {
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
    filteredFlatItems,
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
