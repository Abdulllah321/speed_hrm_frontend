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
  isPosLevel?: boolean;
  onProgress?: (percent: number, message: string) => void;
}) {
  const {
    items,
    totals,
    locations,
    warehouses,
    dateRange,
    reportType,
    activeSelectionNames,
    isPosLevel = false,
    onProgress,
  } = params;

  onProgress?.(10, "Initializing Excel export generator...");

  const dateStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const fileName = `inventory-aging-report-${dateStr}.xlsx`;

  const priceHeader = isPosLevel ? "Unit Price (Rs.)" : "Unit Cost (Rs.)";
  const valuationHeader = isPosLevel ? "Retail Valuation (Rs.)" : "Total Cost Valuation (Rs.)";

  // Build worksheet rows
  const headers = [
    "#",
    "SKU",
    "Barcode",
    "Item Description",
    "Brand",
    "Category",
    priceHeader,
    "Total Stock Qty",
    valuationHeader,
    "0-6 Months Qty",
    "0-6 Months Val (Rs.)",
    "6-9 Months Qty",
    "6-9 Months Val (Rs.)",
    "9-12 Months Qty",
    "9-12 Months Val (Rs.)",
    "12-15 Months Qty",
    "12-15 Months Val (Rs.)",
    "15-18 Months Qty",
    "15-18 Months Val (Rs.)",
    ">18 Months Qty (Aged)",
    ">18 Months Val (Rs.)",
    "Avg Age (Days)",
  ];

  if (reportType === "separate") {
    locations.forEach((loc) => headers.push(`Store: ${loc.name}`));
    warehouses.forEach((wh) => headers.push(`WH: ${wh.name}`));
  }

  const dataRows: any[][] = [
    [`INVENTORY AGING REPORT ${isPosLevel ? "(POS LEVEL - RETAIL)" : "(ERP LEVEL - COST)"}`],
    [`As of Date: ${dateStr}`],
    [`Scope: ${activeSelectionNames}`],
    [],
    headers,
  ];

  onProgress?.(30, "Writing item rows & aging brackets to spreadsheet...");

  let rowIndex = 1;
  const totalCount = items.length || 1;

  for (const item of items) {
    const priceToDisplay = isPosLevel ? item.unitPrice : item.unitCost;
    const row = [
      rowIndex++,
      item.sku,
      item.barCode,
      item.name,
      item.brandName,
      item.categoryName,
      priceToDisplay,
      item.totalQty,
      item.totalValue,
      item.bucket0to6mQty,
      item.bucket0to6mValue,
      item.bucket6to9mQty,
      item.bucket6to9mValue,
      item.bucket9to12mQty,
      item.bucket9to12mValue,
      item.bucket12to15mQty,
      item.bucket12to15mValue,
      item.bucket15to18mQty,
      item.bucket15to18mValue,
      item.bucket18mPlusQty,
      item.bucket18mPlusValue,
      item.avgAgeDays,
    ];

    if (reportType === "separate") {
      locations.forEach((loc) => row.push(item.locationStocks[loc.id] || 0));
      warehouses.forEach((wh) => row.push(item.warehouseStocks[wh.id] || 0));
    }

    dataRows.push(row);

    if (rowIndex % 200 === 0) {
      const pct = Math.min(85, 30 + Math.round((rowIndex / totalCount) * 55));
      onProgress?.(pct, `Processing row ${rowIndex} of ${totalCount}...`);
      await yieldToMain();
    }
  }

  onProgress?.(88, "Calculating grand totals summary row...");

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
    totals.totalBucket0to6mQty,
    totals.totalBucket0to6mValue,
    totals.totalBucket6to9mQty,
    totals.totalBucket6to9mValue,
    totals.totalBucket9to12mQty,
    totals.totalBucket9to12mValue,
    totals.totalBucket12to15mQty,
    totals.totalBucket12to15mValue,
    totals.totalBucket15to18mQty,
    totals.totalBucket15to18mValue,
    totals.totalBucket18mPlusQty,
    totals.totalBucket18mPlusValue,
    totals.overallAvgAgeDays,
  ];

  if (reportType === "separate") {
    locations.forEach((loc) => grandTotalsRow.push(totals.locationTotals[loc.id] || 0));
    warehouses.forEach((wh) => grandTotalsRow.push(totals.warehouseTotals[wh.id] || 0));
  }

  dataRows.push([]);
  dataRows.push(grandTotalsRow);

  onProgress?.(95, "Compiling Excel workbook file...");

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Aging");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  onProgress?.(100, "Excel export generated successfully!");

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
