import { format } from "date-fns";
import { COMPANY_NAME } from "@/lib/utils";
import { StockActivityBrandNode, StockActivityTotals } from "./types";

export function generateStockActivityPdfHtml(opts: {
  brands: StockActivityBrandNode[];
  grandTotals: StockActivityTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): string {
  const { brands, grandTotals, dateRange, locationNames } = opts;
  const fromStr = dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start";
  const toStr = dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End";

  let rowsHtml = "";

  const formatVal = (val?: number) => (val === undefined || val === 0 ? "-" : val.toLocaleString());

  for (const brand of brands) {
    const bt = brand.totals;
    rowsHtml += `
      <tr class="level-brand">
        <td colspan="5" style="padding-left: 8px;">BRAND: ${brand.brandName.toUpperCase()}</td>
        <td style="text-align: right;">${formatVal(bt.bf)}</td>
        <td style="text-align: right;">${formatVal(bt.fromWarehouse)}</td>
        <td style="text-align: right;">${formatVal(bt.fromOutlet)}</td>
        <td style="text-align: right; color: #4ade80;">${formatVal(bt.totalTrfIn)}</td>
        <td style="text-align: right;">${formatVal(bt.toWarehouse)}</td>
        <td style="text-align: right;">${formatVal(bt.toOutlet)}</td>
        <td style="text-align: right; color: #f87171;">${formatVal(bt.totalTrfOut)}</td>
        <td style="text-align: right;">${formatVal(bt.exchg)}</td>
        <td style="text-align: right;">${formatVal(bt.refund)}</td>
        <td style="text-align: right;">${formatVal(bt.claim)}</td>
        <td style="text-align: right; color: #818cf8;">${formatVal(bt.sales)}</td>
        <td style="text-align: right;">${formatVal(bt.adj)}</td>
        <td style="text-align: right; color: #2dd4bf;">${formatVal(bt.availableStock)}</td>
        <td style="text-align: right; color: #fbbf24;">${formatVal(bt.transit)}</td>
        <td style="text-align: right; color: #38bdf8;">${formatVal(bt.balance)}</td>
      </tr>
    `;

    for (const div of brand.divisions) {
      const dt = div.totals;
      rowsHtml += `
        <tr class="level-division">
          <td colspan="5" style="padding-left: 18px;">DIVISION: ${div.divisionName.toUpperCase()}</td>
          <td style="text-align: right;">${formatVal(dt.bf)}</td>
          <td style="text-align: right;">${formatVal(dt.fromWarehouse)}</td>
          <td style="text-align: right;">${formatVal(dt.fromOutlet)}</td>
          <td style="text-align: right; color: #059669;">${formatVal(dt.totalTrfIn)}</td>
          <td style="text-align: right;">${formatVal(dt.toWarehouse)}</td>
          <td style="text-align: right;">${formatVal(dt.toOutlet)}</td>
          <td style="text-align: right; color: #dc2626;">${formatVal(dt.totalTrfOut)}</td>
          <td style="text-align: right;">${formatVal(dt.exchg)}</td>
          <td style="text-align: right;">${formatVal(dt.refund)}</td>
          <td style="text-align: right;">${formatVal(dt.claim)}</td>
          <td style="text-align: right; color: #4f46e5;">${formatVal(dt.sales)}</td>
          <td style="text-align: right;">${formatVal(dt.adj)}</td>
          <td style="text-align: right; color: #0d9488;">${formatVal(dt.availableStock)}</td>
          <td style="text-align: right; color: #d97706;">${formatVal(dt.transit)}</td>
          <td style="text-align: right; color: #0284c7;">${formatVal(dt.balance)}</td>
        </tr>
      `;

      for (const gender of div.genders) {
        for (const cat of gender.categories) {
          const ct = cat.totals;
          rowsHtml += `
            <tr class="level-category">
              <td colspan="5" style="padding-left: 28px;">CATEGORY: ${cat.categoryName.toUpperCase()}</td>
              <td style="text-align: right;">${formatVal(ct.bf)}</td>
              <td style="text-align: right;">${formatVal(ct.fromWarehouse)}</td>
              <td style="text-align: right;">${formatVal(ct.fromOutlet)}</td>
              <td style="text-align: right; color: #059669;">${formatVal(ct.totalTrfIn)}</td>
              <td style="text-align: right;">${formatVal(ct.toWarehouse)}</td>
              <td style="text-align: right;">${formatVal(ct.toOutlet)}</td>
              <td style="text-align: right; color: #dc2626;">${formatVal(ct.totalTrfOut)}</td>
              <td style="text-align: right;">${formatVal(ct.exchg)}</td>
              <td style="text-align: right;">${formatVal(ct.refund)}</td>
              <td style="text-align: right;">${formatVal(ct.claim)}</td>
              <td style="text-align: right; color: #4f46e5;">${formatVal(ct.sales)}</td>
              <td style="text-align: right;">${formatVal(ct.adj)}</td>
              <td style="text-align: right; color: #0d9488;">${formatVal(ct.availableStock)}</td>
              <td style="text-align: right; color: #d97706;">${formatVal(ct.transit)}</td>
              <td style="text-align: right; color: #0284c7;">${formatVal(ct.balance)}</td>
            </tr>
          `;

          for (const prod of cat.products) {
            const pt = prod.totals;
            rowsHtml += `
              <tr class="level-article">
                <td style="padding-left: 38px; font-weight: bold; color: #0f172a;">${prod.description}</td>
                <td style="font-family: monospace; font-weight: bold;">${prod.sku}</td>
                <td style="font-family: monospace; color: #64748b;">All Barcodes</td>
                <td style="text-align: center;">All Sizes</td>
                <td style="text-align: center;">All Colors</td>
                <td style="text-align: right; font-weight: bold;">${formatVal(pt.bf)}</td>
                <td style="text-align: right;">${formatVal(pt.fromWarehouse)}</td>
                <td style="text-align: right;">${formatVal(pt.fromOutlet)}</td>
                <td style="text-align: right; font-weight: bold; color: #059669;">${formatVal(pt.totalTrfIn)}</td>
                <td style="text-align: right;">${formatVal(pt.toWarehouse)}</td>
                <td style="text-align: right;">${formatVal(pt.toOutlet)}</td>
                <td style="text-align: right; font-weight: bold; color: #dc2626;">${formatVal(pt.totalTrfOut)}</td>
                <td style="text-align: right;">${formatVal(pt.exchg)}</td>
                <td style="text-align: right;">${formatVal(pt.refund)}</td>
                <td style="text-align: right;">${formatVal(pt.claim)}</td>
                <td style="text-align: right; font-weight: bold; color: #4f46e5;">${formatVal(pt.sales)}</td>
                <td style="text-align: right;">${formatVal(pt.adj)}</td>
                <td style="text-align: right; font-weight: bold; color: #0d9488;">${formatVal(pt.availableStock)}</td>
                <td style="text-align: right; font-weight: bold; color: #d97706;">${formatVal(pt.transit)}</td>
                <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVal(pt.balance)}</td>
              </tr>
            `;

            for (const item of prod.sizes) {
              const st = item.totals;
              rowsHtml += `
                <tr class="level-variant">
                  <td style="padding-left: 48px; font-family: monospace; color: #334155; font-weight: bold;">Barcode: ${item.barCode || "N/A"}</td>
                  <td style="font-family: monospace; color: #64748b;">${prod.sku}</td>
                  <td style="font-family: monospace; color: #334155;">${item.barCode || "-"}</td>
                  <td style="text-align: center;">${item.size}</td>
                  <td style="text-align: center;">${item.color || "N/A"}</td>
                  <td style="text-align: right;">${formatVal(st.bf)}</td>
                  <td style="text-align: right;">${formatVal(st.fromWarehouse)}</td>
                  <td style="text-align: right;">${formatVal(st.fromOutlet)}</td>
                  <td style="text-align: right; color: #059669;">${formatVal(st.totalTrfIn)}</td>
                  <td style="text-align: right;">${formatVal(st.toWarehouse)}</td>
                  <td style="text-align: right;">${formatVal(st.toOutlet)}</td>
                  <td style="text-align: right; color: #dc2626;">${formatVal(st.totalTrfOut)}</td>
                  <td style="text-align: right;">${formatVal(st.exchg)}</td>
                  <td style="text-align: right;">${formatVal(st.refund)}</td>
                  <td style="text-align: right;">${formatVal(st.claim)}</td>
                  <td style="text-align: right; color: #4f46e5;">${formatVal(st.sales)}</td>
                  <td style="text-align: right;">${formatVal(st.adj)}</td>
                  <td style="text-align: right; color: #0d9488;">${formatVal(st.availableStock)}</td>
                  <td style="text-align: right; color: #d97706;">${formatVal(st.transit)}</td>
                  <td style="text-align: right; color: #0284c7;">${formatVal(st.balance)}</td>
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
        <div class="title">Stock Activity Report</div>
        <div class="subtitle">Outlets / Warehouses: ${locationNames} &bull; Period: ${fromStr} to ${toStr}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Hierarchy / Item Description</th>
            <th style="width: 8%;">SKU</th>
            <th style="width: 9%;">Barcode</th>
            <th style="width: 4%; text-align: center;">Size</th>
            <th style="width: 5%; text-align: center;">Color</th>
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
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr class="grand-totals">
            <td colspan="5">GRAND TOTALS (ALL OUTLETS & WAREHOUSES)</td>
            <td style="text-align: right; color: #ffffff;">${formatVal(grandTotals.bf)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.fromWarehouse)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.fromOutlet)}</td>
            <td style="text-align: right; color: #4ade80;">${formatVal(grandTotals.totalTrfIn)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.toWarehouse)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.toOutlet)}</td>
            <td style="text-align: right; color: #f87171;">${formatVal(grandTotals.totalTrfOut)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.exchg)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.refund)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.claim)}</td>
            <td style="text-align: right; color: #818cf8;">${formatVal(grandTotals.sales)}</td>
            <td style="text-align: right;">${formatVal(grandTotals.adj)}</td>
            <td style="text-align: right; color: #2dd4bf;">${formatVal(grandTotals.availableStock)}</td>
            <td style="text-align: right; color: #fbbf24;">${formatVal(grandTotals.transit)}</td>
            <td style="text-align: right; color: #38bdf8;">${formatVal(grandTotals.balance)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
}
