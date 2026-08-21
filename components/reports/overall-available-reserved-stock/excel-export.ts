"use client";

import * as XLSX from "xlsx";
import { TreeNode, StockTotals, FlatItemRecord } from "./types";
import { registerOverallAvailableReservedStockClientExport } from "@/lib/actions/stock-ledger";

interface ExportExcelOptions {
    treeData: TreeNode[];
    filteredItems: FlatItemRecord[];
    grandTotals: StockTotals;
    reportType: "merged" | "separate";
    exportMode?: "hierarchy" | "flat" | "both";
    dateFromStr?: string;
    dateToStr?: string;
    companyName?: string;
    onProgress?: (percent: number, message: string) => void;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function exportOverallAvailableReservedStockToExcel({
    treeData,
    filteredItems,
    grandTotals,
    reportType,
    exportMode = "both",
    dateFromStr,
    dateToStr,
    companyName = "Speed Limit ERP",
    onProgress,
}: ExportExcelOptions): Promise<void> {
    try {
        onProgress?.(5, "Initializing non-blocking Excel generator...");
        await yieldToMain();

        const formattedDate = new Date().toLocaleString();
        const dateRangeStr = `As Of Date: ${dateToStr || format(new Date(), "yyyy-MM-dd")}`;

        // ─── 1. Build Color-Coded Hierarchy View Rows ──────────────────────────────
        let hierarchyRowsHtml = "";
        let hierarchyFlatRows: any[][] = [];

        hierarchyFlatRows.push([companyName.toUpperCase()]);
        hierarchyFlatRows.push([`OVERALL AVAILABLE RESERVED STOCK REPORT (${reportType.toUpperCase()} HIERARCHY VIEW)`]);
        hierarchyFlatRows.push([dateRangeStr]);
        hierarchyFlatRows.push([`Generated At: ${formattedDate}`]);
        hierarchyFlatRows.push([]);
        hierarchyFlatRows.push([
            "GPC / Category / Product / Barcode",
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

        if (exportMode === "hierarchy" || exportMode === "both") {
            onProgress?.(15, "Formatting color-coded hierarchy tree...");
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

            const totalTreeItems = Math.max(1, flatNodeList.length);

            for (let i = 0; i < flatNodeList.length; i++) {
                const { node, depth } = flatNodeList[i];
                const indent = "  ".repeat(depth);

                let label = `${indent}${node.value}`;
                if (node.sku && node.articleName) {
                    label = `${indent}[${node.sku}] ${node.articleName}`;
                } else if (node.level === "variant" && node.barCode) {
                    label = `${indent}[${node.barCode}] ${node.color || "Default"}-${node.size || "Default"}`;
                }

                hierarchyFlatRows.push([
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

                if (i % 80 === 0) {
                    const pct = 15 + Math.floor((i / totalTreeItems) * 30);
                    onProgress?.(pct, `Formatting hierarchy rows (${i}/${totalTreeItems})...`);
                    await yieldToMain();
                }
            }

            hierarchyFlatRows.push([]);
            hierarchyFlatRows.push([
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
        }

        // ─── 2. Build Color-Coded Flat Detail Ledger Rows ──────────────────────────
        let flatDataRows: any[][] = [];

        flatDataRows.push([companyName.toUpperCase()]);
        flatDataRows.push([`OVERALL AVAILABLE RESERVED STOCK REPORT (FLAT DETAIL LEDGER VIEW)`]);
        flatDataRows.push([dateRangeStr]);
        flatDataRows.push([`Generated At: ${formattedDate}`]);
        flatDataRows.push([]);
        flatDataRows.push([
            "Location / Store",
            "Barcode",
            "SKU",
            "Article Name",
            "Brand",
            "Division",
            "Category",
            "Gender",
            "Silhouette",
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

        if (exportMode === "flat" || exportMode === "both") {
            onProgress?.(45, "Formatting color-coded flat detail ledger...");
            await yieldToMain();

            const totalFlatItems = Math.max(1, filteredItems.length);

            for (let i = 0; i < filteredItems.length; i++) {
                const item = filteredItems[i];

                flatDataRows.push([
                    item.locationName,
                    item.barCode,
                    item.sku,
                    item.articleName,
                    item.brand,
                    item.division,
                    item.category,
                    item.gender,
                    item.silhouette,
                    item.size,
                    item.color,
                    item.quantity,
                    item.transit,
                    item.reserved,
                    item.total,
                    item.unitPrice,
                    item.value,
                    item.unitCost,
                    item.costingValue,
                ]);

                if (i % 100 === 0) {
                    const pct = 45 + Math.floor((i / totalFlatItems) * 35);
                    onProgress?.(pct, `Formatting flat detail item ${i}/${totalFlatItems}...`);
                    await yieldToMain();
                }
            }

            flatDataRows.push([]);
            flatDataRows.push([
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
                grandTotals.quantity,
                grandTotals.transit,
                grandTotals.reserved,
                grandTotals.total,
                "",
                grandTotals.value,
                "",
                grandTotals.costingValue,
            ]);
        }

        onProgress?.(85, "Creating XLSX workbook...");
        await yieldToMain();

        // ─── 3. Construct Multi-Sheet XLSX Workbook ─────────────────────────────
        const workbook = XLSX.utils.book_new();

        if (exportMode === "hierarchy" || exportMode === "both") {
            const wsHierarchy = XLSX.utils.aoa_to_sheet(hierarchyFlatRows);
            wsHierarchy["!cols"] = [
                { wch: 48 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
                { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
                { wch: 18 }, { wch: 16 }, { wch: 18 },
            ];
            XLSX.utils.book_append_sheet(workbook, wsHierarchy, "Hierarchy Stock Summary");
        }

        if (exportMode === "flat" || exportMode === "both") {
            const wsFlat = XLSX.utils.aoa_to_sheet(flatDataRows);
            wsFlat["!cols"] = [
                { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 32 },
                { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
                { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
                { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
                { wch: 18 }, { wch: 16 }, { wch: 18 },
            ];
            XLSX.utils.book_append_sheet(workbook, wsFlat, "Flat Detail Ledger");
        }

        const fileName = `overall-available-reserved-stock-${exportMode}-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
