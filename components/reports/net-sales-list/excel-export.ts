"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  NetSalesListDocumentNode,
  NetSalesListTotals,
} from "./types";

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function generateNetSalesListExcel(opts: {
  documents: NetSalesListDocumentNode[];
  grandTotals: NetSalesListTotals | null;
  dateRange: { from?: Date; to?: Date };
  locationNames: string;
  onProgress?: (percent: number, message?: string) => void;
}): Promise<{ excelBuffer: ArrayBuffer; fileName: string; fileBase64: string }> {
  const { documents, grandTotals, dateRange, locationNames, onProgress } = opts;

  onProgress?.(10, "Initializing Excel workbook...");
  await yieldToMain();

  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `net-sales-list-${dateStr}.xlsx`;

  // ──────────────────────────────────────────────────────────────────────────
  // Sheet 1: Net Sales Document Audit Matrix
  // ──────────────────────────────────────────────────────────────────────────
  const headers = [
    "Doc Type",
    "Doc #",
    "Ref Doc #",
    "Date & Time",
    "Store / Location",
    "Cashier",
    "Customer Name",
    "Customer Phone",
    "Customer CNIC",
    "Payment Mode",
    "FBR Inv #",
    "Net Items Qty",
    "Gross WOST",
    "Retail Gross",
    "Discount WOST",
    "Discount Retail",
    "Amount After Disc",
    "Sales Tax",
    "Net Amount",
    "Cash Sale",
    "Cash Refund",
    "Net Cash",
    "Card Sale",
    "Card Refund",
    "Net Card",
    "Credit Sale",
    "Exchange Voucher Redeemed",
    "Exchange Voucher Issued",
    "Credit Voucher Redeemed",
    "Credit Voucher Issued",
    "Claim Voucher Redeemed",
    "Claim Voucher Issued",
    "Gift Voucher",
    "Corporate Voucher",
    "Reward Voucher",
    "Notes",
  ];

  const dataRows: any[][] = [headers];

  const totalCount = documents.length;
  for (let i = 0; i < totalCount; i++) {
    const doc = documents[i];
    const isReturn = doc.docType === "RETURN";
    const sign = isReturn ? -1 : 1;
    const t = doc.totals;

    const row = [
      doc.docType,
      doc.docNumber,
      doc.refDocNumber || "-",
      format(new Date(doc.createdAt), "yyyy-MM-dd HH:mm"),
      doc.locationName,
      doc.cashierName,
      doc.customerName,
      doc.customerPhone || "-",
      doc.customerCnic || "-",
      doc.paymentMethod,
      doc.fbrInvoiceNumber || "-",
      sign * Math.abs(t.totalItems),
      sign * Math.abs(t.wostAmount),
      sign * Math.abs(t.grossAmount),
      sign * Math.abs(t.discountWostAmount),
      sign * Math.abs(t.discountAmount),
      sign * Math.abs(t.amountAfterDiscount),
      sign * Math.abs(t.taxAmount),
      sign * Math.abs(t.netAmount),
      isReturn ? 0 : t.cashAmount || 0,
      isReturn ? Math.abs(t.cashAmount || 0) : 0,
      isReturn ? -(Math.abs(t.cashAmount || 0)) : (t.cashAmount || 0),
      isReturn ? 0 : t.cardAmount || 0,
      isReturn ? Math.abs(t.cardAmount || 0) : 0,
      isReturn ? -(Math.abs(t.cardAmount || 0)) : (t.cardAmount || 0),
      isReturn ? 0 : t.creditSaleAmount || 0,
      isReturn ? 0 : t.exchangeVoucherAmount || 0,
      isReturn ? Math.abs(t.exchangeVoucherAmount || 0) : 0,
      isReturn ? 0 : t.creditVoucherAmount || 0,
      isReturn ? Math.abs(t.creditVoucherAmount || 0) : 0,
      isReturn ? 0 : t.claimVoucherAmount || 0,
      isReturn ? Math.abs(t.claimVoucherAmount || 0) : 0,
      isReturn ? 0 : t.giftVoucherAmount || 0,
      isReturn ? 0 : t.corporateVoucherAmount || 0,
      isReturn ? 0 : t.rewardVoucherAmount || 0,
      doc.notes || "-",
    ];

    dataRows.push(row);

    if (i % 250 === 0 && onProgress) {
      const pct = 10 + Math.floor((i / totalCount) * 60);
      onProgress(pct, `Exporting row ${i + 1} of ${totalCount}...`);
      await yieldToMain();
    }
  }

  // Grand Total Row
  if (grandTotals) {
    const totalRow = [
      "GRAND TOTAL",
      `${grandTotals.totalDocuments} Docs`,
      "-",
      "-",
      locationNames,
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      grandTotals.netItems,
      grandTotals.netWostAmount,
      grandTotals.netGrossAmount,
      grandTotals.netDiscountWostAmount,
      grandTotals.netDiscountAmount,
      grandTotals.amountAfterDiscount,
      grandTotals.netTaxAmount,
      grandTotals.totalNetAmount,
      grandTotals.cashSale,
      grandTotals.cashRefund,
      grandTotals.netCash,
      grandTotals.cardSale,
      grandTotals.cardRefund,
      grandTotals.netCard,
      grandTotals.creditSale,
      grandTotals.exchangeVoucherRedeemed,
      grandTotals.exchangeVoucherIssued,
      grandTotals.creditVoucherRedeemed,
      grandTotals.creditVoucherIssued,
      grandTotals.claimVoucherRedeemed,
      grandTotals.claimVoucherIssued,
      grandTotals.giftVoucherAmount,
      grandTotals.giftVoucherCorporate,
      grandTotals.rewardVoucherAmount,
      "-",
    ];
    dataRows.push(totalRow);
  }

  const sheet1 = XLSX.utils.aoa_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(workbook, sheet1, "Net Sales Register");

  // ──────────────────────────────────────────────────────────────────────────
  // Sheet 2: Executive Summary & Reconciliation
  // ──────────────────────────────────────────────────────────────────────────
  if (grandTotals) {
    const summaryRows: any[][] = [
      ["SPEED LIMIT POS - NET SALES EXECUTIVE SUMMARY"],
      [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`],
      [`Period: ${dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "Start"} to ${dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "End"}`],
      [`Outlets: ${locationNames}`],
      [],
      ["Metric", "Sales Orders", "Returns / Refunds", "Net Amount"],
      [
        "Total Document Count",
        grandTotals.salesOrderCount,
        grandTotals.returnCount,
        grandTotals.totalDocuments,
      ],
      [
        "Total Item Quantity (pcs)",
        grandTotals.totalItemsSold,
        grandTotals.totalItemsReturned,
        grandTotals.netItems,
      ],
      [
        "Gross Value WOST (Without Sales Tax)",
        grandTotals.wostSalesAmount,
        grandTotals.wostReturnAmount,
        grandTotals.netWostAmount,
      ],
      [
        "Retail Gross Value (incl Tax)",
        grandTotals.grossSalesAmount,
        grandTotals.grossReturnAmount,
        grandTotals.netGrossAmount,
      ],
      [
        "Discounts Given WOST",
        grandTotals.discountWostSalesAmount,
        grandTotals.discountWostReturnAmount,
        grandTotals.netDiscountWostAmount,
      ],
      [
        "Retail Discounts Given",
        grandTotals.discountSalesAmount,
        grandTotals.discountReturnAmount,
        grandTotals.netDiscountAmount,
      ],
      [
        "Sales Tax (GST)",
        grandTotals.taxSalesAmount,
        grandTotals.taxReturnAmount,
        grandTotals.netTaxAmount,
      ],
      [
        "NET SALES REVENUE (COLLECTED)",
        grandTotals.netSalesAmount,
        grandTotals.netReturnAmount,
        grandTotals.totalNetAmount,
      ],
      [],
      ["TENDER CHANNEL AUDIT RECONCILIATION", "Sales Intake", "Refund Paid / Issued", "Net Settlement"],
      ["Cash", grandTotals.cashSale, grandTotals.cashRefund, grandTotals.netCash],
      ["Credit/Debit Card", grandTotals.cardSale, grandTotals.cardRefund, grandTotals.netCard],
      ["Credit Sale (A/R)", grandTotals.creditSale, 0, grandTotals.creditSale],
      ["Exchange Vouchers", grandTotals.exchangeVoucherRedeemed, grandTotals.exchangeVoucherIssued, grandTotals.netExchangeVoucher],
      ["Credit Vouchers", grandTotals.creditVoucherRedeemed, grandTotals.creditVoucherIssued, grandTotals.netCreditVoucher],
      ["Claim Vouchers", grandTotals.claimVoucherRedeemed, grandTotals.claimVoucherIssued, grandTotals.netClaimVoucher],
      ["Gift Vouchers", grandTotals.giftVoucherAmount, 0, grandTotals.giftVoucherAmount],
      ["Corporate Institutional", grandTotals.giftVoucherCorporate, 0, grandTotals.giftVoucherCorporate],
      ["Reward Points", grandTotals.rewardVoucherAmount, 0, grandTotals.rewardVoucherAmount],
    ];

    const sheet2 = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, sheet2, "Executive Summary");
  }

  onProgress?.(85, "Encoding Excel binary...");
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const uint8 = new Uint8Array(excelBuffer);
  let binary = "";
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const fileBase64 = btoa(binary);

  onProgress?.(100, "Excel export complete");
  return { excelBuffer, fileName, fileBase64 };
}
