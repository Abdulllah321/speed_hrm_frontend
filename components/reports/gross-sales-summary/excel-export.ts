"use client";

/**
 * Gross Sales Summary — Excel Export
 *
 * Uses the installed `xlsx` (SheetJS Community 0.18.5).
 * Cell-object `s` styles are NOT supported in community edition writer —
 * attempting them produces a corrupt file. We use what IS supported:
 *   - number format strings (cell `z` property)
 *   - column widths (`!cols`)
 *   - freeze panes (`!freeze`)
 *   - row heights (`!rows`)
 *
 * For large datasets (> 2500 items), the view falls through to the
 * server-side Bull Queue export which uses ExcelJS with full styling.
 */

import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  GrossSalesSummaryTreeNode,
  GrossSalesSummaryFlatRecord,
  GrossSalesSummaryTotals,
} from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

const FMT_NUM = "#,##0.00";
const FMT_INT = "#,##0";

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

  if (exportType === "flat") {
    await buildFlatSheet(wb, flatItems, grandTotals, locationNames, dateRange, onProgress);
  } else {
    await buildHierarchicalSheet(wb, treeData, grandTotals, locationNames, dateRange, onProgress);
  }

  onProgress?.(92);
  await yieldToMain();

  const excelBuffer: ArrayBuffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
  });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: "" };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function n(v: number, z = FMT_NUM) {
  return { v, t: "n" as const, z };
}

function s(v: string) {
  return { v, t: "s" as const };
}

// ─── FLAT SHEET ───────────────────────────────────────────────────────────────

const FLAT_HEADERS = [
  "Outlet / Location",
  "Brand",
  "Division",
  "Category",
  "Silhouette",
  "Gender",
  "Order #",
  "FBR Invoice",
  "SKU",
  "Barcode",
  "Description",
  "Size",
  "Color",
  "Qty",
  "Unit Price (Rs.)",
  "Price WOST",
  "Total Price WOST",
  "Discount Amt (Rs.)",
  "Value Excl. Sales Tax",
  "Sales Tax (Rs.)",
  "Value Incl. Tax / Revenue",
];

const FLAT_COL_W = [
  22, 18, 16, 18, 16, 12,
  16, 18, 14, 14, 30, 10, 12,
  8, 14, 14, 16, 16, 18, 14, 22,
];

async function buildFlatSheet(
  wb: XLSX.WorkBook,
  flatItems: GrossSalesSummaryFlatRecord[],
  gt: GrossSalesSummaryTotals,
  locationNames: string,
  dateRange: { from?: Date; to?: Date },
  onProgress?: (p: number) => void,
) {
  const rows: any[][] = [];

  // Row 1: Report Title (merged via writing into col A)
  const fromStr = dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "";
  const toStr = dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "";
  const title = `Gross Sales Summary — ${locationNames}${fromStr ? `  |  ${fromStr}` : ""}${toStr ? ` – ${toStr}` : ""}`;
  rows.push([title]);

  // Row 2: Column headers
  rows.push(FLAT_HEADERS);

  // Data rows
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

    rows.push([
      item.locationName || "",
      item.brandName || "",
      item.divisionName || "",
      item.categoryName || "",
      item.silhouetteName || "",
      item.genderName || "",
      item.orderNumber || "",
      item.fbrInvoiceNumber || "",
      item.sku || "",
      item.barCode || "",
      item.description || "",
      item.sizeName || "",
      item.colorName || "",
      qty,
      uPrice,
      pWost,
      wost,
      disc,
      valEx,
      tax,
      valIncl,
    ]);

    if (i % 300 === 0) {
      onProgress?.(5 + Math.round((i / Math.max(1, total)) * 75));
      await yieldToMain();
    }
  }

  // Grand Total row
  rows.push([
    "GRAND TOTAL", "", "", "", "", "", "", "", "", "", "", "", "",
    gt.totalItems,
    "", "",
    gt.wostAmount,
    gt.discountAmount,
    gt.valueExSalesTax || gt.amountAfterDiscount || 0,
    gt.taxAmount,
    gt.valueInclSalesTax || gt.netAmount || 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Apply number formats to numeric columns (indices 13–20, rows 2..end)
  const numCols = [13, 14, 15, 16, 17, 18, 19, 20];
  const numFmts: Record<number, string> = {
    13: FMT_INT,
    14: FMT_NUM, 15: FMT_NUM, 16: FMT_NUM, 17: FMT_NUM,
    18: FMT_NUM, 19: FMT_NUM, 20: FMT_NUM,
  };
  const dataStartRow = 2; // row index 0=title, 1=headers, 2..=data
  const lastRow = rows.length - 1;
  for (let r = dataStartRow; r <= lastRow; r++) {
    for (const c of numCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].t = "n";
        ws[addr].z = numFmts[c];
      }
    }
  }

  // Merge title row across all columns
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: FLAT_HEADERS.length - 1 } },
  ];

  // Freeze header rows (title + column headers)
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 2, topLeftCell: "A3", activePane: "bottomLeft" };

  ws["!cols"] = FLAT_COL_W.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, "Flat Line Items");
}

// ─── HIERARCHICAL SHEET ───────────────────────────────────────────────────────

const HIER_HEADERS = [
  "Product Hierarchy / Location",
  "Qty",
  "Unit Price (Rs.)",
  "Price WOST",
  "Total Price WOST",
  "Discount Amt (Rs.)",
  "Value Excl. Sales Tax",
  "Sales Tax (Rs.)",
  "Value Incl. Tax / Revenue",
];

const HIER_COL_W = [50, 10, 14, 14, 18, 16, 18, 14, 22];

async function buildHierarchicalSheet(
  wb: XLSX.WorkBook,
  treeData: GrossSalesSummaryTreeNode[],
  gt: GrossSalesSummaryTotals,
  locationNames: string,
  dateRange: { from?: Date; to?: Date },
  onProgress?: (p: number) => void,
) {
  const rows: any[][] = [];

  // Title row
  const fromStr = dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "";
  const toStr = dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "";
  const title = `Gross Sales Summary — ${locationNames}${fromStr ? `  |  ${fromStr}` : ""}${toStr ? ` – ${toStr}` : ""}`;
  rows.push([title]);

  // Header row
  rows.push(HIER_HEADERS);

  let nodeCount = 0;
  function countNodes(nodes: GrossSalesSummaryTreeNode[]): number {
    return nodes.reduce((s, n) => s + 1 + countNodes(n.children || []), 0);
  }
  const totalNodes = Math.max(1, countNodes(treeData));

  async function traverse(nodes: GrossSalesSummaryTreeNode[], depth: number) {
    for (const node of nodes) {
      nodeCount++;

      const indent = "  ".repeat(depth);
      const isLeaf = node.level === "variant";
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

      rows.push([
        label,
        node.totals.totalItems,
        isLeaf && uPrice > 0 ? uPrice : null,
        isLeaf && pWost > 0  ? pWost  : null,
        wost,
        disc,
        valEx,
        tax,
        valIncl,
      ]);

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

  // Grand Total row
  rows.push([
    "GRAND TOTAL",
    gt.totalItems,
    null, null,
    gt.wostAmount,
    gt.discountAmount,
    gt.valueExSalesTax || gt.amountAfterDiscount || 0,
    gt.taxAmount,
    gt.valueInclSalesTax || gt.netAmount || 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows, { dense: false });

  // Apply number formats to numeric columns (1–8, starting from data rows)
  const numFmts: Record<number, string> = {
    1: FMT_INT,
    2: FMT_NUM, 3: FMT_NUM, 4: FMT_NUM,
    5: FMT_NUM, 6: FMT_NUM, 7: FMT_NUM, 8: FMT_NUM,
  };
  const lastRow = rows.length - 1;
  for (let r = 2; r <= lastRow; r++) {
    for (const [c, fmt] of Object.entries(numFmts)) {
      const addr = XLSX.utils.encode_cell({ r, c: Number(c) });
      if (ws[addr] && ws[addr].v !== null && ws[addr].v !== undefined && typeof ws[addr].v === "number") {
        ws[addr].t = "n";
        ws[addr].z = fmt;
      }
    }
  }

  // Merge title
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HIER_HEADERS.length - 1 } },
  ];

  // Freeze header rows
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 2, topLeftCell: "A3", activePane: "bottomLeft" };

  ws["!cols"] = HIER_COL_W.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, "Matrix Summary");
}
