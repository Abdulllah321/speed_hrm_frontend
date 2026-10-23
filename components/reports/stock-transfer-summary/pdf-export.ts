"use client";

import { TransferRecord, TransferGrandTotals } from "./types";
import { format } from "date-fns";

interface ExportPdfOptions {
    transfers: TransferRecord[];
    grandTotals: TransferGrandTotals;
    dateRangeStr: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportStockTransferSummaryToPdf({
    transfers,
    grandTotals,
    dateRangeStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportPdfOptions) {
    onProgress?.(10, "Building HTML print template for stock transfer report...");
    await yieldToMain();

    const rowsHtml = transfers
        .map((tr) => {
            const itemRows = (tr.items || [])
                .map(
                    (it) => `
                <tr style="background-color: #f8fafc; font-size: 10px;">
                    <td style="padding: 4px 8px; font-family: monospace;">${it.sku}</td>
                    <td style="padding: 4px 8px;">${it.articleName}</td>
                    <td style="padding: 4px 8px;">${it.brand} / ${it.category}</td>
                    <td style="padding: 4px 8px;">${it.size} / ${it.color}</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold;">${it.sentQty.toLocaleString()}</td>
                    <td style="padding: 4px 8px; text-align: right; color: #16a34a; font-weight: bold;">${it.receivedQty.toLocaleString()}</td>
                    <td style="padding: 4px 8px; text-align: right; color: ${it.pendingQty > 0 ? "#d97706" : "#64748b"}; font-weight: bold;">${it.pendingQty.toLocaleString()}</td>
                </tr>
            `
                )
                .join("");

            return `
            <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11px; border-top: 2px solid #cbd5e1;">
                <td style="padding: 6px 8px; font-family: monospace;">${tr.requestNo}</td>
                <td style="padding: 6px 8px;" colspan="2">
                    ${tr.sourceName} &rarr; ${tr.destinationName}
                    <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: #fff; margin-left: 6px;">${tr.transferType?.replace(/_/g, " ")}</span>
                </td>
                <td style="padding: 6px 8px;">
                    ${tr.status === "COMPLETED" ? '<span style="color: #16a34a;">Accepted</span>' : '<span style="color: #d97706;">Pending</span>'}
                    ${tr.acceptedByName ? `by ${tr.acceptedByName}` : ""}
                </td>
                <td style="padding: 6px 8px; text-align: right;">${tr.totalSentQty.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; color: #16a34a;">${tr.totalReceivedQty.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; color: #d97706;">${tr.totalPendingQty.toLocaleString()}</td>
            </tr>
            ${itemRows}
        `;
        })
        .join("");

    onProgress?.(50, "Rendering printable document layout...");
    await yieldToMain();

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <title>${companyName} - Stock Transfer Movement & Status Report</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                .title { font-size: 20px; font-weight: bold; margin: 0; }
                .subtitle { font-size: 12px; color: #475569; margin-top: 4px; }
                .kpi-bar { display: flex; justify-content: space-between; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 11px; }
                .kpi-item { text-align: center; }
                .kpi-val { font-size: 14px; font-weight: bold; margin-top: 2px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th { background-color: #0f172a; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
                td { padding: 6px 8px; font-size: 10px; border-bottom: 1px solid #e2e8f0; }
                .footer-total { background-color: #0f172a; color: white; font-weight: bold; font-size: 11px; }
                @media print {
                    body { margin: 10mm; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="title">${companyName}</h1>
                <div class="subtitle">Stock Transfer Movement & Status Report | Period: ${dateRangeStr}</div>
                <div class="subtitle" style="font-size: 10px; color: #94a3b8;">Printed on ${new Date().toLocaleString()}</div>
            </div>

            <div class="kpi-bar">
                <div class="kpi-item">
                    <div>TOTAL TRANSFERS</div>
                    <div class="kpi-val" style="color: #2563eb;">${grandTotals.totalTransfers.toLocaleString()}</div>
                </div>
                <div class="kpi-item">
                    <div>TOTAL UNITS SENT</div>
                    <div class="kpi-val" style="color: #0284c7;">${grandTotals.totalSentQty.toLocaleString()}</div>
                </div>
                <div class="kpi-item">
                    <div>UNITS ACCEPTED</div>
                    <div class="kpi-val" style="color: #16a34a;">${grandTotals.totalReceivedQty.toLocaleString()}</div>
                </div>
                <div class="kpi-item">
                    <div>PENDING / IN-TRANSIT</div>
                    <div class="kpi-val" style="color: #d97706;">${grandTotals.totalPendingQty.toLocaleString()}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 14%;">STN / SKU</th>
                        <th style="width: 28%;" colspan="2">Route / Article Description</th>
                        <th style="width: 18%;">Status / Receiver</th>
                        <th style="width: 12%; text-align: right;">Sent</th>
                        <th style="width: 12%; text-align: right;">Accepted</th>
                        <th style="width: 12%; text-align: right;">Pending</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr class="footer-total">
                        <td style="padding: 8px;">TOTAL</td>
                        <td colspan="2" style="padding: 8px;">${grandTotals.totalTransfers} Transfer Orders (${grandTotals.totalItems} Items)</td>
                        <td style="padding: 8px;">-</td>
                        <td style="padding: 8px; text-align: right;">${grandTotals.totalSentQty.toLocaleString()}</td>
                        <td style="padding: 8px; text-align: right; color: #4ade80;">${grandTotals.totalReceivedQty.toLocaleString()}</td>
                        <td style="padding: 8px; text-align: right; color: #fde047;">${grandTotals.totalPendingQty.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    onProgress?.(80, "Opening print preview window...");
    await yieldToMain();

    const printWin = window.open("", "_blank");
    if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
            printWin.print();
        }, 300);
    } else {
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stock-transfer-report-${new Date().toISOString().slice(0, 10)}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onProgress?.(100, "Print report opened");
}
