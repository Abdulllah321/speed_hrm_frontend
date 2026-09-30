"use client";

import { format } from "date-fns";
import { GrossSalesReturnNode, GrossSalesReturnTotals, GrossSalesReturnFlatRecord } from "./types";

export async function generateGrossSalesReturnPdf(opts: {
  flatItems?: GrossSalesReturnFlatRecord[];
  returns?: GrossSalesReturnNode[];
  grandTotals: GrossSalesReturnTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<void> {
  const { flatItems = [], grandTotals, dateRange, locationNames, onProgress } = opts;
  onProgress?.(30, "Compiling PDF document layout...");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  const rowsHtml = flatItems
    .slice(0, 1500)
    .map((item) => {
      const qty = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const priceWost = unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0;
      const totalWost = item.wostAmount || Math.round((qty * priceWost) * 100) / 100;
      const discAmt = item.discountAmount || 0;
      const discWostAmt = item.discountWostAmount !== undefined ? item.discountWostAmount : Math.round((discAmt / 1.18) * 100) / 100;
      const valExTax = item.amountAfterDiscount !== undefined ? item.amountAfterDiscount : Math.max(0, Math.round((totalWost - discWostAmt) * 100) / 100);
      const taxAmt = item.taxAmount || 0;
      const valInclTax = item.subTotal || Math.round((valExTax + taxAmt) * 100) / 100;

      return `
    <tr>
      <td>${item.locationName || "Main Outlet"}</td>
      <td>${item.brandName || "-"}</td>
      <td>${item.divisionName || "-"}</td>
      <td>${item.categoryName || "-"}</td>
      <td>${item.silhouetteName || "-"}</td>
      <td>${item.genderName || "-"}</td>
      <td style="font-family: monospace;">${item.sku || item.barCode || "-"}</td>
      <td>${item.description || "-"}</td>
      <td>${item.sizeName || "-"}</td>
      <td>${item.colorName || "-"}</td>
      <td style="text-align: right; font-family: monospace; font-weight: bold; color: #e11d48;">${qty.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace;">Rs. ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace;">Rs. ${priceWost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; color: #4338ca;">Rs. ${totalWost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; color: #d97706;">Rs. ${discAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; color: #0284c7;">Rs. ${valExTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace;">Rs. ${taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; font-weight: bold; color: #e11d48;">Rs. ${valInclTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>POS Sales Return Register Report - ${dateStr}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 15px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 15px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; }
          .kpi-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 8px; font-weight: 700; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace; }
          td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9px; }
          tr:nth-child(even) { background: #f8fafc; }
          tfoot td { background: #e2e8f0; font-weight: 800; font-size: 9.5px; border-top: 2px solid #94a3b8; }
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
            <div class="kpi-val" style="color: #e11d48;">Rs. ${(grandTotals.valueInclSalesTax || grandTotals.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
            <div class="kpi-label">Total Price WOST</div>
            <div class="kpi-val">Rs. ${grandTotals.wostAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
              <th>Outlet</th>
              <th>Brand</th>
              <th>Division</th>
              <th>Category</th>
              <th>Silhouette</th>
              <th>Gender</th>
              <th>SKU / Barcode</th>
              <th>Description</th>
              <th>Size</th>
              <th>Color</th>
              <th style="text-align: right;">Return Qty</th>
              <th style="text-align: right;">UnitPrice</th>
              <th style="text-align: right;">Price WOST</th>
              <th style="text-align: right;">Total WOST</th>
              <th style="text-align: right;">Disc Reversal</th>
              <th style="text-align: right;">Val Excl Tax</th>
              <th style="text-align: right;">Tax</th>
              <th style="text-align: right;">Net Refund</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="10">GRAND TOTAL SUMMARY (${flatItems.length.toLocaleString()} ITEMS)</td>
              <td style="text-align: right; color: #e11d48;">${grandTotals.totalItems.toLocaleString()}</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right; color: #4338ca;">Rs. ${grandTotals.wostAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #b45309;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #0284c7;">Rs. ${(grandTotals.valueExSalesTax || grandTotals.amountAfterDiscount || Math.max(0, Math.round((grandTotals.wostAmount - (grandTotals.discountWostAmount || grandTotals.discountAmount / 1.18)) * 100) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #e11d48;">Rs. ${(grandTotals.valueInclSalesTax || grandTotals.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

