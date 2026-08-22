"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { CostOfSalesBrandNode, CostOfSalesFlatRecord, CostOfSalesTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateCostOfSalesExcel(opts: {
  exportType: "flat" | "hierarchical";
  brands: CostOfSalesBrandNode[];
  flatItems: CostOfSalesFlatRecord[];
  grandTotals: CostOfSalesTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    brands,
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
  const fileName = `cost-of-sales-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const headers = [
      "Brand",
      "Division",
      "Category",
      "Gender",
      "Silhouette",
      "SKU",
      "Article Name",
      "Color",
      "Size",
      "Barcode",
      "Outlet / Store",
      "Sold Qty",
      "Unit Cost (Rs.)",
      "Total Cost (COGS)",
      "Unit Price (Rs.)",
      "Total Revenue",
      "Gross Profit",
      "Margin %",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      dataRows.push([
        item.brand,
        item.division,
        item.category,
        item.gender,
        item.silhouette,
        item.sku,
        item.articleName,
        item.color,
        item.size,
        item.barCode,
        item.locationName,
        item.quantity,
        item.unitCost,
        item.totalCost,
        item.unitPrice,
        item.totalRevenue,
        item.grossProfit,
        `${item.profitMargin}%`,
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
      "",
      "",
      "",
      grandTotals.quantity,
      grandTotals.avgUnitCost,
      grandTotals.totalCost,
      "",
      grandTotals.totalRevenue,
      grandTotals.grossProfit,
      `${grandTotals.profitMargin}%`,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 16 },
      { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Flat Data");
  } else {
    const headers = [
      "Hierarchy / Item Description",
      "SKU",
      "Barcode",
      "Size",
      "Color",
      "Sold Qty",
      "Unit Cost (Rs.)",
      "Total Cost (COGS)",
      "Total Revenue",
      "Gross Profit",
      "Margin %",
    ];

    const dataRows: any[][] = [headers];

    for (const brand of brands) {
      dataRows.push([
        `BRAND: ${brand.brandName.toUpperCase()}`,
        "-",
        "-",
        "-",
        "-",
        brand.totals.quantity,
        brand.totals.avgUnitCost,
        brand.totals.totalCost,
        brand.totals.totalRevenue,
        brand.totals.grossProfit,
        `${brand.totals.profitMargin}%`,
      ]);

      for (const div of brand.divisions) {
        dataRows.push([
          `  DIVISION: ${div.divisionName.toUpperCase()}`,
          "-",
          "-",
          "-",
          "-",
          div.totals.quantity,
          div.totals.avgUnitCost,
          div.totals.totalCost,
          div.totals.totalRevenue,
          div.totals.grossProfit,
          `${div.totals.profitMargin}%`,
        ]);

        for (const gender of div.genders) {
          for (const cat of gender.categories) {
            dataRows.push([
              `    CATEGORY: ${cat.categoryName.toUpperCase()}`,
              "-",
              "-",
              "-",
              "-",
              cat.totals.quantity,
              cat.totals.avgUnitCost,
              cat.totals.totalCost,
              cat.totals.totalRevenue,
              cat.totals.grossProfit,
              `${cat.totals.profitMargin}%`,
            ]);

            for (const prod of cat.products) {
              dataRows.push([
                `      ${prod.description}`,
                prod.sku,
                "All Barcodes",
                "All Sizes",
                "All Colors",
                prod.totals.quantity,
                prod.totals.avgUnitCost,
                prod.totals.totalCost,
                prod.totals.totalRevenue,
                prod.totals.grossProfit,
                `${prod.totals.profitMargin}%`,
              ]);

              for (const item of prod.sizes) {
                dataRows.push([
                  `        Barcode: ${item.barCode || "N/A"}`,
                  prod.sku,
                  item.barCode || "-",
                  item.size,
                  item.color || "N/A",
                  item.quantity,
                  item.costPrice,
                  item.totalCost,
                  item.totalRevenue,
                  item.grossProfit,
                  `${item.profitMargin}%`,
                ]);
              }
            }
          }
        }
      }
    }

    dataRows.push([
      "GRAND TOTAL",
      "-",
      "-",
      "-",
      "-",
      grandTotals.quantity,
      grandTotals.avgUnitCost,
      grandTotals.totalCost,
      grandTotals.totalRevenue,
      grandTotals.grossProfit,
      `${grandTotals.profitMargin}%`,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 14 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hierarchical View");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileBase64 = Buffer.from(excelBuffer).toString("base64");

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64 };
}
