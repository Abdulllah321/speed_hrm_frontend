"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { GrossSalesSummaryTreeNode, GrossSalesSummaryFlatRecord, GrossSalesSummaryTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateGrossSalesSummaryExcel(opts: {
  exportType: "flat" | "hierarchical";
  treeData?: GrossSalesSummaryTreeNode[];
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
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
  const fileName = `gross-sales-summary-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const headers = [
      "Outlet / Location",
      "Brand",
      "Division",
      "Category",
      "Silhouette",
      "Gender",
      "Order Number",
      "FBR Invoice",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Quantity",
      "Unit Price",
      "Price WOST",
      "Total Price WOST",
      "Discount Amount",
      "Value Excl. Sales Tax",
      "Sales Tax",
      "Value Incl. Sales Tax / Total Revenue",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const qty = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const priceWost = unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0;
      const totalWost = item.wostAmount || Math.round((qty * priceWost) * 100) / 100;
      const discAmt = item.discountAmount || 0;
      const valExTax = Math.round((totalWost - discAmt) * 100) / 100;
      const taxAmt = item.taxAmount || 0;
      const valInclTax = item.subTotal || Math.round((valExTax + taxAmt) * 100) / 100;

      dataRows.push([
        item.locationName || "Main Outlet",
        item.brandName || "-",
        item.divisionName || "-",
        item.categoryName || "-",
        item.silhouetteName || "-",
        item.genderName || "-",
        item.orderNumber || "-",
        item.fbrInvoiceNumber || "-",
        item.sku || "-",
        item.barCode || "-",
        item.description || "-",
        item.sizeName || "-",
        item.colorName || "-",
        qty,
        unitPrice,
        priceWost,
        totalWost,
        discAmt,
        valExTax,
        taxAmt,
        valInclTax,
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
      grandTotals.totalItems,
      "",
      "",
      grandTotals.wostAmount,
      grandTotals.discountAmount,
      grandTotals.valueExSalesTax || (grandTotals.wostAmount - grandTotals.discountAmount),
      grandTotals.taxAmount,
      grandTotals.valueInclSalesTax || grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Flat Gross Sales Items");
  } else {
    // Hierarchical Tree Excel Export
    const headers = [
      "Product Hierarchy / Description",
      "SKU / Barcode",
      "Size",
      "Color",
      "Sold Qty",
      "Unit Price",
      "Price WOST",
      "Total Price WOST",
      "Discount Amount",
      "Value Excl. Sales Tax",
      "Sales Tax",
      "Value Incl. Sales Tax / Total Revenue",
    ];

    const dataRows: any[][] = [headers];

    function traverseTree(nodes: GrossSalesSummaryTreeNode[], depth: number = 0) {
      for (const node of nodes) {
        const indent = "  ".repeat(depth);
        let displayLabel = `${indent}${node.value}`;
        if (node.sku && node.articleName) {
          displayLabel = `${indent}[${node.sku}] ${node.articleName}`;
        } else if (node.level === "variant" && node.barCode) {
          displayLabel = `${indent}[${node.barCode}] ${node.color || "Default"}-${node.size || "Default"}`;
        }

        const uPrice = node.totals.unitPrice || node.unitPrice || 0;
        const pWost = node.totals.priceWost || (uPrice > 0 ? Math.round((uPrice / 1.18) * 100) / 100 : 0);
        const totWost = node.totals.wostAmount;
        const disc = node.totals.discountAmount;
        const valEx = node.totals.valueExSalesTax || Math.round((totWost - disc) * 100) / 100;
        const tax = node.totals.taxAmount;
        const valIncl = node.totals.valueInclSalesTax || node.totals.netAmount || Math.round((valEx + tax) * 100) / 100;

        dataRows.push([
          displayLabel,
          node.barCode || node.sku || "-",
          node.size || "-",
          node.color || "-",
          node.totals.totalItems,
          uPrice > 0 ? uPrice : "",
          pWost > 0 ? pWost : "",
          totWost,
          disc,
          valEx,
          tax,
          valIncl,
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
      grandTotals.totalItems,
      "",
      "",
      grandTotals.wostAmount,
      grandTotals.discountAmount,
      grandTotals.valueExSalesTax || (grandTotals.wostAmount - grandTotals.discountAmount),
      grandTotals.taxAmount,
      grandTotals.valueInclSalesTax || grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 45 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Hierarchical Gross Sales");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = "";

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
