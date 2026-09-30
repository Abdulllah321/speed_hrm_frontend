import { useMemo, useState, useEffect } from "react";
import {
  GrossSalesReturnReportData,
  GrossSalesReturnTotals,
  GroupingLevels,
  GrossSalesReturnTreeNode,
  GrossSalesReturnFlatRecord,
} from "./types";

function createEmptyTotals(): GrossSalesReturnTotals {
  return {
    returnCount: 0,
    totalItems: 0,
    unitPrice: 0,
    priceWost: 0,
    grossAmount: 0,
    wostAmount: 0,
    discountAmount: 0,
    discountWostAmount: 0,
    amountAfterDiscount: 0,
    valueExSalesTax: 0,
    taxAmount: 0,
    valueInclSalesTax: 0,
    netAmount: 0,
    cashAmount: 0,
    cardAmount: 0,
    voucherAmount: 0,
  };
}

function addTotals(target: GrossSalesReturnTotals, source: GrossSalesReturnTotals) {
  target.returnCount += source.returnCount;
  target.totalItems += source.totalItems;
  target.grossAmount += source.grossAmount;
  target.wostAmount += source.wostAmount;
  target.discountAmount += source.discountAmount;
  target.discountWostAmount = (target.discountWostAmount || 0) + (source.discountWostAmount || 0);
  target.amountAfterDiscount = (target.amountAfterDiscount || 0) + (source.amountAfterDiscount || 0);
  target.valueExSalesTax += source.valueExSalesTax;
  target.taxAmount += source.taxAmount;
  target.valueInclSalesTax += source.valueInclSalesTax;
  target.netAmount += source.netAmount;
  if (source.cashAmount) target.cashAmount = (target.cashAmount || 0) + source.cashAmount;
  if (source.cardAmount) target.cardAmount = (target.cardAmount || 0) + source.cardAmount;
  if (source.voucherAmount) target.voucherAmount = (target.voucherAmount || 0) + source.voucherAmount;
}

export interface UseGrossSalesReturnDataOptions {
  reportType?: "merged" | "separate";
  selectedLocationIds?: string[];
  selectedCashierId?: string;
  subDateRange?: { from?: Date; to?: Date };
  searchQuery?: string;
}

export function useGrossSalesReturnData(
  reportData: GrossSalesReturnReportData | null,
  options?: UseGrossSalesReturnDataOptions,
) {
  const {
    reportType: optionReportType,
    selectedLocationIds = [],
    selectedCashierId,
    subDateRange,
    searchQuery: optionSearchQuery,
  } = options || {};

  const [internalReportType, setInternalReportType] = useState<"merged" | "separate">("merged");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

  const effectiveReportType = optionReportType ?? internalReportType;
  const effectiveSearchQuery = optionSearchQuery ?? internalSearchQuery;

  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    brand: true,
    division: true,
    category: true,
    silhouette: true,
    article: true,
    variant: true,
    gender: false,
    location: true,
    month: false,
    date: false,
    document: false,
    salesPerson: false,
    taxRate: false,
  });

  useEffect(() => {
    if (reportData?.reportType) {
      setInternalReportType(reportData.reportType);
    }
  }, [reportData?.reportType]);

  const rawItems = reportData?.flatItems || [];

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
      effectiveSearchQuery.trim() ||
      (selectedLocationIds && selectedLocationIds.length > 0) ||
      (selectedCashierId && selectedCashierId !== "all") ||
      paymentModeFilter !== "all" ||
      fbrOnlyFilter ||
      hasSubDateFilter
    );
  }, [
    effectiveSearchQuery,
    selectedLocationIds,
    selectedCashierId,
    paymentModeFilter,
    fbrOnlyFilter,
    hasSubDateFilter,
  ]);

  const { treeData, grandTotals, filteredFlatItems } = useMemo(() => {
    const q = effectiveSearchQuery.toLowerCase().trim();

    // 1. In-Memory Client Slicing across all filters (0ms, zero backend hits)
    const filtered = rawItems.filter((item) => {
      // Outlet / Location filter
      if (selectedLocationIds.length > 0) {
        const matchesLoc =
          selectedLocationIds.some((id) => (item.locationId && item.locationId === id) || item.locationName?.toLowerCase().includes(id.toLowerCase()));
        if (!matchesLoc) return false;
      }

      // Cashier filter
      if (selectedCashierId && selectedCashierId !== "all") {
        const matchesCashier = (item.cashierUserId && item.cashierUserId === selectedCashierId) || (item.cashierName && item.cashierName.toLowerCase().includes(selectedCashierId.toLowerCase()));
        if (!matchesCashier) return false;
      }

      // Payment Mode filter
      if (paymentModeFilter !== "all" && item.paymentMethod && !item.paymentMethod.toUpperCase().includes(paymentModeFilter.toUpperCase())) {
        return false;
      }

      // FBR Synced Only filter
      if (fbrOnlyFilter && (!item.fbrInvoiceNumber || item.fbrInvoiceNumber === "-")) {
        return false;
      }

      // Sub-date filter within loaded period
      if (hasSubDateFilter && subDateRange?.from && subDateRange?.to && item.returnDate) {
        const itemDate = new Date(item.returnDate).getTime();
        const fromTime = new Date(subDateRange.from).setHours(0, 0, 0, 0);
        const toTime = new Date(subDateRange.to).setHours(23, 59, 59, 999);
        if (itemDate < fromTime || itemDate > toTime) return false;
      }

      // Search keyword filter
      if (q) {
        const matchesQuery =
          (item.locationName || "").toLowerCase().includes(q) ||
          (item.returnNumber || "").toLowerCase().includes(q) ||
          (item.orderNumber || "").toLowerCase().includes(q) ||
          (item.customerName || "").toLowerCase().includes(q) ||
          (item.customerPhone || "").includes(q) ||
          (item.cashierName || "").toLowerCase().includes(q) ||
          (item.fbrInvoiceNumber || "").toLowerCase().includes(q) ||
          (item.brandName && item.brandName.toLowerCase().includes(q)) ||
          (item.divisionName && item.divisionName.toLowerCase().includes(q)) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
          (item.genderName && item.genderName.toLowerCase().includes(q)) ||
          (item.silhouetteName && item.silhouetteName.toLowerCase().includes(q)) ||
          (item.sku || "").toLowerCase().includes(q) ||
          (item.barCode || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });

    // 2. Build level sequence: Location -> Month -> Date -> Document -> SalesPerson -> TaxRate -> Brand -> Division -> Category -> Silhouette -> Gender -> Article -> Variant
    const isSeparate = effectiveReportType === "separate";
    const levels: string[] = [];

    if (isSeparate && groupingLevels.location) levels.push("location");
    if (groupingLevels.month) levels.push("month");
    if (groupingLevels.date) levels.push("date");
    if (groupingLevels.document) levels.push("document");
    if (groupingLevels.salesPerson) levels.push("salesPerson");
    if (groupingLevels.taxRate) levels.push("taxRate");
    if (groupingLevels.brand) levels.push("brand");
    if (groupingLevels.division) levels.push("division");
    if (groupingLevels.category) levels.push("category");
    if (groupingLevels.silhouette) levels.push("silhouette");
    if (groupingLevels.gender) levels.push("gender");
    if (groupingLevels.article) levels.push("article");
    if (groupingLevels.variant) levels.push("variant");

    if (levels.length === 0) {
      levels.push(isSeparate ? "location" : "brand");
    }

    const root: GrossSalesReturnTreeNode[] = [];

    for (const item of filtered) {
      if (item.quantity <= 0) continue;

      const qty = item.quantity;
      const unitPrice = item.unitPrice || 0;
      const grossAmt = qty * unitPrice;
      const priceWost = unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0;
      const wostAmt = item.wostAmount || Math.round((grossAmt / 1.18) * 100) / 100;
      const discountAmt = item.discountAmount || 0;
      const discountWostAmt = item.discountWostAmount !== undefined ? item.discountWostAmount : Math.round((discountAmt / 1.18) * 100) / 100;
      const valExTax = item.amountAfterDiscount !== undefined ? item.amountAfterDiscount : Math.max(0, Math.round((wostAmt - discountWostAmt) * 100) / 100);
      const taxAmt = item.taxAmount || 0;
      const valInclTax = item.subTotal || Math.round((valExTax + taxAmt) * 100) / 100;

      const itemTotals: GrossSalesReturnTotals = {
        returnCount: 1,
        totalItems: qty,
        unitPrice,
        priceWost,
        grossAmount: grossAmt,
        wostAmount: wostAmt,
        discountAmount: discountAmt,
        discountWostAmount: discountWostAmt,
        amountAfterDiscount: valExTax,
        valueExSalesTax: valExTax,
        taxAmount: taxAmt,
        valueInclSalesTax: valInclTax,
        netAmount: valInclTax,
        cashAmount: item.paymentMethod?.toUpperCase().includes("CASH") ? valInclTax : 0,
        cardAmount: item.paymentMethod?.toUpperCase().includes("CARD") ? valInclTax : 0,
        voucherAmount: item.paymentMethod?.toUpperCase().includes("VOUCHER") ? valInclTax : 0,
      };

      let currentLevelNodes = root;

      for (let i = 0; i < levels.length; i++) {
        const levelName = levels[i];
        let nodeVal = "";
        let extraFields: Partial<GrossSalesReturnTreeNode> = {};

        if (levelName === "location") {
          nodeVal = item.locationName || "Main Outlet";
        } else if (levelName === "brand") {
          nodeVal = item.brandName || "Default Brand";
        } else if (levelName === "division") {
          nodeVal = item.divisionName || "Default Division";
        } else if (levelName === "category") {
          nodeVal = item.categoryName || "Default Category";
        } else if (levelName === "silhouette") {
          nodeVal = item.silhouetteName || "Default Silhouette";
        } else if (levelName === "gender") {
          nodeVal = item.genderName || "Default Gender";
        } else if (levelName === "document") {
          nodeVal = item.returnNumber || item.orderNumber || "Return Document";
          extraFields.returnNumber = item.returnNumber;
          extraFields.orderNumber = item.orderNumber;
          extraFields.fbrInvoiceNumber = item.fbrInvoiceNumber;
        } else if (levelName === "salesPerson") {
          nodeVal = item.cashierName || "Default Cashier";
        } else if (levelName === "date") {
          nodeVal = item.returnDate ? item.returnDate.split("T")[0] : "No Date";
        } else if (levelName === "month") {
          try {
            const d = new Date(item.returnDate);
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            nodeVal = `${months[d.getMonth()]} ${d.getFullYear()}`;
          } catch {
            nodeVal = "Month Wise";
          }
        } else if (levelName === "taxRate") {
          nodeVal = "18% Standard Tax";
        } else if (levelName === "article") {
          nodeVal = item.sku || item.description || "Article";
          extraFields.sku = item.sku;
          extraFields.articleName = item.description || "Article";
          extraFields.barCode = item.barCode;
          extraFields.unitPrice = unitPrice;
        } else if (levelName === "variant") {
          nodeVal = item.barCode
            ? `[${item.barCode}] ${item.colorName || "Default"}-${item.sizeName || "Default"}`
            : `${item.colorName || "Default"}-${item.sizeName || "Default"}`;
          extraFields.color = item.colorName || "Default";
          extraFields.size = item.sizeName || "Default";
          extraFields.barCode = item.barCode;
          extraFields.sku = item.sku;
          extraFields.unitPrice = unitPrice;
        }

        let existingNode = (currentLevelNodes as any)._childMap?.get(nodeVal);

        if (!existingNode) {
          existingNode = {
            level: levelName,
            value: nodeVal,
            totals: createEmptyTotals(),
            ...extraFields,
            children: [],
          };
          if (!(currentLevelNodes as any)._childMap) {
            (currentLevelNodes as any)._childMap = new Map<string, GrossSalesReturnTreeNode>();
          }
          (currentLevelNodes as any)._childMap.set(nodeVal, existingNode);
          currentLevelNodes.push(existingNode);
        }

        addTotals(existingNode.totals, itemTotals);

        if (i < levels.length - 1) {
          currentLevelNodes = existingNode.children;
        }
      }
    }

    const calculatedGrandTotals = createEmptyTotals();
    for (const node of root) {
      addTotals(calculatedGrandTotals, node.totals);
    }

    const effectiveGrandTotals: GrossSalesReturnTotals = !hasActiveFilters && reportData?.grandTotals
      ? {
          ...reportData.grandTotals,
          discountWostAmount: reportData.grandTotals.discountWostAmount !== undefined ? reportData.grandTotals.discountWostAmount : Math.round((reportData.grandTotals.discountAmount / 1.18) * 100) / 100,
          amountAfterDiscount: reportData.grandTotals.amountAfterDiscount !== undefined ? reportData.grandTotals.amountAfterDiscount : Math.max(0, Math.round((reportData.grandTotals.wostAmount - (reportData.grandTotals.discountWostAmount || reportData.grandTotals.discountAmount / 1.18)) * 100) / 100),
          valueExSalesTax: reportData.grandTotals.valueExSalesTax || reportData.grandTotals.amountAfterDiscount || Math.max(0, Math.round((reportData.grandTotals.wostAmount - (reportData.grandTotals.discountWostAmount || reportData.grandTotals.discountAmount / 1.18)) * 100) / 100),
          valueInclSalesTax: reportData.grandTotals.valueInclSalesTax || reportData.grandTotals.netAmount,
        }
      : calculatedGrandTotals;

    return { treeData: root, grandTotals: effectiveGrandTotals, filteredFlatItems: filtered };
  }, [rawItems, reportData?.grandTotals, effectiveReportType, groupingLevels, effectiveSearchQuery, selectedLocationIds, selectedCashierId, paymentModeFilter, fbrOnlyFilter, subDateRange, hasActiveFilters, hasSubDateFilter]);

  const handleToggleLevel = (level: keyof GroupingLevels, checked: boolean) => {
    setGroupingLevels((prev) => ({ ...prev, [level]: checked }));
  };

  return {
    reportType: effectiveReportType,
    setReportType: setInternalReportType,
    searchQuery: effectiveSearchQuery,
    setSearchQuery: setInternalSearchQuery,
    paymentModeFilter,
    setPaymentModeFilter,
    fbrOnlyFilter,
    setFbrOnlyFilter,
    groupingLevels,
    setGroupingLevels,
    handleToggleLevel,
    treeData,
    grandTotals,
    filteredFlatItems,
  };
}
