import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { StockPositionTableRow, StockPositionTotals } from "./types";
import {
  Barcode,
  ChevronRight,
  ChevronDown,
  UnfoldVertical,
  FoldVertical,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface StockPositionTableProps {
  rows: StockPositionTableRow[];
  grandTotals: StockPositionTotals;
  viewMode: "tree" | "flat";
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function StockPositionTable({
  rows,
  grandTotals,
  viewMode,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: StockPositionTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  const formatVal = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "" || val === "-") return "-";
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toLocaleString();
  };

  const formatPercent = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "") return "-";
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num) || num === 0) return "-";
    return `${num.toFixed(1)}%`;
  };

  const formatPrice = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "" || val === "-") return "-";
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toLocaleString();
  };

  const formatFob = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "" || val === "-") return "-";
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDiscount = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "" || val === "-") return "-";
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num)) return "-";
    if (num === 0) return "0%";
    return `${parseFloat(num.toFixed(2))}%`;
  };

  const totalCols = viewMode === "flat" ? 24 : 18;

  return (
    <div className="space-y-2.5">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-1 no-print">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          Showing{" "}
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {rows.length.toLocaleString()}
          </span>{" "}
          {viewMode === "tree" ? "hierarchy position rows" : "items"}
        </span>

        {viewMode === "tree" && (
          <div className="flex items-center gap-2">
            {onExpandAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandAll}
                className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-lg gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <UnfoldVertical className="h-3 w-3 text-emerald-600" />
                Expand All
              </Button>
            )}
            {onCollapseAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCollapseAll}
                className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-lg gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FoldVertical className="h-3 w-3 text-indigo-600" />
                Collapse All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Virtualized Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[700px] relative">
          <table
            className={cn(
              "w-full text-left border-collapse text-xs",
              viewMode === "flat" ? "min-w-[2450px]" : "min-w-[1950px]",
            )}
          >
            {/* Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              {viewMode === "flat" ? (
                /* Flat Mode: Displays Brand, Division, Category, Gender, Season, Silhouette, Identifiers, and Metrics */
                <tr>
                  {/* 1. Brand */}
                  <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Brand
                  </th>
                  {/* 2. Division */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Division
                  </th>
                  {/* 3. Category */}
                  <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Category
                  </th>
                  {/* 4. Gender */}
                  <th className="py-3 px-2.5 w-[85px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Gender
                  </th>
                  {/* 5. Season */}
                  <th className="py-3 px-2 w-[80px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Season
                  </th>
                  {/* 6. Silhouette */}
                  <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Silhouette
                  </th>
                  {/* 7. SKU */}
                  <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    SKU
                  </th>
                  {/* 8. Item Description */}
                  <th className="py-3 px-3.5 w-[210px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Item Description
                  </th>
                  {/* 9. Barcode */}
                  <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Barcode
                  </th>
                  {/* 10. Size */}
                  <th className="py-3 px-2 w-[65px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Size
                  </th>
                  {/* 11. Color */}
                  <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Color
                  </th>
                  {/* 12. Discount % */}
                  <th className="py-3 px-2.5 w-[90px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                    Discount %
                  </th>
                  {/* 13. Current RP */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-slate-50/80 dark:bg-slate-800/50">
                    Current RP
                  </th>
                  {/* 14. FOB */}
                  <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    FOB
                  </th>
                  {/* 15. Launch Date */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Launch Date
                  </th>
                  {/* 16. Launch Qty */}
                  <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300">
                    Launch Qty
                  </th>
                  {/* 17. Beginning */}
                  <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>Beginning</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Beginning = Opening (B/F) + Net Purchases + Net Adjustments
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 18. Sell Through % */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>Sell Thru %</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Sell Through % = (Net Sales / Beginning) * 100
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 19. Net Sales */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>Net Sales</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Net Sales = POS Sales + Direct Sales - Sales Returns
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 20. End */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>End</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          End Stock = Beginning - Net Sales
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 21. Last LC No */}
                  <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Last LC No
                  </th>
                  {/* 22. Last LC Date */}
                  <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Last LC Date
                  </th>
                  {/* 23. Last Sale Date */}
                  <th className="py-3 px-3 w-[125px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Last Sale Date
                  </th>
                  {/* 24. Total Quantity */}
                  <th className="py-3 px-3 w-[130px] shrink-0 text-right bg-violet-50/50 dark:bg-violet-950/20 text-violet-800 dark:text-violet-300 font-bold">
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Qty</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Total sale quantity on the latest sale date across all outlets
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                </tr>
              ) : (
                /* Tree Mode: Simple Hierarchical Matrix matching other reports */
                <tr>
                  {/* 1. Hierarchy / Item Description */}
                  <th className="py-3 px-3.5 w-[360px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Hierarchy / Item Description
                  </th>
                  {/* 2. SKU */}
                  <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    SKU
                  </th>
                  {/* 3. Barcode */}
                  <th className="py-3 px-3 w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                    Barcode
                  </th>
                  {/* 4. Size */}
                  <th className="py-3 px-2 w-[75px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Size
                  </th>
                  {/* 5. Color */}
                  <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Color
                  </th>
                  {/* 6. Discount % */}
                  <th className="py-3 px-2.5 w-[90px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                    Discount %
                  </th>
                  {/* 7. Current RP */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-slate-50/80 dark:bg-slate-800/50">
                    Current RP
                  </th>
                  {/* 8. FOB */}
                  <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    FOB
                  </th>
                  {/* 9. Launch Date */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Launch Date
                  </th>
                  {/* 10. Launch Qty */}
                  <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300">
                    Launch Qty
                  </th>
                  {/* 11. Beginning */}
                  <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>Beginning</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Beginning = Opening (B/F) + Net Purchases + Net Adjustments
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 12. Sell Through % */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>Sell Thru %</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Sell Through % = (Net Sales / Beginning) * 100
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 13. Net Sales */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>Net Sales</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Net Sales = POS Sales + Direct Sales - Sales Returns
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 14. End */}
                  <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300">
                    <div className="flex items-center justify-end gap-1">
                      <span>End</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          End Stock = Beginning - Net Sales
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  {/* 15. Last LC No */}
                  <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Last LC No
                  </th>
                  {/* 16. Last LC Date */}
                  <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Last LC Date
                  </th>
                  {/* 17. Last Sale Date */}
                  <th className="py-3 px-3 w-[125px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">
                    Last Sale Date
                  </th>
                  {/* 18. Total Quantity */}
                  <th className="py-3 px-3 w-[130px] shrink-0 text-right bg-violet-50/50 dark:bg-violet-950/20 text-violet-800 dark:text-violet-300 font-bold">
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Qty</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Total sale quantity on the latest sale date across all outlets
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                </tr>
              )}
            </thead>

            {/* Table Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={totalCols} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No stock position items found for current filters.
                  </td>
                </tr>
              ) : (
                virtualItems.map((virtualRow) => {
                  const item = rows[virtualRow.index];
                  if (!item) return null;

                  /* Flat Mode Row */
                  if (viewMode === "flat") {
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 dark:border-slate-800/60 transition-colors text-xs hover:bg-slate-50/70 dark:hover:bg-slate-900/30"
                      >
                        {/* 1. Brand */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.brand || "-"}
                        </td>
                        {/* 2. Division */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 truncate">
                          {item.division || "-"}
                        </td>
                        {/* 3. Category */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 truncate">
                          {item.productCategory || "-"}
                        </td>
                        {/* 4. Gender */}
                        <td className="py-2.5 px-2.5 border-r border-slate-100 dark:border-slate-800/60 text-center truncate">
                          {item.gender || "-"}
                        </td>
                        {/* 5. Season */}
                        <td className="py-2.5 px-2 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] truncate">
                          {item.season || "-"}
                        </td>
                        {/* 6. Silhouette */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 truncate">
                          {item.silhouette || "-"}
                        </td>
                        {/* 7. SKU */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono font-medium text-[11px] text-indigo-600 dark:text-indigo-400">
                          {item.sku || "-"}
                        </td>
                        {/* 8. Item Description */}
                        <td
                          className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800/60 truncate max-w-[210px]"
                          title={item.itemName}
                        >
                          {item.itemName || "-"}
                        </td>
                        {/* 9. Barcode */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          {item.barCode || "-"}
                        </td>
                        {/* 10. Size */}
                        <td className="py-2.5 px-2 border-r border-slate-100 dark:border-slate-800/60 text-center font-semibold">
                          {item.size || "-"}
                        </td>
                        {/* 11. Color */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center truncate">
                          {item.color || "-"}
                        </td>
                        {/* 12. Discount % */}
                        <td className="py-2.5 px-2.5 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-rose-700 dark:text-rose-400 font-medium">
                          {formatDiscount(item.discountPercent)}
                        </td>
                        {/* 13. Current RP */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                          {formatPrice(item.currentRp)}
                        </td>
                        {/* 14. FOB */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-amber-700 dark:text-amber-400">
                          {formatFob(item.fob)}
                        </td>
                        {/* 15. Launch Date */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.launchDate || "-"}
                        </td>
                        {/* 16. Launch Qty */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-cyan-700 dark:text-cyan-300">
                          {formatVal(item.totals.launchQty)}
                        </td>
                        {/* 17. Beginning */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-indigo-700 dark:text-indigo-300">
                          {formatVal(item.totals.beginning)}
                        </td>
                        {/* 18. Sell Through % */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-semibold text-amber-700 dark:text-amber-300">
                          {formatPercent(item.totals.sellThroughPercent)}
                        </td>
                        {/* 19. Net Sales */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-emerald-700 dark:text-emerald-300">
                          {formatVal(item.totals.netSales)}
                        </td>
                        {/* 20. End */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-blue-700 dark:text-blue-300">
                          {formatVal(item.totals.end)}
                        </td>
                        {/* 21. Last LC No */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {item.lastLcNumber || item.lastGrnNumber || "-"}
                        </td>
                        {/* 22. Last LC Date */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.lastLcDate || item.lastGrnDate || "-"}
                        </td>
                        {/* 23. Last Sale Date */}
                        <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {item.lastSaleDate || "-"}
                        </td>
                        {/* 24. Total Quantity */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-violet-700 dark:text-violet-300">
                          <div className="flex flex-col items-end">
                            <span>{formatVal(item.totals.totalQty)}</span>
                            {item.lastSaleOutletBreakdown && (
                              <span
                                className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400 truncate max-w-[140px]"
                                title={`Sold on last sale date (${item.lastSaleDate}): ${item.lastSaleOutletBreakdown}`}
                              >
                                {item.lastSaleOutletBreakdown}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  /* Tree Mode Row */
                  const isBrand = item.type === "brand";
                  const isDivision = item.type === "division";
                  const isGender = item.type === "gender";
                  const isCategory = item.type === "category";
                  const isArticle = item.type === "article";
                  const isVariant = item.type === "variant" || !item.type;

                  const depthIndentClass =
                    item.depth === 1
                      ? "pl-6"
                      : item.depth === 2
                      ? "pl-10"
                      : item.depth === 3
                      ? "pl-14"
                      : item.depth === 4
                      ? "pl-18"
                      : item.depth === 5
                      ? "pl-22"
                      : "pl-3.5";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (item.hasChildren && item.nodeId && onToggleNode) {
                          onToggleNode(item.nodeId);
                        }
                      }}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-800/60 transition-colors text-xs select-none",
                        item.hasChildren && "cursor-pointer",
                        isBrand &&
                          "bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold border-l-2 border-slate-400 dark:border-slate-500 hover:bg-slate-200/80 dark:hover:bg-slate-750",
                        isDivision &&
                          "bg-slate-50/90 dark:bg-slate-850 font-bold text-emerald-700 dark:text-emerald-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60",
                        isGender &&
                          "bg-slate-50/70 dark:bg-slate-850/50 text-amber-700 dark:text-amber-300 font-semibold hover:bg-slate-100/60 dark:hover:bg-slate-800/50",
                        isCategory &&
                          "bg-slate-50/80 dark:bg-slate-900/50 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
                        isArticle &&
                          "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium hover:bg-slate-50 dark:hover:bg-slate-900/40",
                        isVariant &&
                          "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-50/70 dark:hover:bg-slate-900/30",
                      )}
                    >
                      {/* 1. Hierarchy / Item Description */}
                      <td
                        className={cn(
                          "py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800/60 truncate",
                          depthIndentClass,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {item.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.nodeId && onToggleNode) {
                                  onToggleNode(item.nodeId);
                                }
                              }}
                              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}

                          {isVariant ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Barcode className="h-3.5 w-3.5 opacity-60 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {item.barCode || item.itemName || "N/A"}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="uppercase text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {item.type}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. SKU */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {item.sku || "-"}
                      </td>

                      {/* 3. Barcode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {isVariant ? item.barCode || "-" : isArticle ? "All Barcodes" : "-"}
                      </td>

                      {/* 4. Size */}
                      <td className="py-2.5 px-2 border-r border-slate-100 dark:border-slate-800/60 text-center font-medium">
                        {isVariant ? item.size || "-" : isArticle ? "All Sizes" : "-"}
                      </td>

                      {/* 5. Color */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center">
                        {isVariant ? item.color || "-" : isArticle ? "All Colors" : "-"}
                      </td>

                      {/* 6. Discount % */}
                      <td className="py-2.5 px-2.5 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-rose-700 dark:text-rose-400 font-medium">
                        {isVariant || isArticle ? formatDiscount(item.discountPercent) : "-"}
                      </td>

                      {/* 7. Current RP */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                        {isVariant || isArticle ? formatPrice(item.currentRp) : "-"}
                      </td>

                      {/* 8. FOB */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-amber-700 dark:text-amber-400">
                        {isVariant || isArticle ? formatFob(item.fob) : "-"}
                      </td>

                      {/* 9. Launch Date */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {isVariant || isArticle ? item.launchDate || "-" : "-"}
                      </td>

                      {/* 10. Launch Qty */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-cyan-700 dark:text-cyan-300">
                        {formatVal(item.totals.launchQty)}
                      </td>

                      {/* 11. Beginning */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-indigo-700 dark:text-indigo-300">
                        {formatVal(item.totals.beginning)}
                      </td>

                      {/* 12. Sell Through % */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-semibold text-amber-700 dark:text-amber-300">
                        {formatPercent(item.totals.sellThroughPercent)}
                      </td>

                      {/* 13. Net Sales */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-emerald-700 dark:text-emerald-300">
                        {formatVal(item.totals.netSales)}
                      </td>

                      {/* 14. End */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-medium text-blue-700 dark:text-blue-300">
                        {formatVal(item.totals.end)}
                      </td>

                      {/* 15. Last LC No */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {isVariant || isArticle ? item.lastLcNumber || item.lastGrnNumber || "-" : "-"}
                      </td>

                      {/* 16. Last LC Date */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {isVariant || isArticle ? item.lastLcDate || item.lastGrnDate || "-" : "-"}
                      </td>

                      {/* 17. Last Sale Date */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {isVariant || isArticle ? item.lastSaleDate || "-" : "-"}
                      </td>

                      {/* 18. Total Quantity */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-violet-700 dark:text-violet-300">
                        <div className="flex flex-col items-end">
                          <span>{formatVal(item.totals.totalQty)}</span>
                          {(isVariant || isArticle) && item.lastSaleOutletBreakdown && (
                            <span
                              className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400 truncate max-w-[140px]"
                              title={`Sold on last sale date (${item.lastSaleDate}): ${item.lastSaleOutletBreakdown}`}
                            >
                              {item.lastSaleOutletBreakdown}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={totalCols} />
                </tr>
              )}
            </tbody>

            {/* Synchronized Sticky Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold shadow-sm border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td
                  colSpan={viewMode === "flat" ? 15 : 9}
                  className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold"
                >
                  GRAND TOTAL ({rows.length.toLocaleString()}{" "}
                  {viewMode === "tree" ? "ROWS" : "ITEMS"})
                </td>
                {/* Launch Qty */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-cyan-700 dark:text-cyan-300">
                  {formatVal(grandTotals.launchQty)}
                </td>
                {/* Beginning */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-indigo-700 dark:text-indigo-300">
                  {formatVal(grandTotals.beginning)}
                </td>
                {/* Sell Through % */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-700 dark:text-amber-300">
                  {formatPercent(grandTotals.sellThroughPercent)}
                </td>
                {/* Net Sales */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-emerald-700 dark:text-emerald-300">
                  {formatVal(grandTotals.netSales)}
                </td>
                {/* End */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-blue-700 dark:text-blue-300">
                  {formatVal(grandTotals.end)}
                </td>
                {/* Last LC No, Last LC Date, Last Sale Date */}
                <td
                  colSpan={3}
                  className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400 font-normal"
                >
                  -
                </td>
                {/* Total Quantity */}
                <td className="py-3 px-3 text-right font-mono font-bold text-violet-700 dark:text-violet-300">
                  {formatVal(grandTotals.totalQty)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
