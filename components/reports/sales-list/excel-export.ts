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
  onProgress?: (percent: number, message?: string) => void;
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

  onProgress?.(5, "Initializing Excel workbook...");
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
      "CNIC",
      "Customer Code",
      "Payment Mode",
      "Merchant",
      "FBR Inv #",
      "FBR Status",
      "Order Notes",
      "SKU",
      "Barcode",
      "Description",
      "Size",
      "Color",
      "Quantity",
      "Unit Price",
      "Unit Price WOST",
      "Value Excl.",
      "Discount %",
      "Discount",
      "Discount WOST",
      "Amount After Discount",
      "Sales Tax",
      "Value Incl. (SubTotal)",
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
      "Override Note",
      "Manual Disc Note",
      "Manual Disc Type",
      "Alliance Partner",
      "Coupon / Promo",
      "Voucher Numbers",
      "Card Details",
    ];

    const dataRows: any[][] = [headers];

    let totalQty = 0;
    let totalValExcl = 0;
    let totalDisc = 0;
    let totalDiscWost = 0;
    let totalAmtAfterDisc = 0;
    let totalTax = 0;
    let totalValIncl = 0;

    const totalCount = flatItems.length;
    for (let i = 0; i < totalCount; i++) {
      const item = flatItems[i];
      const promoCoupon = item.couponCode || item.promoCode || "-";
      const cardDetails = item.cardLast4 ? `**** ${item.cardLast4} ${item.cardSlipNo ? `(Slip: ${item.cardSlipNo})` : ""}`.trim() : "-";
      const overrideNote = item.overrideDiscountNote || (item.overrideDiscountPercent ? `${item.overrideDiscountPercent}% Override` : "-");

      const qty = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const unitPriceWost = Number((item.priceWost !== undefined ? item.priceWost : unitPrice / (1 + (item.taxPercent ?? 18) / 100)).toFixed(2));
      const valExcl = Number((item.valueExcl !== undefined ? item.valueExcl : qty * unitPriceWost).toFixed(2));
      const disc = item.discountAmount || 0;
      const discWost = Number((item.discountAmountWost !== undefined ? item.discountAmountWost : disc / (1 + (item.taxPercent ?? 18) / 100)).toFixed(2));
      const amtAfterDisc = Number((item.amountAfterDiscount !== undefined ? item.amountAfterDiscount : Math.max(0, valExcl - discWost)).toFixed(2));
      const tax = item.taxAmount || 0;
      const valIncl = Number((item.valueIncl !== undefined ? item.valueIncl : (item.subTotal || 0)).toFixed(2));

      totalQty += qty;
      totalValExcl += valExcl;
      totalDisc += disc;
      totalDiscWost += discWost;
      totalAmtAfterDisc += amtAfterDisc;
      totalTax += tax;
      totalValIncl += valIncl;

      dataRows.push([
        item.locationName,
        item.orderNumber,
        item.orderDate ? format(new Date(item.orderDate), "yyyy-MM-dd HH:mm") : "-",
        item.cashierName || "-",
        item.customerName || "Walk-in",
        item.customerPhone || "-",
        item.customerCnic || "-",
        item.customerCode || "-",
        item.paymentMethod || "-",
        item.merchant || "-",
        item.fbrInvoiceNumber || "-",
        item.fbrStatus || "-",
        item.orderNotes || "-",
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
        item.cashSale || 0,
        item.cashReturn || 0,
        item.cardSale || 0,
        item.creditSale || 0,
        item.giftVoucherAmount || 0,
        item.creditVoucherAmount || 0,
        item.exchangeVoucherAmount || 0,
        item.claimVoucherAmount || 0,
        item.giftVoucherCorporate || 0,
        item.creditVoucherIssuedAmount || 0,
        item.rewardVoucherAmount || 0,
        overrideNote,
        item.manualDiscountNote || "-",
        item.manualDiscountType || "-",
        item.alliancePartner ? `${item.alliancePartner} ${item.allianceCode ? `(${item.allianceCode})` : ""}`.trim() : "-",
        promoCoupon,
        item.voucherCodes || "-",
        cardDetails,
      ]);

      if (i % 100 === 0 || i === totalCount - 1) {
        const pct = Math.round(((i + 1) / Math.max(1, totalCount)) * 70) + 10;
        onProgress?.(
          pct,
          `Processing item ${i + 1} of ${totalCount.toLocaleString()}...`,
        );
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
      "",
      "",
      "",
      totalQty || grandTotals.totalItems,
      "",
      Number((totalValExcl || (grandTotals.wostAmount !== undefined ? grandTotals.wostAmount : (grandTotals.grossAmount / 1.18))).toFixed(2)),
      "",
      totalDisc || grandTotals.discountAmount,
      Number((totalDiscWost || (grandTotals.discountWostAmount !== undefined ? grandTotals.discountWostAmount : (grandTotals.discountAmount / 1.18))).toFixed(2)),
      Number((totalAmtAfterDisc || (grandTotals.amountAfterDiscount !== undefined ? grandTotals.amountAfterDiscount : Math.max(0, (grandTotals.wostAmount || (grandTotals.grossAmount / 1.18)) - (grandTotals.discountWostAmount || (grandTotals.discountAmount / 1.18))))).toFixed(2)),
      totalTax || grandTotals.taxAmount,
      totalValIncl || grandTotals.netAmount,
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
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 22 }, // Outlet
      { wch: 18 }, // Invoice #
      { wch: 18 }, // Order Date
      { wch: 16 }, // Cashier
      { wch: 20 }, // Customer
      { wch: 14 }, // Phone
      { wch: 16 }, // CNIC
      { wch: 14 }, // Customer Code
      { wch: 14 }, // Payment Mode
      { wch: 16 }, // Merchant
      { wch: 16 }, // FBR Inv #
      { wch: 12 }, // FBR Status
      { wch: 20 }, // Order Notes
      { wch: 16 }, // SKU
      { wch: 16 }, // Barcode
      { wch: 28 }, // Description
      { wch: 10 }, // Size
      { wch: 12 }, // Color
      { wch: 10 }, // Quantity
      { wch: 12 }, // Unit Price
      { wch: 14 }, // Unit Price WOST
      { wch: 14 }, // Value Excl.
      { wch: 12 }, // Discount %
      { wch: 12 }, // Discount
      { wch: 14 }, // Discount WOST
      { wch: 16 }, // Amt After Disc
      { wch: 12 }, // Sales Tax
      { wch: 16 }, // Value Incl.
      { wch: 14 }, // Cash Sale
      { wch: 14 }, // Cash Return
      { wch: 14 }, // Card Sale
      { wch: 14 }, // Credit Sale
      { wch: 16 }, // Gift Voucher
      { wch: 16 }, // Credit Voucher
      { wch: 18 }, // Exchange Voucher
      { wch: 16 }, // Claim Voucher
      { wch: 22 }, // Corporate Voucher
      { wch: 22 }, // Credit Issued
      { wch: 18 }, // Reward Voucher
      { wch: 20 }, // Override Note
      { wch: 20 }, // Manual Disc Note
      { wch: 16 }, // Manual Disc Type
      { wch: 18 }, // Alliance Partner
      { wch: 16 }, // Coupon / Promo
      { wch: 24 }, // Voucher Numbers
      { wch: 22 }, // Card Details
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Line Items");
  } else {
    // Hierarchical Invoice Matrix Export
    const headers = [
      "Invoice #",
      "Date & Time",
      "Customer",
      "Phone",
      "CNIC",
      "Customer Code",
      "Cashier",
      "Payment Mode",
      "Merchant",
      "FBR Inv #",
      "Order Notes",
      "Discount Audit / Notes",
      "Alliance Partner",
      "Promo / Coupon",
      "Vouchers Redeemed",
      "Card Details",
      "Quantity",
      "Unit Price (Avg)",
      "Unit Price WOST (Avg)",
      "Value Excl.",
      "Discount",
      "Discount WOST",
      "Amount After Discount",
      "Sales Tax",
      "Value Incl. (Net Revenue)",
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
    ];

    const dataRows: any[][] = [headers];

    const totalCount = invoices.length;
    for (let i = 0; i < totalCount; i++) {
      const inv = invoices[i];
      const t = inv.totals;

      const allVouchers = [
        ...(inv.tenderDetails?.giftVouchers || []),
        ...(inv.tenderDetails?.creditVouchers || []),
        ...(inv.tenderDetails?.exchangeVouchers || []),
        ...(inv.tenderDetails?.claimVouchers || []),
        ...(inv.tenderDetails?.corporateVouchers || []),
        ...(inv.tenderDetails?.rewardVouchers || []),
      ];
      const voucherCodesStr = allVouchers.map((v) => `${v.code} (Rs. ${(v.amount || 0).toLocaleString()})`).join(", ");

      const card = inv.tenderDetails?.card;
      const cardDetailsStr = card
        ? `${card.merchant || inv.merchant || "Card"} ${card.cardLast4 ? `**** ${card.cardLast4}` : ""} ${card.authId ? `(Slip: ${card.authId})` : ""}`.trim()
        : "-";

      const discNotesArr: string[] = [];
      if (inv.discountDetails?.overrideDiscountNotes?.length) {
        discNotesArr.push(`Override: ${inv.discountDetails.overrideDiscountNotes.join(", ")}`);
      }
      if (inv.discountDetails?.manualDiscountNote) {
        discNotesArr.push(`Manual: ${inv.discountDetails.manualDiscountNote} (${inv.discountDetails.manualDiscountType || "Flat"})`);
      }
      if (inv.discountDetails?.alliance) {
        discNotesArr.push(`Alliance: ${inv.discountDetails.alliance.partnerName} (${inv.discountDetails.alliance.discountPercent}%)`);
      }
      if (inv.discountDetails?.promo) {
        discNotesArr.push(`Promo: ${inv.discountDetails.promo.name} (${inv.discountDetails.promo.code})`);
      }
      if (inv.discountDetails?.coupon) {
        discNotesArr.push(`Coupon: ${inv.discountDetails.coupon.code}`);
      }
      const discAuditStr = discNotesArr.join(" | ") || (t.discountAmount > 0 ? "Line Discounts" : "-");

      const invGross = t.grossAmount || 0;
      const invQty = t.totalItems || 0;
      const invUnitPrice = invQty > 0 ? Number((invGross / invQty).toFixed(2)) : 0;
      const invValExcl = Number((t.wostAmount !== undefined ? t.wostAmount : (invGross / 1.18)).toFixed(2));
      const invUnitPriceWost = invQty > 0 ? Number((invValExcl / invQty).toFixed(2)) : 0;
      const invDisc = t.discountAmount || 0;
      const invDiscWost = Number((t.discountWostAmount !== undefined ? t.discountWostAmount : (inv.discountDetails?.wostDiscount || invdisc / (1 + (item.taxPercent ?? 18) / 100))).toFixed(2));
      const invAmtAfterDisc = Number((t.amountAfterDiscount !== undefined ? t.amountAfterDiscount : Math.max(0, invValExcl - invDiscWost)).toFixed(2));
      const invTax = t.taxAmount || 0;
      const invValIncl = t.netAmount || 0;

      dataRows.push([
        inv.orderNumber,
        inv.createdAt ? format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm") : "-",
        inv.customerName || "Walk-in",
        inv.customerPhone || "-",
        inv.customerCnic || "-",
        inv.customerCode || "-",
        inv.cashierName || "-",
        inv.paymentMethod || "-",
        inv.merchant || "-",
        inv.fbrInvoiceNumber || "-",
        inv.notes || "-",
        discAuditStr,
        inv.discountDetails?.alliance?.partnerName || "-",
        inv.discountDetails?.coupon?.code || inv.discountDetails?.promo?.code || "-",
        voucherCodesStr || "-",
        cardDetailsStr,
        invQty,
        invUnitPrice,
        invUnitPriceWost,
        invValExcl,
        invDisc,
        invDiscWost,
        invAmtAfterDisc,
        invTax,
        invValIncl,
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
      ]);

      if (i % 80 === 0 || i === totalCount - 1) {
        const pct = Math.round(((i + 1) / Math.max(1, totalCount)) * 70) + 10;
        onProgress?.(
          pct,
          `Processing invoice ${i + 1} of ${totalCount.toLocaleString()}...`,
        );
        await yieldToMain();
      }
    }

    const grandGross = grandTotals.grossAmount || 0;
    const grandQty = grandTotals.totalItems || 0;
    const grandUnitPrice = grandQty > 0 ? Number((grandGross / grandQty).toFixed(2)) : 0;
    const grandValExcl = Number((grandTotals.wostAmount !== undefined ? grandTotals.wostAmount : (grandGross / 1.18)).toFixed(2));
    const grandUnitPriceWost = grandQty > 0 ? Number((grandValExcl / grandQty).toFixed(2)) : 0;
    const grandDisc = grandTotals.discountAmount || 0;
    const grandDiscWost = Number((grandTotals.discountWostAmount !== undefined ? grandTotals.discountWostAmount : (granddisc / (1 + (item.taxPercent ?? 18) / 100))).toFixed(2));
    const grandAmtAfterDisc = Number((grandTotals.amountAfterDiscount !== undefined ? grandTotals.amountAfterDiscount : Math.max(0, grandValExcl - grandDiscWost)).toFixed(2));

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
      grandQty,
      grandUnitPrice,
      grandUnitPriceWost,
      grandValExcl,
      grandDisc,
      grandDiscWost,
      grandAmtAfterDisc,
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
    ]);

    onProgress?.(82, "Configuring Excel worksheet grid...");
    await yieldToMain();

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 18 }, // Invoice #
      { wch: 18 }, // Date & Time
      { wch: 20 }, // Customer
      { wch: 14 }, // Phone
      { wch: 16 }, // CNIC
      { wch: 14 }, // Customer Code
      { wch: 16 }, // Cashier
      { wch: 14 }, // Payment Mode
      { wch: 16 }, // Merchant
      { wch: 16 }, // FBR Inv #
      { wch: 20 }, // Order Notes
      { wch: 30 }, // Discount Audit / Notes
      { wch: 18 }, // Alliance Partner
      { wch: 16 }, // Promo / Coupon
      { wch: 26 }, // Vouchers Redeemed
      { wch: 24 }, // Card Details
      { wch: 12 }, // Quantity
      { wch: 16 }, // Unit Price (Avg)
      { wch: 18 }, // Unit Price WOST (Avg)
      { wch: 14 }, // Value Excl.
      { wch: 12 }, // Discount
      { wch: 14 }, // Discount WOST
      { wch: 18 }, // Amount After Discount
      { wch: 12 }, // Sales Tax
      { wch: 18 }, // Value Incl. (Net Sales)
      { wch: 14 }, // Cash Sale
      { wch: 14 }, // Cash Return
      { wch: 14 }, // Card Sale
      { wch: 14 }, // Credit Sale
      { wch: 16 }, // Gift Voucher
      { wch: 16 }, // Credit Voucher
      { wch: 18 }, // Exchange Voucher
      { wch: 16 }, // Claim Voucher
      { wch: 22 }, // Corporate Voucher
      { wch: 22 }, // Credit Issued
      { wch: 18 }, // Reward Voucher
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Invoices Matrix");
  }

  onProgress?.(88, "Encoding Excel workbook binary data...");
  await yieldToMain();

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const base64 = "";

  onProgress?.(98, "Preparing download...");
  await yieldToMain();

  onProgress?.(100, "Excel file ready!");
  return { excelBuffer, fileName, fileBase64: base64 };
}
