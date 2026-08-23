import { useMemo, useState, useCallback, useEffect } from "react";
import {
  NetSalesSummaryReportData,
  NetSalesSummaryTotals,
  GroupingLevels,
  NetSalesSummaryTableRow,
  NetSalesSummaryCategoryNode,
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

export function useNetSalesSummaryData(reportData: NetSalesSummaryReportData | null) {
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    location: true,
    category: true,
    item: true,
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
    const allNodeIds = new Set<string>();
    if (reportData?.locations) {
      for (const loc of reportData.locations) {
        allNodeIds.add(`loc-${loc.locationKey}`);
      }
    }
    if (reportData?.categories) {
      for (const cat of reportData.categories) {
        allNodeIds.add(`cat-${cat.categoryName}`);
      }
    }
    setCollapsedNodes(allNodeIds);
  }, [reportData]);

  const grandTotals = useMemo<NetSalesSummaryTotals>(() => {
    if (!reportData) return createEmptyTotals();
    return reportData.grandTotals || createEmptyTotals();
  }, [reportData]);

  const flatRows = useMemo<NetSalesSummaryTableRow[]>(() => {
    const rows: NetSalesSummaryTableRow[] = [];
    if (!reportData) return rows;

    const q = searchQuery.toLowerCase().trim();

    const filterCategory = (cat: NetSalesSummaryCategoryNode) => {
      if (!q) return true;
      const matchesCategory = cat.categoryName.toLowerCase().includes(q) || cat.brandName.toLowerCase().includes(q);
      const matchesItem = cat.items.some(
        (i) =>
          i.sku.toLowerCase().includes(q) ||
          i.barCode.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
      return matchesCategory || matchesItem;
    };

    const flattenCategories = (categoriesList: NetSalesSummaryCategoryNode[], depthOffset: number, prefix: string) => {
      const filteredCategories = categoriesList.filter(filterCategory);

      for (const cat of filteredCategories) {
        const catNodeId = `${prefix}-cat-${cat.categoryName}`;
        const isCatCollapsed = collapsedNodes.has(catNodeId);
        const hasItems = cat.items.length > 0;

        if (groupingLevels.category) {
          rows.push({
            type: "category",
            id: catNodeId,
            nodeId: catNodeId,
            label: cat.categoryName,
            categoryName: cat.categoryName,
            brandName: cat.brandName,
            totals: cat.totals,
            depth: depthOffset,
            hasChildren: hasItems,
            isExpanded: !isCatCollapsed,
          });
        }

        if (!isCatCollapsed && groupingLevels.item) {
          for (const line of cat.items) {
            rows.push({
              type: "item",
              id: `${prefix}-item-${line.id}`,
              nodeId: `${prefix}-item-${line.id}`,
              categoryName: cat.categoryName,
              brandName: line.brandName,
              sku: line.sku,
              barCode: line.barCode,
              description: line.description,
              sizeName: line.sizeName,
              colorName: line.colorName,
              soldQty: line.soldQty,
              returnQty: line.returnQty,
              netQty: line.netQty,
              grossAmount: line.grossAmount,
              returnAmount: line.returnAmount,
              discountAmount: line.discountAmount,
              taxAmount: line.taxAmount,
              netAmount: line.netAmount,
              totals: {
                orderCount: 1,
                totalItemsSold: line.soldQty,
                totalItemsReturned: line.returnQty,
                netItems: line.netQty,
                grossSalesAmount: line.grossAmount,
                returnAmount: line.returnAmount,
                discountAmount: line.discountAmount,
                taxAmount: line.taxAmount,
                netSalesAmount: line.netAmount,
              },
              depth: depthOffset + 1,
              hasChildren: false,
              isExpanded: false,
            });
          }
        }
      }
    };

    if (reportData.reportType === "separate" && reportData.locations && reportData.locations.length > 0) {
      for (const loc of reportData.locations) {
        const locId = `loc-${loc.locationKey}`;
        const isLocCollapsed = collapsedNodes.has(locId);
        const hasCategories = loc.categories.length > 0;

        if (groupingLevels.location) {
          rows.push({
            type: "location",
            id: locId,
            nodeId: locId,
            label: loc.locationName.toUpperCase(),
            totals: loc.totals,
            depth: 0,
            hasChildren: hasCategories,
            isExpanded: !isLocCollapsed,
          });
        }

        if (!isLocCollapsed && hasCategories) {
          flattenCategories(loc.categories, groupingLevels.location ? 1 : 0, loc.locationKey);
        }
      }
    } else if (reportData.categories) {
      flattenCategories(reportData.categories, 0, "merged");
    }

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
