"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  StockPositionBrandNode,
  StockPositionFlatRecord,
  StockPositionTotals,
} from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateStockPositionExcel(opts: {
  exportType: "flat" | "hierarchical";
  brands: StockPositionBrandNode[];
  flatItems: StockPositionFlatRecord[];
  grandTotals: StockPositionTotals;
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
  const fileName = `stock-position-report-${dateStr}-${exportType}.xlsx`;

  const headers = [
    "Brand",
    "SKU",
    "ItemName",
    "Barcode",
    "Size",
    "Color",
    "Division",
    "Department",
    "ProductCategory",
    "Silhouette",
    "Class",
    "Subclass",
    "Season",
    "OldSeason",
    "Gender",
    "Case",
    "Band",
    "Movement Type",
    "Heel Height",
    "Width",
    "Channel Class",
    "Discount %",
    "Current RP",
    "FOB",
    "Launch Date",
    "Launch Qty",
    "Beginning",
    "Sell Through %",
    "Net Sales",
    "End",
    "Last LC No",
    "Last LC Date",
    "Last Sale Date",
    "Total Quantity",
    "Last Sale Outlets Breakdown",
    "Count",
  ];

  if (exportType === "flat") {
    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const row = [
        item.brand,
        item.sku,
        item.itemName,
        item.barCode,
        item.size,
        item.color,
        item.division,
        item.department,
        item.productCategory,
        item.silhouette,
        item.class,
        item.subclass,
        item.season,
        item.oldSeason,
        item.gender,
        item.case,
        item.band,
        item.movementType,
        item.heelHeight,
        item.width,
        item.channelClass,
        item.discountPercent ?? 0,
        item.currentRp ?? 0,
        item.fob ?? 0,
        item.launchDate || "-",
        item.launchQty ?? 0,
        item.beginning ?? 0,
        item.sellThroughPercent ? Number(item.sellThroughPercent.toFixed(2)) : 0,
        item.netSales ?? 0,
        item.end ?? 0,
        item.lastLcNumber || item.lastGrnNumber || "-",
        item.lastLcDate || item.lastGrnDate || "-",
        item.lastSaleDate || "-",
        item.totalQty ?? 0,
        item.lastSaleOutletBreakdown || "-",
        1,
      ];

      dataRows.push(row);

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
      grandTotals.launchQty,
      grandTotals.beginning,
      grandTotals.sellThroughPercent
        ? Number(grandTotals.sellThroughPercent.toFixed(2))
        : 0,
      grandTotals.netSales,
      grandTotals.end,
      "",
      "",
      "",
      grandTotals.totalQty,
      "",
      totalCount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 14 }, // Brand
      { wch: 16 }, // SKU
      { wch: 28 }, // ItemName
      { wch: 16 }, // Barcode
      { wch: 8 },  // Size
      { wch: 16 }, // Color
      { wch: 14 }, // Division
      { wch: 14 }, // Department
      { wch: 16 }, // Category
      { wch: 14 }, // Silhouette
      { wch: 10 }, // Class
      { wch: 10 }, // Subclass
      { wch: 10 }, // Season
      { wch: 10 }, // OldSeason
      { wch: 10 }, // Gender
      { wch: 10 }, // Case
      { wch: 10 }, // Band
      { wch: 14 }, // Movement
      { wch: 10 }, // Heel
      { wch: 10 }, // Width
      { wch: 12 }, // Channel
      { wch: 12 }, // Discount %
      { wch: 12 }, // Current RP
      { wch: 10 }, // FOB
      { wch: 12 }, // Launch Date
      { wch: 12 }, // Launch Qty
      { wch: 12 }, // Beginning
      { wch: 14 }, // Sell Through %
      { wch: 12 }, // Net Sales
      { wch: 12 }, // End
      { wch: 16 }, // Last LC No
      { wch: 14 }, // Last LC Date
      { wch: 18 }, // Last Sale Date
      { wch: 14 }, // Total Qty
      { wch: 30 }, // Outlet breakdown
      { wch: 8 },  // Count
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Position Flat");
  } else {
    // Hierarchical Export
    const treeHeaders = [
      "Hierarchy Level",
      "Brand",
      "SKU",
      "ItemName",
      "Barcode",
      "Size",
      "Color",
      "Division",
      "Category",
      "Season",
      "Gender",
      "Discount %",
      "Current RP",
      "FOB",
      "Launch Date",
      "Launch Qty",
      "Beginning",
      "Sell Through %",
      "Net Sales",
      "End",
      "Last LC No",
      "Last LC Date",
      "Last Sale Date",
      "Total Quantity",
      "Last Sale Outlets Breakdown",
    ];

    const dataRows: any[][] = [treeHeaders];

    for (const brand of brands) {
      const bt = brand.totals;
      dataRows.push([
        `[BRAND] ${brand.brandName}`,
        brand.brandName,
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
        bt.launchQty,
        bt.beginning,
        bt.sellThroughPercent ? Number(bt.sellThroughPercent.toFixed(2)) : 0,
        bt.netSales,
        bt.end,
        "",
        "",
        "",
        bt.totalQty,
        "",
      ]);

      for (const div of brand.divisions || []) {
        const dt = div.totals;
        dataRows.push([
          `  [DIVISION] ${div.divisionName}`,
          brand.brandName,
          "",
          "",
          "",
          "",
          "",
          div.divisionName,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          dt.launchQty,
          dt.beginning,
          dt.sellThroughPercent ? Number(dt.sellThroughPercent.toFixed(2)) : 0,
          dt.netSales,
          dt.end,
          "",
          "",
          "",
          dt.totalQty,
          "",
        ]);

        const genders = div.genders || [];
        for (const gen of genders) {
          const gt = gen.totals;
          dataRows.push([
            `    [GENDER] ${gen.genderName}`,
            brand.brandName,
            "",
            "",
            "",
            "",
            "",
            div.divisionName,
            "",
            "",
            gen.genderName,
            "",
            "",
            "",
            "",
            gt.launchQty,
            gt.beginning,
            gt.sellThroughPercent ? Number(gt.sellThroughPercent.toFixed(2)) : 0,
            gt.netSales,
            gt.end,
            "",
            "",
            "",
            gt.totalQty,
            "",
          ]);

          for (const cat of gen.categories || []) {
            const ct = cat.totals;
            dataRows.push([
              `      [CATEGORY] ${cat.categoryName}`,
              brand.brandName,
              "",
              "",
              "",
              "",
              "",
              div.divisionName,
              cat.categoryName,
              "",
              gen.genderName,
              "",
              "",
              "",
              "",
              ct.launchQty,
              ct.beginning,
              ct.sellThroughPercent ? Number(ct.sellThroughPercent.toFixed(2)) : 0,
              ct.netSales,
              ct.end,
              "",
              "",
              "",
              ct.totalQty,
              "",
            ]);

            for (const prod of cat.products || []) {
              const pt = prod.totals;
              const firstSize = prod.sizes?.[0];
              dataRows.push([
                `        [SKU] ${prod.sku} - ${prod.description || prod.itemName || ""}`,
                brand.brandName,
                prod.sku,
                prod.description || prod.itemName || "",
                "",
                "",
                "",
                div.divisionName,
                cat.categoryName,
                "",
                gen.genderName,
                prod.discountPercent ?? firstSize?.discountPercent ?? "",
                prod.currentRp ?? firstSize?.currentRp ?? "",
                prod.fob ?? firstSize?.fob ?? "",
                prod.launchDate ?? firstSize?.launchDate ?? "-",
                pt.launchQty,
                pt.beginning,
                pt.sellThroughPercent ? Number(pt.sellThroughPercent.toFixed(2)) : 0,
                pt.netSales,
                pt.end,
                prod.lastLcNumber ?? firstSize?.lastLcNumber ?? firstSize?.lastGrnNumber ?? "-",
                prod.lastLcDate ?? firstSize?.lastLcDate ?? firstSize?.lastGrnDate ?? "-",
                prod.lastSaleDate ?? firstSize?.lastSaleDate ?? "-",
                pt.totalQty,
                prod.lastSaleOutletBreakdown ?? firstSize?.lastSaleOutletBreakdown ?? "-",
              ]);

              for (const v of prod.sizes || []) {
                const vt = v.totals;
                dataRows.push([
                  `          Variant: ${v.size} / ${v.color}`,
                  brand.brandName,
                  prod.sku,
                  prod.itemName,
                  v.barCode,
                  v.size,
                  v.color,
                  div.divisionName,
                  cat.categoryName,
                  v.season,
                  gen.genderName,
                  v.discountPercent ?? 0,
                  v.currentRp ?? 0,
                  v.fob ?? 0,
                  v.launchDate || "-",
                  vt.launchQty,
                  vt.beginning,
                  vt.sellThroughPercent ? Number(vt.sellThroughPercent.toFixed(2)) : 0,
                  vt.netSales,
                  vt.end,
                  v.lastLcNumber || v.lastGrnNumber || "-",
                  v.lastLcDate || v.lastGrnDate || "-",
                  v.lastSaleDate || "-",
                  vt.totalQty,
                  v.lastSaleOutletBreakdown || "-",
                ]);
              }
            }
          }
        }
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
      grandTotals.launchQty,
      grandTotals.beginning,
      grandTotals.sellThroughPercent
        ? Number(grandTotals.sellThroughPercent.toFixed(2))
        : 0,
      grandTotals.netSales,
      grandTotals.end,
      "",
      "",
      "",
      grandTotals.totalQty,
      "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 38 }, // Hierarchy Level
      { wch: 14 }, // Brand
      { wch: 16 }, // SKU
      { wch: 24 }, // ItemName
      { wch: 16 }, // Barcode
      { wch: 8 },  // Size
      { wch: 14 }, // Color
      { wch: 14 }, // Division
      { wch: 16 }, // Category
      { wch: 10 }, // Season
      { wch: 10 }, // Gender
      { wch: 12 }, // Discount %
      { wch: 12 }, // Current RP
      { wch: 12 }, // FOB
      { wch: 12 }, // Launch Date
      { wch: 12 }, // Launch Qty
      { wch: 12 }, // Beginning
      { wch: 14 }, // Sell Through %
      { wch: 12 }, // Net Sales
      { wch: 12 }, // End
      { wch: 16 }, // Last LC No
      { wch: 14 }, // Last LC Date
      { wch: 18 }, // Last Sale Date
      { wch: 14 }, // Total Qty
      { wch: 30 }, // Last Sale Outlets Breakdown
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Position Hierarchy");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileBase64 = Buffer.from(excelBuffer).toString("base64");

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64 };
}
