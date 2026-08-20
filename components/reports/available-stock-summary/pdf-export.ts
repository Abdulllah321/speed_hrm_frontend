"use client";

import { TreeNode, StockTotals } from "./types";
import { registerClientGeneratedExport } from "@/lib/actions/stock-ledger";

interface ExportPdfOptions {
    treeData: TreeNode[];
    grandTotals: StockTotals;
    reportType: "merged" | "separate";
    dateFromStr?: string;
    dateToStr?: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

export async function exportAvailableStockSummaryToPdf({
    treeData,
    grandTotals,
    reportType,
    dateFromStr,
    dateToStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportPdfOptions): Promise<void> {
    try {
        onProgress?.(10, "Building PDF print layout...");

        let tableRowsHtml = "";

        function traverseNode(node: TreeNode, depth: number = 0) {
            const paddingLeft = depth * 16;
            let label = node.value;
            if (node.sku && node.articleName) {
                label = `[${node.sku}] ${node.articleName}`;
            }

            const isSubtotal = depth < 3;
            const rowClass = isSubtotal
                ? "font-bold bg-gray-100 dark:bg-gray-800 text-gray-900"
                : "text-gray-700 hover:bg-gray-50";

            tableRowsHtml += `
                <tr class="${rowClass}">
                    <td style="padding-left: ${paddingLeft + 8}px;">${label}</td>
                    <td style="text-align: center;">${node.size || "-"}</td>
                    <td style="text-align: center;">${node.color || "-"}</td>
                    <td style="text-align: right;">${node.totals.quantity.toLocaleString()}</td>
                    <td style="text-align: right;">${node.totals.transit.toLocaleString()}</td>
                    <td style="text-align: right;">${node.totals.reserved.toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 600;">${node.totals.total.toLocaleString()}</td>
                    <td style="text-align: right;">${node.totals.unitPrice ? "Rs. " + node.totals.unitPrice.toLocaleString() : "-"}</td>
                    <td style="text-align: right; font-weight: 600;">Rs. ${node.totals.value.toLocaleString()}</td>
                </tr>
            `;

            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    traverseNode(child, depth + 1);
                }
            }
        }

        onProgress?.(40, "Formatting PDF table rows...");

        for (const rootNode of treeData) {
            traverseNode(rootNode, 0);
        }

        onProgress?.(70, "Opening print-ready preview window...");

        const printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Available Stock Summary - ${companyName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #111; }
                    .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .header h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; }
                    .header p { margin: 2px 0; font-size: 12px; color: #555; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                    th { background-color: #f3f4f6; font-weight: 600; text-transform: uppercase; font-size: 10px; }
                    tr.grand-total { font-size: 12px; font-weight: bold; background-color: #e5e7eb; border-top: 2px solid #111; }
                    @media print {
                        body { margin: 0; }
                        @page { size: A4 landscape; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${companyName}</h1>
                    <p><strong>AVAILABLE STOCK SUMMARY REPORT (${reportType.toUpperCase()} VIEW)</strong></p>
                    <p>Period: ${dateFromStr || "All Time"} to ${dateToStr || "Present"} | Generated: ${new Date().toLocaleString()}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>GPC / Category / Product</th>
                            <th style="text-align: center;">Size</th>
                            <th style="text-align: center;">Color</th>
                            <th style="text-align: right;">Available Qty</th>
                            <th style="text-align: right;">In Transit</th>
                            <th style="text-align: right;">Reserved</th>
                            <th style="text-align: right;">Total Balance</th>
                            <th style="text-align: right;">Selling Price</th>
                            <th style="text-align: right;">Selling Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                        <tr class="grand-total">
                            <td>GRAND TOTAL</td>
                            <td></td>
                            <td></td>
                            <td style="text-align: right;">${grandTotals.quantity.toLocaleString()}</td>
                            <td style="text-align: right;">${grandTotals.transit.toLocaleString()}</td>
                            <td style="text-align: right;">${grandTotals.reserved.toLocaleString()}</td>
                            <td style="text-align: right;">${grandTotals.total.toLocaleString()}</td>
                            <td></td>
                            <td style="text-align: right;">Rs. ${grandTotals.value.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        onProgress?.(85, "Launching print dialog...");

        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
        }

        onProgress?.(95, "Syncing PDF record with S3 & Export History...");

        // In background, register ExportHistory record
        try {
            const blob = new Blob([printHtml], { type: "text/html" });
            const fileName = `available-stock-summary-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`;
            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("fileName", fileName);
            formData.append("format", "pdf");
            await registerClientGeneratedExport(formData);
        } catch (s3Err) {
            console.warn("Background S3 PDF export registration warn:", s3Err);
        }

        onProgress?.(100, "PDF print layout complete!");
    } catch (err: any) {
        console.error("PDF export error:", err);
        throw err;
    }
}
