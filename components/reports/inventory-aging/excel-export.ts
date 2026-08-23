import * as XLSX from "xlsx";
import {
  InventoryAgingRecord,
  InventoryAgingTotals,
  LocationHeader,
  WarehouseHeader,
} from "./types";
import { DateRange } from "@/components/ui/date-range-picker";
import { registerInventoryAgingClientExport } from "@/lib/actions/inventory-aging";

function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function generateInventoryAgingExcel(params: {
  items: InventoryAgingRecord[];
  totals: InventoryAgingTotals;
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
  dateRange: DateRange;
  reportType: "merged" | "separate";
  activeSelectionNames: string;
}) {
  const { items, totals, locations, warehouses, dateRange, reportType, activeSelectionNames } = params;

  const dateStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const fileName = `inventory-aging-report-${dateStr}.xlsx`;

  // Build worksheet rows
  const headers = [
    "#",
    "SKU",
    "Barcode",
    "Item Description",
    "Brand",
    "Category",
    "Unit Cost (Rs.)",
    "Total Stock Qty",
    "Total Valuation (Rs.)",
    "0-30 Days Qty",
    "0-30 Days Val (Rs.)",
    "31-60 Days Qty",
    "31-60 Days Val (Rs.)",
    "61-90 Days Qty",
    "61-90 Days Val (Rs.)",
    "91-120 Days Qty",
    "91-120 Days Val (Rs.)",
    "121-180 Days Qty",
    "121-180 Days Val (Rs.)",
    "181+ Days Qty (Aged)",
    "181+ Days Val (Rs.)",
    "Avg Age (Days)",
  ];

  if (reportType === "separate") {
    locations.forEach((loc) => headers.push(`Store: ${loc.name}`));
    warehouses.forEach((wh) => headers.push(`WH: ${wh.name}`));
  }

  const dataRows: any[][] = [
    ["INVENTORY AGING REPORT"],
    [`As of Date: ${dateStr}`],
    [`Scope: ${activeSelectionNames}`],
    [],
    headers,
  ];

  let rowIndex = 1;
  for (const item of items) {
    const row = [
      rowIndex++,
      item.sku,
      item.barCode,
      item.name,
      item.brandName,
      item.categoryName,
      item.unitCost,
      item.totalQty,
      item.totalValue,
      item.bucket0to30Qty,
      item.bucket0to30Value,
      item.bucket31to60Qty,
      item.bucket31to60Value,
      item.bucket61to90Qty,
      item.bucket61to90Value,
      item.bucket91to120Qty,
      item.bucket91to120Value,
      item.bucket121to180Qty,
      item.bucket121to180Value,
      item.bucket181PlusQty,
      item.bucket181PlusValue,
      item.avgAgeDays,
    ];

    if (reportType === "separate") {
      locations.forEach((loc) => row.push(item.locationStocks[loc.id] || 0));
      warehouses.forEach((wh) => row.push(item.warehouseStocks[wh.id] || 0));
    }

    dataRows.push(row);

    if (rowIndex % 500 === 0) {
      await yieldToMain();
    }
  }

  // Grand Totals Row
  const grandTotalsRow = [
    "TOTAL",
    `${totals.totalItems} SKUs`,
    "",
    "Grand Total Inventory Balance",
    "",
    "",
    "",
    totals.totalStockQty,
    totals.totalStockValue,
    totals.totalBucket0to30Qty,
    totals.totalBucket0to30Value,
    totals.totalBucket31to60Qty,
    totals.totalBucket31to60Value,
    totals.totalBucket61to90Qty,
    totals.totalBucket61to90Value,
    totals.totalBucket91to120Qty,
    totals.totalBucket91to120Value,
    totals.totalBucket121to180Qty,
    totals.totalBucket121to180Value,
    totals.totalBucket181PlusQty,
    totals.totalBucket181PlusValue,
    totals.overallAvgAgeDays,
  ];

  if (reportType === "separate") {
    locations.forEach((loc) => grandTotalsRow.push(totals.locationTotals[loc.id] || 0));
    warehouses.forEach((wh) => grandTotalsRow.push(totals.warehouseTotals[wh.id] || 0));
  }

  dataRows.push([]);
  dataRows.push(grandTotalsRow);

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Aging");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Client Download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Background S3 Sync
  try {
    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("fileName", fileName);
    formData.append("format", "xlsx");
    await registerInventoryAgingClientExport(formData);
  } catch (err) {
    console.warn("Background S3 export registration failed:", err);
  }
}
