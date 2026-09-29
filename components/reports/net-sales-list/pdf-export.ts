"use client";

import { format } from "date-fns";
import { NetSalesListDocumentNode, NetSalesListTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateNetSalesListPdf(opts: {
  documents: NetSalesListDocumentNode[];
  grandTotals: NetSalesListTotals | null;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<void> {
  const { documents, grandTotals, dateRange, locationNames, onProgress } = opts;

  onProgress?.(10, "Preparing printable net sales report...");
  await yieldToMain();

  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const totalCount = Math.min(documents.length, 2500);
  const rowChunks: string[] = [];

  const formatNumber = (num?: number) =>
    (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (totalCount === 0) {
    rowChunks.push(`
      <tr>
        <td colspan="15" style="text-align: center; padding: 24px; color: #64748b; font-size: 10px;">
          No transactions match the selected filters.
        </td>
      </tr>
    `);
  } else {
    for (let i = 0; i < totalCount; i++) {
      const doc = documents[i];
      const isReturn = doc.docType === "RETURN";
      const sign = isReturn ? -1 : 1;
      const t = doc.totals;

      const badgeColor = isReturn ? "#e11d48" : "#047857";
      const badgeBg = isReturn ? "#ffe4e6" : "#d1fae5";
      const textColor = isReturn ? "#be123c" : "#0f172a";

      rowChunks.push(`
        <tr style="background-color: ${isReturn ? "#fff1f2" : "#ffffff"};">
          <td><span style="background:${badgeBg}; color:${badgeColor}; font-weight:bold; padding:2px 6px; border-radius:4px; font-size:9px;">${doc.docType}</span></td>
          <td style="font-family: monospace; font-weight: bold;">${doc.docNumber}${doc.refDocNumber ? `<br/><span style="font-size:8px; color:#64748b;">(Ref: ${doc.refDocNumber})</span>` : ""}</td>
          <td>${format(new Date(doc.createdAt), "yyyy-MM-dd HH:mm")}</td>
          <td>${doc.locationName}</td>
          <td>${doc.cashierName}</td>
          <td>${doc.customerName}${doc.customerPhone ? `<br/><span style="font-size:8px; color:#64748b;">${doc.customerPhone}</span>` : ""}</td>
          <td>${doc.paymentMethod}</td>
          <td style="text-align: right; font-weight: bold; color:${textColor};">${sign * Math.abs(t.totalItems)}</td>
          <td style="text-align: right; color:${textColor};">Rs. ${formatNumber(sign * Math.abs(t.wostAmount))}</td>
          <td style="text-align: right; color:#64748b;">Rs. ${formatNumber(sign * Math.abs(t.grossAmount))}</td>
          <td style="text-align: right; color:#b45309;">Rs. ${formatNumber(sign * Math.abs(t.discountWostAmount))}</td>
          <td style="text-align: right; color:#64748b;">Rs. ${formatNumber(sign * Math.abs(t.taxAmount))}</td>
          <td style="text-align: right; font-weight: bold; color:${badgeColor};">Rs. ${formatNumber(sign * Math.abs(t.netAmount))}</td>
          <td style="text-align: right;">${t.cashAmount ? `Rs. ${formatNumber(isReturn ? -t.cashAmount : t.cashAmount)}` : "-"}</td>
          <td style="text-align: right;">${t.cardAmount ? `Rs. ${formatNumber(isReturn ? -t.cardAmount : t.cardAmount)}` : "-"}</td>
        </tr>
      `);
    }
  }

  const rowsHtml = rowChunks.join("");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Speed Limit - Net Sales List Report</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 8mm 6mm;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        background: #fff;
        font-size: 8.5px;
        line-height: 1.25;
        margin: 0;
        padding: 0;
      }
      .header-wrap {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .brand-title {
        font-size: 16px;
        font-weight: 900;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        margin: 0;
      }
      .report-title {
        font-size: 13px;
        font-weight: 700;
        color: #047857;
        margin: 2px 0 0 0;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 12px;
      }
      .meta-item span {
        font-size: 8px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 600;
      }
      .meta-item p {
        margin: 2px 0 0 0;
        font-weight: bold;
        font-size: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8px;
      }
      th {
        background: #0f172a;
        color: #fff;
        font-weight: 700;
        text-align: left;
        padding: 5px 6px;
        border: 1px solid #334155;
        font-size: 8px;
        text-transform: uppercase;
      }
      td {
        padding: 4px 6px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
      }
      tfoot td {
        background: #f1f5f9;
        font-weight: bold;
        border-top: 2px solid #0f172a;
        padding: 6px;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <div class="header-wrap">
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 class="brand-title">SPEED LIMIT RETAIL APPAREL</h1>
          <h2 class="report-title">NET SALES REGISTER & AUDIT REPORT</h2>
        </div>
        <div style="text-align: right; font-size: 8.5px; color: #64748b;">
          <strong>Date Range:</strong> ${fromDateStr} to ${toDateStr}<br/>
          <strong>Stores:</strong> ${locationNames}<br/>
          <strong>Generated:</strong> ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
        </div>
      </div>
    </div>

    ${
      grandTotals
        ? `
    <div class="meta-grid">
      <div class="meta-item">
        <span>Net Sales Revenue</span>
        <p style="color:#047857; font-size:12px;">PKR ${formatNumber(grandTotals.totalNetAmount)}</p>
        <span style="font-size:7.5px; color:#64748b;">Gross WOST: ${formatNumber(grandTotals.netWostAmount)}</span>
      </div>
      <div class="meta-item">
        <span>Transactions & Items</span>
        <p>${grandTotals.totalDocuments} Docs (${grandTotals.netItems} pcs)</p>
        <span style="font-size:7.5px; color:#64748b;">${grandTotals.salesOrderCount} Sold / ${grandTotals.returnCount} Returned</span>
      </div>
      <div class="meta-item">
        <span>Discounts & Taxes</span>
        <p style="color:#b45309;">Disc: PKR ${formatNumber(grandTotals.netDiscountWostAmount)}</p>
        <span style="font-size:7.5px; color:#64748b;">Tax: PKR ${formatNumber(grandTotals.netTaxAmount)}</span>
      </div>
      <div class="meta-item">
        <span>Cash / Card Settlement</span>
        <p>Cash: ${formatNumber(grandTotals.netCash)}</p>
        <span style="font-size:7.5px; color:#64748b;">Card: ${formatNumber(grandTotals.netCard)}</span>
      </div>
    </div>`
        : ""
    }

    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Doc #</th>
          <th>Date</th>
          <th>Store</th>
          <th>Cashier</th>
          <th>Customer</th>
          <th>Payment</th>
          <th style="text-align: right;">Net Qty</th>
          <th style="text-align: right;">Gross WOST</th>
          <th style="text-align: right;">Retail Gross</th>
          <th style="text-align: right;">Disc WOST</th>
          <th style="text-align: right;">Tax</th>
          <th style="text-align: right;">Net Amount</th>
          <th style="text-align: right;">Cash</th>
          <th style="text-align: right;">Card</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      ${
        grandTotals
          ? `
      <tfoot>
        <tr>
          <td colspan="7">GRAND TOTAL (${grandTotals.totalDocuments} TRANSACTIONS)</td>
          <td style="text-align: right;">${grandTotals.netItems.toLocaleString()}</td>
          <td style="text-align: right;">Rs. ${formatNumber(grandTotals.netWostAmount)}</td>
          <td style="text-align: right;">Rs. ${formatNumber(grandTotals.netGrossAmount)}</td>
          <td style="text-align: right; color:#b45309;">Rs. ${formatNumber(grandTotals.netDiscountWostAmount)}</td>
          <td style="text-align: right;">Rs. ${formatNumber(grandTotals.netTaxAmount)}</td>
          <td style="text-align: right; color:#047857;">Rs. ${formatNumber(grandTotals.totalNetAmount)}</td>
          <td style="text-align: right;">Rs. ${formatNumber(grandTotals.netCash)}</td>
          <td style="text-align: right;">Rs. ${formatNumber(grandTotals.netCard)}</td>
        </tr>
      </tfoot>`
          : ""
      }
    </table>

    <script>
      function triggerPrint() {
        window.focus();
        window.print();
      }
      if (document.readyState === 'complete') {
        setTimeout(triggerPrint, 350);
      } else {
        window.addEventListener('load', function() {
          setTimeout(triggerPrint, 350);
        });
      }
    </script>
  </body>
</html>`;

  onProgress?.(90, "Opening print preview...");
  await yieldToMain();

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the print view.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
