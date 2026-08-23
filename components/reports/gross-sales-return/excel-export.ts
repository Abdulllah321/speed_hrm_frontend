"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { GrossSalesReturnNode, GrossSalesReturnFlatRecord, GrossSalesReturnTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateGrossSalesReturnExcel(opts: {
  exportType: "flat" | "hierarchical";
  returns: GrossSalesReturnNode[];
  flatItems: GrossSalesReturnFlatRecord[];
  grandTotals: GrossSalesReturnTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
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

  onProgress?.(10);
  await yieldToMain();

  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `gross-sales-return-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const headers = [
      "Outlet / Location",
      "Return #",
      "Order #",
      "Return Date",
      "Cashier",
      "Customer",
      "Phone",
      "Refund Mode",
      "FBR Inv #",
      "FBR Status",
      "Category",
      "Brand",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Quantity",
      "Unit Price",
      "Discount Reversal",
      "SubTotal",
      "Gross Return",
      "Net Refund",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      dataRows.push([
        item.locationName,
        item.returnNumber,
        item.orderNumber,
        format(new Date(item.returnDate), "yyyy-MM-dd HH:mm"),
        item.cashierName,
        item.customerName,
        item.customerPhone,
        item.paymentMethod,
        item.fbrInvoiceNumber,
        item.fbrStatus,
        item.categoryName,
        item.brandName,
        item.sku,
        item.barCode,
        item.description,
        item.sizeName,
        item.colorName,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.subTotal,
        item.returnGrossAmount,
        item.returnNetAmount,
      ]);

      if (i % 500 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 70) + 10);
        await yieldToMain();
      }
    }

    dataRows.push([
      "GRAND TOTAL",
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
      "",
      grandTotals.totalItems,
      "",
      grandTotals.discountAmount,
      grandTotals.netAmount,
      grandTotals.grossAmount,
      grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Returned Line Items");
  } else {
    const headers = [
      "Return #",
      "Order #",
      "Return Date",
      "Customer",
      "Cashier",
      "Refund Mode",
      "FBR Inv #",
      "Items Count",
      "Gross Return",
      "Discount Reversal",
      "Taxes",
      "Net Refund",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = returns.length;
    for (let i = 0; i < totalCount; i++) {
      const ret = returns[i];
      const t = ret.totals;
      dataRows.push([
        ret.returnNumber,
        ret.orderNumber,
        format(new Date(ret.createdAt), "yyyy-MM-dd HH:mm"),
        `${ret.customerName} (${ret.customerPhone})`,
        ret.cashierName,
        ret.paymentMethod,
        ret.fbrInvoiceNumber,
        t.totalItems,
        t.grossAmount,
        t.discountAmount,
        t.taxAmount,
        t.netAmount,
      ]);

      if (i % 300 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 70) + 10);
        await yieldToMain();
      }
    }

    dataRows.push([
      "GRAND TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      grandTotals.totalItems,
      grandTotals.grossAmount,
      grandTotals.discountAmount,
      grandTotals.taxAmount,
      grandTotals.netAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Return Matrix");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
