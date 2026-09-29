"use client";

import { useMemo, useState, useCallback } from "react";
import {
  NetSalesListReportData,
  NetSalesListFilterState,
  NetSalesListTableRow,
  NetSalesListTotals,
  NetSalesListDocumentNode,
  NetSalesListLocationNode,
} from "./types";

export function useNetSalesListData(
  data: NetSalesListReportData | null,
  filters: NetSalesListFilterState
) {
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  // Filter locations and documents based on client-side search & doc type
  const filteredData = useMemo(() => {
    if (!data) return { locations: [], grandTotals: null, allDocuments: [] };

    const searchLower = (filters.search || "").trim().toLowerCase();
    const docTypeFilter = filters.docTypeFilter;

    const filteredLocations: NetSalesListLocationNode[] = [];
    const allFilteredDocs: NetSalesListDocumentNode[] = [];

    // Grand totals accumulators
    const totals: NetSalesListTotals = {
      totalDocuments: 0,
      salesOrderCount: 0,
      returnCount: 0,
      totalItemsSold: 0,
      totalItemsReturned: 0,
      netItems: 0,
      grossSalesAmount: 0,
      grossReturnAmount: 0,
      netGrossAmount: 0,
      wostSalesAmount: 0,
      wostReturnAmount: 0,
      netWostAmount: 0,
      discountSalesAmount: 0,
      discountReturnAmount: 0,
      netDiscountAmount: 0,
      discountWostSalesAmount: 0,
      discountWostReturnAmount: 0,
      netDiscountWostAmount: 0,
      amountAfterDiscount: 0,
      taxSalesAmount: 0,
      taxReturnAmount: 0,
      netTaxAmount: 0,
      netSalesAmount: 0,
      netReturnAmount: 0,
      totalNetAmount: 0,
      cashSale: 0,
      cashRefund: 0,
      netCash: 0,
      cardSale: 0,
      cardRefund: 0,
      netCard: 0,
      creditSale: 0,
      giftVoucherAmount: 0,
      giftVoucherCorporate: 0,
      exchangeVoucherRedeemed: 0,
      exchangeVoucherIssued: 0,
      netExchangeVoucher: 0,
      creditVoucherRedeemed: 0,
      creditVoucherIssued: 0,
      netCreditVoucher: 0,
      claimVoucherRedeemed: 0,
      claimVoucherIssued: 0,
      netClaimVoucher: 0,
      rewardVoucherAmount: 0,
    };

    // If data.locations is populated, iterate them; otherwise treat as one merged location
    const sourceLocations =
      data.locations && data.locations.length > 0
        ? data.locations
        : [
            {
              locationKey: "ALL",
              locationName: data.locationNames || "All Stores",
              documents: data.documents || [],
              totals: data.grandTotals,
            },
          ];

    for (const loc of sourceLocations) {
      if (
        filters.locationId &&
        filters.locationId !== "all" &&
        loc.locationId &&
        loc.locationId !== filters.locationId
      ) {
        continue;
      }

      const matchingDocs: NetSalesListDocumentNode[] = [];

      for (const doc of loc.documents) {
        // Doc type filter
        if (docTypeFilter === "SALES_ONLY" && doc.docType !== "SALE") continue;
        if (docTypeFilter === "RETURNS_ONLY" && doc.docType !== "RETURN") continue;

        // Search text filter
        if (searchLower) {
          const matchDoc =
            doc.docNumber.toLowerCase().includes(searchLower) ||
            (doc.refDocNumber && doc.refDocNumber.toLowerCase().includes(searchLower)) ||
            (doc.customerName && doc.customerName.toLowerCase().includes(searchLower)) ||
            (doc.customerPhone && doc.customerPhone.toLowerCase().includes(searchLower)) ||
            (doc.customerCnic && doc.customerCnic.toLowerCase().includes(searchLower)) ||
            (doc.cashierName && doc.cashierName.toLowerCase().includes(searchLower)) ||
            (doc.fbrInvoiceNumber && doc.fbrInvoiceNumber.toLowerCase().includes(searchLower)) ||
            doc.items.some(
              (it) =>
                it.sku.toLowerCase().includes(searchLower) ||
                it.barCode.toLowerCase().includes(searchLower) ||
                it.description.toLowerCase().includes(searchLower)
            );

          if (!matchDoc) continue;
        }

        matchingDocs.push(doc);
        allFilteredDocs.push(doc);

        // Accumulate into totals
        totals.totalDocuments += 1;
        const dt = doc.totals;

        if (doc.docType === "SALE") {
          totals.salesOrderCount += 1;
          totals.totalItemsSold += dt.totalItems;
          totals.grossSalesAmount += dt.grossAmount;
          totals.wostSalesAmount += dt.wostAmount;
          totals.discountSalesAmount += dt.discountAmount;
          totals.discountWostSalesAmount += dt.discountWostAmount;
          totals.taxSalesAmount += dt.taxAmount;
          totals.netSalesAmount += dt.netAmount;

          totals.cashSale += dt.cashAmount || 0;
          totals.cardSale += dt.cardAmount || 0;
          totals.creditSale += dt.creditSaleAmount || 0;
          totals.giftVoucherAmount += dt.giftVoucherAmount || 0;
          totals.giftVoucherCorporate += dt.corporateVoucherAmount || 0;
          totals.exchangeVoucherRedeemed += dt.exchangeVoucherAmount || 0;
          totals.creditVoucherRedeemed += dt.creditVoucherAmount || 0;
          totals.claimVoucherRedeemed += dt.claimVoucherAmount || 0;
          totals.rewardVoucherAmount += dt.rewardVoucherAmount || 0;
        } else {
          // RETURN (Note: dt values on returns are absolute positive values for aggregation)
          totals.returnCount += 1;
          const retQty = Math.abs(dt.totalItems);
          const retGross = Math.abs(dt.grossAmount);
          const retWost = Math.abs(dt.wostAmount);
          const retDisc = Math.abs(dt.discountAmount);
          const retDiscWost = Math.abs(dt.discountWostAmount);
          const retTax = Math.abs(dt.taxAmount);
          const retNet = Math.abs(dt.netAmount);

          totals.totalItemsReturned += retQty;
          totals.grossReturnAmount += retGross;
          totals.wostReturnAmount += retWost;
          totals.discountReturnAmount += retDisc;
          totals.discountWostReturnAmount += retDiscWost;
          totals.taxReturnAmount += retTax;
          totals.netReturnAmount += retNet;

          totals.cashRefund += Math.abs(dt.cashAmount || 0);
          totals.cardRefund += Math.abs(dt.cardAmount || 0);
          totals.exchangeVoucherIssued += Math.abs(dt.exchangeVoucherAmount || 0);
          totals.creditVoucherIssued += Math.abs(dt.creditVoucherAmount || 0);
          totals.claimVoucherIssued += Math.abs(dt.claimVoucherAmount || 0);
        }
      }

      if (matchingDocs.length > 0) {
        filteredLocations.push({
          ...loc,
          documents: matchingDocs,
        });
      }
    }

    // Compute Net derived totals
    totals.netItems = totals.totalItemsSold - totals.totalItemsReturned;
    totals.netGrossAmount = totals.grossSalesAmount - totals.grossReturnAmount;
    totals.netWostAmount = totals.wostSalesAmount - totals.wostReturnAmount;
    totals.netDiscountAmount = totals.discountSalesAmount - totals.discountReturnAmount;
    totals.netDiscountWostAmount = totals.discountWostSalesAmount - totals.discountWostReturnAmount;
    totals.amountAfterDiscount = Math.max(0, totals.netWostAmount - totals.netDiscountWostAmount);
    totals.netTaxAmount = totals.taxSalesAmount - totals.taxReturnAmount;
    totals.totalNetAmount = totals.netSalesAmount - totals.netReturnAmount;
    totals.netCash = totals.cashSale - totals.cashRefund;
    totals.netCard = totals.cardSale - totals.cardRefund;
    totals.netExchangeVoucher = totals.exchangeVoucherRedeemed - totals.exchangeVoucherIssued;
    totals.netCreditVoucher = totals.creditVoucherRedeemed - totals.creditVoucherIssued;
    totals.netClaimVoucher = totals.claimVoucherRedeemed - totals.claimVoucherIssued;

    return {
      locations: filteredLocations,
      grandTotals: totals,
      allDocuments: allFilteredDocs,
    };
  }, [data, filters]);

  // Flatten rows for virtualization
  const rows: NetSalesListTableRow[] = useMemo(() => {
    const r: NetSalesListTableRow[] = [];
    const isMultiLocation = filteredData.locations.length > 1;

    for (const loc of filteredData.locations) {
      const locKey = loc.locationKey || loc.locationName;
      const isLocExpanded = !isMultiLocation || expandedLocations.has(locKey);

      if (isMultiLocation) {
        r.push({
          type: "location-header",
          id: `loc-${locKey}`,
          locationKey: locKey,
          locationName: loc.locationName,
          totals: loc.totals || filteredData.grandTotals,
          isExpanded: isLocExpanded,
        });
      }

      if (isLocExpanded) {
        for (const doc of loc.documents) {
          const isDocExpanded = expandedDocs.has(doc.id);
          r.push({
            type: "document-header",
            id: `doc-${doc.id}`,
            locationKey: locKey,
            document: doc,
            isExpanded: isDocExpanded,
          });

          if (isDocExpanded && doc.items) {
            for (const it of doc.items) {
              r.push({
                type: "line-item",
                id: `item-${it.id}`,
                documentId: doc.id,
                docType: doc.docType,
                docNumber: doc.docNumber,
                item: it,
              });
            }
          }
        }
      }
    }

    return r;
  }, [filteredData, expandedLocations, expandedDocs]);

  // Toggle handlers
  const toggleLocation = useCallback((locationKey: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationKey)) next.delete(locationKey);
      else next.add(locationKey);
      return next;
    });
  }, []);

  const toggleDoc = useCallback((docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!filteredData.locations) return;
    const allLocs = new Set<string>();
    const allDocs = new Set<string>();
    for (const l of filteredData.locations) {
      allLocs.add(l.locationKey || l.locationName);
      for (const d of l.documents) {
        allDocs.add(d.id);
      }
    }
    setExpandedLocations(allLocs);
    setExpandedDocs(allDocs);
  }, [filteredData]);

  const collapseAll = useCallback(() => {
    setExpandedLocations(new Set());
    setExpandedDocs(new Set());
  }, []);

  return {
    rows,
    grandTotals: filteredData.grandTotals,
    filteredLocations: filteredData.locations,
    allDocuments: filteredData.allDocuments,
    toggleLocation,
    toggleDoc,
    expandAll,
    collapseAll,
  };
}
