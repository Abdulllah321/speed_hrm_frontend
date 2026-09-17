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
    grossAmount: 0,
    wostAmount: 0,
    discountAmount: 0,
    netAmount: 0,
    taxAmount: 0,
  };
}

function addTotals(target: GrossSalesSummaryTotals, source: GrossSalesSummaryTotals) {
  target.orderCount += source.orderCount;
  target.totalItems += source.totalItems;
  target.grossAmount += source.grossAmount;
  target.wostAmount += source.wostAmount;
  target.discountAmount += source.discountAmount;
  target.netAmount += source.netAmount;
  target.taxAmount += source.taxAmount;
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
    gender: true,
    silhouette: true,
    article: true,
    variant: true,
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

    // 2. Build level sequence
    const isSeparate = effectiveReportType === "separate";
    const levels: string[] = [];

    if (isSeparate && groupingLevels.location) levels.push("location");
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

    const root: GrossSalesSummaryTreeNode[] = [];

    for (const item of filtered) {
      if (item.quantity <= 0) continue;

      const grossAmt = item.quantity * item.unitPrice;
      const wostAmt = item.wostAmount || Math.round((grossAmt / 1.18) * 100) / 100;

      const itemTotals: GrossSalesSummaryTotals = {
        orderCount: 1,
        totalItems: item.quantity,
        grossAmount: grossAmt,
        wostAmount: wostAmt,
        discountAmount: item.discountAmount,
        netAmount: item.subTotal,
        taxAmount: item.taxAmount,
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

    const finalGrandTotals = (!hasActiveFilters && reportData?.grandTotals)
      ? reportData.grandTotals
      : calculatedGrandTotals;

    return { treeData: root, grandTotals: finalGrandTotals, filteredFlatItems: filtered };
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
