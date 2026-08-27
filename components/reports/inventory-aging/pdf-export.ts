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
  isPosLevel?: boolean;
  onProgress?: (percent: number, message: string) => void;
}) {
  const { items, totals, dateRange, activeSelectionNames, isPosLevel = false, onProgress } = params;
  
  onProgress?.(15, "Preparing PDF print layout...");

  const dateStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    onProgress?.(100, "Pop-up blocked. Could not open print window.");
    return;
  }

  onProgress?.(45, "Formatting items & aging brackets into HTML printable page...");

  const priceHeader = isPosLevel ? "Unit Price" : "Unit Cost";
  const valHeader = isPosLevel ? "Retail Valuation" : "Cost Valuation";

  const rowsHtml = items.slice(0, 1000).map((item, idx) => {
    const priceToDisplay = isPosLevel ? item.unitPrice : item.unitCost;
    return `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold;">${item.sku}</td>
      <td>${item.name}</td>
      <td>${item.brandName || ""}</td>
      <td>${item.categoryName || ""}</td>
      <td style="text-align: right;">Rs. ${priceToDisplay.toLocaleString()}</td>
      <td style="text-align: right; font-weight: bold;">${item.totalQty.toLocaleString()}</td>
      <td style="text-align: right; font-weight: bold; color: #4f46e5;">Rs. ${item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
      <td style="text-align: right;">${item.bucket0to6mQty}</td>
      <td style="text-align: right;">${item.bucket6to9mQty}</td>
      <td style="text-align: right;">${item.bucket9to12mQty}</td>
      <td style="text-align: right;">${item.bucket12to15mQty}</td>
      <td style="text-align: right;">${item.bucket15to18mQty}</td>
      <td style="text-align: right; color: #e11d48; font-weight: bold;">${item.bucket18mPlusQty}</td>
      <td style="text-align: center; font-weight: bold;">${item.avgAgeDays}d</td>
    </tr>
  `;
  }).join("");

  onProgress?.(80, "Rendering grand totals summary & document styles...");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Inventory Aging Report (${isPosLevel ? "POS" : "ERP"}) - ${dateStr}</title>
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
        <h1>INVENTORY AGING REPORT ${isPosLevel ? "(POS LEVEL - RETAIL)" : "(ERP LEVEL - COST)"}</h1>
        <p><strong>As of Date:</strong> ${dateStr} | <strong>Scope:</strong> ${activeSelectionNames}</p>
        
        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Total Stock Units</div>
            <div class="card-value">${totals.totalStockQty.toLocaleString()} pcs</div>
          </div>
          <div class="card">
            <div class="card-title">${valHeader}</div>
            <div class="card-value">Rs. ${totals.totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div class="card">
            <div class="card-title">Fresh (0-6M)</div>
            <div class="card-value">${totals.totalBucket0to6mQty.toLocaleString()} pcs</div>
          </div>
          <div class="card">
            <div class="card-title">Aged Stock (&gt;18M)</div>
            <div class="card-value" style="color: #e11d48;">${totals.totalBucket18mPlusQty.toLocaleString()} pcs</div>
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
              <th style="text-align: right;">${priceHeader}</th>
              <th style="text-align: right;">Total Qty</th>
              <th style="text-align: right;">${valHeader}</th>
              <th style="text-align: right;">0-6M</th>
              <th style="text-align: right;">6-9M</th>
              <th style="text-align: right;">9-12M</th>
              <th style="text-align: right;">12-15M</th>
              <th style="text-align: right;">15-18M</th>
              <th style="text-align: right;">&gt;18M</th>
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
              <td style="text-align: right;">${totals.totalBucket0to6mQty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket6to9mQty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket9to12mQty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket12to15mQty.toLocaleString()}</td>
              <td style="text-align: right;">${totals.totalBucket15to18mQty.toLocaleString()}</td>
              <td style="text-align: right; color: #fb7185;">${totals.totalBucket18mPlusQty.toLocaleString()}</td>
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

  onProgress?.(95, "Opening PDF print dialog...");

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  onProgress?.(100, "PDF document rendered successfully!");

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
