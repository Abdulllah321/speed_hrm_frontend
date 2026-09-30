"use client";

// xlsx-js-style is a drop-in replacement for xlsx that supports cell-level styles (fill, font, border, numFmt).
import XLSXStyle from "xlsx-js-style";
import { format } from "date-fns";
import { GrossSalesSummaryTreeNode, GrossSalesSummaryFlatRecord, GrossSalesSummaryTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

// ─── Color Palette ────────────────────────────────────────────────────────────
const DARK_HEADER_BG = "1E293B";   // Slate-900 dark navy
const WHITE = "FFFFFF";
const GRAND_TOTAL_BG = "0F172A";   // Almost black
const GRAND_TOTAL_FG = "F8FAFC";

// Hierarchy level background colors (mirrors UI)
const LEVEL_COLORS: Record<string, string> = {
  location:   "1D4ED8", // Blue-700
  brand:      "334155", // Slate-700
  division:   "475569", // Slate-600
  category:   "64748B", // Slate-500
  gender:     "7C3AED", // Violet-600
  silhouette: "0369A1", // Sky-700
  article:    "D1FAE5", // Green-100  (light row — dark text)
  variant:    "FFFFFF", // White (leaf)
  month:      "1E40AF", // Blue-800
  date:       "1D4ED8", // Blue-700
  document:   "374151", // Gray-700
  salesPerson:"4B5563", // Gray-600
  taxRate:    "6B7280", // Gray-500
};

// Rows with a dark bg use white text; light bg rows use dark text
const DARK_LEVELS = new Set([
  "location","brand","division","category","gender","silhouette","month","date","document","salesPerson","taxRate"
]);

// ─── Border Helpers ───────────────────────────────────────────────────────────
const borderThin = {
  top:    { style: "thin", color: { rgb: "CBD5E1" } },
  bottom: { style: "thin", color: { rgb: "CBD5E1" } },
  left:   { style: "thin", color: { rgb: "CBD5E1" } },
  right:  { style: "thin", color: { rgb: "CBD5E1" } },
};

const borderTotal = {
  top:    { style: "medium", color: { rgb: "1E293B" } },
  bottom: { style: "double", color: { rgb: "1E293B" } },
  left:   { style: "thin",   color: { rgb: "CBD5E1" } },
  right:  { style: "thin",   color: { rgb: "CBD5E1" } },
};

// ─── Style Factories ──────────────────────────────────────────────────────────
function headerStyle(align: "left" | "center" | "right" = "left") {
  return {
    font:      { bold: true, sz: 10, color: { rgb: WHITE } },
    fill:      { fgColor: { rgb: DARK_HEADER_BG }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
    border:    borderThin,
  };
}

function levelStyle(level: string, align: "left" | "center" | "right" = "left", isLeaf = false, numFmt?: string) {
  const bg = LEVEL_COLORS[level] || "F1F5F9";
  const isDark = DARK_LEVELS.has(level);
  const fg = isDark ? WHITE : "0F172A";
  return {
    font:      { bold: !isLeaf, sz: isLeaf ? 9 : 9.5, color: { rgb: fg } },
    fill:      { fgColor: { rgb: bg }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center", indent: 0 },
    border:    borderThin,
    ...(numFmt ? { numFmt } : {}),
  };
}

function totalStyle(align: "left" | "center" | "right" = "left", numFmt?: string) {
  return {
    font:      { bold: true, sz: 10, color: { rgb: GRAND_TOTAL_FG } },
    fill:      { fgColor: { rgb: GRAND_TOTAL_BG }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center" },
    border:    borderTotal,
    ...(numFmt ? { numFmt } : {}),
  };
}

function plainStyle(align: "left" | "center" | "right" = "left", numFmt?: string) {
  return {
    font:      { sz: 9, color: { rgb: "1E293B" } },
    fill:      { fgColor: { rgb: WHITE }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center" },
    border:    borderThin,
    ...(numFmt ? { numFmt } : {}),
  };
}

// ─── xlsx-js-style helper: apply style to entire row ─────────────────────────
function applyRowStyle(ws: any, rowIdx: number, cols: number, styleFn: (colIdx: number) => any, values: any[]) {
  for (let c = 0; c < cols; c++) {
    const cellAddress = XLSXStyle.utils.encode_cell({ r: rowIdx, c });
    if (!ws[cellAddress]) ws[cellAddress] = { v: values[c] ?? "", t: "s" };
    ws[cellAddress].s = styleFn(c);
  }
}

// Number format strings
const NUM_FMT   = "#,##0.00";
const INT_FMT   = "#,##0";
const PCT_FMT   = "0.00%";

export async function generateGrossSalesSummaryExcel(opts: {
  exportType: "flat" | "hierarchical";
  treeData?: GrossSalesSummaryTreeNode[];
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const { exportType, treeData = [], flatItems, grandTotals, dateRange, locationNames, onProgress } = opts;

  onProgress?.(5);
  await yieldToMain();

  const wb = XLSXStyle.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `gross-sales-summary-${exportType}-${dateStr}.xlsx`;

  if (exportType === "flat") {
    await buildFlatSheet(wb, flatItems, grandTotals, locationNames, dateRange, onProgress);
  } else {
    await buildHierarchicalSheet(wb, treeData, grandTotals, locationNames, dateRange, onProgress);
  }

  onProgress?.(92);
  await yieldToMain();

  const excelBuffer: ArrayBuffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: "" };
}

// ─── FLAT SHEET ───────────────────────────────────────────────────────────────
async function buildFlatSheet(
  wb: any,
  flatItems: GrossSalesSummaryFlatRecord[],
  grandTotals: GrossSalesSummaryTotals,
  locationNames: string,
  dateRange: { from?: Date; to?: Date },
  onProgress?: (p: number) => void,
) {
  const HEADERS = [
    { label: "Outlet / Location",               align: "left"   as const, key: "locationName"      },
    { label: "Brand",                            align: "left"   as const, key: "brandName"          },
    { label: "Division",                         align: "left"   as const, key: "divisionName"       },
    { label: "Category",                         align: "left"   as const, key: "categoryName"       },
    { label: "Silhouette",                       align: "left"   as const, key: "silhouetteName"     },
    { label: "Gender",                           align: "left"   as const, key: "genderName"         },
    { label: "Order #",                          align: "center" as const, key: "orderNumber"        },
    { label: "FBR Invoice",                      align: "center" as const, key: "fbrInvoiceNumber"   },
    { label: "SKU",                              align: "center" as const, key: "sku"                },
    { label: "Barcode",                          align: "center" as const, key: "barCode"            },
    { label: "Description",                      align: "left"   as const, key: "description"        },
    { label: "Size",                             align: "center" as const, key: "sizeName"           },
    { label: "Color",                            align: "center" as const, key: "colorName"          },
    { label: "Qty",                              align: "right"  as const, numFmt: INT_FMT,  key: "quantity"         },
    { label: "Unit Price (Rs.)",                 align: "right"  as const, numFmt: NUM_FMT,  key: "unitPrice"        },
    { label: "Price WOST",                       align: "right"  as const, numFmt: NUM_FMT,  key: "priceWost"        },
    { label: "Total Price WOST",                 align: "right"  as const, numFmt: NUM_FMT,  key: "wostAmount"       },
    { label: "Discount Amount (Rs.)",            align: "right"  as const, numFmt: NUM_FMT,  key: "discountAmount"   },
    { label: "Value Excl. Sales Tax",            align: "right"  as const, numFmt: NUM_FMT,  key: "valExTax"         },
    { label: "Sales Tax (Rs.)",                  align: "right"  as const, numFmt: NUM_FMT,  key: "taxAmount"        },
    { label: "Value Incl. Sales Tax / Revenue",  align: "right"  as const, numFmt: NUM_FMT,  key: "valInclTax"       },
  ];

  const ws: any = {};
  const colCount = HEADERS.length;
  let rowIdx = 0;

  // ── Title Row ──
  const titleCell = XLSXStyle.utils.encode_cell({ r: rowIdx, c: 0 });
  ws[titleCell] = {
    v: `Gross Sales Summary — ${locationNames}${dateRange.from ? "  |  " + format(dateRange.from, "dd MMM yyyy") : ""}${dateRange.to ? " – " + format(dateRange.to, "dd MMM yyyy") : ""}`,
    t: "s",
    s: { font: { bold: true, sz: 12, color: { rgb: WHITE } }, fill: { fgColor: { rgb: "0F172A" }, patternType: "solid" }, alignment: { horizontal: "left", vertical: "center" } },
  };
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: colCount - 1 } });
  rowIdx++;

  // ── Header Row ──
  const headerVals = HEADERS.map((h) => h.label);
  applyRowStyle(ws, rowIdx, colCount, (ci) => headerStyle(HEADERS[ci].align), headerVals);
  rowIdx++;

  // ── Data Rows ──
  const total = flatItems.length;
  for (let i = 0; i < total; i++) {
    const item = flatItems[i];
    const qty        = item.quantity || 0;
    const unitPrice  = item.unitPrice || 0;
    const priceWost  = unitPrice > 0 ? Math.round((unitPrice / 1.18) * 100) / 100 : 0;
    const wostAmt    = item.wostAmount || Math.round(qty * priceWost * 100) / 100;
    const discAmt    = item.discountAmount || 0;
    const discWost   = item.discountWostAmount ?? Math.round((discAmt / 1.18) * 100) / 100;
    const valExTax   = Math.max(0, Math.round((wostAmt - discWost) * 100) / 100);
    const taxAmt     = item.taxAmount || 0;
    const valInclTax = item.subTotal || Math.round((valExTax + taxAmt) * 100) / 100;

    const vals = [
      item.locationName || "—",
      item.brandName || "—",
      item.divisionName || "—",
      item.categoryName || "—",
      item.silhouetteName || "—",
      item.genderName || "—",
      item.orderNumber || "—",
      item.fbrInvoiceNumber || "—",
      item.sku || "—",
      item.barCode || "—",
      item.description || "—",
      item.sizeName || "—",
      item.colorName || "—",
      qty,
      unitPrice,
      priceWost,
      wostAmt,
      discAmt,
      valExTax,
      taxAmt,
      valInclTax,
    ];

    const isAlt = i % 2 === 1;
    const altBg = isAlt ? "F8FAFC" : WHITE;
    applyRowStyle(ws, rowIdx, colCount, (ci) => ({
      ...plainStyle(HEADERS[ci].align, HEADERS[ci].numFmt),
      fill: { fgColor: { rgb: altBg }, patternType: "solid" },
    }), vals);
    // set correct cell type for numbers
    for (let ci = 13; ci < colCount; ci++) {
      const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c: ci });
      if (ws[addr]) ws[addr].t = "n";
    }
    rowIdx++;

    if (i % 300 === 0) {
      onProgress?.(5 + Math.round((i / Math.max(1, total)) * 70));
      await yieldToMain();
    }
  }

  // ── Grand Total Row ──
  const grandVals = [
    "GRAND TOTAL", "", "", "", "", "", "", "", "", "", "", "", "",
    grandTotals.totalItems,
    "", "", // unitPrice, priceWost
    grandTotals.wostAmount,
    grandTotals.discountAmount,
    grandTotals.valueExSalesTax || grandTotals.amountAfterDiscount || 0,
    grandTotals.taxAmount,
    grandTotals.valueInclSalesTax || grandTotals.netAmount || 0,
  ];
  applyRowStyle(ws, rowIdx, colCount, (ci) => totalStyle(HEADERS[ci].align, HEADERS[ci].numFmt), grandVals);
  for (let ci = 13; ci < colCount; ci++) {
    const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c: ci });
    if (ws[addr] && typeof grandVals[ci] === "number") ws[addr].t = "n";
  }
  rowIdx++;

  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx - 1, c: colCount - 1 } });
  ws["!cols"] = [
    { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
    { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
    { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 22 },
  ];
  ws["!rows"] = [{ hpt: 28 }, { hpt: 24 }]; // title + header row height

  XLSXStyle.utils.book_append_sheet(wb, ws, "Flat Line Items");
}

// ─── HIERARCHICAL SHEET ───────────────────────────────────────────────────────
async function buildHierarchicalSheet(
  wb: any,
  treeData: GrossSalesSummaryTreeNode[],
  grandTotals: GrossSalesSummaryTotals,
  locationNames: string,
  dateRange: { from?: Date; to?: Date },
  onProgress?: (p: number) => void,
) {
  const HEADERS = [
    { label: "Product Hierarchy / Location / Description", align: "left"  as const },
    { label: "Qty",                                         align: "right" as const, numFmt: INT_FMT },
    { label: "Unit Price (Rs.)",                            align: "right" as const, numFmt: NUM_FMT },
    { label: "Price WOST",                                  align: "right" as const, numFmt: NUM_FMT },
    { label: "Total Price WOST",                            align: "right" as const, numFmt: NUM_FMT },
    { label: "Discount Amt",                                align: "right" as const, numFmt: NUM_FMT },
    { label: "Value Excl. Tax",                             align: "right" as const, numFmt: NUM_FMT },
    { label: "Sales Tax",                                   align: "right" as const, numFmt: NUM_FMT },
    { label: "Value Incl. Tax / Revenue",                   align: "right" as const, numFmt: NUM_FMT },
  ];

  const ws: any = {};
  const colCount = HEADERS.length;
  let rowIdx = 0;

  // ── Title Row ──
  ws["!merges"] = [];
  const titleAddr = XLSXStyle.utils.encode_cell({ r: 0, c: 0 });
  ws[titleAddr] = {
    v: `Gross Sales Summary — ${locationNames}${dateRange.from ? "  |  " + format(dateRange.from, "dd MMM yyyy") : ""}${dateRange.to ? " – " + format(dateRange.to, "dd MMM yyyy") : ""}`,
    t: "s",
    s: { font: { bold: true, sz: 12, color: { rgb: WHITE } }, fill: { fgColor: { rgb: "0F172A" }, patternType: "solid" }, alignment: { horizontal: "left", vertical: "center" } },
  };
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } });
  rowIdx++;

  // ── Header Row ──
  applyRowStyle(ws, rowIdx, colCount, (ci) => headerStyle(HEADERS[ci].align), HEADERS.map((h) => h.label));
  rowIdx++;

  // ── Tree Traversal ──
  let nodeCount = 0;

  function countNodes(nodes: GrossSalesSummaryTreeNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children || []), 0);
  }
  const totalNodes = countNodes(treeData);

  async function traverseTree(nodes: GrossSalesSummaryTreeNode[], depth: number) {
    for (const node of nodes) {
      nodeCount++;
      const isLeaf = node.level === "variant";

      const indent = "  ".repeat(depth);
      let label = `${indent}${node.value}`;
      if (node.level === "article" && node.sku) {
        label = `${indent}[${node.sku}] ${node.articleName || node.value}`;
      } else if (isLeaf && node.barCode) {
        label = `${indent}[${node.barCode}] ${node.color || ""}${node.size ? " — " + node.size : ""}`;
      }

      const uPrice  = node.totals.unitPrice || node.unitPrice || 0;
      const pWost   = node.totals.priceWost || (uPrice > 0 ? Math.round((uPrice / 1.18) * 100) / 100 : 0);
      const totWost = node.totals.wostAmount;
      const disc    = node.totals.discountAmount;
      const valEx   = node.totals.valueExSalesTax || Math.round((totWost - disc) * 100) / 100;
      const tax     = node.totals.taxAmount;
      const valIncl = node.totals.valueInclSalesTax || node.totals.netAmount || Math.round((valEx + tax) * 100) / 100;

      const vals = [
        label,
        node.totals.totalItems,
        isLeaf && uPrice > 0 ? uPrice : "",
        isLeaf && pWost > 0  ? pWost  : "",
        totWost,
        disc,
        valEx,
        tax,
        valIncl,
      ];

      const sty = (ci: number) => {
        const fmt = HEADERS[ci].numFmt;
        if (isLeaf) return plainStyle(HEADERS[ci].align, fmt);
        return levelStyle(node.level, HEADERS[ci].align, false, fmt);
      };

      applyRowStyle(ws, rowIdx, colCount, sty, vals);

      // set number cells
      for (let ci = 1; ci < colCount; ci++) {
        const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c: ci });
        if (ws[addr] && typeof vals[ci] === "number") ws[addr].t = "n";
      }
      rowIdx++;

      if (nodeCount % 200 === 0) {
        onProgress?.(5 + Math.round((nodeCount / Math.max(1, totalNodes)) * 75));
        await yieldToMain();
      }

      if (node.children && node.children.length > 0) {
        await traverseTree(node.children, depth + 1);
      }
    }
  }

  await traverseTree(treeData, 0);

  // ── Grand Total Row ──
  const grandVals = [
    "GRAND TOTAL",
    grandTotals.totalItems, "", "",
    grandTotals.wostAmount,
    grandTotals.discountAmount,
    grandTotals.valueExSalesTax || grandTotals.amountAfterDiscount || 0,
    grandTotals.taxAmount,
    grandTotals.valueInclSalesTax || grandTotals.netAmount || 0,
  ];
  applyRowStyle(ws, rowIdx, colCount, (ci) => totalStyle(HEADERS[ci].align, HEADERS[ci].numFmt), grandVals);
  for (let ci = 1; ci < colCount; ci++) {
    const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c: ci });
    if (ws[addr] && typeof grandVals[ci] === "number") ws[addr].t = "n";
  }
  rowIdx++;

  ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx - 1, c: colCount - 1 } });
  ws["!cols"] = [
    { wch: 50 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 22 },
  ];
  ws["!rows"] = [{ hpt: 28 }, { hpt: 24 }];

  XLSXStyle.utils.book_append_sheet(wb, ws, "Matrix Summary");
}
