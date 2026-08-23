import {
  InventoryAgingRecord,
  InventoryAgingTotals,
  LocationHeader,
  WarehouseHeader,
} from "./types";
import { DateRange } from "@/components/ui/date-range-picker";
import { registerInventoryAgingClientExport } from "@/lib/actions/inventory-aging";

export async function generateInventoryAgingPdf(params: {
  items: InventoryAgingRecord[];
  totals: InventoryAgingTotals;
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
  dateRange: DateRange;
  reportType: "merged" | "separate";
  activeSelectionNames: string;
}) {
  const { items, totals, dateRange, activeSelectionNames } = params;
  const dateStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const rowsHtml = items.slice(0, 1000).map((item, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold;">${item.sku}</td>
      <td>${item.name}</td>
      <td>${item.brandName || ""}</td>
      <td>${item.categoryName || ""}</td>
      <td style="text-align: right;">Rs. ${item.unitCost.toLocaleString()}</td>
      <td style="text-align: right; font-weight: bold;">${item.totalQty.toLocaleString()}</td>
      <td style="text-align: right; font-weight: bold; color: #4f46e5;">Rs. ${item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
      <td style="text-align: right;">${item.bucket0to30Qty}</td>
      <td style="text-align: right;">${item.bucket31to60Qty}</td>
      <td style="text-align: right;">${item.bucket61to90Qty}</td>
      <td style="text-align: right;">${item.bucket91to120Qty}</td>
      <td style="text-align: right;">${item.bucket121to180Qty}</td>
      <td style="text-align: right; color: #e11d48; font-weight: bold;">${item.bucket181PlusQty}</td>
      <td style="text-align: center; font-weight: bold;">${item.avgAgeDays}d</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Inventory Aging Report - ${dateStr}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #0f172a; margin: 20px; }
          h1 { font-size: 18px; margin: 0 0 5px 0; color: #0f172a; }
          p { margin: 2px 0; color: #475569; font-size: 11px; }
          .summary-cards { display: flex; gap: 15px; margin: 15px 0; }
          .card { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; flex: 1; }
          .card-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .card-value { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          .footer-row td { background: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>INVENTORY AGING REPORT</h1>
        <p><strong>As of Date:</strong> ${dateStr} | <strong>Scope:</strong> ${activeSelectionNames}</p>
        
        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Total Stock Units</div>
            <div class="card-value">${totals.totalStockQty.toLocaleString()} pcs</div>
          </div>
          <div class="card">
            <div class="card-title">Total Valuation</div>
            <div class="card-value">Rs. ${totals.totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div class="card">
            <div class="card-title">Fresh (0-30d)</div>
            <div class="card-value">${totals.totalBucket0to30Qty.toLocaleString()} pcs</div>
          </div>
          <div class="card">
            <div class="card-title">Aged Stock (181+d)</div>
            <div class="card-value" style="color: #e11d48;">${totals.totalBucket181PlusQty.toLocaleString()} pcs</div>
          </div>
          <div class="card">
            <div class="card-title">Overall Avg Age</div>
            <div class="card-value">${totals.overallAvgAgeDays} Days</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>SKU</th>
              <th>Item Description</th>
              <th>Brand</th>
              <th>Category</th>
              <th style="text-align: right;">Unit Cost</th>
              <th style="text-align: right;">Total Qty</th>
              <th style="text-align: right;">Valuation</th>
              <th style="text-align: right;">0-30d</th>
              <th style="text-align: right;">31-60d</th>
              <th style="text-align: right;">61-90d</th>
              <th style="text-align: right;">91-120d</th>
              <th style="text-align: right;">121-180d</th>
              <th style="text-align: right;">181+d</th>
              <th style="text-align: center;">Avg Age</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="footer-row">
              <td colspan="6">GRAND TOTAL (${totals.totalItems} SKUs)</td>
              <td style="text-align: right;">${totals.totalStockQty.toLocaleString()}</td>
              <td style="text-align: right;">Rs. ${totals.totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td style="text-align: right;">${totals.totalBucket0to30Qty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket31to60Qty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket61to90Qty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket91to120Qty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket121to180Qty.toLocaleString()}</td>
              <td style="text-align: right; color: #fb7185;">${totals.totalBucket181PlusQty.toLocaleString()}</td>
              <td style="text-align: center;">${totals.overallAvgAgeDays}d</td>
            </tr>
          </tfoot>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Background S3 Sync
  try {
    const fileName = `inventory-aging-report-${dateStr}.pdf`;
    const blob = new Blob([html], { type: "text/html" });
    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("fileName", fileName);
    formData.append("format", "html");
    await registerInventoryAgingClientExport(formData);
  } catch (err) {
    console.warn("Background S3 PDF export registration failed:", err);
  }
}
