"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { IncomeStatementResult, IncomeStatementAccount } from "@/lib/actions/finance-reports";

const fmtNum = (n?: number) => (n ?? 0);
const fmtPct = (val?: number) => (val !== undefined ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%` : "0.00%");

export function exportProfitLossToExcel(
  data: IncomeStatementResult,
  fileNamePrefix: string = "Profit_and_Loss_Statement"
) {
  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `${fileNamePrefix}_${dateStr}.xlsx`;

  const hasCompare = !!(data.compareFrom || data.compareTo || data.compareTotalIncome !== undefined);

  // Define headers
  const headers = hasCompare
    ? [
        "Account Code",
        "Account Name & Level",
        "Type",
        `Current Period (${data.from || "Start"} to ${data.to || "Today"})`,
        `Comparison Period (${data.compareFrom || "N/A"} to ${data.compareTo || "N/A"})`,
        "Variance (Rs.)",
        "Variance (%)",
      ]
    : [
        "Account Code",
        "Account Name & Level",
        "Type",
        `Amount (Rs.) (${data.from || "Start"} to ${data.to || "Today"})`,
      ];

  const rows: any[][] = [];

  // 1. Report Title & Context Header
  rows.push(["PROFIT & LOSS STATEMENT (INCOME STATEMENT)"]);
  rows.push([
    `Primary Period: ${data.from || "All Time"} to ${data.to || "Today"}${
      hasCompare ? ` | Comparison Period: ${data.compareFrom || "N/A"} to ${data.compareTo || "N/A"}` : ""
    }`,
  ]);
  rows.push([]);

  // 2. Financial KPI Summary Block
  rows.push(["SUMMARY MARGINS & FINANCIAL POSITION"]);
  rows.push(["Total Revenue", fmtNum(data.totalIncome)]);
  if (data.totalCogs !== undefined && data.totalCogs > 0) {
    rows.push(["Cost of Goods Sold (COGS)", fmtNum(data.totalCogs)]);
    rows.push(["Gross Profit", fmtNum(data.grossProfit)]);
  }
  rows.push(["Total Expenses", fmtNum(data.totalExpense)]);
  rows.push(["Net Profit / (Loss)", fmtNum(data.netProfit)]);
  if (hasCompare) {
    rows.push(["Compare Net Profit / (Loss)", fmtNum(data.compareNetProfit)]);
    rows.push(["Period Net Profit Variance", fmtNum(data.varianceNetProfit)]);
  }
  rows.push([]);

  // 3. Table Column Headers
  rows.push(headers);

  // Helper to append hierarchical rows
  const addAccountRows = (accs: IncomeStatementAccount[]) => {
    for (const acc of accs) {
      const indent = " ".repeat((acc.level || 0) * 3);
      const displayName = `${indent}${acc.isTagAccount ? "• " : acc.isGroup ? "[Group] " : ""}${acc.name}`;

      if (hasCompare) {
        rows.push([
          acc.code || "-",
          displayName,
          acc.type,
          fmtNum(acc.amount),
          fmtNum(acc.compareAmount),
          fmtNum(acc.variance),
          fmtPct(acc.percentageChange),
        ]);
      } else {
        rows.push([
          acc.code || "-",
          displayName,
          acc.type,
          fmtNum(acc.amount),
        ]);
      }
    }
  };

  // 4. INCOME Section
  rows.push(["REVENUE & OPERATING INCOME", "", "", "", "", "", ""]);
  addAccountRows(data.income || []);
  if (hasCompare) {
    rows.push([
      "TOTAL REVENUE / OPERATING INCOME",
      "",
      "INCOME",
      fmtNum(data.totalIncome),
      fmtNum(data.compareTotalIncome),
      fmtNum((data.totalIncome || 0) - (data.compareTotalIncome || 0)),
      "",
    ]);
  } else {
    rows.push(["TOTAL REVENUE / OPERATING INCOME", "", "INCOME", fmtNum(data.totalIncome)]);
  }
  rows.push([]);

  // 5. EXPENSE Section
  rows.push(["EXPENSES & OPERATING COSTS", "", "", "", "", "", ""]);
  addAccountRows(data.expense || []);
  if (hasCompare) {
    rows.push([
      "TOTAL EXPENSES & OPERATING COSTS",
      "",
      "EXPENSE",
      fmtNum(data.totalExpense),
      fmtNum(data.compareTotalExpense),
      fmtNum((data.totalExpense || 0) - (data.compareTotalExpense || 0)),
      "",
    ]);
  } else {
    rows.push(["TOTAL EXPENSES & OPERATING COSTS", "", "EXPENSE", fmtNum(data.totalExpense)]);
  }
  rows.push([]);

  // 6. NET PROFIT GRAND TOTAL
  const netTitle = (data.netProfit || 0) >= 0 ? "NET PROFIT" : "NET LOSS";
  if (hasCompare) {
    rows.push([
      `SUMMARY GRAND TOTAL (${netTitle})`,
      "",
      "",
      fmtNum(data.netProfit),
      fmtNum(data.compareNetProfit),
      fmtNum(data.varianceNetProfit),
      fmtPct(data.percentageNetProfit),
    ]);
  } else {
    rows.push([
      `SUMMARY GRAND TOTAL (${netTitle})`,
      "",
      "",
      fmtNum(data.netProfit),
    ]);
  }

  // Create worksheet and auto-fit column widths
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = hasCompare
    ? [
        { wch: 16 }, // Code
        { wch: 45 }, // Name
        { wch: 12 }, // Type
        { wch: 22 }, // Current
        { wch: 22 }, // Compare
        { wch: 18 }, // Variance
        { wch: 14 }, // Variance %
      ]
    : [
        { wch: 16 },
        { wch: 45 },
        { wch: 12 },
        { wch: 25 },
      ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Profit & Loss");
  XLSX.writeFile(workbook, fileName);
}
