"use client";

import { TreeNode, StockTotals, FlatItemRecord } from "./types";
import { registerOverallAvailableReservedStockClientExport } from "@/lib/actions/stock-ledger";

interface ExportPdfOptions {
    treeData: TreeNode[];
    filteredItems?: FlatItemRecord[];
    grandTotals: StockTotals;
    reportType: "merged" | "separate";
    exportMode?: "hierarchy" | "flat";
    dateFromStr?: string;
    dateToStr?: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportOverallAvailableReservedStockToPdf({
    treeData,
    filteredItems = [],
    grandTotals,
    reportType,
    exportMode = "hierarchy",
    dateFromStr,
    dateToStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportPdfOptions): Promise<void> {
    try {
        onProgress?.(10, "Initializing non-blocking PDF/Print layout generator...");
        await yieldToMain();

        let tableRowsHtml = "";

        if (exportMode === "hierarchy") {
            onProgress?.(25, "Formatting hierarchy tree rows...");
            await yieldToMain();

            const flatNodeList: { node: TreeNode; depth: number }[] = [];
            function flattenTree(nodes: TreeNode[], depth: number) {
                for (const node of nodes) {
                    flatNodeList.push({ node, depth });
                    if (node.children && node.children.length > 0) {
                        flattenTree(node.children, depth + 1);
                    }
                }
            }
            flattenTree(treeData, 0);

            const total = Math.max(1, flatNodeList.length);

            for (let i = 0; i < flatNodeList.length; i++) {
                const { node, depth } = flatNodeList[i];
                const paddingLeft = depth * 16 + 8;
                let label = node.value;
                if (node.sku && node.articleName) {
                    label = `[${node.sku}] ${node.articleName}`;
                } else if (node.level === "variant" && node.barCode) {
                    label = `[${node.barCode}] ${node.color || "Default"}-${node.size || "Default"}`;
                }

                let rowStyle = "background-color: #FFFFFF; color: #111;";
                let labelStyle = "font-size: 11px;";
                if (depth === 0) {
                    rowStyle = "background-color: #1E293B; color: #FFFFFF; font-weight: bold;";
                    labelStyle = "font-size: 12px;";
                } else if (depth === 1) {
                    rowStyle = "background-color: #334155; color: #FFFFFF; font-weight: bold;";
                } else if (depth === 2) {
                    rowStyle = "background-color: #475569; color: #FFFFFF; font-weight: bold;";
                } else if (depth === 3) {
                    rowStyle = "background-color: #E0F2FE; color: #0369A1; font-weight: bold;";
                }

                tableRowsHtml += `
                    <tr style="${rowStyle}">
                        <td style="padding-left: ${paddingLeft}px; ${labelStyle}">${label}</td>
                        <td style="text-align: center;">${node.size || "-"}</td>
                        <td style="text-align: center;">${node.color || "-"}</td>
                        <td style="text-align: right;">${node.totals.quantity.toLocaleString()}</td>
                        <td style="text-align: right;">${node.totals.transit.toLocaleString()}</td>
                        <td style="text-align: right;">${node.totals.reserved.toLocaleString()}</td>
                        <td style="text-align: right; font-weight: bold;">${node.totals.total.toLocaleString()}</td>
                        <td style="text-align: right;">${node.totals.unitPrice ? "Rs. " + node.totals.unitPrice.toLocaleString() : "-"}</td>
                        <td style="text-align: right; font-weight: bold;">Rs. ${node.totals.value.toLocaleString()}</td>
                    </tr>
                `;

                if (i % 100 === 0) {
                    const pct = 25 + Math.floor((i / total) * 45);
                    onProgress?.(pct, `Processing node ${i}/${total}...`);
                    await yieldToMain();
                }
            }
        } else {
            onProgress?.(25, "Formatting flat detail item rows...");
            await yieldToMain();

            const total = Math.max(1, filteredItems.length);

            for (let i = 0; i < filteredItems.length; i++) {
                const item = filteredItems[i];
                const bgStyle = i % 2 === 0 ? "background-color: #FFFFFF;" : "background-color: #F8FAFC;";

                tableRowsHtml += `
                    <tr style="${bgStyle} color: #111; font-size: 11px;">
                        <td>${item.locationName}</td>
                        <td style="text-align: center; font-weight: 600;">${item.barCode}</td>
                        <td style="text-align: center;">${item.sku}</td>
                        <td>${item.articleName}</td>
                        <td>${item.brand}</td>
                        <td style="text-align: center;">${item.size || "-"}</td>
                        <td style="text-align: center;">${item.color || "-"}</td>
                        <td style="text-align: right; color: #059669; font-weight: 600;">${item.quantity.toLocaleString()}</td>
                        <td style="text-align: right; color: #D97706;">${item.transit.toLocaleString()}</td>
                        <td style="text-align: right; color: #9333EA;">${item.reserved.toLocaleString()}</td>
                        <td style="text-align: right; font-weight: bold;">${item.total.toLocaleString()}</td>
                        <td style="text-align: right;">Rs. ${item.unitPrice.toLocaleString()}</td>
                        <td style="text-align: right; font-weight: bold;">Rs. ${item.value.toLocaleString()}</td>
                    </tr>
                `;

                if (i % 100 === 0) {
                    const pct = 25 + Math.floor((i / total) * 45);
                    onProgress?.(pct, `Processing flat item ${i}/${total}...`);
                    await yieldToMain();
                }
            }
        }

        onProgress?.(75, "Rendering print layout preview...");
        await yieldToMain();

        const tableHeaderHtml = exportMode === "hierarchy" ? `
            <tr>
                <th style="width: 32%;">GPC / Category / Product / Barcode</th>
                <th style="width: 7%; text-align: center;">Size</th>
                <th style="width: 12%; text-align: center;">Color</th>
                <th style="width: 9%; text-align: right;">Available Qty</th>
                <th style="width: 8%; text-align: right;">In Transit</th>
                <th style="width: 8%; text-align: right;">Reserved</th>
                <th style="width: 9%; text-align: right;">Total Balance</th>
                <th style="width: 7%; text-align: right;">Price</th>
                <th style="width: 8%; text-align: right;">Value</th>
            </tr>
        ` : `
            <tr>
                <th style="width: 14%;">Location</th>
                <th style="width: 10%; text-align: center;">Barcode</th>
                <th style="width: 9%; text-align: center;">SKU</th>
                <th style="width: 20%;">Article Name</th>
                <th style="width: 10%;">Brand</th>
                <th style="width: 5%; text-align: center;">Size</th>
                <th style="width: 8%; text-align: center;">Color</th>
                <th style="width: 6%; text-align: right;">Qty</th>
                <th style="width: 5%; text-align: right;">Transit</th>
                <th style="width: 5%; text-align: right;">Reserved</th>
                <th style="width: 6%; text-align: right;">Total</th>
                <th style="width: 6%; text-align: right;">Price</th>
                <th style="width: 8%; text-align: right;">Value</th>
            </tr>
        `;

        const printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Overall Available Reserved Stock - ${companyName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #111; }
                    .header { margin-bottom: 20px; border-bottom: 2px solid #1E293B; padding-bottom: 10px; }
                    .header h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; color: #1E293B; }
                    .header p { margin: 2px 0; font-size: 12px; color: #475569; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
                    th, td { border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; }
                    th { background-color: #1E293B; color: #FFFFFF; font-weight: 600; text-transform: uppercase; font-size: 10px; }
                    tr.grand-total { font-size: 12px; font-weight: bold; background-color: #0F172A; color: #FFFFFF; border-top: 2px solid #111; }
                    @media print {
                        body { margin: 0; }
                        @page { size: A4 landscape; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${companyName}</h1>
                    <p><strong>OVERALL AVAILABLE RESERVED STOCK REPORT (${reportType.toUpperCase()} ${exportMode.toUpperCase()} VIEW)</strong></p>
                    <p>As Of Date: ${dateToStr || new Date().toISOString().slice(0, 10)} | Generated: ${new Date().toLocaleString()}</p>
                </div>

                <table>
                    <thead>
                        ${tableHeaderHtml}
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                    <tfoot>
                        <tr class="grand-total">
                            <td colspan="${exportMode === "hierarchy" ? 3 : 7}">GRAND TOTAL</td>
                            <td style="text-align: right; color: #34D399;">${grandTotals.quantity.toLocaleString()}</td>
                            <td style="text-align: right; color: #FBBF24;">${grandTotals.transit.toLocaleString()}</td>
                            <td style="text-align: right; color: #C084FC;">${grandTotals.reserved.toLocaleString()}</td>
                            <td style="text-align: right; color: #38BDF8;">${grandTotals.total.toLocaleString()}</td>
                            <td style="text-align: right;"></td>
                            <td style="text-align: right; color: #818CF8;">Rs. ${grandTotals.value.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        onProgress?.(90, "Opening PDF print preview window...");
        await yieldToMain();

        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }

        onProgress?.(96, "Syncing export record with S3 & Export History...");
        await yieldToMain();

        try {
            const blob = new Blob([printHtml], { type: "text/html" });
            const fileName = `overall-available-reserved-stock-${exportMode}-${reportType}-${new Date().toISOString().slice(0, 10)}.html`;
            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("fileName", fileName);
            formData.append("format", "html");
            await registerOverallAvailableReservedStockClientExport(formData);
        } catch (s3Err) {
            console.warn("Background S3 export registration warning:", s3Err);
        }

        onProgress?.(100, "PDF export complete!");
    } catch (err: any) {
        console.error("PDF export error:", err);
        throw err;
    }
}
