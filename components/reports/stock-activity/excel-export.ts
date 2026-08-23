"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { StockActivityBrandNode, StockActivityFlatRecord, StockActivityTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateStockActivityExcel(opts: {
  exportType: "flat" | "hierarchical";
  brands: StockActivityBrandNode[];
  flatItems: StockActivityFlatRecord[];
  grandTotals: StockActivityTotals;
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
  const fileName = `stock-activity-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const hasLocations = flatItems.some((i) => !!i.locationName);
    const headers = [
      ...(hasLocations ? ["Location / Outlet"] : []),
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
      "Opening B/F",
      "Wh IN",
      "Outlet IN",
      "Total IN",
      "Wh OUT",
      "Outlet OUT",
      "Total OUT",
      "Exchg",
      "Refund",
      "Claim",
      "Sales",
      "Adj",
      "Available",
      "Transit",
      "Balance",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const t = item.totals;
      dataRows.push([
        ...(hasLocations ? [item.locationName || "N/A"] : []),
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
        t.bf,
        t.fromWarehouse,
        t.fromOutlet,
        t.totalTrfIn,
        t.toWarehouse,
        t.toOutlet,
        t.totalTrfOut,
        t.exchg,
        t.refund,
        t.claim,
        t.sales,
        t.adj,
        t.availableStock,
        t.transit,
        t.balance,
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
      grandTotals.bf,
      grandTotals.fromWarehouse,
      grandTotals.fromOutlet,
      grandTotals.totalTrfIn,
      grandTotals.toWarehouse,
      grandTotals.toOutlet,
      grandTotals.totalTrfOut,
      grandTotals.exchg,
      grandTotals.refund,
      grandTotals.claim,
      grandTotals.sales,
      grandTotals.adj,
      grandTotals.availableStock,
      grandTotals.transit,
      grandTotals.balance,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 16 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Flat Activity Data");
  } else {
    const headers = [
      "Hierarchy / Item Description",
      "SKU",
      "Barcode",
      "Size",
      "Color",
      "Opening B/F",
      "Wh IN",
      "Outlet IN",
      "Total IN",
      "Wh OUT",
      "Outlet OUT",
      "Total OUT",
      "Exchg",
      "Refund",
      "Claim",
      "Sales",
      "Adj",
      "Available",
      "Transit",
      "Balance",
    ];

    const dataRows: any[][] = [headers];

    for (const brand of brands) {
      const bt = brand.totals;
      dataRows.push([
        `BRAND: ${brand.brandName.toUpperCase()}`,
        "-",
        "-",
        "-",
        "-",
        bt.bf,
        bt.fromWarehouse,
        bt.fromOutlet,
        bt.totalTrfIn,
        bt.toWarehouse,
        bt.toOutlet,
        bt.totalTrfOut,
        bt.exchg,
        bt.refund,
        bt.claim,
        bt.sales,
        bt.adj,
        bt.availableStock,
        bt.transit,
        bt.balance,
      ]);

      for (const div of brand.divisions) {
        const dt = div.totals;
        dataRows.push([
          `  DIVISION: ${div.divisionName.toUpperCase()}`,
          "-",
          "-",
          "-",
          "-",
          dt.bf,
          dt.fromWarehouse,
          dt.fromOutlet,
          dt.totalTrfIn,
          dt.toWarehouse,
          dt.toOutlet,
          dt.totalTrfOut,
          dt.exchg,
          dt.refund,
          dt.claim,
          dt.sales,
          dt.adj,
          dt.availableStock,
          dt.transit,
          dt.balance,
        ]);

        for (const gender of div.genders) {
          for (const cat of gender.categories) {
            const ct = cat.totals;
            dataRows.push([
              `    CATEGORY: ${cat.categoryName.toUpperCase()}`,
              "-",
              "-",
              "-",
              "-",
              ct.bf,
              ct.fromWarehouse,
              ct.fromOutlet,
              ct.totalTrfIn,
              ct.toWarehouse,
              ct.toOutlet,
              ct.totalTrfOut,
              ct.exchg,
              ct.refund,
              ct.claim,
              ct.sales,
              ct.adj,
              ct.availableStock,
              ct.transit,
              ct.balance,
            ]);

            for (const prod of cat.products) {
              const pt = prod.totals;
              dataRows.push([
                `      ${prod.description}`,
                prod.sku,
                "All Barcodes",
                "All Sizes",
                "All Colors",
                pt.bf,
                pt.fromWarehouse,
                pt.fromOutlet,
                pt.totalTrfIn,
                pt.toWarehouse,
                pt.toOutlet,
                pt.totalTrfOut,
                pt.exchg,
                pt.refund,
                pt.claim,
                pt.sales,
                pt.adj,
                pt.availableStock,
                pt.transit,
                pt.balance,
              ]);

              for (const item of prod.sizes) {
                const st = item.totals;
                dataRows.push([
                  `        Barcode: ${item.barCode || "N/A"}`,
                  prod.sku,
                  item.barCode || "-",
                  item.size,
                  item.color || "N/A",
                  st.bf,
                  st.fromWarehouse,
                  st.fromOutlet,
                  st.totalTrfIn,
                  st.toWarehouse,
                  st.toOutlet,
                  st.totalTrfOut,
                  st.exchg,
                  st.refund,
                  st.claim,
                  st.sales,
                  st.adj,
                  st.availableStock,
                  st.transit,
                  st.balance,
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
      grandTotals.bf,
      grandTotals.fromWarehouse,
      grandTotals.fromOutlet,
      grandTotals.totalTrfIn,
      grandTotals.toWarehouse,
      grandTotals.toOutlet,
      grandTotals.totalTrfOut,
      grandTotals.exchg,
      grandTotals.refund,
      grandTotals.claim,
      grandTotals.sales,
      grandTotals.adj,
      grandTotals.availableStock,
      grandTotals.transit,
      grandTotals.balance,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hierarchical Activity");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileBase64 = Buffer.from(excelBuffer).toString("base64");

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64 };
}
