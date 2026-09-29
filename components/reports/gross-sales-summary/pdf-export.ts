"use client";

import { format } from "date-fns";
import { GrossSalesSummaryFlatRecord, GrossSalesSummaryTotals } from "./types";

export async function generateGrossSalesSummaryPdf(opts: {
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<void> {
  const { flatItems, grandTotals, dateRange, locationNames, onProgress } = opts;

  onProgress?.(10, "Initializing PDF layout...");

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fromDateStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start";
  const toDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End";

  onProgress?.(35, "Rendering table rows...");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to open the PDF print view.");
    return;
  }

  const rowsHtml = flatItems
    .slice(0, 1500)
    .map(
      (item) => {
        const qty = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const priceWost = unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0;
        const totalWost = item.wostAmount || Math.round((qty * priceWost) * 100) / 100;
        const discAmt = item.discountAmount || 0;
        const valExTax = Math.round((totalWost - discAmt) * 100) / 100;
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
      <td style="text-align: right; font-family: monospace; font-weight: bold;">${qty.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace;">Rs. ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace;">Rs. ${priceWost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; color: #4338ca;">Rs. ${totalWost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; color: #d97706;">Rs. ${discAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; color: #0284c7;">Rs. ${valExTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace;">Rs. ${taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-family: monospace; font-weight: bold; color: #059669;">Rs. ${valInclTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `;
      }
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Gross Sales Summary Report - ${dateStr}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
          .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9px; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 6px 8px; font-weight: 700; text-transform: uppercase; font-size: 8px; font-family: monospace; }
          td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          tfoot tr td { background: #e2e8f0; font-weight: 800; font-size: 9px; border-top: 2px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Gross Sales Summary Report</div>
            <div class="meta">Outlet Selection: <strong>${locationNames}</strong> | Date Period: <strong>${fromDateStr}</strong> to <strong>${toDateStr}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: #475569;">SPEED LIMIT ERP POS</div>
            <div class="meta">Printed: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Orders Processed</div>
            <div class="kpi-val">${grandTotals.orderCount.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Sold Items</div>
            <div class="kpi-val">${grandTotals.totalItems.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Discounts</div>
            <div class="kpi-val" style="color: #d97706;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gross Revenue</div>
            <div class="kpi-val" style="color: #059669;">Rs. ${(grandTotals.valueInclSalesTax || grandTotals.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
              <th style="text-align: right;">Sold Qty</th>
              <th style="text-align: right;">UnitPrice</th>
              <th style="text-align: right;">Price WOST</th>
              <th style="text-align: right;">Total WOST</th>
              <th style="text-align: right;">Discount</th>
              <th style="text-align: right;">Val Excl Tax</th>
              <th style="text-align: right;">Tax</th>
              <th style="text-align: right;">Val Incl Tax</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="10">GRAND TOTAL SUMMARY (${flatItems.length.toLocaleString()} ITEMS)</td>
              <td style="text-align: right;">${grandTotals.totalItems.toLocaleString()}</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right; color: #4338ca;">Rs. ${grandTotals.wostAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #d97706;">Rs. ${grandTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #0284c7;">Rs. ${(grandTotals.valueExSalesTax || (grandTotals.wostAmount - grandTotals.discountAmount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">Rs. ${grandTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #059669;">Rs. ${(grandTotals.valueInclSalesTax || grandTotals.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
