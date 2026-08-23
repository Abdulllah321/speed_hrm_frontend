"use client";

import { format } from "date-fns";
import { AllianceRegisterRecord, AllianceRegisterTotals } from "./types";

export async function generateAllianceRegisterPdf(opts: {
  records: AllianceRegisterRecord[];
  grandTotals: AllianceRegisterTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): Promise<void> {
  const { records, grandTotals, dateRange, locationNames } = opts;

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  const rowsHtml = records
    .slice(0, 1500)
    .map(
      (row) => `
    <tr>
      <td style="font-family: monospace; font-weight: bold;">${row.invoiceNo}</td>
      <td>${row.date}</td>
      <td>${row.time}</td>
      <td style="text-align: right; font-family: monospace;">$${row.retailPrice.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace;">$${row.retailWost.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace; color: #e11d48; font-weight: bold;">$${row.discount.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace;">$${row.sTax.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace; font-weight: bold; color: #059669;">$${row.netSale.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace;">$${row.cash.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace;">$${row.card.toFixed(2)}</td>
      <td style="font-family: monospace;">${row.prefixCardNo || "-"}</td>
      <td style="font-family: monospace;">${row.authId || "-"}</td>
      <td style="font-family: monospace;">${row.cardNo ? `****${row.cardNo}` : "-"}</td>
      <td style="font-weight: 600; color: #312e81;">${row.allianceOption || "-"}</td>
      <td style="color: #64748b;">${row.remarks || "-"}</td>
    </tr>
  `
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Alliance Register Report - ${dateStr}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-b: 2px solid #e2e8f0; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
          .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
          th { background: #1e1b4b; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 700; text-transform: uppercase; font-size: 9px; font-family: monospace; }
          td { border-bottom: 1px solid #e2e8f0; padding: 6px 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          tfoot tr td { background: #312e81; color: #ffffff; font-weight: 800; font-size: 10px; border-top: 2px solid #1e1b4b; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Alliance Register Report</div>
            <div class="meta">Outlet Selection: <strong>${locationNames}</strong> | Period: <strong>${fromDateStr}</strong> to <strong>${toDateStr}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: #475569;">SPEED LIMIT ERP POS</div>
            <div class="meta">Printed: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Alliance Memos</div>
            <div class="kpi-val">${grandTotals.count.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Retail Value</div>
            <div class="kpi-val">$${grandTotals.retailPrice.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Discount Availed</div>
            <div class="kpi-val" style="color: #e11d48;">$${grandTotals.discount.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Net Sales Revenue</div>
            <div class="kpi-val" style="color: #059669;">$${grandTotals.netSale.toFixed(2)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Time</th>
              <th style="text-align: right;">Retail Price</th>
              <th style="text-align: right;">Retail WOST</th>
              <th style="text-align: right;">Discount</th>
              <th style="text-align: right;">S. Tax</th>
              <th style="text-align: right;">Net Sale</th>
              <th style="text-align: right;">Cash</th>
              <th style="text-align: right;">Card</th>
              <th>BIN / Prefix</th>
              <th>Auth ID</th>
              <th>Card No</th>
              <th>Alliance Option</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">GRAND TOTAL SUMMARY (${records.length.toLocaleString()} TRANSACTIONS)</td>
              <td style="text-align: right;">$${grandTotals.retailPrice.toFixed(2)}</td>
              <td style="text-align: right;">$${grandTotals.retailWost.toFixed(2)}</td>
              <td style="text-align: right; color: #fda4af;">$${grandTotals.discount.toFixed(2)}</td>
              <td style="text-align: right;">$${grandTotals.sTax.toFixed(2)}</td>
              <td style="text-align: right; color: #6ee7b7;">$${grandTotals.netSale.toFixed(2)}</td>
              <td style="text-align: right;">$${grandTotals.cash.toFixed(2)}</td>
              <td style="text-align: right;">$${grandTotals.card.toFixed(2)}</td>
              <td colspan="5">-</td>
            </tr>
          </tfoot>
        </table>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
