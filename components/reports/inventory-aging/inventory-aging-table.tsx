import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  InventoryAgingRecord,
  InventoryAgingTotals,
  LocationHeader,
  WarehouseHeader,
} from "./types";
import { cn } from "@/lib/utils";
import { Loader2, PackageX, RefreshCw } from "lucide-react";

interface InventoryAgingTableProps {
  items: InventoryAgingRecord[];
  totals: InventoryAgingTotals;
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
  reportType: "merged" | "separate";
  isPending: boolean;
  isLoading?: boolean;
  progressPercent?: number;
  progressMessage?: string;
  isPosLevel?: boolean;
}

export function InventoryAgingTable({
  items,
  totals,
  locations,
  warehouses,
  reportType,
  isPending,
  isLoading = false,
  progressPercent = 0,
  progressMessage = "",
  isPosLevel = false,
}: InventoryAgingTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden no-print relative">
      {/* Real-time Calculation / Fetch Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-4">
          <div className="p-3.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <RefreshCw className="h-7 w-7 animate-spin" />
          </div>
          <div className="text-center max-w-sm space-y-1.5">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
              {progressMessage || "Calculating Inventory Aging & Valuation..."}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluating stock movement ledger & FIFO entry buckets
            </p>
          </div>
          <div className="w-64 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {progressPercent}% Complete
          </span>
        </div>
      )}

      <div
        ref={parentRef}
        className="max-h-[680px] overflow-auto relative"
      >
        <div className="inline-block min-w-full align-middle">
          {/* Table Header */}
          <div className="sticky top-0 z-20 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider shadow-xs">
            <div className="flex items-center px-4 py-3 border-b border-slate-800 min-w-max">
              <div className="w-12 shrink-0 text-center">#</div>
              <div className="w-36 shrink-0 font-mono">SKU / Barcode</div>
              <div className="w-64 shrink-0">Item Description</div>
              <div className="w-32 shrink-0">Brand</div>
              <div className="w-32 shrink-0">Category</div>
              <div className="w-24 shrink-0 text-right">
                {isPosLevel ? "Unit Price" : "Unit Cost"}
              </div>
              <div className="w-24 shrink-0 text-right">Total Qty</div>
              <div className="w-28 shrink-0 text-right">
                {isPosLevel ? "Retail Value" : "Cost Value"}
              </div>

              {/* Aging Buckets (Month-based: 0-6M, 6-9M, 9-12M, 12-15M, 15-18M, >18M) */}
              <div className="w-24 shrink-0 text-right bg-sky-950/60 text-sky-300 px-2 py-1 rounded-l">0–6M</div>
              <div className="w-24 shrink-0 text-right bg-amber-950/60 text-amber-300 px-2 py-1">6–9M</div>
              <div className="w-24 shrink-0 text-right bg-amber-950/60 text-amber-300 px-2 py-1">9–12M</div>
              <div className="w-24 shrink-0 text-right bg-orange-950/60 text-orange-300 px-2 py-1">12–15M</div>
              <div className="w-24 shrink-0 text-right bg-orange-950/60 text-orange-300 px-2 py-1">15–18M</div>
              <div className="w-28 shrink-0 text-right bg-rose-950/80 text-rose-300 px-2 py-1 rounded-r">&gt;18M (Aged)</div>

              <div className="w-24 shrink-0 text-center">Avg Age</div>

              {/* Dynamic Matrix Store/Warehouse Columns */}
              {reportType === "separate" && (
                <>
                  {locations.map((loc) => (
                    <div key={loc.id} className="w-28 shrink-0 text-right text-emerald-400 font-mono px-2">
                      {loc.code || loc.name}
                    </div>
                  ))}
                  {warehouses.map((wh) => (
                    <div key={wh.id} className="w-28 shrink-0 text-right text-sky-400 font-mono px-2">
                      {wh.code || wh.name}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Empty State */}
          {!isLoading && items.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <PackageX className="h-8 w-8" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                No inventory aging items found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Try selecting different stores, warehouses, or aging brackets.
              </p>
            </div>
          )}

          {/* Table Body (Virtualized Rows) */}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index];
              const isEven = virtualRow.index % 2 === 0;
              const priceToDisplay = isPosLevel ? item.unitPrice : item.unitCost;

              return (
                <div
                  key={item.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    "flex items-center px-4 py-2.5 text-xs font-medium border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 min-w-max",
                    isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-800/30",
                  )}
                >
                  <div className="w-12 shrink-0 text-center text-slate-400 font-mono">
                    {virtualRow.index + 1}
                  </div>
                  <div className="w-36 shrink-0 font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.sku}
                  </div>
                  <div className="w-64 shrink-0 font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                    {item.name}
                  </div>
                  <div className="w-32 shrink-0 text-slate-600 dark:text-slate-400 truncate">
                    {item.brandName}
                  </div>
                  <div className="w-32 shrink-0 text-slate-600 dark:text-slate-400 truncate">
                    {item.categoryName}
                  </div>
                  <div className="w-24 shrink-0 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {priceToDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </div>
                  <div className="w-24 shrink-0 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {item.totalQty.toLocaleString()}
                  </div>
                  <div className="w-28 shrink-0 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    Rs. {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>

                  {/* Aging Buckets */}
                  <div className={cn("w-24 shrink-0 text-right font-mono px-2", item.bucket0to6mQty > 0 ? "font-bold text-sky-600 dark:text-sky-400" : "text-slate-300 dark:text-slate-700")}>
                    {item.bucket0to6mQty.toLocaleString()}
                  </div>
                  <div className={cn("w-24 shrink-0 text-right font-mono px-2", item.bucket6to9mQty > 0 ? "font-semibold text-slate-700 dark:text-slate-300" : "text-slate-300 dark:text-slate-700")}>
                    {item.bucket6to9mQty.toLocaleString()}
                  </div>
                  <div className={cn("w-24 shrink-0 text-right font-mono px-2", item.bucket9to12mQty > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-300 dark:text-slate-700")}>
                    {item.bucket9to12mQty.toLocaleString()}
                  </div>
                  <div className={cn("w-24 shrink-0 text-right font-mono px-2", item.bucket12to15mQty > 0 ? "font-semibold text-orange-600 dark:text-orange-400" : "text-slate-300 dark:text-slate-700")}>
                    {item.bucket12to15mQty.toLocaleString()}
                  </div>
                  <div className={cn("w-24 shrink-0 text-right font-mono px-2", item.bucket15to18mQty > 0 ? "font-semibold text-orange-700 dark:text-orange-300" : "text-slate-300 dark:text-slate-700")}>
                    {item.bucket15to18mQty.toLocaleString()}
                  </div>
                  <div className={cn("w-28 shrink-0 text-right font-mono px-2", item.bucket18mPlusQty > 0 ? "font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 py-0.5 rounded" : "text-slate-300 dark:text-slate-700")}>
                    {item.bucket18mPlusQty.toLocaleString()}
                  </div>

                  <div className="w-24 shrink-0 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.avgAgeDays}d
                  </div>

                  {/* Separate Mode Dynamic Store Columns */}
                  {reportType === "separate" && (
                    <>
                      {locations.map((loc) => (
                        <div key={loc.id} className="w-28 shrink-0 text-right font-mono text-slate-700 dark:text-slate-300 px-2">
                          {(item.locationStocks[loc.id] || 0).toLocaleString()}
                        </div>
                      ))}
                      {warehouses.map((wh) => (
                        <div key={wh.id} className="w-28 shrink-0 text-right font-mono text-slate-700 dark:text-slate-300 px-2">
                          {(item.warehouseStocks[wh.id] || 0).toLocaleString()}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Footer Grand Totals Row */}
          <div className="sticky bottom-0 z-20 bg-slate-900 text-white font-bold text-xs shadow-md">
            <div className="flex items-center px-4 py-3 border-t border-slate-800 min-w-max">
              <div className="w-12 shrink-0 text-center text-slate-400">TOTAL</div>
              <div className="w-36 shrink-0 font-mono text-indigo-400">
                {totals.totalItems.toLocaleString()} SKUs
              </div>
              <div className="w-64 shrink-0 text-slate-300">Grand Total Inventory Balance</div>
              <div className="w-32 shrink-0"></div>
              <div className="w-32 shrink-0"></div>
              <div className="w-24 shrink-0 text-right"></div>
              <div className="w-24 shrink-0 text-right font-mono text-emerald-400 text-sm font-black">
                {totals.totalStockQty.toLocaleString()}
              </div>
              <div className="w-28 shrink-0 text-right font-mono text-indigo-300 text-sm font-black">
                Rs. {totals.totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>

              {/* Bucket Totals */}
              <div className="w-24 shrink-0 text-right font-mono text-sky-300 px-2">
                {totals.totalBucket0to6mQty.toLocaleString()}
              </div>
              <div className="w-24 shrink-0 text-right font-mono text-slate-300 px-2">
                {totals.totalBucket6to9mQty.toLocaleString()}
              </div>
              <div className="w-24 shrink-0 text-right font-mono text-amber-300 px-2">
                {totals.totalBucket9to12mQty.toLocaleString()}
              </div>
              <div className="w-24 shrink-0 text-right font-mono text-orange-300 px-2">
                {totals.totalBucket12to15mQty.toLocaleString()}
              </div>
              <div className="w-24 shrink-0 text-right font-mono text-orange-300 px-2">
                {totals.totalBucket15to18mQty.toLocaleString()}
              </div>
              <div className="w-28 shrink-0 text-right font-mono text-rose-400 text-sm font-black px-2">
                {totals.totalBucket18mPlusQty.toLocaleString()}
              </div>

              <div className="w-24 shrink-0 text-center font-mono text-amber-400 font-black">
                {totals.overallAvgAgeDays}d
              </div>

              {/* Separate Mode Dynamic Store Columns */}
              {reportType === "separate" && (
                <>
                  {locations.map((loc) => (
                    <div key={loc.id} className="w-28 shrink-0 text-right font-mono text-emerald-400 px-2">
                      {(totals.locationTotals[loc.id] || 0).toLocaleString()}
                    </div>
                  ))}
                  {warehouses.map((wh) => (
                    <div key={wh.id} className="w-28 shrink-0 text-right font-mono text-sky-400 px-2">
                      {(totals.warehouseTotals[wh.id] || 0).toLocaleString()}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
