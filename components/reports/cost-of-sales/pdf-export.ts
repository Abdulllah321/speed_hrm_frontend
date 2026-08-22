import { format } from "date-fns";
import { COMPANY_NAME } from "@/lib/utils";
import { CostOfSalesBrandNode, CostOfSalesTotals } from "./types";

export function generateCostOfSalesPdfHtml(opts: {
  brands: CostOfSalesBrandNode[];
  grandTotals: CostOfSalesTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): string {
  const { brands, grandTotals, dateRange, locationNames } = opts;
  const fromStr = dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start";
  const toStr = dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End";

  let rowsHtml = "";

  const formatVal = (val?: number) => (val === undefined || val === 0 ? "-" : val.toLocaleString());
  const formatPrice = (val?: number) =>
    val === undefined || val === 0 ? "-" : `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  for (const brand of brands) {
    rowsHtml += `
      <tr class="level-brand">
        <td colspan="5" style="padding-left: 8px;">BRAND: ${brand.brandName.toUpperCase()}</td>
        <td style="text-align: right;">${formatVal(brand.totals.quantity)}</td>
        <td style="text-align: right;">${formatPrice(brand.totals.avgUnitCost)}</td>
        <td style="text-align: right; color: #d97706;">${formatPrice(brand.totals.totalCost)}</td>
        <td style="text-align: right; color: #059669;">${formatPrice(brand.totals.totalRevenue)}</td>
        <td style="text-align: right; color: #0d9488;">${formatPrice(brand.totals.grossProfit)}</td>
        <td style="text-align: right;">${brand.totals.profitMargin}%</td>
      </tr>
    `;

    for (const div of brand.divisions) {
      rowsHtml += `
        <tr class="level-division">
          <td colspan="5" style="padding-left: 18px;">DIVISION: ${div.divisionName.toUpperCase()}</td>
          <td style="text-align: right;">${formatVal(div.totals.quantity)}</td>
          <td style="text-align: right;">${formatPrice(div.totals.avgUnitCost)}</td>
          <td style="text-align: right; color: #d97706;">${formatPrice(div.totals.totalCost)}</td>
          <td style="text-align: right; color: #059669;">${formatPrice(div.totals.totalRevenue)}</td>
          <td style="text-align: right; color: #0d9488;">${formatPrice(div.totals.grossProfit)}</td>
          <td style="text-align: right;">${div.totals.profitMargin}%</td>
        </tr>
      `;

      for (const gender of div.genders) {
        for (const cat of gender.categories) {
          rowsHtml += `
            <tr class="level-category">
              <td colspan="5" style="padding-left: 28px;">CATEGORY: ${cat.categoryName.toUpperCase()}</td>
              <td style="text-align: right;">${formatVal(cat.totals.quantity)}</td>
              <td style="text-align: right;">${formatPrice(cat.totals.avgUnitCost)}</td>
              <td style="text-align: right; color: #d97706;">${formatPrice(cat.totals.totalCost)}</td>
              <td style="text-align: right; color: #059669;">${formatPrice(cat.totals.totalRevenue)}</td>
              <td style="text-align: right; color: #0d9488;">${formatPrice(cat.totals.grossProfit)}</td>
              <td style="text-align: right;">${cat.totals.profitMargin}%</td>
            </tr>
          `;

          for (const prod of cat.products) {
            rowsHtml += `
              <tr class="level-article">
                <td style="padding-left: 38px; font-weight: bold; color: #0f172a;">${prod.description}</td>
                <td style="font-family: monospace; font-weight: bold;">${prod.sku}</td>
                <td style="font-family: monospace; color: #64748b;">All Barcodes</td>
                <td style="text-align: center;">All Sizes</td>
                <td style="text-align: center;">All Colors</td>
                <td style="text-align: right; font-weight: bold;">${formatVal(prod.totals.quantity)}</td>
                <td style="text-align: right;">${formatPrice(prod.totals.avgUnitCost)}</td>
                <td style="text-align: right; font-weight: bold; color: #d97706;">${formatPrice(prod.totals.totalCost)}</td>
                <td style="text-align: right; font-weight: bold; color: #059669;">${formatPrice(prod.totals.totalRevenue)}</td>
                <td style="text-align: right; font-weight: bold; color: #0d9488;">${formatPrice(prod.totals.grossProfit)}</td>
                <td style="text-align: right; font-weight: bold;">${prod.totals.profitMargin}%</td>
              </tr>
            `;

            for (const item of prod.sizes) {
              rowsHtml += `
                <tr class="level-variant">
                  <td style="padding-left: 48px; font-family: monospace; color: #334155; font-weight: bold;">Barcode: ${item.barCode || "N/A"}</td>
                  <td style="font-family: monospace; color: #64748b;">${prod.sku}</td>
                  <td style="font-family: monospace; color: #334155;">${item.barCode || "-"}</td>
                  <td style="text-align: center;">${item.size}</td>
                  <td style="text-align: center;">${item.color || "N/A"}</td>
                  <td style="text-align: right;">${formatVal(item.quantity)}</td>
                  <td style="text-align: right;">${formatPrice(item.costPrice)}</td>
                  <td style="text-align: right; color: #b45309;">${formatPrice(item.totalCost)}</td>
                  <td style="text-align: right; color: #047857;">${formatPrice(item.totalRevenue)}</td>
                  <td style="text-align: right; color: #0f766e;">${formatPrice(item.grossProfit)}</td>
                  <td style="text-align: right;">${item.profitMargin}%</td>
                </tr>
              `;
            }
          }
        }
      }
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 8.5px; color: #1e293b; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }
        .company { font-size: 16px; font-weight: bold; color: #0f172a; }
        .title { font-size: 12px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-top: 2px; }
        .subtitle { font-size: 9px; color: #475569; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8px; }
        th, td { padding: 4px 6px; border: 1px solid #cbd5e1; }
        th { background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-weight: bold; }
        .level-brand { background-color: #0f172a; color: #ffffff; font-weight: bold; }
        .level-division { background-color: #1e293b; color: #ffffff; font-weight: bold; }
        .level-category { background-color: #334155; color: #ffffff; font-weight: bold; }
        .level-article { background-color: #f1f5f9; font-weight: bold; }
        .level-variant { background-color: #ffffff; }
        .grand-totals { background-color: #0f172a; color: #ffffff; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">${COMPANY_NAME}</div>
        <div class="title">Cost of Sales Report</div>
        <div class="subtitle">Outlets / Warehouses: ${locationNames} &bull; Period: ${fromStr} to ${toStr}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 26%;">Hierarchy / Item Description</th>
            <th style="width: 10%;">SKU</th>
            <th style="width: 11%;">Barcode</th>
            <th style="width: 6%; text-align: center;">Size</th>
            <th style="width: 8%; text-align: center;">Color</th>
            <th style="width: 7%; text-align: right;">Sold Qty</th>
            <th style="width: 8%; text-align: right;">Unit Cost</th>
            <th style="width: 9%; text-align: right;">COGS (Cost)</th>
            <th style="width: 9%; text-align: right;">Revenue</th>
            <th style="width: 8%; text-align: right;">Gross Profit</th>
            <th style="width: 4%; text-align: right;">Margin %</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr class="grand-totals">
            <td colspan="5">GRAND TOTALS (ALL OUTLETS & WAREHOUSES)</td>
            <td style="text-align: right; color: #4ade80;">${formatVal(grandTotals.quantity)}</td>
            <td style="text-align: right;">${formatPrice(grandTotals.avgUnitCost)}</td>
            <td style="text-align: right; color: #fbbf24;">${formatPrice(grandTotals.totalCost)}</td>
            <td style="text-align: right; color: #4ade80;">${formatPrice(grandTotals.totalRevenue)}</td>
            <td style="text-align: right; color: #2dd4bf;">${formatPrice(grandTotals.grossProfit)}</td>
            <td style="text-align: right; color: #38bdf8;">${grandTotals.profitMargin}%</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
}
