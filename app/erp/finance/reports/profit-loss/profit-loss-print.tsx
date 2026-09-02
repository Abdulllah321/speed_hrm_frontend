"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { IncomeStatementResult, IncomeStatementAccount } from "@/lib/actions/finance-reports";

const fmt = (n?: number) =>
  (n ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (val?: number) =>
  val !== undefined ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%` : "0.00%";

export function ProfitLossPrint({
  data,
  fromDate,
  toDate,
  compareFromDate,
  compareToDate,
}: {
  data: IncomeStatementResult;
  fromDate?: Date;
  toDate?: Date;
  compareFromDate?: Date;
  compareToDate?: Date;
}) {
  const [printedAt, setPrintedAt] = useState<string>("");

  useEffect(() => {
    setPrintedAt(format(new Date(), "dd-MMM-yyyy hh:mm a"));
  }, []);

  const hasCompare = !!(
    compareFromDate ||
    compareToDate ||
    data.compareTotalIncome !== undefined
  );

  const netProfit = data.netProfit ?? 0;
  const totalRevenue = data.totalIncome ?? 0;
  const grossProfit = data.grossProfit ?? totalRevenue;
  const grossMarginPct = totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMarginPct = totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;

  const renderAccounts = (accounts: IncomeStatementAccount[], sectionTitle: string) => {
    if (!accounts || accounts.length === 0) return null;

    return (
      <>
        {/* Section Header */}
        <tr className="bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider border-y-2 border-slate-900 [-webkit-print-color-adjust:exact] [color-adjust:exact]">
          <td colSpan={hasCompare ? 6 : 3} className="py-1 px-1.5 text-slate-900">
            {sectionTitle}
          </td>
        </tr>

        {accounts.map((row) => {
          const indentLevel = (row.level || 0) * 10;
          const isGroup = row.isGroup;
          const isTag = row.isTagAccount;

          return (
            <tr
              key={row.id}
              className={`border-b border-slate-200 ${
                isGroup ? "font-bold bg-slate-50 [-webkit-print-color-adjust:exact]" : ""
              } ${isTag ? "italic text-slate-600" : ""}`}
            >
              <td className="py-1 px-1.5 font-mono text-[9px] text-slate-600 whitespace-nowrap align-top">
                {row.code}
              </td>
              <td className="py-1 px-1.5 align-top">
                <div style={{ paddingLeft: `${indentLevel}px` }} className="flex items-center gap-1">
                  <span>{row.name}</span>
                  {isGroup && (
                    <span className="text-[7.5px] font-mono px-1 rounded bg-slate-200 text-slate-700 ml-1 font-normal">
                      Group
                    </span>
                  )}
                  {isTag && (
                    <span className="text-[7.5px] font-mono px-1 rounded bg-blue-100 text-blue-700 ml-1 font-normal">
                      Sub-Tag
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1 px-1.5 text-right font-mono font-medium align-top">
                {fmt(row.amount)}
              </td>
              {hasCompare && (
                <td className="py-1 px-1.5 text-right font-mono text-slate-600 align-top">
                  {fmt(row.compareAmount)}
                </td>
              )}
              {hasCompare && (
                <td
                  className={`py-1 px-1.5 text-right font-mono text-[9px] align-top ${
                    (row.variance ?? 0) > 0
                      ? "text-emerald-700"
                      : (row.variance ?? 0) < 0
                      ? "text-rose-700"
                      : "text-slate-500"
                  }`}
                >
                  {fmt(row.variance)}
                </td>
              )}
              {hasCompare && (
                <td
                  className={`py-1 px-1.5 text-right font-mono text-[9px] align-top ${
                    (row.percentageChange ?? 0) > 0
                      ? "text-emerald-700"
                      : (row.percentageChange ?? 0) < 0
                      ? "text-rose-700"
                      : "text-slate-500"
                  }`}
                >
                  {fmtPct(row.percentageChange)}
                </td>
              )}
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div className="hidden print:block w-full max-w-none bg-white text-black p-0 font-sans text-[10px] box-border">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
          }
          .no-print, header, nav, aside, footer, button, [role="alert"] {
            display: none !important;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Corporate Header - Spans Full Width */}
      <div className="flex justify-between mb-2 gap-2 items-start border-b-2 border-slate-900 pb-2 w-full">
        {/* Logo / Company Name */}
        <div className="w-[30%] flex flex-col justify-center">
          <img src="/image.png" alt="Company Logo" className="w-18 object-contain mb-1" onError={(e) => (e.currentTarget.style.display = "none")} />
          <span className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
            Speed (Pvt.) Limited
          </span>
          <span className="text-[9px] text-slate-600">Financial Reporting Module</span>
        </div>

        {/* Title Box */}
        <div className="w-[38%] flex flex-col justify-center">
          <div className="bg-[#eef2f6] text-black w-full text-center py-1.5 border border-slate-300 [-webkit-print-color-adjust:exact] [color-adjust:exact]">
            <span className="text-base font-extrabold underline decoration-2 underline-offset-2 tracking-wide uppercase">
              Profit &amp; Loss
            </span>
            <br />
            <span className="text-xs font-bold tracking-wide uppercase text-slate-700">Statement</span>
          </div>
        </div>

        {/* Details Metadata Box */}
        <div className="w-[32%] bg-[#f8fafc] text-[9px] p-1.5 border border-slate-300 [-webkit-print-color-adjust:exact] [color-adjust:exact] flex flex-col justify-center space-y-0.5">
          <div className="flex justify-between">
            <span className="font-bold text-slate-700">Report Period:</span>
            <span className="font-semibold font-mono">
              {fromDate && toDate
                ? `${format(fromDate, "dd/MM/yyyy")} - ${format(toDate, "dd/MM/yyyy")}`
                : "All Time"}
            </span>
          </div>
          {hasCompare && compareFromDate && compareToDate && (
            <div className="flex justify-between border-t border-slate-200 pt-0.5">
              <span className="font-bold text-slate-700">Compare Period:</span>
              <span className="font-semibold font-mono">
                {format(compareFromDate, "dd/MM/yyyy")} - {format(compareToDate, "dd/MM/yyyy")}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-0.5">
            <span className="font-bold text-slate-700">Printed On:</span>
            <span className="font-mono text-slate-600">{printedAt}</span>
          </div>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-4 gap-2 mb-2 w-full">
        <div className="p-1 border border-slate-300 bg-slate-50 text-center [-webkit-print-color-adjust:exact]">
          <span className="text-[8px] font-bold uppercase text-slate-600 block">Total Revenue</span>
          <span className="text-xs font-extrabold font-mono text-slate-900">{fmt(totalRevenue)}</span>
        </div>
        <div className="p-1 border border-slate-300 bg-slate-50 text-center [-webkit-print-color-adjust:exact]">
          <span className="text-[8px] font-bold uppercase text-slate-600 block">Gross Profit</span>
          <span className="text-xs font-extrabold font-mono text-slate-900">{fmt(grossProfit)}</span>
          <span className="text-[8px] font-semibold text-slate-600 block">({grossMarginPct.toFixed(1)}% Margin)</span>
        </div>
        <div className="p-1 border border-slate-300 bg-slate-50 text-center [-webkit-print-color-adjust:exact]">
          <span className="text-[8px] font-bold uppercase text-slate-600 block">Total Expenses</span>
          <span className="text-xs font-extrabold font-mono text-slate-900">{fmt(data.totalExpense)}</span>
        </div>
        <div className="p-1 border border-slate-300 bg-slate-100 text-center [-webkit-print-color-adjust:exact]">
          <span className="text-[8px] font-bold uppercase text-slate-600 block">
            {netProfit >= 0 ? "Net Profit" : "Net Loss"}
          </span>
          <span className="text-xs font-extrabold font-mono text-slate-900">{fmt(Math.abs(netProfit))}</span>
          <span className="text-[8px] font-semibold text-slate-600 block">({netMarginPct.toFixed(1)}% Margin)</span>
        </div>
      </div>

      {/* Main Hierarchy Table Spanning 100% Page Width */}
      <table className="w-full border-collapse table-fixed text-[9.5px]">
        <colgroup>
          <col className="w-[14%]" />
          <col className="w-[46%]" />
          <col className="w-[20%]" />
          {hasCompare && <col className="w-[20%]" />}
          {hasCompare && <col className="w-[14%]" />}
          {hasCompare && <col className="w-[12%]" />}
        </colgroup>
        <thead>
          <tr className="bg-slate-900 text-white uppercase text-[9px] font-mono tracking-wider border-b-2 border-slate-900 [-webkit-print-color-adjust:exact] [color-adjust:exact]">
            <th className="py-1 px-1.5 text-left">Code</th>
            <th className="py-1 px-1.5 text-left">Account Name / Hierarchy</th>
            <th className="py-1 px-1.5 text-right">Current Period</th>
            {hasCompare && <th className="py-1 px-1.5 text-right">Compare Period</th>}
            {hasCompare && <th className="py-1 px-1.5 text-right">Variance ($)</th>}
            {hasCompare && <th className="py-1 px-1.5 text-right">Variance (%)</th>}
          </tr>
        </thead>
        <tbody>
          {/* Revenue & Income Section */}
          {renderAccounts(data.income, "REVENUE & OPERATING INCOME")}

          {/* Section Total Income */}
          <tr className="bg-slate-200 font-extrabold border-t-2 border-b border-slate-900 text-slate-900 [-webkit-print-color-adjust:exact]">
            <td colSpan={2} className="py-1 px-1.5 text-right uppercase text-[9px]">
              TOTAL REVENUE &amp; OPERATING INCOME
            </td>
            <td className="py-1 px-1.5 text-right font-mono">{fmt(data.totalIncome)}</td>
            {hasCompare && <td className="py-1 px-1.5 text-right font-mono">{fmt(data.compareTotalIncome)}</td>}
            {hasCompare && <td className="py-1 px-1.5 text-right font-mono">{fmt((data.totalIncome || 0) - (data.compareTotalIncome || 0))}</td>}
            {hasCompare && <td className="py-1 px-1.5"></td>}
          </tr>

          {/* Expenses Section */}
          {renderAccounts(data.expense, "EXPENSES & OPERATING COSTS")}

          {/* Section Total Expense */}
          <tr className="bg-slate-200 font-extrabold border-t-2 border-b border-slate-900 text-slate-900 [-webkit-print-color-adjust:exact]">
            <td colSpan={2} className="py-1 px-1.5 text-right uppercase text-[9px]">
              TOTAL EXPENSES &amp; OPERATING COSTS
            </td>
            <td className="py-1 px-1.5 text-right font-mono">{fmt(data.totalExpense)}</td>
            {hasCompare && <td className="py-1 px-1.5 text-right font-mono">{fmt(data.compareTotalExpense)}</td>}
            {hasCompare && <td className="py-1 px-1.5 text-right font-mono">{fmt((data.totalExpense || 0) - (data.compareTotalExpense || 0))}</td>}
            {hasCompare && <td className="py-1 px-1.5"></td>}
          </tr>

          {/* Grand Total Net Profit / Loss */}
          <tr className="bg-slate-900 text-white font-extrabold border-t-4 border-slate-900 text-[10.5px] [-webkit-print-color-adjust:exact]">
            <td colSpan={2} className="py-1.5 px-1.5 text-right uppercase tracking-wider">
              {netProfit >= 0 ? "SUMMARY NET PROFIT" : "SUMMARY NET LOSS"}
            </td>
            <td className="py-1.5 px-1.5 text-right font-mono">{fmt(Math.abs(netProfit))}</td>
            {hasCompare && <td className="py-1.5 px-1.5 text-right font-mono">{fmt(data.compareNetProfit)}</td>}
            {hasCompare && <td className="py-1.5 px-1.5 text-right font-mono">{fmt(data.varianceNetProfit)}</td>}
            {hasCompare && <td className="py-1.5 px-1.5 text-right font-mono">{fmtPct(data.percentageNetProfit)}</td>}
          </tr>
        </tbody>
      </table>

      {/* Signatures & Footer */}
      <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-end text-[8.5px] text-slate-600">
        <div className="text-center w-32 border-t border-slate-400 pt-1">
          <span>Prepared By</span>
        </div>
        <div className="text-center w-32 border-t border-slate-400 pt-1">
          <span>Verified By</span>
        </div>
        <div className="text-center w-32 border-t border-slate-400 pt-1">
          <span>Authorized Approval</span>
        </div>
      </div>
    </div>
  );
}
