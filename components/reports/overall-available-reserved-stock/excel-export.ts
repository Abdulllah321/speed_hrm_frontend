"use client";

import * as XLSX from "xlsx";
import { FlatItemRecord, LocationHeader, StockTotals } from "./types";
import { registerOverallAvailableReservedStockClientExport } from "@/lib/actions/stock-ledger";

interface ExportExcelOptions {
    filteredItems: FlatItemRecord[];
    locationHeaders: LocationHeader[];
    grandTotals: StockTotals;
    asOfDate?: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportOverallAvailableReservedStockToExcel({
    filteredItems,
    locationHeaders,
    grandTotals,
    asOfDate,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportExcelOptions): Promise<void> {
    try {
        onProgress?.(5, "Initializing non-blocking Excel generator...");
        await yieldToMain();

        const formattedDate = new Date().toLocaleString();
        const dateRangeStr = `As Of Date: ${asOfDate || new Date().toISOString().slice(0, 10)}`;

        const dataRows: any[][] = [];

        // Title Block
        dataRows.push([companyName.toUpperCase()]);
        dataRows.push([`OVERALL STOCK MATRIX REPORT (OUTLETS & WAREHOUSES STORE-WISE BREAKDOWN)`]);
        dataRows.push([dateRangeStr]);
        dataRows.push([`Generated At: ${formattedDate}`]);
        dataRows.push([]);

        // Header Row
        const headerRow = [
            "Brand",
            "Division",
            "Category",
            "Gender",
            "Silhouette",
            "SKU",
            "Article Name",
            "Size",
            "Color",
            "Barcode",
            "Available Qty",
            "In Transit",
            "Stock Reserved",
            "Total Balance",
            "Selling Price (Rs.)",
            "Selling Value (Rs.)",
            "Unit Cost (Rs.)",
            "Unit Value (Rs.)",
            ...locationHeaders.map((h) => h.code),
        ];
        dataRows.push(headerRow);

        onProgress?.(20, "Formatting store matrix rows...");
        await yieldToMain();

        const totalItems = Math.max(1, filteredItems.length);

        for (let i = 0; i < filteredItems.length; i++) {
            const item = filteredItems[i];

            const locQtys = locationHeaders.map((hdr) => {
                if (hdr.type === "warehouse") {
                    return item.warehouseStocks?.[hdr.id] || 0;
                }
                return item.locationStocks?.[hdr.id] || 0;
            });

            dataRows.push([
                item.brand || "",
                item.division || "",
                item.category || "",
                item.gender || "",
                item.silhouette || "",
                item.sku || "",
                item.articleName || "",
                item.size || "",
                item.color || "",
                item.barCode || "",
                item.quantity,
                item.transit,
                item.reserved,
                item.total,
                item.unitPrice,
                item.value,
                item.unitCost,
                item.costingValue,
                ...locQtys,
            ]);

            if (i % 100 === 0) {
                const pct = 20 + Math.floor((i / totalItems) * 60);
                onProgress?.(pct, `Formatting item ${i}/${totalItems}...`);
                await yieldToMain();
            }
        }

        // Grand Totals Row
        const totalsLocQtys = locationHeaders.map((hdr) => {
            if (hdr.type === "warehouse") {
                return grandTotals.warehouseStocks?.[hdr.id] || 0;
            }
            return grandTotals.locationStocks?.[hdr.id] || 0;
        });

        dataRows.push([]);
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
            grandTotals.quantity,
            grandTotals.transit,
            grandTotals.reserved,
            grandTotals.total,
            "",
            grandTotals.value,
            "",
            grandTotals.costingValue,
            ...totalsLocQtys,
        ]);

        onProgress?.(85, "Constructing XLSX workbook...");
        await yieldToMain();

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

        // Column widths
        const colWidths = [
            { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
            { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 10 },
            { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
            { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
            { wch: 16 }, { wch: 18 },
            ...locationHeaders.map(() => ({ wch: 12 })),
        ];
        worksheet["!cols"] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, "Overall Stock Matrix");

        const fileName = `overall-stock-matrix-${asOfDate || new Date().toISOString().slice(0, 10)}.xlsx`;
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

        onProgress?.(92, "Triggering instant browser download...");
        await yieldToMain();

        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        onProgress?.(96, "Syncing export with S3 & Export History...");
        await yieldToMain();

        try {
            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("fileName", fileName);
            formData.append("format", "xlsx");
            await registerOverallAvailableReservedStockClientExport(formData);
        } catch (s3Err) {
            console.warn("Background S3 export registration warning:", s3Err);
        }

        onProgress?.(100, "Excel export completed successfully!");
    } catch (err: any) {
        console.error("Excel export error:", err);
        throw err;
    }
}
