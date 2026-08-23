import { useMemo, useState, useCallback, useEffect } from "react";
import {
  NetSalesSummaryReportData,
  NetSalesSummaryTotals,
  GroupingLevels,
  NetSalesSummaryTableRow,
} from "./types";

const createEmptyTotals = (): NetSalesSummaryTotals => ({
  orderCount: 0,
  totalItemsSold: 0,
  totalItemsReturned: 0,
  netItems: 0,
  grossSalesAmount: 0,
  returnAmount: 0,
  discountAmount: 0,
  taxAmount: 0,
  netSalesAmount: 0,
});

const addTotals = (target: NetSalesSummaryTotals, source: NetSalesSummaryTotals) => {
  target.orderCount += source.orderCount;
  target.totalItemsSold += source.totalItemsSold;
  target.totalItemsReturned += source.totalItemsReturned;
  target.netItems += source.netItems;
  target.grossSalesAmount += source.grossSalesAmount;
  target.returnAmount += source.returnAmount;
  target.discountAmount += source.discountAmount;
  target.taxAmount += source.taxAmount;
  target.netSalesAmount += source.netSalesAmount;
};

export function useNetSalesSummaryData(reportData: NetSalesSummaryReportData | null) {
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

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (reportData?.reportType) {
      setReportType(reportData.reportType);
    }
  }, [reportData?.reportType]);

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

  const collapseAll = useCallback(() => {
    setCollapsedNodes(new Set(["root"]));
  }, []);

  const grandTotals = useMemo<NetSalesSummaryTotals>(() => {
    if (!reportData) return createEmptyTotals();
    return reportData.grandTotals || createEmptyTotals();
  }, [reportData]);

  const flatRows = useMemo<NetSalesSummaryTableRow[]>(() => {
    const rows: NetSalesSummaryTableRow[] = [];
    if (!reportData || !reportData.flatItems) return rows;

    const q = searchQuery.toLowerCase().trim();

    // 1. Filter flat items
    const filteredFlatItems = reportData.flatItems.filter((item) => {
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

    // 2. Build level sequence matching available-stock-summary
    const isSeparate = reportData.reportType === "separate";
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

    interface InternalTreeNode {
      level: string;
      value: string;
      sku?: string;
      barCode?: string;
      description?: string;
      sizeName?: string;
      colorName?: string;
      brandName?: string;
      categoryName?: string;
      divisionName?: string;
      genderName?: string;
      silhouetteName?: string;
      totals: NetSalesSummaryTotals;
      childrenMap: Map<string, InternalTreeNode>;
    }

    const rootMap = new Map<string, InternalTreeNode>();

    for (const item of filteredFlatItems) {
      const itemTotals: NetSalesSummaryTotals = {
        orderCount: 1,
        totalItemsSold: item.soldQty,
        totalItemsReturned: item.returnQty,
        netItems: item.netQty,
        grossSalesAmount: item.grossAmount,
        returnAmount: item.returnAmount,
        discountAmount: item.discountAmount,
        taxAmount: item.taxAmount,
        netSalesAmount: item.netAmount,
      };

      let currentMap = rootMap;

      for (let i = 0; i < levels.length; i++) {
        const levelName = levels[i];
        let val = "";

        if (levelName === "location") val = item.locationName;
        else if (levelName === "brand") val = item.brandName || "Default Brand";
        else if (levelName === "division") val = item.divisionName || "Default Division";
        else if (levelName === "category") val = item.categoryName || "Default Category";
        else if (levelName === "gender") val = item.genderName || "Default Gender";
        else if (levelName === "silhouette") val = item.silhouetteName || "Default Silhouette";
        else if (levelName === "article") val = item.sku || item.barCode || "Article";
        else if (levelName === "variant") val = `${item.colorName || "Default"}-${item.sizeName || "Default"}`;

        let existing = currentMap.get(val);
        if (!existing) {
          existing = {
            level: levelName,
            value: val,
            sku: item.sku,
            barCode: item.barCode,
            description: item.description,
            sizeName: item.sizeName,
            colorName: item.colorName,
            brandName: item.brandName,
            categoryName: item.categoryName,
            divisionName: item.divisionName,
            genderName: item.genderName,
            silhouetteName: item.silhouetteName,
            totals: createEmptyTotals(),
            childrenMap: new Map(),
          };
          currentMap.set(val, existing);
        }

        addTotals(existing.totals, itemTotals);
        currentMap = existing.childrenMap;
      }
    }

    // Recursively flatten tree into TableRows
    function flattenTree(map: Map<string, InternalTreeNode>, depth: number, parentKey: string) {
      for (const [key, node] of map.entries()) {
        const nodeId = `${parentKey}_${node.level}_${key}`;
        const hasChildren = node.childrenMap.size > 0;
        const isExpanded = !collapsedNodes.has(nodeId);

        rows.push({
          id: nodeId,
          nodeId,
          type: node.level as any,
          label: node.value,
          categoryName: node.categoryName,
          brandName: node.brandName,
          divisionName: node.divisionName,
          genderName: node.genderName,
          silhouetteName: node.silhouetteName,
          sku: node.sku,
          barCode: node.barCode,
          description: node.description,
          sizeName: node.sizeName,
          colorName: node.colorName,
          soldQty: node.totals.totalItemsSold,
          returnQty: node.totals.totalItemsReturned,
          netQty: node.totals.netItems,
          grossAmount: node.totals.grossSalesAmount,
          returnAmount: node.totals.returnAmount,
          discountAmount: node.totals.discountAmount,
          taxAmount: node.totals.taxAmount,
          netAmount: node.totals.netSalesAmount,
          totals: node.totals,
          depth,
          hasChildren,
          isExpanded,
        });

        if (hasChildren && isExpanded) {
          flattenTree(node.childrenMap, depth + 1, nodeId);
        }
      }
    }

    flattenTree(rootMap, 0, "root");
    return rows;
  }, [reportData, groupingLevels, collapsedNodes, searchQuery]);

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
    grandTotals,
    flatRows,
    toggleNode,
    expandAll,
    collapseAll,
  };
}
