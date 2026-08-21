"use client";

import * as XLSX from "xlsx";
import { FlatItemRecord, TransactionTotals } from "./types";
import { registerClientGeneratedExport } from "@/lib/actions/stock-ledger";

interface ExportExcelOptions {
    filteredItems: FlatItemRecord[];
    grandTotals: TransactionTotals;
    dateRangeStr: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportStockTransactionDetailToExcel({
    filteredItems,
    grandTotals,
    dateRangeStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportExcelOptions): Promise<void> {
    onProgress?.(5, "Initializing Excel workbook generator...");
    await yieldToMain();

    const headers = [
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
        "Doc Type / Ref #",
        "Date",
        "Opening (B/F)",
        "In (+)",
        "Out (-)",
        "In-Transit",
        "Closing Balance",
    ];

    const dataRows: any[][] = [];

    // Title Row
    dataRows.push([`${companyName} - Stock Transaction Detail Report`]);
    dataRows.push([`Period: ${dateRangeStr} | Total SKUs: ${filteredItems.length}`]);
    dataRows.push([]); // Blank row
    dataRows.push(headers);

    onProgress?.(25, `Writing ${filteredItems.length} product movement ledgers...`);
    await yieldToMain();

    let processedCount = 0;
    const totalItems = filteredItems.length;

    for (const item of filteredItems) {
        dataRows.push([
            item.brand,
            item.division,
            item.category,
            item.gender,
            item.silhouette,
            item.sku,
            item.articleName,
            item.size,
            item.color,
            item.barCode,
            "SUMMARY ITEM TOTAL",
            "-",
            item.openingBalance,
            item.inQty,
            item.outQty,
            item.inTransitQty,
            item.closingBalance,
        ]);

        if (item.transactions && item.transactions.length > 0) {
            for (const tx of item.transactions) {
                dataRows.push([
                    "",
                    "",
                    "",
                    "",
                    "",
                    item.sku,
                    item.articleName,
                    item.size,
                    item.color,
                    item.barCode,
                    `${tx.docType} (${tx.docRef})`,
                    tx.date ? new Date(tx.date).toLocaleDateString() : "-",
                    "-",
                    tx.inQty || 0,
                    tx.outQty || 0,
                    tx.isInTransit ? tx.inQty : 0,
                    tx.runningBalance ?? "-",
                ]);
            }
        }

        processedCount++;
        if (processedCount % 100 === 0) {
            const pct = Math.floor(25 + (processedCount / totalItems) * 55);
            onProgress?.(pct, `Writing excel rows (${processedCount}/${totalItems})...`);
            await yieldToMain();
        }
    }

    // Grand Totals Row
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
        "",
        "",
        grandTotals.openingBalance,
        grandTotals.totalInQty,
        grandTotals.totalOutQty,
        grandTotals.inTransitQty,
        grandTotals.closingBalance,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaction Detail");

    onProgress?.(90, "Compressing XLSX workbook...");
    await yieldToMain();

    const fileName = `stock-transaction-detail-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    // Register export in background
    try {
        const wbBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
        await registerClientGeneratedExport({
            fileBuffer: wbBuffer,
            fileName,
            format: "xlsx",
        });
    } catch {
        // non-blocking
    }

    onProgress?.(100, "Excel export complete!");
}
