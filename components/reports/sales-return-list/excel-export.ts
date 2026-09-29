"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { SalesReturnNode, SalesReturnFlatRecord, SalesReturnTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateSalesReturnListExcel(opts: {
  exportType: "flat" | "hierarchical";
  returns: SalesReturnNode[];
  flatItems: SalesReturnFlatRecord[];
  grandTotals: SalesReturnTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    returns,
    flatItems,
    grandTotals,
    dateRange,
    locationNames,
    onProgress,
  } = opts;

  onProgress?.(5, "Initializing Excel workbook...");
  await yieldToMain();

  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `sales-return-list-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const headers = [
      "Outlet / Location",
      "Return #",
      "Original Invoice #",
      "Return Date",
      "Sub Type",
      "Refund Mode",
      "Claim Status",
      "Cashier",
      "Customer Name",
      "Phone",
      "CNIC",
      "Customer Code",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Return Qty",
      "Unit Price",
      "Unit Price WOST",
      "Value Excl. (WOST)",
      "Discount %",
      "Discount",
      "Discount WOST",
      "Amount After Discount",
      "Sales Tax (18%)",
      "Value Incl. (Net Total)",
      "Voucher Code Issued",
      "Voucher Amount",
      "Voucher Type",
      "Cash Refund",
      "Card Refund",
      "Return Reason",
    ];

    const dataRows: any[][] = [headers];

    let totalQty = 0;
    let totalValExcl = 0;
    let totalDisc = 0;
    let totalDiscWost = 0;
    let totalAmtAfterDisc = 0;
    let totalTax = 0;
    let totalValIncl = 0;
    let totalVouchers = 0;
    let totalCash = 0;
    let totalCard = 0;

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];

      const qty = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const unitPriceWost = Number((item.priceWost !== undefined ? item.priceWost : unitPrice / 1.18).toFixed(2));
      const valExcl = Number((item.valueExcl !== undefined ? item.valueExcl : qty * unitPriceWost).toFixed(2));
      const disc = item.discountAmount || 0;
      const discWost = Number((item.discountAmountWost !== undefined ? item.discountAmountWost : disc / 1.18).toFixed(2));
      const amtAfterDisc = Number((item.amountAfterDiscount !== undefined ? item.amountAfterDiscount : Math.max(0, valExcl - discWost)).toFixed(2));
      const tax = item.taxAmount || 0;
      const valIncl = Number((item.lineTotal !== undefined ? item.lineTotal : 0).toFixed(2));

      totalQty += qty;
      totalValExcl += valExcl;
      totalDisc += disc;
      totalDiscWost += discWost;
      totalAmtAfterDisc += amtAfterDisc;
      totalTax += tax;
      totalValIncl += valIncl;
      totalVouchers += item.voucherIssuedAmount || item.voucherAmount || 0;
      totalCash += item.cashRefund || 0;
      totalCard += item.cardRefund || 0;

      dataRows.push([
        item.locationName,
        item.returnNumber,
        item.originalOrderNumber || "-",
        item.returnDate ? format(new Date(item.returnDate), "yyyy-MM-dd HH:mm") : "-",
        item.subTypeLabel || item.subType,
        item.refundMode || "-",
        item.claimStatus || "-",
        item.cashierName || "-",
        item.customerName || "Walk-in",
        item.customerPhone || "-",
        item.customerCnic || "-",
        item.customerCode || "-",
        item.sku || "-",
        item.barCode || "-",
        item.description || "-",
        item.sizeName || "-",
        item.colorName || "-",
        qty,
        unitPrice,
        unitPriceWost,
        valExcl,
        item.discountPercent || 0,
        disc,
        discWost,
        amtAfterDisc,
        tax,
        valIncl,
        item.voucherCode || "-",
        item.voucherAmount || item.voucherIssuedAmount || 0,
        item.voucherType || "-",
        item.cashRefund || 0,
        item.cardRefund || 0,
        item.returnReason || "-",
      ]);

      if (i % 250 === 0 || i === totalCount - 1) {
        const pct = Math.round(((i + 1) / Math.max(1, totalCount)) * 75) + 10;
        onProgress?.(
          pct,
          `Processing return row ${i + 1} of ${totalCount.toLocaleString()}...`,
        );
        await yieldToMain();
      }
    }

    // Append Summary Row
    dataRows.push([
      "GRAND TOTALS",
      `Total Returns: ${grandTotals.returnCount}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalQty || grandTotals.totalItems,
      "",
      "",
      totalValExcl || grandTotals.wostAmount,
      "",
      totalDisc || grandTotals.discountAmount,
      totalDiscWost || grandTotals.discountWostAmount,
      totalAmtAfterDisc || grandTotals.amountAfterDiscount,
      totalTax || grandTotals.taxAmount,
      totalValIncl || grandTotals.netAmount,
      "",
      totalVouchers || grandTotals.voucherIssuedAmount,
      "",
      totalCash || grandTotals.cashRefund,
      totalCard || grandTotals.cardRefund,
      "",
    ]);

    onProgress?.(88, "Building Excel sheet...");
    await yieldToMain();

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Returns (Flat)");
  } else {
    // Hierarchical Mode
    const headers = [
      "Return # / SKU",
      "Original Invoice # / Barcode",
      "Return Date / Description",
      "Sub Type / Size & Color",
      "Refund Mode",
      "Customer Name",
      "Phone",
      "CNIC",
      "Location",
      "Cashier",
      "Return Qty",
      "Unit Price WOST",
      "Value Excl. (WOST)",
      "Discount WOST",
      "Amount After Discount",
      "Sales Tax (18%)",
      "Net Value Incl.",
      "Voucher Code",
      "Voucher Amount",
      "Cash Refund",
      "Card Refund",
      "Return Reason",
    ];

    const dataRows: any[][] = [headers];
    const totalCount = returns.length;

    for (let i = 0; i < totalCount; i++) {
      const ret = returns[i];
      const t = ret.totals;
      const cust = ret.customerDetails;

      const grossVal = t.grossAmount || 0;
      const valExcl = t.wostAmount || grossVal / 1.18;
      const discWost = t.discountWostAmount || (t.discountAmount || 0) / 1.18;
      const amtAfterDisc = t.amountAfterDiscount || Math.max(0, valExcl - discWost);

      // Parent Return Row
      dataRows.push([
        ret.returnNumber,
        ret.originalOrderNumber || "-",
        ret.createdAt ? format(new Date(ret.createdAt), "yyyy-MM-dd HH:mm") : "-",
        ret.subTypeLabel || ret.subType,
        ret.refundMode || "VOUCHER",
        cust?.name || ret.customerName || "Walk-in",
        cust?.phone || ret.customerPhone || "-",
        cust?.cnic || ret.customerCnic || "-",
        ret.locationName || "-",
        ret.cashierName || "-",
        t.totalItems,
        t.totalItems > 0 ? (valExcl / t.totalItems).toFixed(2) : 0,
        valExcl.toFixed(2),
        discWost.toFixed(2),
        amtAfterDisc.toFixed(2),
        t.taxAmount.toFixed(2),
        t.netAmount.toFixed(2),
        ret.voucherCode || "-",
        ret.voucherAmount || t.voucherIssuedAmount || 0,
        t.cashRefund || 0,
        t.cardRefund || 0,
        ret.reason || "-",
      ]);

      // Child Item Rows
      const items = ret.items || [];
      for (const it of items) {
        const itemPriceWost = it.priceWost || it.unitPrice / 1.18;
        const itemValExcl = it.valueExcl || (it.quantity * it.unitPrice) / 1.18;
        const itemDiscWost = it.discountAmountWost || (it.discountAmount || 0) / 1.18;
        const itemAmtAfter = it.amountAfterDiscount || Math.max(0, itemValExcl - itemDiscWost);

        dataRows.push([
          `  ↳ ${it.sku || it.barCode}`,
          it.barCode || "-",
          it.description || "-",
          `${it.sizeName || "-"} / ${it.colorName || "-"}`,
          "",
          "",
          "",
          "",
          "",
          "",
          it.quantity,
          itemPriceWost.toFixed(2),
          itemValExcl.toFixed(2),
          itemDiscWost.toFixed(2),
          itemAmtAfter.toFixed(2),
          it.taxAmount.toFixed(2),
          it.lineTotal.toFixed(2),
          "",
          "",
          "",
          "",
          it.returnReason || "-",
        ]);
      }

      if (i % 200 === 0 || i === totalCount - 1) {
        const pct = Math.round(((i + 1) / Math.max(1, totalCount)) * 75) + 10;
        onProgress?.(
          pct,
          `Processing return hierarchy ${i + 1} of ${totalCount.toLocaleString()}...`,
        );
        await yieldToMain();
      }
    }

    // Grand Totals Summary Row
    dataRows.push([
      "GRAND TOTALS",
      `Total Returns: ${grandTotals.returnCount}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      grandTotals.totalItems,
      grandTotals.totalItems > 0 ? (grandTotals.wostAmount / grandTotals.totalItems).toFixed(2) : 0,
      grandTotals.wostAmount.toFixed(2),
      grandTotals.discountWostAmount.toFixed(2),
      grandTotals.amountAfterDiscount.toFixed(2),
      grandTotals.taxAmount.toFixed(2),
      grandTotals.netAmount.toFixed(2),
      "",
      grandTotals.voucherIssuedAmount.toFixed(2),
      grandTotals.cashRefund.toFixed(2),
      grandTotals.cardRefund.toFixed(2),
      "",
    ]);

    onProgress?.(88, "Building Excel sheet...");
    await yieldToMain();

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Returns (Hierarchical)");
  }

  onProgress?.(95, "Encoding file buffer...");
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileBase64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100, "Done");
  return { excelBuffer, fileName, fileBase64 };
}
