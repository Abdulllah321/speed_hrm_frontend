"use client";

import * as XLSX from "xlsx";
import { VoucherRegisterItem, VoucherRegisterTotals, VoucherReportMode } from "./types";
import { format } from "date-fns";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

interface GenerateVoucherExcelOptions {
  items: VoucherRegisterItem[];
  totals: VoucherRegisterTotals;
  dateRange: { from?: Date; to?: Date };
  asOfDate?: Date;
  mode: VoucherReportMode;
  locationNames: string;
}

export async function generateVoucherRegisterExcel({
  items,
  totals,
  dateRange,
  asOfDate,
  mode,
  locationNames,
}: GenerateVoucherExcelOptions): Promise<{ excelBuffer: Blob; fileName: string }> {
  await yieldToMain();

  const isOutstanding = mode === "outstanding";
  const sheetName = isOutstanding ? "Outstanding Vouchers" : "Voucher Register";
  const workbook = XLSX.utils.book_new();

  const headers = [
    "Voucher #",
    "Type",
    "Issue Date Time",
    "Company Name",
    "GL Code",
    "Customer / Beneficiary",
    "Issued Store / Outlet",
    "Base / Source Memo",
    "Valid Till",
    "Discount (Rs.)",
    "Amount / Face Value (Rs.)",
    "Settled In Inv #",
    "Settled Date Time",
    "Status",
  ];

  const rows: (string | number)[][] = [headers];

  for (const item of items) {
    rows.push([
      item.voucherNumber,
      item.voucherType,
      item.dateTime,
      item.companyName,
      item.companyGlCode,
      item.customerDetail,
      item.outletName,
      item.baseCashMemo,
      item.validTill,
      item.discountAmount,
      item.faceValue,
      item.settledInCashMemo,
      item.settledDateTime,
      item.status,
    ]);
  }

  // Summary row
  rows.push([
    `TOTALS (${items.length} Vouchers)`,
    "-",
    "-",
    "-",
    "-",
    "-",
    "-",
    "-",
    "-",
    totals.totalDiscount,
    totals.totalFaceValue,
    isOutstanding
      ? `Outstanding: Rs. ${totals.totalOutstandingAmount.toLocaleString()}`
      : `Settled: Rs. ${totals.totalSettledAmount.toLocaleString()}`,
    "-",
    "-",
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  worksheet["!cols"] = [
    { wch: 22 }, // Voucher #
    { wch: 14 }, // Type
    { wch: 20 }, // Date Time
    { wch: 24 }, // Company
    { wch: 14 }, // GL Code
    { wch: 28 }, // Customer
    { wch: 22 }, // Outlet
    { wch: 22 }, // Base Memo
    { wch: 16 }, // Valid Till
    { wch: 16 }, // Discount
    { wch: 18 }, // Face Value
    { wch: 24 }, // Settled Inv
    { wch: 20 }, // Settled Date
    { wch: 14 }, // Status
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBufferArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBufferArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const prefix = isOutstanding ? "voucher-outstanding-preview" : "voucher-register-report";
  const fileName = `${prefix}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

  return { excelBuffer: blob, fileName };
}
