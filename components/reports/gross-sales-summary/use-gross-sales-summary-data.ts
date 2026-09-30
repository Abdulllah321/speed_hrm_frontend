import { useMemo, useState, useEffect } from "react";
import {
  GrossSalesSummaryReportData,
  GrossSalesSummaryTotals,
  GroupingLevels,
  GrossSalesSummaryTreeNode,
  GrossSalesSummaryFlatRecord,
} from "./types";

function createEmptyTotals(): GrossSalesSummaryTotals {
  return {
    orderCount: 0,
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
  };
}

function addTotals(target: GrossSalesSummaryTotals, source: GrossSalesSummaryTotals) {
  target.orderCount += source.orderCount;
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
}

export interface UseGrossSalesSummaryDataOptions {
  reportType?: "merged" | "separate";
  selectedLocationIds?: string[];
  selectedCashierId?: string;
  subDateRange?: { from?: Date; to?: Date };
  searchQuery?: string;
}

export function useGrossSalesSummaryData(
  reportData: GrossSalesSummaryReportData | null,
  options?: UseGrossSalesSummaryDataOptions,
) {
  const {
    reportType: optionReportType,
    selectedLocationIds = [],
    selectedCashierId,
    subDateRange,
    searchQuery: optionSearchQuery,
  } = options || {};

  const [internalReportType, setInternalReportType] = useState<"merged" | "separate">("separate");
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
      hasSubDateFilter
    );
  }, [
    effectiveSearchQuery,
    selectedLocationIds,
    selectedCashierId,
    hasSubDateFilter,
  ]);

  const { treeData, grandTotals, filteredFlatItems } = useMemo(() => {
    const q = effectiveSearchQuery.toLowerCase().trim();

    // 1. In-Memory Client Slicing across all filters (0ms, zero backend calls)
    const filtered = rawItems.filter((item) => {
      // Outlet / Location filter
      if (selectedLocationIds.length > 0) {
        const matchesLoc =
          (item.locationId && selectedLocationIds.includes(item.locationId)) ||
          selectedLocationIds.some((id) => item.locationName?.toLowerCase().includes(id.toLowerCase()));
        if (!matchesLoc) return false;
      }

      // Cashier filter
      if (selectedCashierId && item.cashierUserId && item.cashierUserId !== selectedCashierId) {
        return false;
      }

      // Sub-date filter within loaded period
      if (hasSubDateFilter && subDateRange?.from && subDateRange?.to && item.createdAt) {
        const itemDate = new Date(item.createdAt).getTime();
        const fromTime = new Date(subDateRange.from).setHours(0, 0, 0, 0);
        const toTime = new Date(subDateRange.to).setHours(23, 59, 59, 999);
        if (itemDate < fromTime || itemDate > toTime) return false;
      }

      // Search keyword filter
      if (q) {
        const matchesQuery =
          (item.locationName || "").toLowerCase().includes(q) ||
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

    const root: GrossSalesSummaryTreeNode[] = [];

    for (const item of filtered) {
      if (item.quantity <= 0) continue;

      const qty = item.quantity;
      const unitPrice = item.unitPrice || 0;
      const grossAmt = qty * unitPrice;
      const priceWost = unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0;
      const wostAmt = item.wostAmount || Math.round((grossAmt / 1.18) * 100) / 100;
      const discountAmt = item.discountAmount || 0;
      const discountWostAmt = item.discountWostAmount !== undefined ? item.discountWostAmount : Math.round((discountAmt / 1.18) * 100) / 100;
      const valExTax = Math.max(0, Math.round((wostAmt - discountWostAmt) * 100) / 100);
      const taxAmt = item.taxAmount || 0;
      const valInclTax = item.subTotal || Math.round((valExTax + taxAmt) * 100) / 100;

      const itemTotals: GrossSalesSummaryTotals = {
        orderCount: 1,
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
      };

      let currentLevelNodes = root;

      for (let i = 0; i < levels.length; i++) {
        const levelName = levels[i];
        let nodeVal = "";
        let extraFields: Partial<GrossSalesSummaryTreeNode> = {};

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
          nodeVal = item.orderNumber || "No Invoice";
          extraFields.fbrInvoiceNumber = item.fbrInvoiceNumber;
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
            (currentLevelNodes as any)._childMap = new Map<string, GrossSalesSummaryTreeNode>();
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

    const effectiveGrandTotals: GrossSalesSummaryTotals = !hasActiveFilters && reportData?.grandTotals
      ? {
          ...reportData.grandTotals,
          discountWostAmount: reportData.grandTotals.discountWostAmount !== undefined ? reportData.grandTotals.discountWostAmount : Math.round((reportData.grandTotals.discountAmount / 1.18) * 100) / 100,
          amountAfterDiscount: reportData.grandTotals.amountAfterDiscount !== undefined ? reportData.grandTotals.amountAfterDiscount : Math.max(0, Math.round((reportData.grandTotals.wostAmount - (reportData.grandTotals.discountWostAmount || reportData.grandTotals.discountAmount / 1.18)) * 100) / 100),
          valueExSalesTax: reportData.grandTotals.valueExSalesTax || reportData.grandTotals.amountAfterDiscount || Math.max(0, Math.round((reportData.grandTotals.wostAmount - (reportData.grandTotals.discountWostAmount || reportData.grandTotals.discountAmount / 1.18)) * 100) / 100),
          valueInclSalesTax: reportData.grandTotals.valueInclSalesTax || reportData.grandTotals.netAmount,
        }
      : calculatedGrandTotals;

    // Patch root nodes with backend computed values to avoid preview truncation discrepancies
    if (!hasActiveFilters && reportData) {
      if (isSeparate && reportData.locations && levels[0] === "location") {
        for (const locNode of root) {
          const backendLoc = reportData.locations.find((l: any) => l.locationName === locNode.value);
          if (backendLoc && backendLoc.totals) {
            locNode.totals = { ...backendLoc.totals };
            
            // Patch second level if it's brand or category
            if (levels[1] === "brand" && backendLoc.categories) {
              for (const brandNode of locNode.children) {
                const brandCats = backendLoc.categories.filter((c: any) => c.brandName === brandNode.value);
                if (brandCats.length > 0) {
                  const patchedTotals = createEmptyTotals();
                  for (const cat of brandCats) {
                    if (cat.totals) addTotals(patchedTotals, cat.totals);
                  }
                  brandNode.totals = patchedTotals;
                }
              }
            } else if (levels[1] === "category" && backendLoc.categories) {
              for (const catNode of locNode.children) {
                const backendCat = backendLoc.categories.find((c: any) => c.categoryName === catNode.value);
                if (backendCat && backendCat.totals) {
                  catNode.totals = { ...backendCat.totals };
                }
              }
            }
          }
        }
      } else if (!isSeparate && reportData.categories) {
        if (levels[0] === "brand") {
          for (const brandNode of root) {
            const brandCats = reportData.categories.filter((c: any) => c.brandName === brandNode.value);
            if (brandCats.length > 0) {
              const patchedTotals = createEmptyTotals();
              for (const cat of brandCats) {
                if (cat.totals) addTotals(patchedTotals, cat.totals);
              }
              brandNode.totals = patchedTotals;
            }
          }
        } else if (levels[0] === "category") {
          for (const catNode of root) {
            const backendCat = reportData.categories.find((c: any) => c.categoryName === catNode.value);
            if (backendCat && backendCat.totals) {
              catNode.totals = { ...backendCat.totals };
            }
          }
        }
      }
    }

    return { treeData: root, grandTotals: effectiveGrandTotals, filteredFlatItems: filtered };
  }, [rawItems, effectiveReportType, groupingLevels, effectiveSearchQuery, selectedLocationIds, selectedCashierId, subDateRange, hasActiveFilters, hasSubDateFilter, reportData?.grandTotals]);

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
