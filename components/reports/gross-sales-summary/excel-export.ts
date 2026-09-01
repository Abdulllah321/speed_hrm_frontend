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
      "Gender",
      "Silhouette",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Quantity",
      "Unit Price",
      "Gross Sales",
      "WOST Sales",
      "Discount Amount",
      "Taxes",
      "SubTotal Revenue",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const gross = item.quantity * item.unitPrice;
      const wost = item.wostAmount || Math.round((gross / 1.18) * 100) / 100;
      dataRows.push([
        item.locationName || "Main Outlet",
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
        item.quantity,
        item.unitPrice,
        gross,
        wost,
        item.discountAmount,
        item.taxAmount,
        item.subTotal,
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
      grandTotals.totalItems,
      "",
      grandTotals.grossAmount,
      grandTotals.wostAmount,
      grandTotals.discountAmount,
      grandTotals.taxAmount,
      grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
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
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
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
      "Gross Sales",
      "WOST Sales",
      "Discount Amount",
      "Taxes",
      "SubTotal Revenue",
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

        dataRows.push([
          displayLabel,
          node.barCode || node.sku || "-",
          node.size || "-",
          node.color || "-",
          node.totals.totalItems,
          node.totals.grossAmount,
          node.totals.wostAmount,
          node.totals.discountAmount,
          node.totals.taxAmount,
          node.totals.netAmount,
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
      grandTotals.grossAmount,
      grandTotals.wostAmount,
      grandTotals.discountAmount,
      grandTotals.taxAmount,
      grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 45 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Hierarchical Gross Sales");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
