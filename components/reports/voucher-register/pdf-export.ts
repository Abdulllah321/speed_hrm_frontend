import { VoucherRegisterItem, VoucherRegisterTotals, VoucherReportMode } from "./types";
import { format } from "date-fns";
import { COMPANY_NAME } from "@/lib/utils";

interface GenerateVoucherPdfOptions {
  items: VoucherRegisterItem[];
  totals: VoucherRegisterTotals;
  dateRange: { from?: Date; to?: Date };
  asOfDate?: Date;
  mode: VoucherReportMode;
  locationNames: string;
}

export function generateVoucherRegisterPdf({
  items,
  totals,
  dateRange,
  asOfDate,
  mode,
  locationNames,
}: GenerateVoucherPdfOptions) {
  const isOutstanding = mode === "outstanding";
  const title = isOutstanding
    ? "Outstanding Vouchers Master Preview"
    : "Unified Voucher Register Report";

  const periodStr = isOutstanding
    ? `As-Of Date: ${asOfDate ? format(asOfDate, "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")} (All Outstanding Vouchers Till Date)`
    : `Period: ${dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start"} to ${dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End"}`;

  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="font-family: monospace; font-weight: bold; color: #4338ca;">${item.voucherNumber}</td>
        <td style="text-align: center; font-weight: bold;">${item.voucherType}</td>
        <td>${item.dateTime}</td>
        <td>${item.companyName}</td>
        <td style="font-family: monospace; color: #64748b;">${item.companyGlCode}</td>
        <td>${item.customerDetail}</td>
        <td>${item.outletName}</td>
        <td style="font-family: monospace; color: #0284c7;">${item.baseCashMemo}</td>
        <td>${item.validTill}</td>
        <td style="text-align: right; color: #d97706;">Rs. ${item.discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; color: #059669;">Rs. ${item.faceValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        <td style="font-family: monospace; color: #0284c7;">${item.settledInCashMemo}</td>
        <td>${item.settledDateTime}</td>
        <td style="text-align: center; font-weight: bold;">${item.status}</td>
      </tr>
    `,
    )
    .join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${COMPANY_NAME}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 8.5px;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .company-name {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .report-title {
            font-size: 13px;
            font-weight: 700;
            color: #4338ca;
            margin-top: 2px;
          }
          .meta {
            font-size: 9px;
            color: #64748b;
            margin-top: 4px;
            display: flex;
            justify-content: center;
            gap: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            text-align: left;
          }
          thead th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 7.5px;
            letter-spacing: 0.5px;
          }
          tfoot tr {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 800;
            font-size: 8.5px;
          }
          tfoot td {
            border-color: #0f172a;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${COMPANY_NAME}</div>
          <div class="report-title">${title}</div>
          <div class="meta">
            <span><strong>Outlets:</strong> ${locationNames}</span>
            <span><strong>Filter:</strong> ${periodStr}</span>
            <span><strong>Generated:</strong> ${format(new Date(), "dd MMM yyyy, HH:mm")}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%;">Voucher #</th>
              <th style="width: 6%; text-align: center;">Type</th>
              <th style="width: 8%;">Date Time</th>
              <th style="width: 10%;">Company Name</th>
              <th style="width: 6%;">GL Code</th>
              <th style="width: 11%;">Customer / Beneficiary</th>
              <th style="width: 8%;">Outlet</th>
              <th style="width: 8%;">Base Inv #</th>
              <th style="width: 6%;">Valid Till</th>
              <th style="width: 7%; text-align: right;">Discount</th>
              <th style="width: 7%; text-align: right;">Amount</th>
              <th style="width: 8%;">Settled Inv #</th>
              <th style="width: 8%;">Settled Date</th>
              <th style="width: 5%; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="9">GRAND TOTALS (${items.length} Vouchers)</td>
              <td style="text-align: right; color: #fde047;">Rs. ${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right; color: #4ade80;">Rs. ${totals.totalFaceValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
              <td colspan="3">${isOutstanding ? 'Outstanding Liability' : 'Settled Total'}: Rs. ${(isOutstanding ? totals.totalOutstandingAmount : totals.totalSettledAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
