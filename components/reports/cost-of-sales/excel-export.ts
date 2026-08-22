import ExcelJS from "exceljs";
import { format } from "date-fns";
import { CostOfSalesBrandNode, CostOfSalesFlatRecord, CostOfSalesTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateCostOfSalesExcel(opts: {
  exportType: "flat" | "hierarchical";
  brands: CostOfSalesBrandNode[];
  flatItems: CostOfSalesFlatRecord[];
  grandTotals: CostOfSalesTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ fileBuffer: Buffer; fileName: string }> {
  const {
    exportType,
    brands,
    flatItems,
    grandTotals,
    dateRange,
    locationNames,
    onProgress,
  } = opts;

  const workbook = new ExcelJS.Workbook();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `cost-of-sales-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const ws = workbook.addWorksheet("Flat Cost of Sales");
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 2 }];

    const columns = [
      { header: "Brand", key: "brand", width: 16 },
      { header: "Division", key: "division", width: 14 },
      { header: "Category", key: "category", width: 18 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Silhouette", key: "silhouette", width: 14 },
      { header: "SKU", key: "sku", width: 14 },
      { header: "Article Name", key: "articleName", width: 28 },
      { header: "Color", key: "color", width: 14 },
      { header: "Size", key: "size", width: 8 },
      { header: "Barcode", key: "barCode", width: 16 },
      { header: "Outlet / Store", key: "locationName", width: 18 },
      { header: "Sold Qty", key: "quantity", width: 12, numFmt: "#,##0" },
      { header: "Unit Cost (Rs.)", key: "unitCost", width: 14, numFmt: "#,##0.00" },
      { header: "Total Cost (COGS)", key: "totalCost", width: 16, numFmt: "#,##0.00" },
      { header: "Unit Price (Rs.)", key: "unitPrice", width: 14, numFmt: "#,##0.00" },
      { header: "Total Revenue", key: "totalRevenue", width: 16, numFmt: "#,##0.00" },
      { header: "Gross Profit", key: "grossProfit", width: 14, numFmt: "#,##0.00" },
      { header: "Margin %", key: "profitMargin", width: 12, numFmt: "0.00%" },
    ];

    ws.columns = columns;

    // Header Row
    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.alignment = { vertical: "middle", horizontal: idx >= 11 ? "right" : "left" };
    });

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      ws.addRow({
        brand: item.brand,
        division: item.division,
        category: item.category,
        gender: item.gender,
        silhouette: item.silhouette,
        sku: item.sku,
        articleName: item.articleName,
        color: item.color,
        size: item.size,
        barCode: item.barCode,
        locationName: item.locationName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        unitPrice: item.unitPrice,
        totalRevenue: item.totalRevenue,
        grossProfit: item.grossProfit,
        profitMargin: item.profitMargin / 100,
      });

      if (i % 500 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 90));
        await yieldToMain();
      }
    }

    // Grand Totals Row
    const totalRow = ws.addRow({
      brand: "GRAND TOTAL",
      quantity: grandTotals.quantity,
      unitCost: grandTotals.avgUnitCost,
      totalCost: grandTotals.totalCost,
      totalRevenue: grandTotals.totalRevenue,
      grossProfit: grandTotals.grossProfit,
      profitMargin: grandTotals.profitMargin / 100,
    });

    totalRow.height = 24;
    totalRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    });
  } else {
    // Hierarchical Worksheet
    const ws = workbook.addWorksheet("Hierarchical Cost of Sales");
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 2 }];

    const columns = [
      { header: "GPC / Product Hierarchy", key: "label", width: 38 },
      { header: "SKU", key: "sku", width: 14 },
      { header: "Size", key: "size", width: 8 },
      { header: "Color", key: "color", width: 12 },
      { header: "Sold Qty", key: "quantity", width: 12, numFmt: "#,##0" },
      { header: "Unit Cost (Rs.)", key: "unitCost", width: 14, numFmt: "#,##0.00" },
      { header: "Total Cost (COGS)", key: "totalCost", width: 16, numFmt: "#,##0.00" },
      { header: "Total Revenue", key: "totalRevenue", width: 16, numFmt: "#,##0.00" },
      { header: "Gross Profit", key: "grossProfit", width: 14, numFmt: "#,##0.00" },
      { header: "Margin %", key: "profitMargin", width: 12, numFmt: "0.00%" },
    ];

    ws.columns = columns;

    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.alignment = { vertical: "middle", horizontal: idx >= 4 ? "right" : "left" };
    });

    for (const brand of brands) {
      ws.addRow({
        label: `BRAND: ${brand.brandName.toUpperCase()}`,
        quantity: brand.totals.quantity,
        unitCost: brand.totals.avgUnitCost,
        totalCost: brand.totals.totalCost,
        totalRevenue: brand.totals.totalRevenue,
        grossProfit: brand.totals.grossProfit,
        profitMargin: brand.totals.profitMargin / 100,
      });

      for (const div of brand.divisions) {
        ws.addRow({
          label: `  DIVISION: ${div.divisionName.toUpperCase()}`,
          quantity: div.totals.quantity,
          unitCost: div.totals.avgUnitCost,
          totalCost: div.totals.totalCost,
          totalRevenue: div.totals.totalRevenue,
          grossProfit: div.totals.grossProfit,
          profitMargin: div.totals.profitMargin / 100,
        });

        for (const gender of div.genders) {
          for (const cat of gender.categories) {
            ws.addRow({
              label: `    CATEGORY: ${cat.categoryName.toUpperCase()}`,
              quantity: cat.totals.quantity,
              unitCost: cat.totals.avgUnitCost,
              totalCost: cat.totals.totalCost,
              totalRevenue: cat.totals.totalRevenue,
              grossProfit: cat.totals.grossProfit,
              profitMargin: cat.totals.profitMargin / 100,
            });

            for (const prod of cat.products) {
              ws.addRow({
                label: `      ${prod.description}`,
                sku: prod.sku,
                size: "All Sizes",
                color: "All Colors",
                quantity: prod.totals.quantity,
                unitCost: prod.totals.avgUnitCost,
                totalCost: prod.totals.totalCost,
                totalRevenue: prod.totals.totalRevenue,
                grossProfit: prod.totals.grossProfit,
                profitMargin: prod.totals.profitMargin / 100,
              });

              for (const item of prod.sizes) {
                ws.addRow({
                  label: `        — Variant: ${item.color || "Default"}`,
                  sku: prod.sku,
                  size: item.size,
                  color: item.color,
                  quantity: item.quantity,
                  unitCost: item.costPrice,
                  totalCost: item.totalCost,
                  totalRevenue: item.totalRevenue,
                  grossProfit: item.grossProfit,
                  profitMargin: item.profitMargin / 100,
                });
              }
            }
          }
        }
      }
    }
  }

  onProgress?.(95);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  onProgress?.(100);

  return { fileBuffer, fileName };
}
