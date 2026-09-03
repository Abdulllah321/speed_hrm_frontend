"use client";

import { format } from "date-fns";
import { SalesListInvoiceNode, SalesListTotals } from "./types";

export async function generateSalesListPdf(opts: {
  invoices: SalesListInvoiceNode[];
  grandTotals: SalesListTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): Promise<void> {
  const { invoices, grandTotals, dateRange, locationNames } = opts;

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  const rowsHtml = invoices
    .slice(0, 1500)
    .map(
      (inv) => `
    <tr>
      <td>${inv.orderNumber}</td>
      <td>${format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm")}</td>
      <td>${inv.customerName} (${inv.customerPhone})</td>
      <td>${inv.cashierName}</td>
      <td style="text-align: center;">${inv.paymentMethod}</td>
      <td>${inv.fbrInvoiceNumber || "-"}</td>
      <td style="text-align: right;">${inv.totals.totalItems}</td>
      <td style="text-align: right;">Rs. ${inv.totals.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; color: #b45309;">Rs. ${inv.totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right;">Rs. ${inv.totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: bold; color: #047857;">Rs. ${inv.totals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right;">${inv.totals.cashSale ? `Rs. ${inv.totals.cashSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right; color: #e11d48;">${inv.totals.cashReturn ? `Rs. ${inv.totals.cashReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.cardSale ? `Rs. ${inv.totals.cardSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.creditSale ? `Rs. ${inv.totals.creditSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.giftVoucherAmount ? `Rs. ${inv.totals.giftVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.creditVoucherAmount ? `Rs. ${inv.totals.creditVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.exchangeVoucherAmount ? `Rs. ${inv.totals.exchangeVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.claimVoucherAmount ? `Rs. ${inv.totals.claimVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.giftVoucherCorporate ? `Rs. ${inv.totals.giftVoucherCorporate.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right; color: #b91c1c;">${inv.totals.creditVoucherIssuedAmount ? `Rs. ${inv.totals.creditVoucherIssuedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.rewardVoucherAmount ? `Rs. ${inv.totals.rewardVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="text-align: right;">${inv.totals.onCreditAmount ? `Rs. ${inv.totals.onCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sales Invoice List Report - ${dateStr}</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8px; color: #1e293b; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
          .title { font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 10px; color: #64748b; margin-top: 3px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 12px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center; }
          .kpi-label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 7.5px; font-weight: 700; padding: 4px 6px; border: 1px solid #cbd5e1; text-align: left; }
          td { padding: 4px 6px; border: 1px solid #e2e8f0; font-size: 8px; }
          tr:nth-child(even) { background: #f8fafc; }
          tfoot td { background: #e2e8f0; font-weight: 800; font-size: 8.5px; border-top: 2px solid #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">POS Sales Invoice List Report</div>
            <div class="subtitle">Location: <strong>${locationNames}</strong> &bull; Period: <strong>${fromDateStr} to ${toDateStr}</strong></div>
          </div>
          <div style="text-align: right; font-size: 9px; color: #64748b;">
            Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Net Sales</div>
            <div class="kpi-val" style="color: #047857;">Rs. ${grandTotals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Invoices</div>
            <div class="kpi-val">${grandTotals.orderCount.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Items Sold</div>
            <div class="kpi-val">${grandTotals.totalItems.toLocaleString()} pcs</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cash Sales</div>
            <div class="kpi-val">Rs. ${grandTotals.cashSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Card Sales</div>
            <div class="kpi-val">Rs. ${grandTotals.cardSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Credit Sales</div>
            <div class="kpi-val">Rs. ${grandTotals.creditSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th style="text-align: center;">Payment</th>
              <th>FBR Inv #</th>
              <th style="text-align: right;">Items</th>
              <th style="text-align: right;">Gross Amt</th>
              <th style="text-align: right;">Discount</th>
              <th style="text-align: right;">Taxes</th>
              <th style="text-align: right;">Net Sales</th>
              <th style="text-align: right;">Cash Sale</th>
              <th style="text-align: right;">Cash Return</th>
              <th style="text-align: right;">Card Sale</th>
              <th style="text-align: right;">Credit Sale</th>
              <th style="text-align: right;">Gift Voucher</th>
              <th style="text-align: right;">Credit Voucher</th>
              <th style="text-align: right;">Exchange Voucher</th>
              <th style="text-align: right;">Claim Voucher</th>
              <th style="text-align: right;">Corporate Gift</th>
              <th style="text-align: right;">Credit Issued</th>
              <th style="text-align: right;">Reward Voucher</th>
              <th style="text-align: right;">On Credit</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6">GRAND TOTAL (ALL SELECTED INVOICES)</td>
              <td style="text-align: right;">${grandTotals.totalItems.toLocaleString()}</td>
              <td style="text-align: right;">Rs. ${grandTotals.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #b45309;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #047857;">Rs. ${grandTotals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.cashSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #e11d48;">Rs. ${grandTotals.cashReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.cardSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.creditSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.giftVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.creditVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.exchangeVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.claimVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.giftVoucherCorporate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #b91c1c;">Rs. ${grandTotals.creditVoucherIssuedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.rewardVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.onCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
