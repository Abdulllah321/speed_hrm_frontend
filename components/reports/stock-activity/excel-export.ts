"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { StockActivityBrandNode, StockActivityFlatRecord, StockActivityTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

function getMetricsData(t: StockActivityTotals, reportType: "merged" | "separate" | "detailed") {
  if (reportType === "detailed") {
    return [
      t.purchases || 0,
      t.purchaseReturn || 0,
      t.fromOutlet || 0,
      t.toOutlet || 0,
      t.deliveryChallan || 0,
      t.wholesaleReturn || 0,
      t.adj || 0,
      t.availableStock || 0,
      t.reservedSO || 0,
      t.reservedSRN || 0,
      (t.reservedSO || 0) + (t.reservedSRN || 0),
      (t.availableStock || 0) - ((t.reservedSO || 0) + (t.reservedSRN || 0)),
      t.transitGRN || 0,
      t.transit || 0,
      t.balance || 0
    ];
  }
  return [
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
  ];
}

export async function generateStockActivityExcel(opts: {
  exportType: "flat" | "hierarchical";
  reportType?: "merged" | "separate" | "detailed";
  brands: StockActivityBrandNode[];
  flatItems: StockActivityFlatRecord[];
  grandTotals: StockActivityTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    reportType = "merged",
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
    ];

    if (reportType === "detailed") {
      headers.push(
        "Purchases",
        "Purchase Ret",
        "From Outlet",
        "To Outlet",
        "Delivery Challan",
        "Wholesale Ret",
        "Adj",
        "Available",
        "Reserved SO",
        "Reserved SRN",
        "Total Reserved",
        "Stock After Res",
        "Transit GRN",
        "Transit",
        "Balance"
      );
    } else {
      headers.push(
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
        "Balance"
      );
    }

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const t = item.totals;
      const row = [
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
        ...getMetricsData(t, reportType)
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
      grandTotals.bf,
      ...getMetricsData(grandTotals, reportType)
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
    ];

    if (reportType === "detailed") {
      headers.push(
        "Purchases",
        "Purchase Ret",
        "From Outlet",
        "To Outlet",
        "Delivery Challan",
        "Wholesale Ret",
        "Adj",
        "Available",
        "Reserved SO",
        "Reserved SRN",
        "Total Reserved",
        "Stock After Res",
        "Transit GRN",
        "Transit",
        "Balance"
      );
    } else {
      headers.push(
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
        "Balance"
      );
    }

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
        ...getMetricsData(bt, reportType)
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
          ...getMetricsData(dt, reportType)
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
              ...getMetricsData(ct, reportType)
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
                ...getMetricsData(pt, reportType)
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
                  ...getMetricsData(st, reportType)
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
      ...getMetricsData(grandTotals, reportType)
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
