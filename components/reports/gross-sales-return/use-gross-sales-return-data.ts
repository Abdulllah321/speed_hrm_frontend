import { useMemo, useState, useCallback, useEffect } from "react";
import {
  GrossSalesReturnReportData,
  GrossSalesReturnTotals,
  GroupingLevels,
  GrossSalesReturnTableRow,
  GrossSalesReturnNode,
} from "./types";

const createEmptyTotals = (): GrossSalesReturnTotals => ({
  returnCount: 0,
  totalItems: 0,
  grossAmount: 0,
  wostAmount: 0,
  discountAmount: 0,
  netAmount: 0,
  taxAmount: 0,
  cashAmount: 0,
  cardAmount: 0,
  voucherAmount: 0,
});

export function useGrossSalesReturnData(reportData: GrossSalesReturnReportData | null) {
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    location: true,
    returnNote: true,
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
    if (reportData?.returns) {
      for (const ret of reportData.returns) {
        allNodeIds.add(`ret-${ret.id}`);
      }
    }
    setCollapsedNodes(allNodeIds);
  }, [reportData]);

  const grandTotals = useMemo<GrossSalesReturnTotals>(() => {
    if (!reportData) return createEmptyTotals();
    return reportData.grandTotals || createEmptyTotals();
  }, [reportData]);

  const flatRows = useMemo<GrossSalesReturnTableRow[]>(() => {
    const rows: GrossSalesReturnTableRow[] = [];
    if (!reportData) return rows;

    const q = searchQuery.toLowerCase().trim();

    const filterReturn = (ret: GrossSalesReturnNode) => {
      if (fbrOnlyFilter && (!ret.fbrInvoiceNumber || ret.fbrInvoiceNumber === "-")) return false;
      if (paymentModeFilter !== "all" && ret.paymentMethod !== paymentModeFilter.toUpperCase()) return false;

      if (!q) return true;

      const matchesReturnNo = ret.returnNumber.toLowerCase().includes(q);
      const matchesOrderNo = ret.orderNumber.toLowerCase().includes(q);
      const matchesCustomer = ret.customerName.toLowerCase().includes(q) || ret.customerPhone.includes(q);
      const matchesCashier = ret.cashierName.toLowerCase().includes(q);
      const matchesFbr = ret.fbrInvoiceNumber.toLowerCase().includes(q);
      const matchesItem = ret.items.some(
        (i) =>
          i.sku.toLowerCase().includes(q) ||
          i.barCode.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q) ||
          i.brandName.toLowerCase().includes(q),
      );

      return matchesReturnNo || matchesOrderNo || matchesCustomer || matchesCashier || matchesFbr || matchesItem;
    };

    const flattenReturns = (returnsList: GrossSalesReturnNode[], depthOffset: number, prefix: string) => {
      const filteredReturns = returnsList.filter(filterReturn);

      for (const ret of filteredReturns) {
        const retNodeId = `${prefix}-ret-${ret.id}`;
        const isRetCollapsed = collapsedNodes.has(retNodeId);
        const hasItems = ret.items.length > 0;

        if (groupingLevels.returnNote) {
          rows.push({
            type: "returnNote",
            id: retNodeId,
            nodeId: retNodeId,
            returnNumber: ret.returnNumber,
            orderNumber: ret.orderNumber,
            createdAt: ret.createdAt,
            customerName: ret.customerName,
            customerPhone: ret.customerPhone,
            cashierName: ret.cashierName,
            paymentMethod: ret.paymentMethod,
            fbrInvoiceNumber: ret.fbrInvoiceNumber,
            fbrStatus: ret.fbrStatus,
            totals: ret.totals,
            depth: depthOffset,
            hasChildren: hasItems,
            isExpanded: !isRetCollapsed,
          });
        }

        if (!isRetCollapsed && groupingLevels.item) {
          for (const line of ret.items) {
            rows.push({
              type: "item",
              id: `${prefix}-item-${line.id}`,
              nodeId: `${prefix}-item-${line.id}`,
              returnNumber: ret.returnNumber,
              orderNumber: ret.orderNumber,
              sku: line.sku,
              barCode: line.barCode,
              description: line.description,
              categoryName: line.categoryName,
              brandName: line.brandName,
              sizeName: line.sizeName,
              colorName: line.colorName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              taxAmount: line.taxAmount,
              subTotal: line.subTotal,
              totals: {
                returnCount: 0,
                totalItems: line.quantity,
                grossAmount: line.unitPrice * line.quantity,
                wostAmount: line.wostAmount || Math.round(((line.unitPrice * line.quantity) / 1.18) * 100) / 100,
                discountAmount: line.discountAmount,
                netAmount: line.subTotal,
                taxAmount: line.taxAmount,
                cashAmount: ret.paymentMethod.includes("CASH") ? line.subTotal : 0,
                cardAmount: ret.paymentMethod.includes("CARD") ? line.subTotal : 0,
                voucherAmount: ret.paymentMethod.includes("VOUCHER") ? line.subTotal : 0,
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
        const hasReturns = loc.returns.length > 0;

        if (groupingLevels.location) {
          rows.push({
            type: "location",
            id: locId,
            nodeId: locId,
            label: loc.locationName.toUpperCase(),
            totals: loc.totals,
            depth: 0,
            hasChildren: hasReturns,
            isExpanded: !isLocCollapsed,
          });
        }

        if (!isLocCollapsed && hasReturns) {
          flattenReturns(loc.returns, groupingLevels.location ? 1 : 0, loc.locationKey);
        }
      }
    } else if (reportData.returns) {
      flattenReturns(reportData.returns, 0, "merged");
    }

    return rows;
  }, [reportData, groupingLevels, collapsedNodes, searchQuery, paymentModeFilter, fbrOnlyFilter]);

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
