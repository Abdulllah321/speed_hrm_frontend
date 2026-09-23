import { format } from "date-fns";
import { COMPANY_NAME } from "@/lib/utils";
import { StockActivityBrandNode, StockActivityTotals } from "./types";

export function generateStockActivityPdfHtml(opts: {
  brands: StockActivityBrandNode[];
  grandTotals: StockActivityTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  reportType?: "merged" | "separate" | "detailed";
}): string {
  const { brands, grandTotals, dateRange, locationNames, reportType = "merged" } = opts;
  const fromStr = dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start";
  const toStr = dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End";

  const isDetailed = reportType === "detailed";
  let rowsHtml = "";

  const formatVal = (val?: number | null) => (val === undefined || val === null || val === 0 ? "-" : val.toLocaleString());

  const renderCells = (t: StockActivityTotals, colorScheme: "white" | "emerald" | "default" = "default") => {
    if (isDetailed) {
      const reserved = (t.reservedSO || 0) + (t.reservedSRN || 0);
      const net = (t.availableStock || 0) - reserved;
      return `
        <td style="text-align: right;">${formatVal(t.bf)}</td>
        <td style="text-align: right; color: #4ade80;">${formatVal(t.purchases)}</td>
        <td style="text-align: right; color: #f87171;">${formatVal(t.purchaseReturn)}</td>
        <td style="text-align: right;">${formatVal(t.fromOutlet)}</td>
        <td style="text-align: right; color: #818cf8;">${formatVal(t.toOutlet)}</td>
        <td style="text-align: right; color: #fbbf24;">${formatVal(t.deliveryChallan)}</td>
        <td style="text-align: right;">${formatVal(t.wholesaleReturn)}</td>
        <td style="text-align: right;">${formatVal(t.adj)}</td>
        <td style="text-align: right; font-weight: bold; color: #2dd4bf;">${formatVal(t.availableStock)}</td>
        <td style="text-align: right;">${formatVal(reserved)}</td>
        <td style="text-align: right; font-weight: bold;">${formatVal(net)}</td>
        <td style="text-align: right; color: #fbbf24;">${formatVal(t.transitGRN || t.transit)}</td>
        <td style="text-align: right; font-weight: bold; color: #38bdf8;">${formatVal(t.balance)}</td>
      `;
    }
    return `
      <td style="text-align: right;">${formatVal(t.bf)}</td>
      <td style="text-align: right;">${formatVal(t.fromWarehouse)}</td>
      <td style="text-align: right;">${formatVal(t.fromOutlet)}</td>
      <td style="text-align: right; color: #4ade80;">${formatVal(t.totalTrfIn)}</td>
      <td style="text-align: right;">${formatVal(t.toWarehouse)}</td>
      <td style="text-align: right;">${formatVal(t.toOutlet)}</td>
      <td style="text-align: right; color: #f87171;">${formatVal(t.totalTrfOut)}</td>
      <td style="text-align: right;">${formatVal(t.exchg)}</td>
      <td style="text-align: right;">${formatVal(t.refund)}</td>
      <td style="text-align: right;">${formatVal(t.claim)}</td>
      <td style="text-align: right; color: #4f46e5;">${formatVal(t.sales)}</td>
      <td style="text-align: right;">${formatVal(t.adj)}</td>
      <td style="text-align: right; color: #2dd4bf;">${formatVal(t.availableStock)}</td>
      <td style="text-align: right; color: #fbbf24;">${formatVal(t.transit)}</td>
      <td style="text-align: right; color: #0284c7;">${formatVal(t.balance)}</td>
    `;
  };

  for (const brand of brands) {
    const bt = brand.totals;
    rowsHtml += `
      <tr class="level-brand">
        <td colspan="5" style="padding-left: 8px;">BRAND: ${brand.brandName.toUpperCase()}</td>
        ${renderCells(bt, "white")}
      </tr>
    `;

    for (const div of brand.divisions) {
      const dt = div.totals;
      rowsHtml += `
        <tr class="level-division">
          <td colspan="5" style="padding-left: 18px;">DIVISION: ${div.divisionName.toUpperCase()}</td>
          ${renderCells(dt, "emerald")}
        </tr>
      `;

      for (const gen of div.genders) {
        const gt = gen.totals;
        rowsHtml += `
          <tr class="level-gender">
            <td colspan="5" style="padding-left: 28px;">GENDER: ${gen.genderName.toUpperCase()}</td>
            ${renderCells(gt, "default")}
          </tr>
        `;

        for (const cat of gen.categories) {
          const ct = cat.totals;
          rowsHtml += `
            <tr class="level-category">
              <td colspan="5" style="padding-left: 38px;">CATEGORY: ${cat.categoryName.toUpperCase()}</td>
              ${renderCells(ct, "default")}
            </tr>
          `;

          for (const prod of cat.products) {
            const pt = prod.totals;
            rowsHtml += `
              <tr class="level-article">
                <td style="padding-left: 48px; font-weight: bold; color: #0f172a;">${prod.description}</td>
                <td style="font-family: monospace; font-weight: bold;">${prod.sku}</td>
                <td style="font-family: monospace; color: #64748b;">All Barcodes</td>
                <td style="text-align: center;">All Sizes</td>
                <td style="text-align: center;">All Colors</td>
                ${renderCells(pt, "default")}
              </tr>
            `;

            for (const item of prod.sizes) {
              const st = item.totals;
              rowsHtml += `
                <tr class="level-variant">
                  <td style="padding-left: 58px; font-family: monospace; color: #334155; font-weight: bold;">Barcode: ${item.barCode || "N/A"}</td>
                  <td style="font-family: monospace; color: #64748b;">${prod.sku}</td>
                  <td style="font-family: monospace; color: #334155;">${item.barCode || "-"}</td>
                  <td style="text-align: center;">${item.size}</td>
                  <td style="text-align: center;">${item.color || "N/A"}</td>
                  ${renderCells(st, "default")}
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
        @page { size: A4 landscape; margin: 8mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 7.5px; color: #1e293b; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }
        .company { font-size: 15px; font-weight: bold; color: #0f172a; }
        .title { font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-top: 2px; }
        .subtitle { font-size: 8.5px; color: #475569; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 7.5px; }
        th, td { padding: 3px 4px; border: 1px solid #cbd5e1; }
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
        <div class="title">${isDetailed ? "Warehouse Stock Activity Report (C40001)" : "Stock Activity Report"}</div>
        <div class="subtitle">${isDetailed ? "Warehouse" : "Outlets / Stores"}: ${locationNames} &bull; Period: ${fromStr} to ${toStr}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Hierarchy / Item Description</th>
            <th style="width: 8%;">SKU</th>
            <th style="width: 9%;">Barcode</th>
            <th style="width: 4%; text-align: center;">Size</th>
            <th style="width: 5%; text-align: center;">Color</th>
            ${
              isDetailed
                ? `
                <th style="width: 5%; text-align: right;">B/F</th>
                <th style="width: 5%; text-align: right;">Purchases</th>
                <th style="width: 5%; text-align: right;">Pur Ret</th>
                <th style="width: 5%; text-align: right;">From Out</th>
                <th style="width: 5%; text-align: right;">To Out</th>
                <th style="width: 5%; text-align: right;">DC</th>
                <th style="width: 4%; text-align: right;">WS Ret</th>
                <th style="width: 4%; text-align: right;">Adj</th>
                <th style="width: 5%; text-align: right;">Avail</th>
                <th style="width: 4%; text-align: right;">Res</th>
                <th style="width: 5%; text-align: right;">Net</th>
                <th style="width: 4%; text-align: right;">Transit</th>
                <th style="width: 5%; text-align: right;">Bal</th>
              `
                : `
                <th style="width: 5%; text-align: right;">B/F</th>
                <th style="width: 4%; text-align: right;">Wh IN</th>
                <th style="width: 4%; text-align: right;">Out IN</th>
                <th style="width: 5%; text-align: right;">Tot IN</th>
                <th style="width: 4%; text-align: right;">Wh OUT</th>
                <th style="width: 4%; text-align: right;">Out OUT</th>
                <th style="width: 5%; text-align: right;">Tot OUT</th>
                <th style="width: 4%; text-align: right;">Exchg</th>
                <th style="width: 4%; text-align: right;">Refund</th>
                <th style="width: 4%; text-align: right;">Claim</th>
                <th style="width: 5%; text-align: right;">Sales</th>
                <th style="width: 4%; text-align: right;">Adj</th>
                <th style="width: 5%; text-align: right;">Avail</th>
                <th style="width: 4%; text-align: right;">Transit</th>
                <th style="width: 5%; text-align: right;">Bal</th>
              `
            }
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr class="grand-totals">
            <td colspan="5">GRAND TOTALS (${isDetailed ? "CENTRAL WAREHOUSE C40001" : "ALL OUTLETS"})</td>
            ${renderCells(grandTotals, "white")}
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
}
