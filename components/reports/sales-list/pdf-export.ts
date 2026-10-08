"use client";

import { format } from "date-fns";
import { SalesListInvoiceNode, SalesListTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateSalesListPdf(opts: {
  invoices: SalesListInvoiceNode[];
  grandTotals: SalesListTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<void> {
  const { invoices, grandTotals, dateRange, locationNames, onProgress } = opts;

  onProgress?.(5, "Preparing printable document template...");
  await yieldToMain();

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const totalCount = Math.min(invoices.length, 3000);
  const rowChunks: string[] = [];

  if (totalCount === 0) {
    rowChunks.push(`
      <tr>
        <td colspan="25" style="text-align: center; padding: 24px; color: #64748b; font-size: 9px; font-weight: 600;">
          No sales invoices found matching the selected filters.
        </td>
      </tr>
    `);
  } else {
    for (let i = 0; i < totalCount; i++) {
      const inv = invoices[i];
      const custDisplay = `${inv.customerName || "Walk-in"}${inv.customerPhone && inv.customerPhone !== "-" ? ` (${inv.customerPhone})` : ""}${inv.customerCnic ? ` [${inv.customerCnic}]` : ""}`;
      
      const gross = inv.totals?.grossAmount || 0;
      const qty = inv.totals?.totalItems || 0;
      const unitPrice = qty > 0 ? gross / qty : 0;
      const valExcl = inv.totals?.wostAmount !== undefined ? inv.totals.wostAmount : (gross - (inv.totals.taxAmount || 0));
      const unitPriceWost = qty > 0 ? valExcl / qty : 0;
      const disc = inv.totals?.discountAmount || 0;
      const discWost = inv.totals?.discountWostAmount !== undefined ? inv.totals.discountWostAmount : (inv.discountDetails?.wostDiscount || disc - (inv.totals.taxAmount || 0));
      const amtAfterDisc = inv.totals?.amountAfterDiscount !== undefined ? inv.totals.amountAfterDiscount : Math.max(0, valExcl - discWost);
      const tax = inv.totals?.taxAmount || 0;
      const valIncl = inv.totals?.netAmount || 0;

      rowChunks.push(`
        <tr>
          <td><strong>${inv.orderNumber}</strong></td>
          <td>${inv.createdAt ? format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm") : "-"}</td>
          <td>${custDisplay}</td>
          <td>${inv.cashierName || "-"}</td>
          <td style="text-align: center;">${inv.paymentMethod || "-"}</td>
          <td>${inv.merchant || "-"}</td>
          <td style="font-family: monospace;">${inv.fbrInvoiceNumber || "-"}</td>
          <td style="text-align: right; font-weight: 600;">${qty.toLocaleString()}</td>
          <td style="text-align: right;">Rs. ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${unitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${valExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #b45309;">Rs. ${disc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #1d4ed8;">Rs. ${amtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-weight: bold; color: #047857;">Rs. ${valIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${inv.totals?.cashSale ? `Rs. ${inv.totals.cashSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right; color: #e11d48;">${inv.totals?.cashReturn ? `Rs. ${inv.totals.cashReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.cardSale ? `Rs. ${inv.totals.cardSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.creditSale ? `Rs. ${inv.totals.creditSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.giftVoucherAmount ? `Rs. ${inv.totals.giftVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.creditVoucherAmount ? `Rs. ${inv.totals.creditVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.exchangeVoucherAmount ? `Rs. ${inv.totals.exchangeVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.claimVoucherAmount ? `Rs. ${inv.totals.claimVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.giftVoucherCorporate ? `Rs. ${inv.totals.giftVoucherCorporate.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right; color: #b91c1c;">${inv.totals?.creditVoucherIssuedAmount ? `Rs. ${inv.totals.creditVoucherIssuedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="text-align: right;">${inv.totals?.rewardVoucherAmount ? `Rs. ${inv.totals.rewardVoucherAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
        </tr>
      `);

      if (i % 80 === 0 || i === totalCount - 1) {
        const pct = Math.round(((i + 1) / Math.max(1, totalCount)) * 75) + 10;
        onProgress?.(
          pct,
          `Rendering invoice ${i + 1} of ${totalCount.toLocaleString()}...`,
        );
        await yieldToMain();
      }
    }
  }

  onProgress?.(88, "Compiling print layout & summary metrics...");
  await yieldToMain();

  const grandGross = grandTotals.grossAmount || 0;
  const grandQty = grandTotals.totalItems || 0;
  const grandUnitPrice = grandQty > 0 ? grandGross / grandQty : 0;
  const grandValExcl = grandTotals.wostAmount !== undefined ? grandTotals.wostAmount : (grandGross - (inv.totals.taxAmount || 0));
  const grandUnitPriceWost = grandQty > 0 ? grandValExcl / grandQty : 0;
  const grandDisc = grandTotals.discountAmount || 0;
  const grandDiscWost = grandTotals.discountWostAmount !== undefined ? grandTotals.discountWostAmount : (grandDisc - (inv.totals.taxAmount || 0));
  const grandAmtAfterDisc = grandTotals.amountAfterDiscount !== undefined ? grandTotals.amountAfterDiscount : Math.max(0, grandValExcl - grandDiscWost);
  const grandTax = grandTotals.taxAmount || 0;
  const grandValIncl = grandTotals.netAmount || 0;

  const rowsHtml = rowChunks.join("");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Sales Invoice List Report - ${dateStr}</title>
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
        <div class="title">POS Sales Invoice List Report</div>
        <div class="subtitle">Location: <strong>${locationNames}</strong> &bull; Period: <strong>${fromDateStr} to ${toDateStr}</strong></div>
      </div>
      <div style="text-align: right; font-size: 8.5px; color: #64748b;">
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
          <th>Merchant</th>
          <th>FBR Inv #</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Unit Price WOST</th>
          <th style="text-align: right;">Value Excl.</th>
          <th style="text-align: right;">Discount</th>
          <th style="text-align: right;">Amt After Disc</th>
          <th style="text-align: right;">Sales Tax</th>
          <th style="text-align: right;">Value Incl.</th>
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
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="7">GRAND TOTAL (ALL SELECTED INVOICES)</td>
          <td style="text-align: right;">${grandQty.toLocaleString()}</td>
          <td style="text-align: right;">Rs. ${grandUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${grandUnitPriceWost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${grandValExcl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #b45309;">Rs. ${grandDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #1d4ed8;">Rs. ${grandAmtAfterDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${grandTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: #047857;">Rs. ${grandValIncl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        </tr>
      </tfoot>
    </table>

    <script>
      function triggerPrint() {
        window.focus();
        window.print();
      }
      if (document.readyState === 'complete') {
        setTimeout(triggerPrint, 400);
      } else {
        window.addEventListener('load', function() {
          setTimeout(triggerPrint, 400);
        });
      }
    </script>
  </body>
</html>`;

  onProgress?.(95, "Opening print preview window...");
  await yieldToMain();

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      // Handled by inline script
    }
  }, 500);

  onProgress?.(100, "Print document ready!");
}

