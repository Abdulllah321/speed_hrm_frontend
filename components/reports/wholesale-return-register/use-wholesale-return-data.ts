import { useState, useMemo } from "react";
import {
  WholesaleReturnRegisterData,
  WholesaleReturnFlatRecord,
  GroupingLevels,
  WholesaleReturnTreeNode,
  WholesaleReturnTotals,
} from "./types";
import { DateRange } from "react-day-picker";

interface UseWholesaleReturnDataProps {
  reportType: "merged" | "separate";
  selectedCustomerIds: string[];
  subDateRange?: DateRange;
  searchQuery?: string;
}

const emptyTotals = (): WholesaleReturnTotals => ({
  totalItems: 0,
  grossAmount: 0,
  wostAmount: 0,
  discountAmount: 0,
  taxAmount: 0,
  addTaxAmount: 0,
  taxPayable: 0,
  netAmount: 0,
});

export function useWholesaleReturnData(
  initialData: WholesaleReturnRegisterData | null,
  options: UseWholesaleReturnDataProps
) {
  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    month: false,
    date: false,
    document: false,
    salesPerson: false,
    taxRate: false,
    customer: true,
    Return: true,
    brand: false,
    division: false,
    category: true,
    gender: false,
    silhouette: false,
    product: true,
    variant: true,
  });

  const handleToggleLevel = (level: keyof GroupingLevels) => {
    setGroupingLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const filteredFlatItems = useMemo(() => {
    if (!initialData || !initialData.flatItems) return [];
    let items = initialData.flatItems;

    if (options.selectedCustomerIds && options.selectedCustomerIds.length > 0) {
      items = items.filter((item) => options.selectedCustomerIds.includes(item.customerId));
    }

    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.returnNumber && item.returnNumber.toLowerCase().includes(q)) ||
          (item.customerName && item.customerName.toLowerCase().includes(q)) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(q))
      );
    }

    return items;
  }, [initialData, options.selectedCustomerIds, options.searchQuery]);

  const { grandTotals, treeData } = useMemo(() => {
    const gt = emptyTotals();
    if (!filteredFlatItems.length) return { grandTotals: gt, treeData: [] };

    // Build level sequence
    const isSeparate = options.reportType === "separate";
    const levels: string[] = [];

    if (isSeparate && groupingLevels.customer) levels.push("customer");
    if (groupingLevels.month) levels.push("month");
    if (groupingLevels.date) levels.push("date");
    if (groupingLevels.Return || groupingLevels.document) levels.push("Return");
    if (groupingLevels.salesPerson) levels.push("salesPerson");
    if (groupingLevels.taxRate) levels.push("taxRate");
    if (groupingLevels.brand) levels.push("brand");
    if (groupingLevels.division) levels.push("division");
    if (groupingLevels.category) levels.push("category");
    if (groupingLevels.gender) levels.push("gender");
    if (groupingLevels.silhouette) levels.push("silhouette");
    if (groupingLevels.product) levels.push("product");
    if (groupingLevels.variant) levels.push("variant");

    if (levels.length === 0) {
      levels.push(isSeparate ? "customer" : "Return");
    }

    const tree: WholesaleReturnTreeNode[] = [];

    filteredFlatItems.forEach((item) => {
      // Aggregate Grand Totals
      const addTax = item.addTaxAmount || 0;
      const taxAmt = item.taxAmount || 0;
      const taxPay = item.taxPayable !== undefined ? item.taxPayable : taxAmt + addTax;

      gt.totalItems += item.quantity || 0;
      gt.grossAmount += (item.unitPrice || 0) * (item.quantity || 0);
      gt.wostAmount += item.wostAmount || 0;
      gt.discountAmount += item.discountAmount || 0;
      gt.taxAmount += taxAmt;
      gt.addTaxAmount += addTax;
      gt.taxPayable += taxPay;
      gt.netAmount += item.subTotal || 0;

      const itemTotals: WholesaleReturnTotals = {
        totalItems: item.quantity || 0,
        grossAmount: (item.unitPrice || 0) * (item.quantity || 0),
        wostAmount: item.wostAmount || 0,
        discountAmount: item.discountAmount || 0,
        taxAmount: taxAmt,
        addTaxAmount: addTax,
        taxPayable: taxPay,
        netAmount: item.subTotal || 0,
      };

      let currentLevelNodes = tree;

      for (let i = 0; i < levels.length; i++) {
        const levelName = levels[i];
        let nodeVal = "";
        let extraFields: Partial<WholesaleReturnTreeNode> = {};

        if (levelName === "customer") {
          nodeVal = item.customerName || "Unknown Customer";
          extraFields.customerId = item.customerId;
          extraFields.customerName = item.customerName;
        } else if (levelName === "month") {
          if (item.returnDate) {
            const d = new Date(item.returnDate);
            nodeVal = d.toLocaleString('default', { month: 'long', year: 'numeric' });
          } else {
            nodeVal = "Unknown Month";
          }
        } else if (levelName === "date") {
          if (item.returnDate) {
            nodeVal = new Date(item.returnDate).toLocaleDateString();
          } else {
            nodeVal = "Unknown Date";
          }
        } else if (levelName === "Return" || levelName === "document") {
          nodeVal = item.returnNumber || "Unknown Return";
          extraFields.returnNumber = item.returnNumber;
          extraFields.returnDate = item.returnDate;
        } else if (levelName === "salesPerson") {
          nodeVal = "N/A"; // Wholesale Return doesn't typically have a salesPerson directly
        } else if (levelName === "taxRate") {
          nodeVal = item.taxRate ? `${item.taxRate}%` : "0%";
        } else if (levelName === "brand") {
          nodeVal = item.brandName || "Default Brand";
          extraFields.brandName = item.brandName;
        } else if (levelName === "division") {
          nodeVal = item.divisionName || "Default Division";
        } else if (levelName === "category") {
          nodeVal = item.categoryName || "Default Category";
          extraFields.categoryName = item.categoryName;
        } else if (levelName === "gender") {
          nodeVal = item.genderName || "Default Gender";
        } else if (levelName === "silhouette") {
          nodeVal = item.silhouetteName || "Default Silhouette";
        } else if (levelName === "product") {
          nodeVal = item.sku ? `[${item.sku}] ${item.description || "Article"}` : item.description || "Article";
          extraFields.sku = item.sku;
          extraFields.description = item.description;
          extraFields.unitPrice = item.unitPrice;
        } else if (levelName === "variant") {
          nodeVal = `${item.colorName || "Default"}-${item.sizeName || "Default"}`;
          extraFields.color = item.colorName || "Default";
          extraFields.size = item.sizeName || "Default";
          extraFields.sku = item.sku;
        }

        let existingNode = (currentLevelNodes as any)._childMap?.get(nodeVal);

        if (!existingNode) {
          existingNode = {
            level: levelName === "document" ? "Return" : levelName,
            value: nodeVal,
            totals: emptyTotals(),
            ...extraFields,
            children: [],
          };
          if (!(currentLevelNodes as any)._childMap) {
            (currentLevelNodes as any)._childMap = new Map<string, WholesaleReturnTreeNode>();
          }
          (currentLevelNodes as any)._childMap.set(nodeVal, existingNode);
          currentLevelNodes.push(existingNode);
        }

        // Add to existing totals
        existingNode.totals.totalItems += itemTotals.totalItems;
        existingNode.totals.grossAmount += itemTotals.grossAmount;
        existingNode.totals.wostAmount += itemTotals.wostAmount;
        existingNode.totals.discountAmount += itemTotals.discountAmount;
        existingNode.totals.taxAmount += itemTotals.taxAmount;
        existingNode.totals.addTaxAmount += itemTotals.addTaxAmount;
        existingNode.totals.taxPayable += itemTotals.taxPayable;
        existingNode.totals.netAmount += itemTotals.netAmount;

        if (i < levels.length - 1) {
          currentLevelNodes = existingNode.children;
        }
      }
    });

    return { grandTotals: gt, treeData: tree };
  }, [filteredFlatItems, groupingLevels, options.reportType]);

  return {
    groupingLevels,
    handleToggleLevel,
    grandTotals,
    treeData,
  };
}
