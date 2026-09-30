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
  wostAmount: 0,
  discountAmount: 0,
  discountWostAmount: 0,
  amountAfterDiscount: 0,
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
});

export const addTotals = (target: SalesListTotals, source: SalesListTotals) => {
  target.orderCount += source.orderCount;
  target.totalItems += source.totalItems;
  target.grossAmount += source.grossAmount;
  target.wostAmount = (target.wostAmount || 0) + (source.wostAmount || (source.grossAmount ? source.grossAmount / 1.18 : 0));
  target.discountAmount += source.discountAmount;
  target.discountWostAmount = (target.discountWostAmount || 0) + (source.discountWostAmount || (source.discountAmount ? source.discountAmount / 1.18 : 0));
  target.amountAfterDiscount = (target.amountAfterDiscount || 0) + (source.amountAfterDiscount || Math.max(0, (source.wostAmount || source.grossAmount / 1.18) - (source.discountWostAmount || source.discountAmount / 1.18)));
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
    let fromTime: number | undefined;
    if (subDateRange?.from) {
      const f = new Date(subDateRange.from);
      f.setHours(0, 0, 0, 0);
      fromTime = f.getTime();
    }
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

    const result = Array.from(map.values());

    // Patch location totals with backend computed values to avoid preview truncation discrepancies
    if (!hasActiveFilters && reportData?.locations) {
      for (const group of result) {
        const backendLoc = reportData.locations.find((l) => l.locationKey === group.locationKey);
        if (backendLoc && backendLoc.totals) {
          group.totals = { ...backendLoc.totals };
        }
      }
    }

    return result;
  }, [filteredInvoices, hasActiveFilters, reportData?.locations]);

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
            customerCnic: inv.customerCnic,
            customerCode: inv.customerCode,
            cashierName: inv.cashierName,
            paymentMethod: inv.paymentMethod,
            merchant: inv.merchant,
            fbrInvoiceNumber: inv.fbrInvoiceNumber,
            fbrStatus: inv.fbrStatus,
            notes: inv.notes,
            totals: inv.totals,
            discountDetails: inv.discountDetails,
            customerDetails: inv.customerDetails,
            tenderDetails: inv.tenderDetails,
            items: inv.items,
            depth: depthOffset,
            hasChildren: hasItems && groupingLevels.item,
            isExpanded: isInvExpanded,
          });
        }

        const shouldRenderItems =
          groupingLevels.item && (!groupingLevels.invoice || isInvExpanded);

        if (shouldRenderItems) {
          for (const line of inv.items) {
            const lineSubTotal = line.lineTotal || line.subTotal || 0;
            const proratedTax =
              inv.totals.taxAmount > 0 && inv.totals.netAmount > 0
                ? (lineSubTotal / inv.totals.netAmount) * inv.totals.taxAmount
                : 0;
            const lineGross = line.unitPrice
              ? line.unitPrice * line.quantity
              : lineSubTotal + (line.discountAmount || 0);

            const itemPriceWost = line.priceWost !== undefined ? line.priceWost : (line.unitPrice || 0) / 1.18;
            const itemDiscWost = line.discountAmountWost !== undefined ? line.discountAmountWost : (line.discountAmount || 0) / 1.18;
            const itemValueExcl = (line.quantity || 1) * itemPriceWost;
            const itemAmtAfterDisc = Math.max(0, itemValueExcl - itemDiscWost);

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
              priceWost: itemPriceWost,
              valueExcl: itemValueExcl,
              discountPercent: line.discountPercent,
              discountAmount: line.discountAmount,
              discountAmountWost: itemDiscWost,
              amountAfterDiscount: itemAmtAfterDisc,
              taxPercent: line.taxPercent,
              taxAmount: proratedTax,
              subTotal: lineSubTotal,
              valueIncl: lineSubTotal,
              hasOverrideDiscount: line.hasOverrideDiscount,
              overrideDiscountPercent: line.overrideDiscountPercent,
              overrideDiscountNote: line.overrideDiscountNote,
              totals: {
                orderCount: 0,
                totalItems: line.quantity,
                grossAmount: lineGross,
                discountAmount: line.discountAmount || 0,
                netAmount: lineSubTotal,
                taxAmount: proratedTax,
                paidAmount: lineSubTotal,
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
      const allVouchers = [
        ...(inv.tenderDetails?.giftVouchers || []),
        ...(inv.tenderDetails?.creditVouchers || []),
        ...(inv.tenderDetails?.exchangeVouchers || []),
        ...(inv.tenderDetails?.claimVouchers || []),
        ...(inv.tenderDetails?.corporateVouchers || []),
        ...(inv.tenderDetails?.rewardVouchers || []),
      ];
      const voucherCodes = allVouchers.map((v) => `${v.code} (Rs. ${(v.amount || 0).toLocaleString()})`).join(", ");

      const items = inv.items && inv.items.length > 0 ? inv.items : [{
        id: inv.id,
        orderNumber: inv.orderNumber,
        sku: "-",
        barCode: "-",
        description: "Invoice Summary",
        sizeName: "-",
        colorName: "-",
        quantity: inv.totals?.totalItems || 1,
        unitPrice: inv.totals?.grossAmount || 0,
        priceWost: inv.totals?.wostAmount !== undefined ? inv.totals.wostAmount / (inv.totals?.totalItems || 1) : (inv.totals?.grossAmount || 0) / 1.18,
        discountPercent: 0,
        discountAmount: inv.totals?.discountAmount || 0,
        discountAmountWost: inv.totals?.discountWostAmount !== undefined ? inv.totals.discountWostAmount : (inv.totals?.discountAmount || 0) / 1.18,
        taxPercent: 18,
        taxAmount: inv.totals?.taxAmount || 0,
        lineTotal: inv.totals?.netAmount || 0,
        hasOverrideDiscount: false,
      }];

      for (const line of items) {
        records.push({
          locationName: inv.locationName || "Main Outlet",
          orderNumber: inv.orderNumber,
          orderDate: inv.createdAt,
          cashierName: inv.cashierName,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          customerCnic: inv.customerCnic,
          customerCode: inv.customerCode,
          paymentMethod: inv.paymentMethod,
          merchant: inv.merchant,
          fbrInvoiceNumber: inv.fbrInvoiceNumber,
          fbrStatus: inv.fbrStatus,
          orderNotes: inv.notes,
          sku: line.sku,
          barCode: line.barCode,
          description: line.description,
          sizeName: line.sizeName,
          colorName: line.colorName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          priceWost: line.priceWost !== undefined ? line.priceWost : (line.unitPrice || 0) / 1.18,
          valueExcl: (line.quantity || 1) * (line.priceWost !== undefined ? line.priceWost : (line.unitPrice || 0) / 1.18),
          discountPercent: line.discountPercent,
          discountAmount: line.discountAmount,
          discountAmountWost: line.discountAmountWost !== undefined ? line.discountAmountWost : (line.discountAmount || 0) / 1.18,
          amountAfterDiscount: Math.max(0, ((line.quantity || 1) * (line.priceWost !== undefined ? line.priceWost : (line.unitPrice || 0) / 1.18)) - (line.discountAmountWost !== undefined ? line.discountAmountWost : (line.discountAmount || 0) / 1.18)),
          hasOverrideDiscount: line.hasOverrideDiscount,
          overrideDiscountPercent: line.overrideDiscountPercent,
          overrideDiscountNote: line.overrideDiscountNote,
          manualDiscountNote: inv.discountDetails?.manualDiscountNote,
          manualDiscountType: inv.discountDetails?.manualDiscountType,
          manualDiscountPercent: inv.discountDetails?.manualDiscountPercent,
          manualDiscountAmount: inv.discountDetails?.manualDiscountAmount,
          alliancePartner: inv.discountDetails?.alliance?.partnerName,
          allianceCode: inv.discountDetails?.alliance?.code,
          promoCode: inv.discountDetails?.promo?.code,
          couponCode: inv.discountDetails?.coupon?.code,
          voucherCodes: voucherCodes || undefined,
          cardLast4: inv.tenderDetails?.card?.cardLast4,
          cardSlipNo: inv.tenderDetails?.card?.authId,
          taxAmount: line.taxAmount,
          subTotal: line.lineTotal || line.subTotal || 0,
          valueIncl: line.lineTotal || line.subTotal || 0,
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
