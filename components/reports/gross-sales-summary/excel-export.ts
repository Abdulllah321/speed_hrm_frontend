"use client";

/**
 * Gross Sales Summary — Beautiful Styled Excel Export
 *
 * Uses the already-installed `xlsx` (SheetJS) package.
 * Cell-level styles are injected via the `s` property on each cell object.
 * The workbook is written with `{ cellStyles: true }` to enable style output.
 *
 * Color palette mirrors the UI preview hierarchy levels.
 */

import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  GrossSalesSummaryTreeNode,
  GrossSalesSummaryFlatRecord,
  GrossSalesSummaryTotals,
} from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encCell(r: number, c: number) {
  return XLSX.utils.encode_cell({ r, c });
}

function numCell(v: number | string, numFmt?: string, s?: any): any {
  return { v, t: typeof v === "number" ? "n" : "s", s, ...(numFmt ? { z: numFmt } : {}) };
}

function strCell(v: string, s?: any): any {
  return { v, t: "s", s };
}

// ─── Style Factories ──────────────────────────────────────────────────────────

const DARK_NAV   = "1E293B"; // Slate-900 — header background
const NEAR_BLACK = "0F172A"; // Near-black — title & grand total
const WHITE      = "FFFFFF";

/** Hierarchy level → background RGB (for dark levels: white text; light: dark text) */
const LEVEL_BG: Record<string, string> = {
  location:    "1D4ED8", // Blue-700    → white text
  month:       "1E40AF", // Blue-800    → white text
  date:        "1D4ED8", // Blue-700    → white text
  document:    "374151", // Gray-700    → white text
  salesPerson: "4B5563", // Gray-600    → white text
  taxRate:     "6B7280", // Gray-500    → white text
  brand:       "334155", // Slate-700   → white text
  division:    "475569", // Slate-600   → white text
  category:    "64748B", // Slate-500   → white text
  gender:      "7C3AED", // Violet-600  → white text
  silhouette:  "0369A1", // Sky-700     → white text
  article:     "ECFDF5", // Green-50    → dark text (light row)
  variant:     "F8FAFC", // Near-white  → dark text (leaf)
};

const DARK_LEVELS = new Set([
  "location","month","date","document","salesPerson","taxRate",
  "brand","division","category","gender","silhouette",
]);

const borderThin = {
  top:    { style: "thin",   color: { rgb: "CBD5E1" } },
  bottom: { style: "thin",   color: { rgb: "CBD5E1" } },
  left:   { style: "thin",   color: { rgb: "CBD5E1" } },
  right:  { style: "thin",   color: { rgb: "CBD5E1" } },
};

const borderTotal = {
  top:    { style: "medium", color: { rgb: "1E293B" } },
  bottom: { style: "double", color: { rgb: "1E293B" } },
  left:   { style: "thin",   color: { rgb: "CBD5E1" } },
  right:  { style: "thin",   color: { rgb: "CBD5E1" } },
};

function headerS(align: "left" | "center" | "right" = "left") {
  return {
    font:      { bold: true, sz: 10, color: { rgb: WHITE } },
    fill:      { fgColor: { rgb: DARK_NAV }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
    border:    borderThin,
  };
}

function levelS(level: string, align: "left" | "center" | "right" = "left") {
  const bg   = LEVEL_BG[level] || "F1F5F9";
  const dark = DARK_LEVELS.has(level);
  return {
    font:      { bold: !["article","variant"].includes(level), sz: 9.5, color: { rgb: dark ? WHITE : "0F172A" } },
    fill:      { fgColor: { rgb: bg }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center" },
    border:    borderThin,
  };
}

function plainS(align: "left" | "center" | "right" = "left", alt = false) {
  return {
    font:      { sz: 9, color: { rgb: "1E293B" } },
    fill:      { fgColor: { rgb: alt ? "F1F5F9" : WHITE }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center" },
    border:    borderThin,
  };
}

function totalS(align: "left" | "center" | "right" = "left") {
  return {
    font:      { bold: true, sz: 10, color: { rgb: WHITE } },
    fill:      { fgColor: { rgb: NEAR_BLACK }, patternType: "solid" },
    alignment: { horizontal: align, vertical: "center" },
    border:    borderTotal,
  };
}

function titleS() {
  return {
    font:      { bold: true, sz: 12, color: { rgb: WHITE } },
    fill:      { fgColor: { rgb: NEAR_BLACK }, patternType: "solid" },
    alignment: { horizontal: "left", vertical: "center" },
    border:    { bottom: { style: "thin", color: { rgb: "334155" } } },
  };
}

// ─── Number formats ───────────────────────────────────────────────────────────
const FMT_NUM = "#,##0.00";
const FMT_INT = "#,##0";

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateGrossSalesSummaryExcel(opts: {
  exportType: "flat" | "hierarchical";
  treeData?: GrossSalesSummaryTreeNode[];
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    treeData = [],
    flatItems,
    grandTotals,
    dateRange,
    locationNames,
    onProgress,
  } = opts;

  onProgress?.(5);
  await yieldToMain();

  const wb = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `gross-sales-summary-${exportType}-${dateStr}.xlsx`;

  const title = `Gross Sales Summary — ${locationNames}` +
    (dateRange.from ? `  |  ${format(dateRange.from, "dd MMM yyyy")}` : "") +
    (dateRange.to   ? ` – ${format(dateRange.to, "dd MMM yyyy")}`   : "");

  if (exportType === "flat") {
    await buildFlatSheet(wb, flatItems, grandTotals, title, onProgress);
  } else {
    await buildHierarchicalSheet(wb, treeData, grandTotals, title, onProgress);
  }

  onProgress?.(92);
  await yieldToMain();

  // `cellStyles: true` enables the `s` property on cell objects to be written
  const excelBuffer: ArrayBuffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  } as any);

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: "" };
}

// ─── FLAT SHEET ───────────────────────────────────────────────────────────────

const FLAT_COLS = [
  { label: "Outlet / Location",              w: 22, align: "left"   as const },
  { label: "Brand",                          w: 18, align: "left"   as const },
  { label: "Division",                       w: 16, align: "left"   as const },
  { label: "Category",                       w: 18, align: "left"   as const },
  { label: "Silhouette",                     w: 16, align: "left"   as const },
  { label: "Gender",                         w: 12, align: "left"   as const },
  { label: "Order #",                        w: 16, align: "center" as const },
  { label: "FBR Invoice",                    w: 18, align: "center" as const },
  { label: "SKU",                            w: 14, align: "center" as const },
  { label: "Barcode",                        w: 14, align: "center" as const },
  { label: "Description",                    w: 30, align: "left"   as const },
  { label: "Size",                           w: 10, align: "center" as const },
  { label: "Color",                          w: 12, align: "center" as const },
  { label: "Qty",                            w:  8, align: "right"  as const, numFmt: FMT_INT },
  { label: "Unit Price (Rs.)",               w: 14, align: "right"  as const, numFmt: FMT_NUM },
  { label: "Price WOST",                     w: 14, align: "right"  as const, numFmt: FMT_NUM },
  { label: "Total Price WOST",               w: 16, align: "right"  as const, numFmt: FMT_NUM },
  { label: "Discount Amt (Rs.)",             w: 16, align: "right"  as const, numFmt: FMT_NUM },
  { label: "Value Excl. Sales Tax",          w: 18, align: "right"  as const, numFmt: FMT_NUM },
  { label: "Sales Tax (Rs.)",                w: 14, align: "right"  as const, numFmt: FMT_NUM },
  { label: "Value Incl. Tax / Revenue",      w: 22, align: "right"  as const, numFmt: FMT_NUM },
];

async function buildFlatSheet(
  wb: XLSX.WorkBook,
  flatItems: GrossSalesSummaryFlatRecord[],
  gt: GrossSalesSummaryTotals,
  title: string,
  onProgress?: (p: number) => void,
) {
  const ws: any = {};
  const nc = FLAT_COLS.length;
  let r = 0;

  // Title
  ws[encCell(r, 0)] = strCell(title, titleS());
  ws["!merges"] = [{ s: { r, c: 0 }, e: { r, c: nc - 1 } }];
  r++;

  // Header
  for (let c = 0; c < nc; c++) {
    ws[encCell(r, c)] = strCell(FLAT_COLS[c].label, headerS(FLAT_COLS[c].align));
  }
  r++;

  // Data
  const total = flatItems.length;
  for (let i = 0; i < total; i++) {
    const item = flatItems[i];
    const qty       = item.quantity || 0;
    const uPrice    = item.unitPrice || 0;
    const pWost     = uPrice > 0 ? Math.round((uPrice / 1.18) * 100) / 100 : 0;
    const wost      = item.wostAmount || Math.round(qty * pWost * 100) / 100;
    const disc      = item.discountAmount || 0;
    const discWost  = item.discountWostAmount ?? Math.round((disc / 1.18) * 100) / 100;
    const valEx     = Math.max(0, Math.round((wost - discWost) * 100) / 100);
    const tax       = item.taxAmount || 0;
    const valIncl   = item.subTotal || Math.round((valEx + tax) * 100) / 100;
    const alt       = i % 2 === 1;

    const strs = [
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
    ];
    const nums = [qty, uPrice, pWost, wost, disc, valEx, tax, valIncl];

    for (let c = 0; c < strs.length; c++) {
      ws[encCell(r, c)] = strCell(strs[c], plainS(FLAT_COLS[c].align, alt));
    }
    for (let c = 0; c < nums.length; c++) {
      const ci = strs.length + c;
      ws[encCell(r, ci)] = numCell(nums[c], FLAT_COLS[ci].numFmt, {
        ...plainS(FLAT_COLS[ci].align, alt),
        numFmt: FLAT_COLS[ci].numFmt,
      });
    }
    r++;

    if (i % 300 === 0) {
      onProgress?.(5 + Math.round((i / Math.max(1, total)) * 75));
      await yieldToMain();
    }
  }

  // Grand Total
  const grandStrs = [
    "GRAND TOTAL","","","","","","","","","","","","",
  ];
  const grandNums = [
    gt.totalItems, 0, 0, gt.wostAmount, gt.discountAmount,
    gt.valueExSalesTax || gt.amountAfterDiscount || 0,
    gt.taxAmount,
    gt.valueInclSalesTax || gt.netAmount || 0,
  ];

  for (let c = 0; c < grandStrs.length; c++) {
    ws[encCell(r, c)] = strCell(grandStrs[c], totalS(FLAT_COLS[c].align));
  }
  for (let c = 0; c < grandNums.length; c++) {
    const ci = grandStrs.length + c;
    const val = grandNums[c];
    // Skip zeros for unit price / pWost placeholders
    if (ci === 14 || ci === 15) {
      ws[encCell(r, ci)] = strCell("", totalS(FLAT_COLS[ci].align));
    } else {
      ws[encCell(r, ci)] = numCell(val, FLAT_COLS[ci].numFmt, {
        ...totalS(FLAT_COLS[ci].align),
        numFmt: FLAT_COLS[ci].numFmt,
      });
    }
  }
  r++;

  ws["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: nc - 1 } });
  ws["!cols"] = FLAT_COLS.map((col) => ({ wch: col.w }));
  ws["!rows"] = [{ hpt: 28 }, { hpt: 22 }];

  XLSX.utils.book_append_sheet(wb, ws, "Flat Line Items");
}

// ─── HIERARCHICAL SHEET ───────────────────────────────────────────────────────

const HIER_COLS = [
  { label: "Product Hierarchy / Location",  w: 50, align: "left"  as const },
  { label: "Qty",                            w: 10, align: "right" as const, numFmt: FMT_INT },
  { label: "Unit Price (Rs.)",               w: 14, align: "right" as const, numFmt: FMT_NUM },
  { label: "Price WOST",                     w: 14, align: "right" as const, numFmt: FMT_NUM },
  { label: "Total Price WOST",               w: 18, align: "right" as const, numFmt: FMT_NUM },
  { label: "Discount Amt (Rs.)",             w: 16, align: "right" as const, numFmt: FMT_NUM },
  { label: "Value Excl. Sales Tax",          w: 18, align: "right" as const, numFmt: FMT_NUM },
  { label: "Sales Tax (Rs.)",                w: 14, align: "right" as const, numFmt: FMT_NUM },
  { label: "Value Incl. Tax / Revenue",      w: 22, align: "right" as const, numFmt: FMT_NUM },
];

async function buildHierarchicalSheet(
  wb: XLSX.WorkBook,
  treeData: GrossSalesSummaryTreeNode[],
  gt: GrossSalesSummaryTotals,
  title: string,
  onProgress?: (p: number) => void,
) {
  const ws: any = {};
  const nc = HIER_COLS.length;
  let r = 0;

  // Title
  ws[encCell(r, 0)] = strCell(title, titleS());
  ws["!merges"] = [{ s: { r, c: 0 }, e: { r, c: nc - 1 } }];
  r++;

  // Header
  for (let c = 0; c < nc; c++) {
    ws[encCell(r, c)] = strCell(HIER_COLS[c].label, headerS(HIER_COLS[c].align));
  }
  r++;

  let nodeCount = 0;

  function countNodes(nodes: GrossSalesSummaryTreeNode[]): number {
    return nodes.reduce((s, n) => s + 1 + countNodes(n.children || []), 0);
  }
  const totalNodes = Math.max(1, countNodes(treeData));

  async function traverse(nodes: GrossSalesSummaryTreeNode[], depth: number) {
    for (const node of nodes) {
      nodeCount++;
      const isLeaf   = node.level === "variant";
      const indent   = "  ".repeat(depth);
      const s        = levelS(node.level, "left");

      let label = `${indent}${node.value}`;
      if (node.level === "article" && node.sku) {
        label = `${indent}[${node.sku}] ${node.articleName || node.value}`;
      } else if (isLeaf && node.barCode) {
        label = `${indent}[${node.barCode}] ${node.color || ""}${node.size ? " — " + node.size : ""}`;
      }

      const uPrice  = node.totals.unitPrice || node.unitPrice || 0;
      const pWost   = node.totals.priceWost || (uPrice > 0 ? Math.round((uPrice / 1.18) * 100) / 100 : 0);
      const wost    = node.totals.wostAmount;
      const disc    = node.totals.discountAmount;
      const valEx   = node.totals.valueExSalesTax || Math.round((wost - disc) * 100) / 100;
      const tax     = node.totals.taxAmount;
      const valIncl = node.totals.valueInclSalesTax || node.totals.netAmount || Math.round((valEx + tax) * 100) / 100;

      // Column 0: label (always string)
      ws[encCell(r, 0)] = strCell(label, s);

      // Column 1: Qty
      ws[encCell(r, 1)] = numCell(node.totals.totalItems, FMT_INT, { ...levelS(node.level, "right"), numFmt: FMT_INT });

      // Column 2: Unit Price (only on leaf)
      ws[encCell(r, 2)] = isLeaf && uPrice > 0
        ? numCell(uPrice,  FMT_NUM, { ...levelS(node.level, "right"), numFmt: FMT_NUM })
        : strCell("", s);

      // Column 3: Price WOST (only on leaf)
      ws[encCell(r, 3)] = isLeaf && pWost > 0
        ? numCell(pWost,   FMT_NUM, { ...levelS(node.level, "right"), numFmt: FMT_NUM })
        : strCell("", s);

      // Columns 4-8: financial totals
      const totals = [wost, disc, valEx, tax, valIncl];
      for (let ci = 0; ci < totals.length; ci++) {
        ws[encCell(r, 4 + ci)] = numCell(totals[ci], FMT_NUM, {
          ...levelS(node.level, "right"),
          numFmt: FMT_NUM,
        });
      }

      r++;

      if (nodeCount % 200 === 0) {
        onProgress?.(5 + Math.round((nodeCount / totalNodes) * 75));
        await yieldToMain();
      }

      if (node.children?.length) {
        await traverse(node.children, depth + 1);
      }
    }
  }

  await traverse(treeData, 0);

  // Grand Total
  ws[encCell(r, 0)] = strCell("GRAND TOTAL", totalS("left"));
  ws[encCell(r, 1)] = numCell(gt.totalItems, FMT_INT, { ...totalS("right"), numFmt: FMT_INT });
  ws[encCell(r, 2)] = strCell("", totalS("right"));
  ws[encCell(r, 3)] = strCell("", totalS("right"));
  const gtNums = [
    gt.wostAmount,
    gt.discountAmount,
    gt.valueExSalesTax || gt.amountAfterDiscount || 0,
    gt.taxAmount,
    gt.valueInclSalesTax || gt.netAmount || 0,
  ];
  for (let ci = 0; ci < gtNums.length; ci++) {
    ws[encCell(r, 4 + ci)] = numCell(gtNums[ci], FMT_NUM, { ...totalS("right"), numFmt: FMT_NUM });
  }
  r++;

  ws["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: nc - 1 } });
  ws["!cols"] = HIER_COLS.map((col) => ({ wch: col.w }));
  ws["!rows"] = [{ hpt: 28 }, { hpt: 22 }];

  XLSX.utils.book_append_sheet(wb, ws, "Matrix Summary");
}
