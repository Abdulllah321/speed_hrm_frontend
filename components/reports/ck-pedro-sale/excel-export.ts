import * as XLSX from "xlsx";
import { CkPedroReportRecord } from "./types";

export function exportCkPedroToExcel(records: CkPedroReportRecord[], dateStr?: string) {
  const currentDate = dateStr || new Date().toISOString().split("T")[0];

  // Build rows array matching CK_Pedro_Sale.xlsx
  const rows: any[][] = [];

  // Row 1: Date: [date]
  rows.push(["Date:", currentDate]);
  // Row 2: Empty
  rows.push([]);
  // Row 3: Title
  rows.push(["CK Pedro Sale"]);
  // Row 4: Empty
  rows.push([]);

  // Row 5: Headers
  const headers = [
    "Country",
    "Date",
    "Location",
    "Article",
    "BarCode",
    "SoldQty",
    "UnitCost",
    "GrossPrice",
    "NetPrice",
    "NetpriceSGD",
    "TransactionID",
    "StaffID",
    "Emp_Code",
    "Column1",
    "Column2",
    "Price_W_O_T",
    "Total_Price_W_O_T",
    "DiscountAmount",
    "Value Ex Sales Tax",
    "Sales Tax",
    "Additional Sales Tax",
    "Total Sales Tax",
    "Value Incl Sales Tax",
  ];
  rows.push(headers);

  // Data rows
  for (const r of records) {
    rows.push([
      r.country,
      r.date,
      r.location,
      r.article,
      r.barCode,
      r.soldQty,
      r.unitCost,
      r.grossPrice,
      r.netPrice,
      r.netpriceSGD,
      r.transactionID,
      r.staffID,
      r.emp_Code,
      r.column1 || "",
      r.column2 || "",
      r.price_W_O_T,
      r.total_Price_W_O_T,
      r.discountAmount,
      r.valueExSalesTax,
      r.salesTax,
      r.additionalSalesTax,
      r.totalSalesTax,
      r.valueInclSalesTax,
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 14 }, // Country
    { wch: 14 }, // Date
    { wch: 16 }, // Location
    { wch: 18 }, // Article
    { wch: 18 }, // BarCode
    { wch: 10 }, // SoldQty
    { wch: 14 }, // UnitCost
    { wch: 14 }, // GrossPrice
    { wch: 14 }, // NetPrice
    { wch: 14 }, // NetpriceSGD
    { wch: 16 }, // TransactionID
    { wch: 10 }, // StaffID
    { wch: 12 }, // Emp_Code
    { wch: 10 }, // Column1
    { wch: 10 }, // Column2
    { wch: 16 }, // Price_W_O_T
    { wch: 18 }, // Total_Price_W_O_T
    { wch: 16 }, // DiscountAmount
    { wch: 18 }, // Value Ex Sales Tax
    { wch: 14 }, // Sales Tax
    { wch: 18 }, // Additional Sales Tax
    { wch: 16 }, // Total Sales Tax
    { wch: 20 }, // Value Incl Sales Tax
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const fileName = `CK_Pedro_Sale_${currentDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

