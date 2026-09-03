"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { SalesListInvoiceNode, SalesListFlatRecord, SalesListTotals } from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateSalesListExcel(opts: {
  exportType: "flat" | "hierarchical";
  invoices: SalesListInvoiceNode[];
  flatItems: SalesListFlatRecord[];
  grandTotals: SalesListTotals;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const {
    exportType,
    invoices,
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
  const fileName = `sales-list-report-${dateStr}-${exportType}.xlsx`;

  if (exportType === "flat") {
    const headers = [
      "Outlet / Location",
      "Invoice #",
      "Order Date",
      "Cashier",
      "Customer",
      "Phone",
      "Payment Mode",
      "Merchant",
      "FBR Inv #",
      "FBR Status",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Quantity",
      "Unit Price",
      "Discount",
      "SubTotal",
      "Order Gross",
      "Order Net",
      "Cash Sale",
      "Cash Return",
      "Card Sale",
      "Credit Sale",
      "Gift Voucher",
      "Credit Voucher",
      "Exchange Voucher",
      "Claim Voucher",
      "Corporate Voucher",
      "Credit Issued",
      "Reward Voucher",
      "On Credit",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      dataRows.push([
        item.locationName,
        item.orderNumber,
        format(new Date(item.orderDate), "yyyy-MM-dd HH:mm"),
        item.cashierName,
        item.customerName,
        item.customerPhone,
        item.paymentMethod,
        item.merchant || "-",
        item.fbrInvoiceNumber,
        item.fbrStatus,
        item.sku,
        item.barCode,
        item.description,
        item.sizeName,
        item.colorName,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.subTotal,
        item.orderGrossAmount,
        item.orderNetAmount,
        item.cashSale,
        item.cashReturn,
        item.cardSale,
        item.creditSale,
        item.giftVoucherAmount,
        item.creditVoucherAmount,
        item.exchangeVoucherAmount,
        item.claimVoucherAmount,
        item.giftVoucherCorporate,
        item.creditVoucherIssuedAmount,
        item.rewardVoucherAmount,
        item.onCreditAmount,
      ]);

      if (i % 500 === 0) {
        onProgress?.(Math.round((i / Math.max(1, totalCount)) * 70) + 10);
        await yieldToMain();
      }
    }

    // Add Totals Footer Row
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
      grandTotals.totalItems,
      "",
      grandTotals.discountAmount,
      grandTotals.netAmount,
      grandTotals.grossAmount,
      grandTotals.netAmount,
      grandTotals.cashSale,
      grandTotals.cashReturn,
      grandTotals.cardSale,
      grandTotals.creditSale,
      grandTotals.giftVoucherAmount,
      grandTotals.creditVoucherAmount,
      grandTotals.exchangeVoucherAmount,
      grandTotals.claimVoucherAmount,
      grandTotals.giftVoucherCorporate,
      grandTotals.creditVoucherIssuedAmount,
      grandTotals.rewardVoucherAmount,
      grandTotals.onCreditAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Line Items");
  } else {
    // Hierarchical Invoice Matrix Export
    const headers = [
      "Invoice #",
      "Date & Time",
      "Customer",
      "Cashier",
      "Payment Mode",
      "Merchant",
      "FBR Inv #",
      "Items Count",
      "Gross Amount",
      "Discount",
      "Tax Amount",
      "Net Sales Amount",
      "Cash Sale",
      "Cash Return",
      "Card Sale",
      "Credit Sale",
      "Gift Voucher",
      "Credit Voucher",
      "Exchange Voucher",
      "Claim Voucher",
      "Corporate Voucher",
      "Credit Issued",
      "Reward Voucher",
      "On Credit",
    ];

    const dataRows: any[][] = [headers];

    const totalCount = invoices.length;
    for (let i = 0; i < totalCount; i++) {
      const inv = invoices[i];
      const t = inv.totals;
      dataRows.push([
        inv.orderNumber,
        format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm"),
        `${inv.customerName} (${inv.customerPhone})`,
        inv.cashierName,
        inv.paymentMethod,
        inv.merchant || "-",
        inv.fbrInvoiceNumber,
        t.totalItems,
        t.grossAmount,
        t.discountAmount,
        t.taxAmount,
        t.netAmount,
        t.cashSale,
        t.cashReturn,
        t.cardSale,
        t.creditSale,
        t.giftVoucherAmount,
        t.creditVoucherAmount,
        t.exchangeVoucherAmount,
        t.claimVoucherAmount,
        t.giftVoucherCorporate,
        t.creditVoucherIssuedAmount,
        t.rewardVoucherAmount,
        t.onCreditAmount,
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
      grandTotals.totalItems,
      grandTotals.grossAmount,
      grandTotals.discountAmount,
      grandTotals.taxAmount,
      grandTotals.netAmount,
      grandTotals.cashSale,
      grandTotals.cashReturn,
      grandTotals.cardSale,
      grandTotals.creditSale,
      grandTotals.giftVoucherAmount,
      grandTotals.creditVoucherAmount,
      grandTotals.exchangeVoucherAmount,
      grandTotals.claimVoucherAmount,
      grandTotals.giftVoucherCorporate,
      grandTotals.creditVoucherIssuedAmount,
      grandTotals.rewardVoucherAmount,
      grandTotals.onCreditAmount,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 20 },
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
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Invoices Matrix");
  }

  onProgress?.(90);
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

  onProgress?.(100);
  return { excelBuffer, fileName, fileBase64: base64 };
}
