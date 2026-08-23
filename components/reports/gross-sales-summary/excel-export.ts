"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { GrossSalesSummaryCategoryNode, GrossSalesSummaryFlatRecord, GrossSalesSummaryTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateGrossSalesSummaryExcel(opts: {
  exportType: "flat" | "hierarchical";
  categories: GrossSalesSummaryCategoryNode[];
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    categories,
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
      "Category",
      "Brand",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Quantity",
      "Unit Price",
      "Discount",
      "SubTotal",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      dataRows.push([
        item.locationName,
        item.categoryName,
        item.brandName,
        item.sku,
        item.barCode,
        item.description,
        item.sizeName,
        item.colorName,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.subTotal,
      ]);

      if (i % 500 === 0) {
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
      grandTotals.totalItems,
      "",
      grandTotals.discountAmount,
      grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Gross Line Items");
  } else {
    const headers = [
      "Category Name",
      "Brand",
      "Items Count",
      "Gross Amount",
      "Discount Amount",
      "Taxes",
      "Net Sales Amount",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = categories.length;
    for (let i = 0; i < totalCount; i++) {
      const cat = categories[i];
      const t = cat.totals;
      dataRows.push([
        cat.categoryName,
        cat.brandName,
        t.totalItems,
        t.grossAmount,
        t.discountAmount,
        t.taxAmount,
        t.netAmount,
      ]);

      if (i % 300 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 70) + 10);
        await yieldToMain();
      }
    }

    dataRows.push([
      "GRAND TOTAL",
      "",
      grandTotals.totalItems,
      grandTotals.grossAmount,
      grandTotals.discountAmount,
      grandTotals.taxAmount,
      grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Category Summary Matrix");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
