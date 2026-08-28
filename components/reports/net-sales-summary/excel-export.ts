"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { NetSalesSummaryTreeNode, NetSalesSummaryFlatRecord, NetSalesSummaryTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateNetSalesSummaryExcel(opts: {
  exportType: "flat" | "hierarchical";
  treeData?: NetSalesSummaryTreeNode[];
  flatItems: NetSalesSummaryFlatRecord[];
  grandTotals: NetSalesSummaryTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    treeData = [],
    flatItems,
    grandTotals,
    dateRange,
    locationNames,
    onProgress,
  } = opts;

  onProgress?.(10);
  await yieldToMain();

  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `net-sales-summary-report-${dateStr}-${exportType}.xlsx`;

  const getMonthLabel = (dateStr?: string, monthStr?: string): string => {
    if (monthStr && monthStr.trim()) return monthStr;
    if (!dateStr || !dateStr.trim()) return "-";
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

  if (exportType === "flat") {
    const headers = [
      "Outlet / Location",
      "Month / Year",
      "Doc Date",
      "Doc Number",
      "Salesperson / Cashier",
      "Tax Group Rate",
      "Brand",
      "Division",
      "Category",
      "Gender",
      "Silhouette",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Unit Price",
      "Sold Qty",
      "Return Qty",
      "Net Qty",
      "Retail Sales Value",
      "WOST Amount",
      "Discount Amount",
      "Value Excl. Sales Tax",
      "Sales Tax Amount",
      "Value Incl. Sales Tax / Net Revenue",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const soldQty = item.soldQty || 0;
      const returnQty = item.returnQty || 0;
      const netQty = item.netQty !== undefined ? item.netQty : (soldQty - returnQty);
      const unitPrice = item.unitPrice || (soldQty > 0 ? item.grossAmount / soldQty : 0);
      const taxPct = item.taxRatePercent || 18;
      const taxDivisor = 1 + taxPct / 100;
      const defaultWost = Math.round((unitPrice / taxDivisor) * netQty * 100) / 100;

      const retailSalesVal = item.retailSalesValue !== undefined ? item.retailSalesValue : (unitPrice * netQty);
      const wostAmount = item.wostAmount !== undefined ? item.wostAmount : defaultWost;
      const discountAmount = item.discountAmount || 0;
      const valueExSalesTax = item.valueExSalesTax !== undefined ? item.valueExSalesTax : Math.round((wostAmount - discountAmount) * 100) / 100;
      const taxAmount = item.taxAmount || 0;
      const valueInclSalesTax = item.valueInclSalesTax !== undefined ? item.valueInclSalesTax : Math.round((valueExSalesTax + taxAmount) * 100) / 100;

      dataRows.push([
        item.locationName || "Main Outlet",
        getMonthLabel(item.docDate, item.docMonth),
        item.docDate || "-",
        item.docNo || "-",
        item.salesPerson || "-",
        item.taxRateName || (item.taxRatePercent ? `${item.taxRatePercent}%` : "-"),
        item.brandName || "-",
        item.divisionName || "-",
        item.categoryName || "-",
        item.genderName || "-",
        item.silhouetteName || "-",
        item.sku || "-",
        item.barCode || "-",
        item.description || "-",
        item.sizeName || "-",
        item.colorName || "-",
        unitPrice,
        soldQty,
        returnQty,
        netQty,
        retailSalesVal,
        wostAmount,
        discountAmount,
        valueExSalesTax,
        taxAmount,
        valueInclSalesTax,
      ]);

      if (i % 300 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 70) + 10);
        await yieldToMain();
      }
    }

    dataRows.push([
      "GRAND TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "-",
      grandTotals.totalItemsSold,
      grandTotals.totalItemsReturned,
      grandTotals.netItems,
      grandTotals.retailSalesValue,
      grandTotals.wostAmount,
      grandTotals.discountAmount,
      grandTotals.valueExSalesTax,
      grandTotals.taxAmount,
      grandTotals.valueInclSalesTax,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Flat Net Sales Items");
  } else {
    // Hierarchical Tree Excel Export
    const headers = [
      "Product Hierarchy / Description",
      "SKU / Barcode",
      "Size",
      "Color",
      "Unit Price",
      "Sold Qty",
      "Return Qty",
      "Net Qty",
      "Retail Sales Value",
      "WOST Amount",
      "Discount Amount",
      "Value Excl. Sales Tax",
      "Sales Tax Amount",
      "Value Incl. Sales Tax / Net Revenue",
    ];

    const dataRows: any[][] = [headers];

    function traverseTree(nodes: NetSalesSummaryTreeNode[], depth: number = 0) {
      for (const node of nodes) {
        const indent = "  ".repeat(depth);
        let displayLabel = `${indent}${node.value}`;
        if (node.sku && node.articleName) {
          displayLabel = `${indent}[${node.sku}] ${node.articleName}`;
        } else if (node.level === "variant" && node.barCode) {
          displayLabel = `${indent}[${node.barCode}] ${node.color || "Default"}-${node.size || "Default"}`;
        }

        const unitPrice = node.totals.unitPrice || node.unitPrice || 0;
        const retailSalesVal = node.totals.retailSalesValue !== undefined ? node.totals.retailSalesValue : (unitPrice * node.totals.netItems);

        dataRows.push([
          displayLabel,
          node.barCode || node.sku || "-",
          node.size || "-",
          node.color || "-",
          unitPrice > 0 ? unitPrice : "-",
          node.totals.totalItemsSold,
          node.totals.totalItemsReturned,
          node.totals.netItems,
          retailSalesVal,
          node.totals.wostAmount,
          node.totals.discountAmount,
          node.totals.valueExSalesTax,
          node.totals.taxAmount,
          node.totals.valueInclSalesTax,
        ]);

        if (node.children && node.children.length > 0) {
          traverseTree(node.children, depth + 1);
        }
      }
    }

    traverseTree(treeData, 0);

    dataRows.push([
      "GRAND TOTAL",
      "-",
      "-",
      "-",
      "-",
      grandTotals.totalItemsSold,
      grandTotals.totalItemsReturned,
      grandTotals.netItems,
      grandTotals.retailSalesValue,
      grandTotals.wostAmount,
      grandTotals.discountAmount,
      grandTotals.valueExSalesTax,
      grandTotals.taxAmount,
      grandTotals.valueInclSalesTax,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 45 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Hierarchical Net Sales");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
