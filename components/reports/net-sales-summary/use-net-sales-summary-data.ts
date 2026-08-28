import { useMemo, useState, useEffect } from "react";
import {
  NetSalesSummaryReportData,
  NetSalesSummaryTotals,
  GroupingLevels,
  NetSalesSummaryTreeNode,
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

export function useNetSalesSummaryData(reportData: NetSalesSummaryReportData | null) {
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

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
      setReportType(reportData.reportType);
    }
  }, [reportData?.reportType]);

  const rawItems = reportData?.flatItems || [];

  const { treeData, grandTotals } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

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

    // 1. Filter flat items
    const filteredFlatItems = rawItems.filter((item) => {
      if (!q) return true;
      const monthLbl = getMonthLabel(item.docDate, item.docMonth);
      return (
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
        item.description.toLowerCase().includes(q)
      );
    });

    // 2. Build level sequence
    const isSeparate = reportType === "separate";
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

    for (const item of filteredFlatItems) {
      const soldQty = item.soldQty || 0;
      const returnQty = item.returnQty || 0;
      const netQty = item.netQty !== undefined ? item.netQty : (soldQty - returnQty);

      let unitPrice = item.unitPrice || 0;
      if (unitPrice === 0 && soldQty > 0 && item.grossAmount > 0) {
        unitPrice = item.grossAmount / soldQty;
      }

      const taxPct = item.taxRatePercent || 18;
      const taxDivisor = 1 + taxPct / 100;
      const defaultWost = Math.round((unitPrice / taxDivisor) * netQty * 100) / 100;

      const retailSalesValue = item.retailSalesValue !== undefined ? item.retailSalesValue : (unitPrice * netQty);
      const wostAmount = item.wostAmount !== undefined ? item.wostAmount : defaultWost;
      const discountAmount = item.discountAmount || 0;
      const valueExSalesTax = item.valueExSalesTax !== undefined ? item.valueExSalesTax : Math.round((wostAmount - discountAmount) * 100) / 100;
      const taxAmount = item.taxAmount || 0;
      const valueInclSalesTax = item.valueInclSalesTax !== undefined ? item.valueInclSalesTax : Math.round((valueExSalesTax + taxAmount) * 100) / 100;

      const itemTotals: NetSalesSummaryTotals = {
        orderCount: 1,
        unitPrice,
        totalItemsSold: soldQty,
        totalItemsReturned: returnQty,
        netItems: netQty,
        retailSalesValue,
        wostAmount,
        discountAmount,
        valueExSalesTax,
        taxAmount,
        valueInclSalesTax,
        grossSalesAmount: item.grossAmount,
        returnAmount: item.returnAmount,
        netSalesAmount: valueInclSalesTax,
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
          nodeVal = item.docDate || "Date Wise";
        } else if (levelName === "document") {
          nodeVal = item.docNo ? `Doc #${item.docNo}` : "Document Wise";
        } else if (levelName === "salesPerson") {
          nodeVal = item.salesPerson || "Default Cashier";
        } else if (levelName === "taxRate") {
          if (item.taxRateName) {
            nodeVal = item.taxRateName;
          } else if (item.taxRatePercent !== undefined) {
            nodeVal = `${item.taxRatePercent}% Sales Tax Group`;
          } else {
            const calculatedPct = valueExSalesTax > 0 ? Math.round((taxAmount / valueExSalesTax) * 100) : 0;
            nodeVal = calculatedPct > 0 ? `${calculatedPct}% Sales Tax Group` : "0% Tax Exempt Group";
          }
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

        if (unitPrice > 0) {
          existingNode.totals.unitPrice = unitPrice;
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
