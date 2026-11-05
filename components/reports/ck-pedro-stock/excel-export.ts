import * as XLSX from "xlsx";
import { CkPedroStockRecord } from "./types";

export function exportCkPedroStockToExcel(records: CkPedroStockRecord[], dateStr?: string) {
  const currentDate = dateStr || new Date().toISOString().split("T")[0];

  const rows: any[][] = [];

  // Row 1: Title (matching CK_Pedro_Stock.xlsx Sheet1)
  rows.push(["CK Pedro Stock "]);
  // Row 2: Empty
  rows.push([]);

  // Row 3: Headers
  const headers = [
    "Country",
    "Date",
    "StoreName",
    "ArticleNo",
    "BarCode",
    "Batch",
    "OnHandQty",
    "UnitLandedCost",
    "UnitGrossPrice",
    "UnitNetPrice",
    "Column1",
  ];
  rows.push(headers);

  // Data rows
  for (const r of records) {
    rows.push([
      r.country,
      r.date,
      r.storeName,
      r.articleNo,
      `\t${r.barCode}`,
      r.batch || "",
      r.onHandQty,
      r.unitLandedCost,
      r.unitGrossPrice,
      r.unitNetPrice,
      r.column1 || "",
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 14 }, // Country
    { wch: 14 }, // Date
    { wch: 16 }, // StoreName
    { wch: 22 }, // ArticleNo
    { wch: 20 }, // BarCode
    { wch: 10 }, // Batch
    { wch: 12 }, // OnHandQty
    { wch: 16 }, // UnitLandedCost
    { wch: 16 }, // UnitGrossPrice
    { wch: 16 }, // UnitNetPrice
    { wch: 10 }, // Column1
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const fileName = `CK_Pedro_Stock_${currentDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

