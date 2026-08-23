"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { AllianceRegisterRecord, AllianceRegisterTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateAllianceRegisterExcel(opts: {
  exportType: "flat" | "hierarchical";
  records: AllianceRegisterRecord[];
  grandTotals: AllianceRegisterTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    records,
    grandTotals,
    dateRange,
    locationNames,
    onProgress,
  } = opts;

  onProgress?.(10);
  await yieldToMain();

  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `alliance-register-report-${dateStr}-${exportType}.xlsx`;

  const headers = [
    "Sales Tax Invoice",
    "Date",
    "Time",
    "Retail Price",
    "Retail Price WOST",
    "Discount",
    "Sales Tax",
    "Net Sale",
    "Cash",
    "Card",
    "Prefix Card No.",
    "Auth ID",
    "Card No.",
    "Alliance Program / Option",
    "Remarks / Notes",
    "Gift Voucher No.",
    "Gift Voucher Amt",
    "Credit Voucher No.",
    "Credit Voucher Amt",
    "Claim Voucher No.",
    "Claim Voucher Amt",
    "Corp Voucher No.",
    "Corp Voucher Amt",
    "Exchange Voucher No.",
    "Exchange Voucher Amt",
    "Credit Issued No.",
    "Credit Issued Amt",
  ];

  if (exportType === "flat") {
    const dataRows: any[][] = [headers];

    const totalCount = records.length;
    for (let i = 0; i < totalCount; i++) {
      const row = records[i];
      dataRows.push([
        row.invoiceNo,
        row.date,
        row.time,
        row.retailPrice,
        row.retailWost,
        row.discount,
        row.sTax,
        row.netSale,
        row.cash,
        row.card,
        row.prefixCardNo || "-",
        row.authId || "-",
        row.cardNo ? `****${row.cardNo}` : "-",
        row.allianceOption || "-",
        row.remarks || "-",
        row.giftVoucherCode || "-",
        row.giftVoucherAmt,
        row.creditCode || "-",
        row.creditAmt,
        row.claimCode || "-",
        row.claimAmt,
        row.corporateCode || "-",
        row.corporateAmt,
        row.exchangeCode || "-",
        row.exchangeAmt,
        row.creditVoucherIssued || "-",
        row.creditVoucherIssuedAmt,
      ]);

      if (i % 300 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 70) + 10);
        await yieldToMain();
      }
    }

    dataRows.push([
      "GRAND TOTALS",
      "",
      "",
      grandTotals.retailPrice,
      grandTotals.retailWost,
      grandTotals.discount,
      grandTotals.sTax,
      grandTotals.netSale,
      grandTotals.cash,
      grandTotals.card,
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      grandTotals.giftVoucherAmt,
      "-",
      grandTotals.creditAmt,
      "-",
      grandTotals.claimAmt,
      "-",
      grandTotals.corporateAmt,
      "-",
      grandTotals.exchangeAmt,
      "-",
      grandTotals.creditVoucherIssuedAmt,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Alliance Register");
  } else {
    // Hierarchical / Grouped by Alliance Program
    const allianceGroups = new Map<string, AllianceRegisterRecord[]>();
    for (const record of records) {
      const option = record.allianceOption || "Other Alliance Sales";
      const list = allianceGroups.get(option) || [];
      list.push(record);
      allianceGroups.set(option, list);
    }

    const dataRows: any[][] = [headers];

    for (const [programName, groupRecords] of allianceGroups.entries()) {
      // Program Header Row
      dataRows.push([`ALLIANCE PROGRAM: ${programName.toUpperCase()}`]);

      let groupPrice = 0;
      let groupDisc = 0;
      let groupNet = 0;

      for (const row of groupRecords) {
        groupPrice += row.retailPrice;
        groupDisc += row.discount;
        groupNet += row.netSale;

        dataRows.push([
          `  ${row.invoiceNo}`,
          row.date,
          row.time,
          row.retailPrice,
          row.retailWost,
          row.discount,
          row.sTax,
          row.netSale,
          row.cash,
          row.card,
          row.prefixCardNo || "-",
          row.authId || "-",
          row.cardNo ? `****${row.cardNo}` : "-",
          row.allianceOption || "-",
          row.remarks || "-",
          row.giftVoucherCode || "-",
          row.giftVoucherAmt,
          row.creditCode || "-",
          row.creditAmt,
          row.claimCode || "-",
          row.claimAmt,
          row.corporateCode || "-",
          row.corporateAmt,
          row.exchangeCode || "-",
          row.exchangeAmt,
          row.creditVoucherIssued || "-",
          row.creditVoucherIssuedAmt,
        ]);
      }

      // Group Subtotal Row
      dataRows.push([
        `SUBTOTAL: ${programName}`,
        "",
        "",
        groupPrice,
        "",
        groupDisc,
        "",
        groupNet,
      ]);
      dataRows.push([]);
    }

    dataRows.push([
      "GRAND TOTALS",
      "",
      "",
      grandTotals.retailPrice,
      grandTotals.retailWost,
      grandTotals.discount,
      grandTotals.sTax,
      grandTotals.netSale,
      grandTotals.cash,
      grandTotals.card,
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      grandTotals.giftVoucherAmt,
      "-",
      grandTotals.creditAmt,
      "-",
      grandTotals.claimAmt,
      "-",
      grandTotals.corporateAmt,
      "-",
      grandTotals.exchangeAmt,
      "-",
      grandTotals.creditVoucherIssuedAmt,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 32 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Alliance Program Grouped");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
