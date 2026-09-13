import { useMemo, useState, useEffect } from "react";
import {
  NetSalesSummaryReportData,
  NetSalesSummaryTotals,
  GroupingLevels,
  NetSalesSummaryTreeNode,
  NetSalesSummaryFlatRecord,
} from "./types";

function createEmptyTotals(): NetSalesSummaryTotals {
  return {
    orderCount: 0,
    unitPrice: 0,
    totalItemsSold: 0,
    totalItemsReturned: 0,
    netItems: 0,
    retailSalesValue: 0,
    wostAmount: 0,
    discountAmount: 0,
    valueExSalesTax: 0,
    taxAmount: 0,
    valueInclSalesTax: 0,
    grossSalesAmount: 0,
    returnAmount: 0,
    netSalesAmount: 0,
  };
}

function addTotals(target: NetSalesSummaryTotals, source: NetSalesSummaryTotals) {
  target.orderCount += source.orderCount;
  target.totalItemsSold += source.totalItemsSold;
  target.totalItemsReturned += source.totalItemsReturned;
  target.netItems += source.netItems;
  target.retailSalesValue += source.retailSalesValue;
  target.wostAmount += source.wostAmount;
  target.discountAmount += source.discountAmount;
  target.valueExSalesTax += source.valueExSalesTax;
  target.taxAmount += source.taxAmount;
  target.valueInclSalesTax += source.valueInclSalesTax;

  // Legacy field aliases
  target.grossSalesAmount += source.grossSalesAmount;
  target.returnAmount += source.returnAmount;
  target.netSalesAmount += source.netSalesAmount;
}

export interface UseNetSalesSummaryDataOptions {
  reportType?: "merged" | "separate";
  selectedLocationIds?: string[];
  selectedCashierId?: string;
  subDateRange?: { from?: Date; to?: Date };
  searchQuery?: string;
}

export function useNetSalesSummaryData(
  reportData: NetSalesSummaryReportData | null,
  options?: UseNetSalesSummaryDataOptions,
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
    month: true,
    date: false,
    document: false,
    salesPerson: false,
    taxRate: false,
    brand: true,
    division: true,
    category: true,
    gender: true,
    silhouette: true,
    article: true,
    variant: true,
    location: true,
  });

  useEffect(() => {
    if (reportData?.reportType) {
      setInternalReportType(reportData.reportType);
    }
  }, [reportData?.reportType]);

  const rawItems = reportData?.flatItems || [];

  const { treeData, grandTotals, filteredFlatItems } = useMemo(() => {
    const q = effectiveSearchQuery.toLowerCase().trim();

    // Helper to format date string like "2026-07-15" into Month "July 2026"
    const getMonthLabel = (dateStr?: string, monthStr?: string): string => {
      if (monthStr && monthStr.trim()) return monthStr;
      if (!dateStr || !dateStr.trim()) return "Month Wise";
      try {
        const parts = dateStr.split("T")[0].split("-");
        if (parts.length >= 2) {
          const year = parts[0];
          const monthIdx = parseInt(parts[1], 10) - 1;
          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          if (monthIdx >= 0 && monthIdx < 12) {
            return `${months[monthIdx]} ${year}`;
          }
        }
      } catch {
        // fallback
      }
      return dateStr;
    };

    // 1. In-Memory Client Slicing across all filters (0ms, zero backend hits)
    const filtered = rawItems.filter((item) => {
      // Location filter
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
      if (subDateRange?.from && subDateRange?.to && item.createdAt) {
        const itemDate = new Date(item.createdAt).getTime();
        const fromTime = new Date(subDateRange.from).setHours(0, 0, 0, 0);
        const toTime = new Date(subDateRange.to).setHours(23, 59, 59, 999);
        if (itemDate < fromTime || itemDate > toTime) return false;
      }

      // Search keyword filter
      if (q) {
        const monthLbl = getMonthLabel(item.docDate, item.docMonth);
        const matchesQuery =
          item.locationName.toLowerCase().includes(q) ||
          (item.docNo && item.docNo.toLowerCase().includes(q)) ||
          (item.docDate && item.docDate.toLowerCase().includes(q)) ||
          monthLbl.toLowerCase().includes(q) ||
          (item.salesPerson && item.salesPerson.toLowerCase().includes(q)) ||
          (item.taxRateName && item.taxRateName.toLowerCase().includes(q)) ||
          (item.brandName && item.brandName.toLowerCase().includes(q)) ||
          (item.divisionName && item.divisionName.toLowerCase().includes(q)) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
          (item.genderName && item.genderName.toLowerCase().includes(q)) ||
          (item.silhouetteName && item.silhouetteName.toLowerCase().includes(q)) ||
          item.sku.toLowerCase().includes(q) ||
          item.barCode.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });

    // 2. Build level sequence
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
    if (groupingLevels.gender) levels.push("gender");
    if (groupingLevels.silhouette) levels.push("silhouette");
    if (groupingLevels.article) levels.push("article");
    if (groupingLevels.variant) levels.push("variant");

    if (levels.length === 0) {
      levels.push(isSeparate ? "location" : "brand");
    }

    const root: NetSalesSummaryTreeNode[] = [];

    for (const item of filtered) {
      if (item.soldQty === 0 && item.returnQty === 0 && item.netQty === 0) continue;

      const itemTotals: NetSalesSummaryTotals = {
        orderCount: 1,
        unitPrice: item.unitPrice || 0,
        totalItemsSold: item.soldQty,
        totalItemsReturned: item.returnQty,
        netItems: item.netQty,
        retailSalesValue: item.retailSalesValue || 0,
        wostAmount: item.wostAmount || 0,
        discountAmount: item.discountAmount,
        valueExSalesTax: item.valueExSalesTax || 0,
        taxAmount: item.taxAmount,
        valueInclSalesTax: item.valueInclSalesTax || 0,
        grossSalesAmount: item.grossAmount,
        returnAmount: item.returnAmount,
        netSalesAmount: item.netAmount,
      };

      let currentLevelNodes = root;

      for (let i = 0; i < levels.length; i++) {
        const levelName = levels[i];
        let nodeVal = "";
        let extraFields: Partial<NetSalesSummaryTreeNode> = {};

        if (levelName === "location") {
          nodeVal = item.locationName || "Main Outlet";
        } else if (levelName === "month") {
          nodeVal = getMonthLabel(item.docDate, item.docMonth);
        } else if (levelName === "date") {
          nodeVal = item.docDate ? item.docDate.split("T")[0] : "No Date";
        } else if (levelName === "document") {
          nodeVal = item.docNo || "General Transaction";
        } else if (levelName === "salesPerson") {
          nodeVal = item.salesPerson || "Default Cashier";
        } else if (levelName === "taxRate") {
          nodeVal = item.taxRateName || (item.taxRatePercent !== undefined ? `${item.taxRatePercent}% Tax` : "Standard Tax");
        } else if (levelName === "brand") {
          nodeVal = item.brandName || "Default Brand";
        } else if (levelName === "division") {
          nodeVal = item.divisionName || "Default Division";
        } else if (levelName === "category") {
          nodeVal = item.categoryName || "Default Category";
        } else if (levelName === "gender") {
          nodeVal = item.genderName || "Default Gender";
        } else if (levelName === "silhouette") {
          nodeVal = item.silhouetteName || "Default Silhouette";
        } else if (levelName === "article") {
          nodeVal = item.sku || item.description || "Article";
          extraFields.sku = item.sku;
          extraFields.articleName = item.description || "Article";
          extraFields.barCode = item.barCode;
        } else if (levelName === "variant") {
          nodeVal = item.barCode
            ? `[${item.barCode}] ${item.colorName || "Default"}-${item.sizeName || "Default"}`
            : `${item.colorName || "Default"}-${item.sizeName || "Default"}`;
          extraFields.color = item.colorName || "Default";
          extraFields.size = item.sizeName || "Default";
          extraFields.barCode = item.barCode;
          extraFields.sku = item.sku;
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
            (currentLevelNodes as any)._childMap = new Map<string, NetSalesSummaryTreeNode>();
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

    return { treeData: root, grandTotals: calculatedGrandTotals, filteredFlatItems: filtered };
  }, [rawItems, effectiveReportType, groupingLevels, effectiveSearchQuery, selectedLocationIds, selectedCashierId, subDateRange]);

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
