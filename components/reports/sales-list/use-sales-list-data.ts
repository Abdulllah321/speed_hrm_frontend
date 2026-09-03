import { useMemo, useState, useCallback, useEffect } from "react";
import {
  SalesListReportData,
  SalesListTotals,
  GroupingLevels,
  SalesListTableRow,
  SalesListInvoiceNode,
} from "./types";

const createEmptyTotals = (): SalesListTotals => ({
  orderCount: 0,
  totalItems: 0,
  grossAmount: 0,
  discountAmount: 0,
  netAmount: 0,
  taxAmount: 0,
  paidAmount: 0,
  cashAmount: 0,
  cardAmount: 0,
  walletAmount: 0,
  creditAmount: 0,
  cashSale: 0,
  cashReturn: 0,
  cardSale: 0,
  creditSale: 0,
  giftVoucherAmount: 0,
  creditVoucherAmount: 0,
  exchangeVoucherAmount: 0,
  claimVoucherAmount: 0,
  giftVoucherCorporate: 0,
  creditVoucherIssuedAmount: 0,
  rewardVoucherAmount: 0,
  onCreditAmount: 0,
});

export function useSalesListData(reportData: SalesListReportData | null) {
  const [reportType, setReportType] = useState<"merged" | "separate">("merged");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [fbrOnlyFilter, setFbrOnlyFilter] = useState(false);

  const [groupingLevels, setGroupingLevels] = useState<GroupingLevels>({
    location: true,
    invoice: true,
    item: true,
  });

  // Collapsed nodes state
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
    if (reportData?.invoices) {
      for (const inv of reportData.invoices) {
        allNodeIds.add(`inv-${inv.id}`);
      }
    }
    setCollapsedNodes(allNodeIds);
  }, [reportData]);

  // Grand Totals calculation
  const grandTotals = useMemo<SalesListTotals>(() => {
    if (!reportData) return createEmptyTotals();
    return reportData.grandTotals || createEmptyTotals();
  }, [reportData]);

  // Flatten hierarchy into table rows respecting collapse state & search
  const flatRows = useMemo<SalesListTableRow[]>(() => {
    const rows: SalesListTableRow[] = [];
    if (!reportData) return rows;

    const q = searchQuery.toLowerCase().trim();

    const filterInvoice = (inv: SalesListInvoiceNode) => {
      if (fbrOnlyFilter && (!inv.fbrInvoiceNumber || inv.fbrInvoiceNumber === "-")) return false;
      if (paymentModeFilter !== "all" && inv.paymentMethod !== paymentModeFilter.toUpperCase()) return false;

      if (!q) return true;

      const matchesOrderNo = inv.orderNumber.toLowerCase().includes(q);
      const matchesCustomer = inv.customerName.toLowerCase().includes(q) || inv.customerPhone.includes(q);
      const matchesCashier = inv.cashierName.toLowerCase().includes(q);
      const matchesFbr = inv.fbrInvoiceNumber.toLowerCase().includes(q);
      const matchesItem = inv.items.some(
        (i) =>
          i.sku.toLowerCase().includes(q) ||
          i.barCode.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );

      return matchesOrderNo || matchesCustomer || matchesCashier || matchesFbr || matchesItem;
    };

    const flattenInvoices = (invoicesList: SalesListInvoiceNode[], depthOffset: number, prefix: string) => {
      const filteredInvoices = invoicesList.filter(filterInvoice);

      for (const inv of filteredInvoices) {
        const invNodeId = `${prefix}-inv-${inv.id}`;
        const isInvCollapsed = collapsedNodes.has(invNodeId);
        const hasItems = inv.items.length > 0;

        if (groupingLevels.invoice) {
          rows.push({
            type: "invoice",
            id: invNodeId,
            nodeId: invNodeId,
            orderNumber: inv.orderNumber,
            createdAt: inv.createdAt,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            cashierName: inv.cashierName,
            paymentMethod: inv.paymentMethod,
            merchant: inv.merchant,
            fbrInvoiceNumber: inv.fbrInvoiceNumber,
            fbrStatus: inv.fbrStatus,
            totals: inv.totals,
            depth: depthOffset,
            hasChildren: hasItems,
            isExpanded: !isInvCollapsed,
          });
        }

        if (!isInvCollapsed && groupingLevels.item) {
          for (const line of inv.items) {
            rows.push({
              type: "item",
              id: `${prefix}-item-${line.id}`,
              nodeId: `${prefix}-item-${line.id}`,
              orderNumber: inv.orderNumber,
              sku: line.sku,
              barCode: line.barCode,
              description: line.description,
              sizeName: line.sizeName,
              colorName: line.colorName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              subTotal: line.subTotal,
              totals: {
                orderCount: 0,
                totalItems: line.quantity,
                grossAmount: line.unitPrice * line.quantity,
                discountAmount: line.discountAmount,
                netAmount: line.subTotal,
                taxAmount: 0,
                paidAmount: line.subTotal,
                cashAmount: inv.totals.cashAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashAmount : (inv.totals.cashSale > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashSale : 0),
                cardAmount: inv.totals.cardAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cardAmount : (inv.totals.cardSale > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cardSale : 0),
                walletAmount: inv.totals.walletAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.walletAmount : 0,
                creditAmount: inv.totals.creditAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditAmount : 0,
                cashSale: inv.totals.cashSale > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashSale : 0,
                cashReturn: inv.totals.cashReturn > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cashReturn : 0,
                cardSale: inv.totals.cardSale > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.cardSale : 0,
                creditSale: inv.totals.creditSale > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditSale : 0,
                giftVoucherAmount: inv.totals.giftVoucherAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.giftVoucherAmount : 0,
                creditVoucherAmount: inv.totals.creditVoucherAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditVoucherAmount : 0,
                exchangeVoucherAmount: inv.totals.exchangeVoucherAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.exchangeVoucherAmount : 0,
                claimVoucherAmount: inv.totals.claimVoucherAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.claimVoucherAmount : 0,
                giftVoucherCorporate: inv.totals.giftVoucherCorporate > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.giftVoucherCorporate : 0,
                creditVoucherIssuedAmount: inv.totals.creditVoucherIssuedAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.creditVoucherIssuedAmount : 0,
                rewardVoucherAmount: inv.totals.rewardVoucherAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.rewardVoucherAmount : 0,
                onCreditAmount: inv.totals.onCreditAmount > 0 && inv.totals.netAmount > 0 ? (line.subTotal / inv.totals.netAmount) * inv.totals.onCreditAmount : 0,
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
        const hasInvoices = loc.invoices.length > 0;

        if (groupingLevels.location) {
          rows.push({
            type: "location",
            id: locId,
            nodeId: locId,
            label: loc.locationName.toUpperCase(),
            totals: loc.totals,
            depth: 0,
            hasChildren: hasInvoices,
            isExpanded: !isLocCollapsed,
          });
        }

        if (!isLocCollapsed && hasInvoices) {
          flattenInvoices(loc.invoices, groupingLevels.location ? 1 : 0, loc.locationKey);
        }
      }
    } else if (reportData.invoices) {
      flattenInvoices(reportData.invoices, 0, "merged");
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
