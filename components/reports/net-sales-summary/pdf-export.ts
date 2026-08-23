"use client";

import { format } from "date-fns";
import { NetSalesSummaryCategoryNode, NetSalesSummaryTotals } from "./types";

export async function generateNetSalesSummaryPdf(opts: {
  categories: NetSalesSummaryCategoryNode[];
  grandTotals: NetSalesSummaryTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): Promise<void> {
  const { categories, grandTotals, dateRange, locationNames } = opts;

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  const rowsHtml = categories
    .slice(0, 1500)
    .map(
      (cat) => `
    <tr>
      <td>${cat.categoryName}</td>
      <td>${cat.brandName}</td>
      <td style="text-align: right;">${cat.totals.totalItemsSold}</td>
      <td style="text-align: right; color: #e11d48;">${cat.totals.totalItemsReturned}</td>
      <td style="text-align: right; font-weight: bold;">${cat.totals.netItems}</td>
      <td style="text-align: right;">Rs. ${cat.totals.grossSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; color: #e11d48;">Rs. ${cat.totals.returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; color: #b45309;">Rs. ${cat.totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right;">Rs. ${cat.totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: bold; color: #047857;">Rs. ${cat.totals.netSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Net Sales Summary Report - ${dateStr}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 15px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 15px; }
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
            <div class="title">POS Net Sales Category Summary</div>
            <div class="subtitle">Location: <strong>${locationNames}</strong> &bull; Period: <strong>${fromDateStr} to ${toDateStr}</strong></div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Net Sales Revenue</div>
            <div class="kpi-val" style="color: #047857;">Rs. ${grandTotals.netSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Net Units Sold</div>
            <div class="kpi-val">${grandTotals.netItems.toLocaleString()} pcs</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gross Sales</div>
            <div class="kpi-val">Rs. ${grandTotals.grossSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Returns & Refunds</div>
            <div class="kpi-val" style="color: #e11d48;">Rs. ${grandTotals.returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Discounts</div>
            <div class="kpi-val" style="color: #b45309;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Brand</th>
              <th style="text-align: right;">Sold Qty</th>
              <th style="text-align: right;">Ret Qty</th>
              <th style="text-align: right;">Net Qty</th>
              <th style="text-align: right;">Gross Sales</th>
              <th style="text-align: right;">Returns</th>
              <th style="text-align: right;">Discounts</th>
              <th style="text-align: right;">Taxes</th>
              <th style="text-align: right;">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">GRAND TOTAL (NET REVENUE SUMMARY)</td>
              <td style="text-align: right;">${grandTotals.totalItemsSold.toLocaleString()}</td>
              <td style="text-align: right; color: #e11d48;">${grandTotals.totalItemsReturned.toLocaleString()}</td>
              <td style="text-align: right;">${grandTotals.netItems.toLocaleString()}</td>
              <td style="text-align: right;">Rs. ${grandTotals.grossSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #e11d48;">Rs. ${grandTotals.returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #b45309;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #047857;">Rs. ${grandTotals.netSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
