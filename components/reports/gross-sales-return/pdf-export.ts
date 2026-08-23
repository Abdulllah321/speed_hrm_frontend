"use client";

import { format } from "date-fns";
import { GrossSalesReturnNode, GrossSalesReturnTotals } from "./types";

export async function generateGrossSalesReturnPdf(opts: {
  returns: GrossSalesReturnNode[];
  grandTotals: GrossSalesReturnTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): Promise<void> {
  const { returns, grandTotals, dateRange, locationNames } = opts;

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  const rowsHtml = returns
    .slice(0, 1500)
    .map(
      (ret) => `
    <tr>
      <td>${ret.returnNumber}</td>
      <td>${ret.orderNumber}</td>
      <td>${format(new Date(ret.createdAt), "yyyy-MM-dd HH:mm")}</td>
      <td>${ret.customerName} (${ret.customerPhone})</td>
      <td>${ret.cashierName}</td>
      <td style="text-align: center;">${ret.paymentMethod}</td>
      <td>${ret.fbrInvoiceNumber || "-"}</td>
      <td style="text-align: right;">${ret.totals.totalItems}</td>
      <td style="text-align: right;">Rs. ${ret.totals.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; color: #b45309;">Rs. ${ret.totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right;">Rs. ${ret.totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: bold; color: #e11d48;">Rs. ${ret.totals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sales Return Register Report - ${dateStr}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 15px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 15px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; }
          .kpi-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 9px; font-weight: 700; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
          td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9.5px; }
          tr:nth-child(even) { background: #f8fafc; }
          tfoot td { background: #e2e8f0; font-weight: 800; font-size: 10px; border-top: 2px solid #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">POS Sales Return Register Report</div>
            <div class="subtitle">Location: <strong>${locationNames}</strong> &bull; Period: <strong>${fromDateStr} to ${toDateStr}</strong></div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Net Sales Returns</div>
            <div class="kpi-val" style="color: #e11d48;">Rs. ${grandTotals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Returns</div>
            <div class="kpi-val">${grandTotals.returnCount.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Items Returned</div>
            <div class="kpi-val">${grandTotals.totalItems.toLocaleString()} pcs</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gross Return Amt</div>
            <div class="kpi-val">Rs. ${grandTotals.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Return Discounts</div>
            <div class="kpi-val" style="color: #b45309;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Taxes</div>
            <div class="kpi-val">Rs. ${grandTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Return #</th>
              <th>Orig Order #</th>
              <th>Return Date</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th style="text-align: center;">Refund</th>
              <th>FBR Inv #</th>
              <th style="text-align: right;">Items</th>
              <th style="text-align: right;">Gross Return</th>
              <th style="text-align: right;">Disc Reversal</th>
              <th style="text-align: right;">Taxes</th>
              <th style="text-align: right;">Net Refund</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7">GRAND TOTAL (ALL SELECTED SALES RETURN NOTES)</td>
              <td style="text-align: right;">${grandTotals.totalItems.toLocaleString()}</td>
              <td style="text-align: right;">Rs. ${grandTotals.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #b45309;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #e11d48;">Rs. ${grandTotals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
