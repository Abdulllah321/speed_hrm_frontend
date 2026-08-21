"use client";

import { FlatItemRecord, LocationHeader, StockTotals } from "./types";
import { registerOverallAvailableReservedStockClientExport } from "@/lib/actions/stock-ledger";

interface ExportPdfOptions {
    filteredItems: FlatItemRecord[];
    locationHeaders: LocationHeader[];
    grandTotals: StockTotals;
    asOfDate?: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportOverallAvailableReservedStockToPdf({
    filteredItems,
    locationHeaders,
    grandTotals,
    asOfDate,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportPdfOptions): Promise<void> {
    try {
        onProgress?.(10, "Initializing non-blocking PDF/Print layout generator...");
        await yieldToMain();

        let tableRowsHtml = "";
        const total = Math.max(1, filteredItems.length);

        for (let i = 0; i < filteredItems.length; i++) {
            const item = filteredItems[i];
            const bgStyle = i % 2 === 0 ? "background-color: #FFFFFF;" : "background-color: #F8FAFC;";

            const locCellsHtml = locationHeaders.map((hdr) => {
                const qty = hdr.type === "warehouse"
                    ? (item.warehouseStocks?.[hdr.id] || 0)
                    : (item.locationStocks?.[hdr.id] || 0);

                return `<td style="text-align: right; font-family: monospace; ${qty > 0 ? "font-weight: bold;" : "color: #94A3B8;"}">${qty}</td>`;
            }).join("");

            tableRowsHtml += `
                <tr style="${bgStyle} color: #111; font-size: 10px;">
                    <td>${item.brand || "-"}</td>
                    <td>${item.division || "-"}</td>
                    <td>${item.category || "-"}</td>
                    <td>${item.gender || "-"}</td>
                    <td>${item.silhouette || "-"}</td>
                    <td style="font-family: monospace;">${item.sku || "-"}</td>
                    <td style="font-weight: 600;">${item.articleName || "-"}</td>
                    <td style="text-align: center;">${item.size || "-"}</td>
                    <td style="text-align: center;">${item.color || "-"}</td>
                    <td style="text-align: center; font-family: monospace; font-weight: bold; color: #0284C7;">${item.barCode || "-"}</td>
                    <td style="text-align: right; color: #059669; font-weight: bold;">${item.quantity.toLocaleString()}</td>
                    <td style="text-align: right; color: #D97706;">${item.transit.toLocaleString()}</td>
                    <td style="text-align: right; color: #9333EA;">${item.reserved.toLocaleString()}</td>
                    <td style="text-align: right; font-weight: bold;">${item.total.toLocaleString()}</td>
                    <td style="text-align: right;">Rs. ${item.unitPrice ? item.unitPrice.toLocaleString() : "-"}</td>
                    <td style="text-align: right; font-weight: bold;">Rs. ${item.value.toLocaleString()}</td>
                    ${locCellsHtml}
                </tr>
            `;

            if (i % 100 === 0) {
                const pct = 10 + Math.floor((i / total) * 65);
                onProgress?.(pct, `Processing matrix row ${i}/${total}...`);
                await yieldToMain();
            }
        }

        onProgress?.(75, "Rendering print layout preview...");
        await yieldToMain();

        const storeHeadersHtml = locationHeaders.map((hdr) => `
            <th style="text-align: right; font-family: monospace; font-size: 9px; ${hdr.type === "warehouse" ? "color: #F59E0B;" : "color: #38BDF8;"}">${hdr.code}</th>
        `).join("");

        const storeGrandTotalsHtml = locationHeaders.map((hdr) => {
            const qty = hdr.type === "warehouse"
                ? (grandTotals.warehouseStocks?.[hdr.id] || 0)
                : (grandTotals.locationStocks?.[hdr.id] || 0);

            return `<td style="text-align: right; font-family: monospace; font-weight: bold; color: #38BDF8;">${qty.toLocaleString()}</td>`;
        }).join("");

        const printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Overall Stock Matrix Report - ${companyName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; margin: 15px; color: #111; }
                    .header { margin-bottom: 15px; border-bottom: 2px solid #1E293B; padding-bottom: 8px; }
                    .header h1 { margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; color: #1E293B; }
                    .header p { margin: 2px 0; font-size: 11px; color: #475569; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
                    th, td { border: 1px solid #CBD5E1; padding: 4px 6px; text-align: left; }
                    th { background-color: #1E293B; color: #FFFFFF; font-weight: 600; text-transform: uppercase; font-size: 9px; }
                    tr.grand-total { font-size: 10px; font-weight: bold; background-color: #0F172A; color: #FFFFFF; border-top: 2px solid #111; }
                    @media print {
                        body { margin: 0; }
                        @page { size: A3 landscape; margin: 8mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${companyName}</h1>
                    <p><strong>OVERALL STOCK MATRIX REPORT (STORE-WISE BREAKDOWN)</strong></p>
                    <p>As Of Date: ${asOfDate || new Date().toISOString().slice(0, 10)} | Generated: ${new Date().toLocaleString()}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Brand</th>
                            <th>Division</th>
                            <th>Category</th>
                            <th>Gender</th>
                            <th>Silhouette</th>
                            <th>SKU</th>
                            <th>Article Name</th>
                            <th style="text-align: center;">Size</th>
                            <th style="text-align: center;">Color</th>
                            <th style="text-align: center;">Barcode</th>
                            <th style="text-align: right;">Available Qty</th>
                            <th style="text-align: right;">Transit</th>
                            <th style="text-align: right;">Reserved</th>
                            <th style="text-align: right;">Total Bal</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Value</th>
                            ${storeHeadersHtml}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                    <tfoot>
                        <tr class="grand-total">
                            <td colspan="10">GRAND TOTAL</td>
                            <td style="text-align: right; color: #34D399;">${grandTotals.quantity.toLocaleString()}</td>
                            <td style="text-align: right; color: #FBBF24;">${grandTotals.transit.toLocaleString()}</td>
                            <td style="text-align: right; color: #C084FC;">${grandTotals.reserved.toLocaleString()}</td>
                            <td style="text-align: right; color: #38BDF8;">${grandTotals.total.toLocaleString()}</td>
                            <td style="text-align: right;"></td>
                            <td style="text-align: right; color: #818CF8;">Rs. ${grandTotals.value.toLocaleString()}</td>
                            ${storeGrandTotalsHtml}
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
            const fileName = `overall-stock-matrix-${asOfDate || new Date().toISOString().slice(0, 10)}.html`;
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
