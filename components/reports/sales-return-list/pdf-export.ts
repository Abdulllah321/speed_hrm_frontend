"use client";

import { format } from "date-fns";
import { SalesReturnNode, SalesReturnTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateSalesReturnListPdf(opts: {
  returns: SalesReturnNode[];
  grandTotals: SalesReturnTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<void> {
  const { returns, grandTotals, dateRange, locationNames, onProgress } = opts;

  onProgress?.(5, "Preparing printable document template...");
  await yieldToMain();

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const totalCount = Math.min(returns.length, 3000);
  const rowChunks: string[] = [];

  if (totalCount === 0) {
    rowChunks.push(`
      <tr>
        <td colspan="16" style="text-align: center; padding: 24px; color: #64748b; font-size: 9px; font-weight: 600;">
          No sales returns found matching the selected filters.
        </td>
      </tr>
    `);
  } else {
    for (let i = 0; i < totalCount; i++) {
      const ret = returns[i];
      const custDisplay = `${ret.customerName || "Walk-in"}${ret.customerPhone && ret.customerPhone !== "-" ? ` (${ret.customerPhone})` : ""}${ret.customerCnic ? ` [${ret.customerCnic}]` : ""}`;
      
      const t = ret.totals;
      const gross = t.grossAmount || 0;
      const valExcl = t.wostAmount || gross / 1.18;
      const qty = t.totalItems || 0;
      const unitPriceWost = qty > 0 ? valExcl / qty : 0;
      const disc = t.discountAmount || 0;
      const discWost = t.discountWostAmount || disc / 1.18;
      const amtAfterDisc = t.amountAfterDiscount || Math.max(0, valExcl - discWost);
      const tax = t.taxAmount || 0;
      const valIncl = t.netAmount || 0;

      let subTypeBadgeColor = "#fef3c7; color: #92400e; border: 1px solid #fcd34d;";
      if (ret.subType === "REFUND_RF") {
        subTypeBadgeColor = "#ffe4e6; color: #9f1239; border: 1px solid #fda4af;";
      } else if (ret.subType === "CLAIM_CLM") {
        subTypeBadgeColor = "#f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe;";
      }

      rowChunks.push(`
        <tr>
          <td><strong>${ret.returnNumber}</strong></td>
          <td style="font-family: monospace;">${ret.originalOrderNumber || "-"}</td>
          <td>${ret.createdAt ? format(new Date(ret.createdAt), "yyyy-MM-dd HH:mm") : "-"}</td>
          <td><span style="display: inline-block; padding: 1px 4px; border-radius: 4px; font-size: 7px; font-weight: 700; background: ${subTypeBadgeColor}">${ret.subTypeLabel || ret.subType}</span></td>
          <td>${ret.refundMode || "VOUCHER"}</td>
          <td>${custDisplay}</td>
          <td>${ret.cashierName || "-"}</td>
          <td>${ret.locationName || "-"}</td>
          <td style="text-align: right; font-weight: 600;">${qty.toLocaleString()}</td>
          <td style="text-align: right;">Rs. ${unitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #b45309;">Rs. ${valExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #be123c;">Rs. ${discWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #1d4ed8;">Rs. ${amtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-weight: bold; color: #047857;">Rs. ${valIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="font-family: monospace; font-weight: 700; color: #b45309;">${ret.voucherCode ? `${ret.voucherCode} (Rs. ${(ret.voucherAmount || t.voucherIssuedAmount || 0).toLocaleString()})` : "-"}</td>
          <td style="text-align: right; color: #e11d48;">${t.cashRefund ? `Rs. ${t.cashRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right; color: #4338ca;">${t.cardRefund ? `Rs. ${t.cardRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="font-size: 7px; color: #64748b;">${ret.reason || "-"}</td>
        </tr>
      `);

      if (i % 80 === 0 || i === totalCount - 1) {
        const pct = Math.round(((i + 1) / Math.max(1, totalCount)) * 75) + 10;
        onProgress?.(
          pct,
          `Rendering return record ${i + 1} of ${totalCount.toLocaleString()}...`,
        );
        await yieldToMain();
      }
    }
  }

  onProgress?.(88, "Compiling print layout & summary metrics...");
  await yieldToMain();

  const grandQty = grandTotals.totalItems || 0;
  const grandValExcl = grandTotals.wostAmount || (grandTotals.grossAmount / 1.18);
  const grandUnitPriceWost = grandQty > 0 ? grandValExcl / grandQty : 0;
  const grandDiscWost = grandTotals.discountWostAmount || (grandTotals.discountAmount / 1.18);
  const grandAmtAfterDisc = grandTotals.amountAfterDiscount || Math.max(0, grandValExcl - grandDiscWost);
  const grandTax = grandTotals.taxAmount || 0;
  const grandValIncl = grandTotals.netAmount || 0;

  const rowsHtml = rowChunks.join("");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Sales Return List Report - ${dateStr}</title>
    <style>
      @page { size: landscape; margin: 6mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 7.5px; color: #1e293b; margin: 0; padding: 6px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
      .title { font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
      .subtitle { font-size: 9.5px; color: #64748b; margin-top: 2px; }
      .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-bottom: 10px; }
      .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; text-align: center; }
      .kpi-label { font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      .kpi-val { font-size: 10.5px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 7px; font-weight: 700; padding: 3px 5px; border: 1px solid #cbd5e1; text-align: left; }
      td { padding: 3px 5px; border: 1px solid #e2e8f0; font-size: 7.5px; }
      tr:nth-child(even) { background: #f8fafc; }
      tfoot td { background: #e2e8f0; font-weight: 800; font-size: 8px; border-top: 2px solid #94a3b8; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="title">Sales Return List / Register Report</div>
        <div class="subtitle">Location: <strong>${locationNames}</strong> &bull; Period: <strong>${fromDateStr} to ${toDateStr}</strong></div>
      </div>
      <div style="text-align: right; font-size: 8.5px; color: #64748b;">
        Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Returns Value</div>
        <div class="kpi-val" style="color: #b45309;">Rs. ${grandValIncl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Return Documents</div>
        <div class="kpi-val">${grandTotals.returnCount.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Items Returned</div>
        <div class="kpi-val">${grandTotals.totalItems.toLocaleString()} pcs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Vouchers Issued</div>
        <div class="kpi-val" style="color: #d97706;">Rs. ${grandTotals.voucherIssuedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cash Refunds</div>
        <div class="kpi-val" style="color: #e11d48;">Rs. ${grandTotals.cashRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Card Refunds</div>
        <div class="kpi-val" style="color: #4338ca;">Rs. ${grandTotals.cardRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Return #</th>
          <th>Orig. Invoice</th>
          <th>Date</th>
          <th>Sub Type</th>
          <th>Refund Mode</th>
          <th>Customer Details</th>
          <th>Cashier</th>
          <th>Location</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Price WOST</th>
          <th style="text-align: right;">Val Excl.</th>
          <th style="text-align: right;">Disc WOST</th>
          <th style="text-align: right;">Amt After Disc</th>
          <th style="text-align: right;">Sales Tax</th>
          <th style="text-align: right;">Val Incl.</th>
          <th>Voucher Issued</th>
          <th style="text-align: right;">Cash Ref</th>
          <th style="text-align: right;">Card Ref</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="8" style="text-align: right; text-transform: uppercase;">Grand Totals (${grandTotals.returnCount} returns):</td>
          <td style="text-align: right;">${grandQty.toLocaleString()}</td>
          <td style="text-align: right;">Rs. ${grandUnitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #b45309;">Rs. ${grandValExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #be123c;">Rs. ${grandDiscWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #1d4ed8;">Rs. ${grandAmtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${grandTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #047857; font-size: 8.5px;">Rs. ${grandValIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="color: #b45309;">Rs. ${grandTotals.voucherIssuedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #e11d48;">Rs. ${grandTotals.cashRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #4338ca;">Rs. ${grandTotals.cardRefund.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </body>
</html>`;

  onProgress?.(95, "Opening print preview dialog...");
  await yieldToMain();

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Unable to open print preview. Please ensure popups are allowed.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);

  onProgress?.(100, "Done");
}
