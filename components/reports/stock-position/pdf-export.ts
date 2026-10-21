import { format } from "date-fns";
import { COMPANY_NAME } from "@/lib/utils";
import { StockPositionBrandNode, StockPositionTotals } from "./types";

export function generateStockPositionPdfHtml(opts: {
  brands: StockPositionBrandNode[];
  grandTotals: StockPositionTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
}): string {
  const { brands, grandTotals, dateRange, locationNames } = opts;
  const fromStr = dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start";
  const toStr = dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End";

  const formatVal = (val?: number | null) =>
    val === undefined || val === null || val === 0 ? "-" : val.toLocaleString();

  const formatFob = (val?: number | null) =>
    val === undefined || val === null || val === 0 ? "-" : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDiscount = (val?: number | null) => {
    if (val === undefined || val === null) return "-";
    const num = Number(val);
    if (isNaN(num)) return "-";
    if (num === 0) return "0%";
    return `${parseFloat(num.toFixed(2))}%`;
  };

  const formatPercent = (val?: number | null) =>
    val === undefined || val === null || val === 0 ? "-" : `${val.toFixed(1)}%`;

  let rowsHtml = "";

  for (const brand of brands) {
    const bt = brand.totals;
    rowsHtml += `
      <tr class="level-brand">
        <td colspan="8" style="padding-left: 8px;">BRAND: ${brand.brandName.toUpperCase()}</td>
        <td style="text-align: right;">${formatVal(bt.launchQty)}</td>
        <td style="text-align: right;">${formatVal(bt.beginning)}</td>
        <td style="text-align: right;">${formatPercent(bt.sellThroughPercent)}</td>
        <td style="text-align: right;">${formatVal(bt.netSales)}</td>
        <td style="text-align: right;">${formatVal(bt.end)}</td>
        <td colspan="3" style="text-align: center; color: #94a3b8;">-</td>
        <td style="text-align: right; font-weight: bold;">${formatVal(bt.totalQty)}</td>
      </tr>
    `;

    for (const div of brand.divisions || []) {
      const dt = div.totals;
      rowsHtml += `
        <tr class="level-division">
          <td colspan="8" style="padding-left: 20px;">DIVISION: ${div.divisionName.toUpperCase()}</td>
          <td style="text-align: right;">${formatVal(dt.launchQty)}</td>
          <td style="text-align: right;">${formatVal(dt.beginning)}</td>
          <td style="text-align: right;">${formatPercent(dt.sellThroughPercent)}</td>
          <td style="text-align: right;">${formatVal(dt.netSales)}</td>
          <td style="text-align: right;">${formatVal(dt.end)}</td>
          <td colspan="3" style="text-align: center; color: #94a3b8;">-</td>
          <td style="text-align: right; font-weight: bold;">${formatVal(dt.totalQty)}</td>
        </tr>
      `;

      const genders = div.genders || [];
      if (genders.length > 0) {
        for (const gen of genders) {
          const gt = gen.totals;
          rowsHtml += `
            <tr class="level-gender">
              <td colspan="8" style="padding-left: 32px;">GENDER: ${gen.genderName.toUpperCase()}</td>
              <td style="text-align: right;">${formatVal(gt.launchQty)}</td>
              <td style="text-align: right;">${formatVal(gt.beginning)}</td>
              <td style="text-align: right;">${formatPercent(gt.sellThroughPercent)}</td>
              <td style="text-align: right;">${formatVal(gt.netSales)}</td>
              <td style="text-align: right;">${formatVal(gt.end)}</td>
              <td colspan="3" style="text-align: center; color: #94a3b8;">-</td>
              <td style="text-align: right; font-weight: bold;">${formatVal(gt.totalQty)}</td>
            </tr>
          `;

          for (const cat of gen.categories || []) {
            const ct = cat.totals;
            rowsHtml += `
              <tr class="level-category">
                <td colspan="8" style="padding-left: 44px;">CATEGORY: ${cat.categoryName.toUpperCase()}</td>
                <td style="text-align: right;">${formatVal(ct.launchQty)}</td>
                <td style="text-align: right;">${formatVal(ct.beginning)}</td>
                <td style="text-align: right;">${formatPercent(ct.sellThroughPercent)}</td>
                <td style="text-align: right;">${formatVal(ct.netSales)}</td>
                <td style="text-align: right;">${formatVal(ct.end)}</td>
                <td colspan="3" style="text-align: center; color: #94a3b8;">-</td>
                <td style="text-align: right; font-weight: bold;">${formatVal(ct.totalQty)}</td>
              </tr>
            `;

            for (const prod of cat.products || []) {
              const pt = prod.totals;
              const firstSize = prod.sizes?.[0];
              rowsHtml += `
                <tr class="level-article">
                  <td style="padding-left: 56px; font-weight: bold;">${prod.sku} - ${prod.description || prod.itemName || ""}</td>
                  <td>${prod.sku}</td>
                  <td>-</td>
                  <td>-</td>
                  <td style="text-align: right;">${formatDiscount(prod.discountPercent ?? firstSize?.discountPercent)}</td>
                  <td style="text-align: right;">${formatVal(prod.currentRp ?? firstSize?.currentRp)}</td>
                  <td style="text-align: right;">${formatFob(prod.fob ?? firstSize?.fob)}</td>
                  <td style="text-align: center;">${prod.launchDate ?? firstSize?.launchDate ?? "-"}</td>
                  <td style="text-align: right;">${formatVal(pt.launchQty)}</td>
                  <td style="text-align: right;">${formatVal(pt.beginning)}</td>
                  <td style="text-align: right;">${formatPercent(pt.sellThroughPercent)}</td>
                  <td style="text-align: right;">${formatVal(pt.netSales)}</td>
                  <td style="text-align: right;">${formatVal(pt.end)}</td>
                  <td style="text-align: center;">${prod.lastLcNumber ?? firstSize?.lastLcNumber ?? firstSize?.lastGrnNumber ?? "-"}</td>
                  <td style="text-align: center;">${prod.lastLcDate ?? firstSize?.lastLcDate ?? firstSize?.lastGrnDate ?? "-"}</td>
                  <td style="text-align: center;">${prod.lastSaleDate ?? firstSize?.lastSaleDate ?? "-"}</td>
                  <td style="text-align: right; font-weight: bold;">
                    <div>${formatVal(pt.totalQty)}</div>
                    ${prod.lastSaleOutletBreakdown ? `<div style="font-size: 7.5px; color: #64748b;">${prod.lastSaleOutletBreakdown}</div>` : ""}
                  </td>
                </tr>
              `;

              for (const v of prod.sizes || []) {
                const vt = v.totals;
                rowsHtml += `
                  <tr class="level-variant">
                    <td style="padding-left: 68px;">${v.size} / ${v.color}</td>
                    <td>${v.sku}</td>
                    <td>${v.barCode || "-"}</td>
                    <td>${v.season || "-"}</td>
                    <td style="text-align: right;">${formatDiscount(v.discountPercent)}</td>
                    <td style="text-align: right;">${formatVal(v.currentRp)}</td>
                    <td style="text-align: right;">${formatFob(v.fob)}</td>
                    <td style="text-align: center;">${v.launchDate || "-"}</td>
                    <td style="text-align: right;">${formatVal(vt.launchQty)}</td>
                    <td style="text-align: right;">${formatVal(vt.beginning)}</td>
                    <td style="text-align: right;">${formatPercent(vt.sellThroughPercent)}</td>
                    <td style="text-align: right;">${formatVal(vt.netSales)}</td>
                    <td style="text-align: right;">${formatVal(vt.end)}</td>
                    <td style="text-align: center;">${v.lastLcNumber || v.lastGrnNumber || "-"}</td>
                    <td style="text-align: center;">${v.lastLcDate || v.lastGrnDate || "-"}</td>
                    <td style="text-align: center;">${v.lastSaleDate || "-"}</td>
                    <td style="text-align: right; font-weight: bold;">
                      <div>${formatVal(vt.totalQty)}</div>
                      ${v.lastSaleOutletBreakdown ? `<div style="font-size: 7.5px; color: #64748b;">${v.lastSaleOutletBreakdown}</div>` : ""}
                    </td>
                  </tr>
                `;
              }
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
        <meta charset="utf-8" />
        <title>Stock Position Report</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9px; color: #1e293b; margin: 0; padding: 0; }
          .header { margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }
          .title { font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 9px; color: #64748b; margin-top: 2px; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 8.5px; color: #475569; margin-top: 5px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8px; }
          th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 4px; font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
          td { border: 1px solid #e2e8f0; padding: 3px 4px; font-size: 8px; }
          
          .level-brand { background-color: #1e293b; color: #ffffff; font-weight: bold; }
          .level-brand td { border-color: #0f172a; color: #ffffff; }
          .level-division { background-color: #f8fafc; font-weight: bold; color: #047857; }
          .level-category { background-color: #ffffff; font-weight: 600; color: #4338ca; }
          .level-gender { background-color: #ffffff; font-weight: 600; color: #b45309; }
          .level-article { background-color: #f8fafc; }
          .level-variant { background-color: #ffffff; }
          .grand-total { background-color: #0f172a; color: #ffffff; font-weight: bold; }
          .grand-total td { border-color: #0f172a; color: #ffffff; }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${COMPANY_NAME} — Stock Position Report</div>
          <div class="subtitle">Inventory Movement, Sell-Through Analysis & As-Of Stock Position</div>
          <div class="meta-bar">
            <span><strong>Date Range:</strong> ${fromStr} to ${toStr}</span>
            <span><strong>Locations:</strong> ${locationNames || "All Locations"}</span>
            <span><strong>Generated:</strong> ${format(new Date(), "dd MMM yyyy, HH:mm")}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 170px; text-align: left;">Hierarchy / Description</th>
              <th style="width: 70px; text-align: left;">SKU</th>
              <th style="width: 75px; text-align: left;">Barcode</th>
              <th style="width: 45px; text-align: left;">Season</th>
              <th style="width: 45px; text-align: right;">Disc %</th>
              <th style="width: 55px; text-align: right;">Current RP</th>
              <th style="width: 55px; text-align: right;">FOB</th>
              <th style="width: 55px; text-align: center;">Launch Date</th>
              <th style="width: 50px; text-align: right;">Launch Qty</th>
              <th style="width: 50px; text-align: right;">Beginning</th>
              <th style="width: 55px; text-align: right;">Sell Thru %</th>
              <th style="width: 50px; text-align: right;">Net Sales</th>
              <th style="width: 50px; text-align: right;">End</th>
              <th style="width: 65px; text-align: center;">Last LC No</th>
              <th style="width: 55px; text-align: center;">Last LC Date</th>
              <th style="width: 65px; text-align: center;">Last Sale Date</th>
              <th style="width: 80px; text-align: right;">Total Qty</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="grand-total">
              <td colspan="8" style="text-align: left; padding-left: 8px;">GRAND TOTAL</td>
              <td style="text-align: right;">${formatVal(grandTotals.launchQty)}</td>
              <td style="text-align: right;">${formatVal(grandTotals.beginning)}</td>
              <td style="text-align: right;">${formatPercent(grandTotals.sellThroughPercent)}</td>
              <td style="text-align: right;">${formatVal(grandTotals.netSales)}</td>
              <td style="text-align: right;">${formatVal(grandTotals.end)}</td>
              <td colspan="3" style="text-align: center; color: #94a3b8;">-</td>
              <td style="text-align: right; font-weight: bold;">${formatVal(grandTotals.totalQty)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
}
