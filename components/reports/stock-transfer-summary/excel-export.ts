"use client";

import * as XLSX from "xlsx";
import { TransferRecord, TransferGrandTotals } from "./types";
import { format } from "date-fns";

interface ExportExcelOptions {
    transfers: TransferRecord[];
    grandTotals: TransferGrandTotals;
    dateRangeStr: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportStockTransferSummaryToExcel({
    transfers,
    grandTotals,
    dateRangeStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportExcelOptions): Promise<void> {
    onProgress?.(10, "Initializing Excel workbook...");
    await yieldToMain();

    const wb = XLSX.utils.book_new();

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 1: Master Transfers Summary
    // ─────────────────────────────────────────────────────────────────────────
    const masterHeaders = [
        "Transfer / STN #",
        "Outbound #",
        "Inbound #",
        "Date",
        "Transfer Type",
        "Status",
        "Source Location / WH",
        "Destination Location / WH",
        "Initiated By (Maker)",
        "Accepted By (Receiver)",
        "Accepted At",
        "Units Sent",
        "Units Accepted",
        "Units Pending",
        "Dispatch / Courier",
        "Tracking Number",
        "Rider Name",
        "Rider Phone",
        "Shipping Cost",
        "Notes",
    ];

    const masterRows: any[][] = [];
    masterRows.push([`${companyName} - Stock Transfer Movement & Status Report`]);
    masterRows.push([`Period: ${dateRangeStr} | Total Transfers: ${transfers.length}`]);
    masterRows.push([
        `Grand Totals - Sent: ${grandTotals.totalSentQty} | Accepted: ${grandTotals.totalReceivedQty} | Pending: ${grandTotals.totalPendingQty}`,
    ]);
    masterRows.push([]); // blank row
    masterRows.push(masterHeaders);

    for (const tr of transfers) {
        masterRows.push([
            tr.requestNo,
            tr.outboundNo || "-",
            tr.inboundNo || "-",
            tr.createdAt ? format(new Date(tr.createdAt), "yyyy-MM-dd") : "-",
            tr.transferType?.replace(/_/g, " "),
            tr.status,
            tr.sourceName,
            tr.destinationName,
            tr.creatorName || "-",
            tr.acceptedByName || (tr.status === "COMPLETED" ? "Accepted" : "Pending"),
            tr.acceptedAt ? format(new Date(tr.acceptedAt), "yyyy-MM-dd HH:mm") : "-",
            tr.totalSentQty,
            tr.totalReceivedQty,
            tr.totalPendingQty,
            tr.courierName || tr.dispatchType || "-",
            tr.trackingNumber || "-",
            tr.riderName || "-",
            tr.riderPhone || "-",
            tr.shippingCost || 0,
            tr.notes || "-",
        ]);
    }

    // Totals row for Sheet 1
    masterRows.push([]);
    masterRows.push([
        "TOTAL",
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
        grandTotals.totalSentQty,
        grandTotals.totalReceivedQty,
        grandTotals.totalPendingQty,
    ]);

    const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
    wsMaster["!cols"] = [
        { wch: 18 }, // STN
        { wch: 15 }, // Outbound
        { wch: 15 }, // Inbound
        { wch: 12 }, // Date
        { wch: 22 }, // Type
        { wch: 14 }, // Status
        { wch: 28 }, // Source
        { wch: 28 }, // Destination
        { wch: 20 }, // Initiator
        { wch: 20 }, // Accepted By
        { wch: 16 }, // Accepted At
        { wch: 12 }, // Sent
        { wch: 14 }, // Accepted
        { wch: 14 }, // Pending
        { wch: 18 }, // Courier
        { wch: 18 }, // Tracking
        { wch: 16 }, // Rider
        { wch: 14 }, // Phone
        { wch: 14 }, // Cost
        { wch: 30 }, // Notes
    ];
    XLSX.utils.book_append_sheet(wb, wsMaster, "Transfers Summary");

    onProgress?.(50, "Generating line-item details worksheet...");
    await yieldToMain();

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 2: Item Line Breakdown
    // ─────────────────────────────────────────────────────────────────────────
    const itemHeaders = [
        "Transfer STN #",
        "Date",
        "Source",
        "Destination",
        "Status",
        "Accepted By",
        "SKU",
        "Article Description",
        "Barcode",
        "Brand",
        "Division",
        "Category",
        "Gender",
        "Silhouette",
        "Size",
        "Color",
        "Sent Qty",
        "Received Qty",
        "Pending Qty",
    ];

    const itemRows: any[][] = [];
    itemRows.push([`${companyName} - Stock Transfer Line Items Detail`]);
    itemRows.push([`Period: ${dateRangeStr}`]);
    itemRows.push([]);
    itemRows.push(itemHeaders);

    for (const tr of transfers) {
        for (const it of tr.items || []) {
            itemRows.push([
                tr.requestNo,
                tr.createdAt ? format(new Date(tr.createdAt), "yyyy-MM-dd") : "-",
                tr.sourceName,
                tr.destinationName,
                tr.status,
                tr.acceptedByName || (tr.status === "COMPLETED" ? "Accepted" : "Pending"),
                it.sku,
                it.articleName,
                it.barCode || "-",
                it.brand,
                it.division,
                it.category,
                it.gender,
                it.silhouette,
                it.size,
                it.color,
                it.sentQty,
                it.receivedQty,
                it.pendingQty,
            ]);
        }
    }

    const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
    wsItems["!cols"] = [
        { wch: 18 }, // STN
        { wch: 12 }, // Date
        { wch: 25 }, // Source
        { wch: 25 }, // Destination
        { wch: 14 }, // Status
        { wch: 18 }, // Accepted By
        { wch: 16 }, // SKU
        { wch: 28 }, // Description
        { wch: 15 }, // Barcode
        { wch: 14 }, // Brand
        { wch: 14 }, // Division
        { wch: 14 }, // Category
        { wch: 12 }, // Gender
        { wch: 14 }, // Silhouette
        { wch: 10 }, // Size
        { wch: 12 }, // Color
        { wch: 10 }, // Sent
        { wch: 12 }, // Recv
        { wch: 12 }, // Pend
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, "Item Line Details");

    onProgress?.(90, "Saving workbook file...");
    await yieldToMain();

    const fileName = `stock-transfer-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    onProgress?.(100, "Export completed successfully");
}
