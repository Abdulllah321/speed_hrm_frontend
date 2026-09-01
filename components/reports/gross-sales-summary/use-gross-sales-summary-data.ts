import { useMemo, useState, useEffect } from "react";
import {
  GrossSalesSummaryReportData,
  GrossSalesSummaryTotals,
  GroupingLevels,
  GrossSalesSummaryTreeNode,
} from "./types";

function createEmptyTotals(): GrossSalesSummaryTotals {
  return {
    orderCount: 0,
    totalItems: 0,
    grossAmount: 0,
    discountAmount: 0,
    netAmount: 0,
    taxAmount: 0,
  };
}

function addTotals(target: GrossSalesSummaryTotals, source: GrossSalesSummaryTotals) {
  target.orderCount += source.orderCount;
  target.totalItems += source.totalItems;
  target.grossAmount += source.grossAmount;
  target.discountAmount += source.discountAmount;
  target.netAmount += source.netAmount;
  target.taxAmount += source.taxAmount;
}

export function useGrossSalesSummaryData(reportData: GrossSalesSummaryReportData | null) {
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
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
      setReportType(reportData.reportType);
    }
  }, [reportData?.reportType]);

  const rawItems = reportData?.flatItems || [];

  const { treeData, grandTotals } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Filter flat items
    const filteredFlatItems = rawItems.filter((item) => {
      if (!q) return true;
      return (
        item.locationName.toLowerCase().includes(q) ||
        (item.brandName && item.brandName.toLowerCase().includes(q)) ||
        (item.divisionName && item.divisionName.toLowerCase().includes(q)) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
        (item.genderName && item.genderName.toLowerCase().includes(q)) ||
        (item.silhouetteName && item.silhouetteName.toLowerCase().includes(q)) ||
        item.sku.toLowerCase().includes(q) ||
        item.barCode.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });

    // 2. Build level sequence
    const isSeparate = reportType === "separate";
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

    for (const item of filteredFlatItems) {
      if (item.quantity <= 0) continue;

      const itemTotals: GrossSalesSummaryTotals = {
        orderCount: 1,
        totalItems: item.quantity,
        grossAmount: item.quantity * item.unitPrice,
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

        let existingNode = currentLevelNodes.find(
          (n) => n.level === levelName && n.value === nodeVal
        );

        if (!existingNode) {
          existingNode = {
            level: levelName,
            value: nodeVal,
            totals: createEmptyTotals(),
            ...extraFields,
            children: [],
          };
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

    return { treeData: root, grandTotals: calculatedGrandTotals };
  }, [rawItems, reportType, groupingLevels, searchQuery]);

  const handleToggleLevel = (level: keyof GroupingLevels, checked: boolean) => {
    setGroupingLevels((prev) => ({ ...prev, [level]: checked }));
  };

  return {
    reportType,
    setReportType,
    searchQuery,
    setSearchQuery,
    paymentModeFilter,
    setPaymentModeFilter,
    fbrOnlyFilter,
    setFbrOnlyFilter,
    groupingLevels,
    setGroupingLevels,
    handleToggleLevel,
    treeData,
    grandTotals,
  };
}
