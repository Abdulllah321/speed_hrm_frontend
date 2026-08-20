"use client";

import * as XLSX from "xlsx";
import { TreeNode, StockTotals } from "./types";
import { registerClientGeneratedExport } from "@/lib/actions/stock-ledger";

interface ExportExcelOptions {
    treeData: TreeNode[];
    grandTotals: StockTotals;
    reportType: "merged" | "separate";
    dateFromStr?: string;
    dateToStr?: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

export async function exportAvailableStockSummaryToExcel({
    treeData,
    grandTotals,
    reportType,
    dateFromStr,
    dateToStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportExcelOptions): Promise<void> {
    try {
        onProgress?.(10, "Initializing Excel workbook...");

        const rows: any[][] = [];

        // Title Block
        rows.push([companyName.toUpperCase()]);
        rows.push([`AVAILABLE STOCK SUMMARY REPORT (${reportType.toUpperCase()} VIEW)`]);
        rows.push([`Period: ${dateFromStr || "All Time"} to ${dateToStr || "Present"}`]);
        rows.push([`Generated At: ${new Date().toLocaleString()}`]);
        rows.push([]); // blank spacing

        // Table Header
        rows.push([
            "GPC / Category / Product",
            "Size",
            "Color",
            "Available Qty",
            "In Transit",
            "Stock Reserved",
            "Total Balance",
            "Selling Price (Rs.)",
            "Selling Value (Rs.)",
            "Unit Cost (Rs.)",
            "Costing Value (Rs.)",
        ]);

        onProgress?.(30, "Flattening hierarchy nodes & formatting rows...");

        let processedNodes = 0;
        const totalNodes = Math.max(1, treeData.length);

        function traverseNode(node: TreeNode, depth: number = 0) {
            const indent = "  ".repeat(depth);
            let label = `${indent}${node.value}`;

            if (node.sku && node.articleName) {
                label = `${indent}[${node.sku}] ${node.articleName}`;
            }

            rows.push([
                label,
                node.size || "",
                node.color || "",
                node.totals.quantity,
                node.totals.transit,
                node.totals.reserved,
                node.totals.total,
                node.totals.unitPrice || "",
                node.totals.value,
                node.totals.unitCost || "",
                node.totals.costingValue,
            ]);

            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    traverseNode(child, depth + 1);
                }
            }
        }

        for (const rootNode of treeData) {
            traverseNode(rootNode, 0);
            processedNodes++;
            const pct = 30 + Math.floor((processedNodes / totalNodes) * 40);
            onProgress?.(pct, `Processing category node ${processedNodes} of ${totalNodes}...`);
        }

        // Grand Totals Row
        rows.push([]);
        rows.push([
            "GRAND TOTAL",
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
        ]);

        onProgress?.(75, "Generating binary Excel file...");

        const worksheet = XLSX.utils.aoa_to_sheet(rows);

        // Auto-fit column widths
        worksheet["!cols"] = [
            { wch: 45 }, // Category/Item Name
            { wch: 10 }, // Size
            { wch: 14 }, // Color
            { wch: 14 }, // Available Qty
            { wch: 12 }, // In Transit
            { wch: 14 }, // Stock Reserved
            { wch: 14 }, // Total Balance
            { wch: 16 }, // Selling Price
            { wch: 18 }, // Value
            { wch: 16 }, // Unit Cost
            { wch: 18 }, // Costing Value
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Available Stock Summary");

        const fileName = `available-stock-summary-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;

        // Generate binary buffer
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

        onProgress?.(90, "Triggering immediate browser download...");

        // Trigger immediate browser download
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

        onProgress?.(95, "Syncing export record with S3 & Export History...");

        // In background, register ExportHistory and upload to S3
        try {
            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("fileName", fileName);
            formData.append("format", "xlsx");
            await registerClientGeneratedExport(formData);
        } catch (s3Err) {
            console.warn("Background S3 export registration warn:", s3Err);
        }

        onProgress?.(100, "Excel export complete!");
    } catch (err: any) {
        console.error("Excel export error:", err);
        throw err;
    }
}
