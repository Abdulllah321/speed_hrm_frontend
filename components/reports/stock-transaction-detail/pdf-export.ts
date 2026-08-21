"use client";

import { FlatItemRecord, TransactionTotals } from "./types";
import { registerClientGeneratedExport } from "@/lib/actions/stock-ledger";

interface ExportPdfOptions {
    filteredItems: FlatItemRecord[];
    grandTotals: TransactionTotals;
    dateRangeStr: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportStockTransactionDetailToPdf({
    filteredItems,
    grandTotals,
    dateRangeStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportPdfOptions) {
    onProgress?.(10, "Building HTML print template for stock movement ledger...");
    await yieldToMain();

    const itemsRowsHtml = filteredItems.map((item) => {
        const txRows = (item.transactions || []).map((tx) => `
            <tr style="background-color: #f8fafc; font-size: 11px;">
                <td style="padding: 4px 8px; font-family: monospace; color: #64748b;">${tx.date ? new Date(tx.date).toLocaleDateString() : "-"}</td>
                <td style="padding: 4px 8px; font-weight: bold; color: #3b82f6;">${tx.docType}</td>
                <td style="padding: 4px 8px; font-family: monospace;">${tx.docRef || "-"}</td>
                <td style="padding: 4px 8px; color: #475569;">${tx.remarks || "-"}</td>
                <td style="padding: 4px 8px; text-align: right; color: #16a34a; font-weight: bold;">${tx.inQty > 0 ? `+${tx.inQty}` : "-"}</td>
                <td style="padding: 4px 8px; text-align: right; color: #dc2626; font-weight: bold;">${tx.outQty > 0 ? `-${tx.outQty}` : "-"}</td>
                <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: #4f46e5;">${tx.runningBalance ?? "-"}</td>
            </tr>
        `).join("");

        return `
            <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11px;">
                <td style="padding: 6px 8px;">${item.sku}</td>
                <td style="padding: 6px 8px;" colspan="2">${item.articleName}</td>
                <td style="padding: 6px 8px;">${item.size} / ${item.color}</td>
                <td style="padding: 6px 8px; text-align: right;">B/F: ${item.openingBalance.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; color: #16a34a;">+${item.inQty.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; color: #dc2626;">-${item.outQty.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; color: #4f46e5;">Closing: ${item.closingBalance.toLocaleString()}</td>
            </tr>
            ${txRows}
        `;
    }).join("");

    onProgress?.(50, "Rendering printable document layout...");
    await yieldToMain();

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <title>${companyName} - Stock Transaction Detail Report</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                .title { font-size: 20px; font-weight: bold; margin: 0; }
                .subtitle { font-size: 12px; color: #475569; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th { background-color: #0f172a; color: white; padding: 8px; text-align: left; font-size: 11px; }
                td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
                .footer-total { background-color: #0f172a; color: white; font-weight: bold; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">${companyName} - Stock Transaction Detail Report</div>
                <div class="subtitle">Period: ${dateRangeStr} | Total Products Analyzed: ${filteredItems.length}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>SKU / Date</th>
                        <th>Article / Doc Type</th>
                        <th>Barcode / Ref #</th>
                        <th>Variant / Remarks</th>
                        <th style="text-align: right;">Opening (B/F)</th>
                        <th style="text-align: right;">In (+)</th>
                        <th style="text-align: right;">Out (-)</th>
                        <th style="text-align: right;">Closing Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRowsHtml}
                </tbody>
                <tfoot>
                    <tr class="footer-total">
                        <td colspan="4" style="padding: 8px;">GRAND TOTAL</td>
                        <td style="padding: 8px; text-align: right;">${grandTotals.openingBalance.toLocaleString()}</td>
                        <td style="padding: 8px; text-align: right; color: #4ade80;">+${grandTotals.totalInQty.toLocaleString()}</td>
                        <td style="padding: 8px; text-align: right; color: #f87171;">-${grandTotals.totalOutQty.toLocaleString()}</td>
                        <td style="padding: 8px; text-align: right; color: #818cf8;">${grandTotals.closingBalance.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
        </body>
        </html>
    `;

    onProgress?.(80, "Opening print preview dialog...");
    await yieldToMain();

    const printWindow = window.open("", "_blank");
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    // Register HTML export with backend for audit
    try {
        const fileName = `stock-transaction-detail-${new Date().toISOString().slice(0, 10)}.html`;
        const buffer = Buffer.from(htmlContent, "utf-8").toString("base64");
        await registerClientGeneratedExport({
            fileBuffer: buffer,
            fileName,
            format: "html",
        });
    } catch {
        // non-blocking
    }

    onProgress?.(100, "PDF print view ready!");
}
