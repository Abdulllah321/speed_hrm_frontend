import React, { useRef, useState } from "react";
import { VoucherRegisterItem, VoucherRegisterTotals, VoucherReportMode } from "./types";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Copy,
  Check,
  Eye,
  Loader2,
  ArrowUpDown,
  FileText,
  Zap,
  CheckCircle2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoucherRegisterTableProps {
  items: VoucherRegisterItem[];
  totals: VoucherRegisterTotals;
  mode: VoucherReportMode;
  isPending: boolean;
  onSelectItem: (item: VoucherRegisterItem) => void;
  sortColumn: keyof VoucherRegisterItem;
  sortDirection: "asc" | "desc";
  onSort: (col: keyof VoucherRegisterItem) => void;
  totalCount?: number;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  isFetchingAll?: boolean;
  isAllLoaded?: boolean;
  onLoadMore?: () => void;
  onFetchAll?: () => void;
}

export function VoucherRegisterTable({
  items,
  totals,
  mode,
  isPending,
  onSelectItem,
  sortColumn,
  sortDirection,
  onSort,
  totalCount = 0,
  hasMore = false,
  isFetchingMore = false,
  isFetchingAll = false,
  isAllLoaded = false,
  onLoadMore,
  onFetchAll,
}: VoucherRegisterTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      if (hasMore && !isFetchingMore && !isFetchingAll && !isPending && onLoadMore) {
        onLoadMore();
      }
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const handleCopyCode = (e: React.MouseEvent, code: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(`Copied: ${code}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurr = (val: number) =>
    val === 0
      ? "-"
      : val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getTypeBadgeClass = (vType: string) => {
    switch (vType.toUpperCase()) {
      case "GIFT":
      case "OUTLET_GIFT":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200";
      case "CORPORATE":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200";
      case "CREDIT":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200";
      case "EXCHANGE":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200";
      case "REFUND":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200";
      case "CLAIM":
        return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
    }
  };

  const renderSortIndicator = (col: keyof VoucherRegisterItem) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-70" />;
    }
    return (
      <span className="text-indigo-400 font-bold text-[10px]">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden no-print">
      {/* Stream & Dataset Capacity Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-border/70 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-foreground">
              {items.length.toLocaleString()}
            </span>
            <span className="text-muted-foreground">of</span>
            <span className="font-bold text-foreground font-mono">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground">vouchers loaded</span>
          </div>

          {isAllLoaded ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              All Records In Memory (Instant Sort & Filter)
            </span>
          ) : hasMore ? (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • Scroll to stream more or fetch all at once
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isFetchingMore && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Streaming next 100...</span>
            </div>
          )}

          {isFetchingAll && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading all {totalCount.toLocaleString()} records...</span>
            </div>
          )}

          {!isAllLoaded && hasMore && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetchingMore || isFetchingAll || isPending}
                onClick={onLoadMore}
                className="h-7 px-2.5 text-[11px] font-semibold bg-background"
              >
                {isFetchingMore ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Load Next 100
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isFetchingMore || isFetchingAll || isPending}
                onClick={onFetchAll}
                className="h-7 px-2.5 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 dark:bg-amber-500 dark:hover:bg-amber-600 shadow-xs"
              >
                {isFetchingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Zap className="h-3 w-3 mr-1 fill-current" />
                )}
                Fetch All ({totalCount.toLocaleString()})
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={parentRef} onScroll={handleScroll} className="overflow-auto max-h-[700px] w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[2000px]">
          {/* Synchronized Sticky Header */}
          <thead>
            <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 text-[10.5px] uppercase font-semibold tracking-wider sticky top-0 z-20 shadow-xs">
              {/* Voucher # */}
              <th
                onClick={() => onSort("voucherNumber")}
                className="p-3 w-[190px] border-r border-slate-800 bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span>Voucher #</span>
                  {renderSortIndicator("voucherNumber")}
                </div>
              </th>

              {/* Type */}
              <th
                onClick={() => onSort("voucherType")}
                className="p-3 w-[120px] border-r border-slate-800 text-center bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Type</span>
                  {renderSortIndicator("voucherType")}
                </div>
              </th>

              {/* Date Time */}
              <th
                onClick={() => onSort("dateTime")}
                className="p-3 w-[160px] border-r border-slate-800 bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span>Date Time</span>
                  {renderSortIndicator("dateTime")}
                </div>
              </th>

              {/* Company / GL Code */}
              <th
                onClick={() => onSort("companyName")}
                className="p-3 w-[200px] border-r border-slate-800 bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span>Company / GL Code</span>
                  {renderSortIndicator("companyName")}
                </div>
              </th>

              {/* Customer / Beneficiary */}
              <th
                onClick={() => onSort("customerDetail")}
                className="p-3 w-[220px] border-r border-slate-800 bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span>Customer / Beneficiary</span>
                  {renderSortIndicator("customerDetail")}
                </div>
              </th>

              {/* Issued Outlet */}
              <th
                onClick={() => onSort("outletName")}
                className="p-3 w-[180px] border-r border-slate-800 bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span>Issued Store / Outlet</span>
                  {renderSortIndicator("outletName")}
                </div>
              </th>

              {/* Base / Source Inv # */}
              <th className="p-3 w-[180px] border-r border-slate-800 bg-slate-900">
                Base / Claim Memo
              </th>

              {/* Valid Till */}
              <th
                onClick={() => onSort("validTill")}
                className="p-3 w-[130px] border-r border-slate-800 bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span>Valid Till</span>
                  {renderSortIndicator("validTill")}
                </div>
              </th>

              {/* Discount */}
              <th
                onClick={() => onSort("discountAmount")}
                className="p-3 w-[150px] border-r border-slate-800 text-right bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Discount</span>
                  {renderSortIndicator("discountAmount")}
                </div>
              </th>

              {/* Amount / Face Value */}
              <th
                onClick={() => onSort("faceValue")}
                className="p-3 w-[160px] border-r border-slate-800 text-right bg-slate-900 text-emerald-300 font-bold cursor-pointer group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Face Value</span>
                  {renderSortIndicator("faceValue")}
                </div>
              </th>

              {/* Settled In Inv # */}
              <th className="p-3 w-[190px] border-r border-slate-800 bg-slate-900">
                Settled In Inv #
              </th>

              {/* Settled Date Time */}
              <th className="p-3 w-[160px] border-r border-slate-800 bg-slate-900">
                Settled Date
              </th>

              {/* Status */}
              <th
                onClick={() => onSort("status")}
                className="p-3 w-[120px] border-r border-slate-800 text-center bg-slate-900 cursor-pointer group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {renderSortIndicator("status")}
                </div>
              </th>

              {/* Actions */}
              <th className="p-3 w-[70px] text-center bg-slate-900">
                View
              </th>
            </tr>
          </thead>

          {/* Table Body Rows */}
          <tbody className="divide-y divide-border/60 text-xs">
            {isPending ? (
              <tr>
                <td colSpan={14} className="p-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                    <span className="font-medium text-xs">Loading Voucher Register...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={14} className="p-14 text-center text-muted-foreground">
                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="font-semibold text-sm text-foreground">No Vouchers Found</p>
                    <p className="text-xs text-muted-foreground">No records matched your selected filters or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={14} style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  const isSettled = item.settledInCashMemo !== "Pending / Unsettled";
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      onClick={() => onSelectItem(item)}
                      className="hover:bg-muted/50 transition-colors h-[44px] cursor-pointer group"
                    >
                      {/* Voucher # */}
                      <td className="p-3 border-r border-border/40 font-mono font-semibold text-foreground">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{item.voucherNumber}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(e, item.voucherNumber, item.id)}
                            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity"
                            title="Copy Code"
                          >
                            {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 border-r border-border/40 text-center">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider", getTypeBadgeClass(item.voucherType))}>
                          {item.voucherType}
                        </span>
                      </td>

                      {/* Issue Date Time */}
                      <td className="p-3 border-r border-border/40 text-muted-foreground">
                        {item.dateTime}
                      </td>

                      {/* Company / GL Code */}
                      <td className="p-3 border-r border-border/40">
                        {item.companyName !== "-" ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground truncate">{item.companyName}</span>
                            {item.companyGlCode !== "-" && (
                              <span className="text-[10px] font-mono text-muted-foreground">GL: {item.companyGlCode}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </td>

                      {/* Customer / Beneficiary */}
                      <td className="p-3 border-r border-border/40 font-medium text-foreground">
                        <span className="truncate block max-w-[210px]" title={item.customerDetail}>
                          {item.customerDetail}
                        </span>
                      </td>

                      {/* Issued Store */}
                      <td className="p-3 border-r border-border/40 text-foreground font-medium">
                        {item.outletName}
                      </td>

                      {/* Base Memo */}
                      <td className="p-3 border-r border-border/40 font-mono text-slate-700 dark:text-slate-300">
                        {item.baseCashMemo !== "-" ? (
                          <div className="flex items-center gap-1.5 truncate" title={item.baseCashMemo}>
                            <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{item.baseCashMemo}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </td>

                      {/* Valid Till */}
                      <td className="p-3 border-r border-border/40">
                        <span className={cn(item.isExpired ? "text-rose-600 font-medium" : "text-muted-foreground")}>
                          {item.validTill}
                        </span>
                      </td>

                      {/* Discount */}
                      <td className="p-3 border-r border-border/40 text-right font-mono font-medium text-muted-foreground" title={`Discount: ${formatCurr(item.discountAmount)}`}>
                        {formatCurr(item.discountAmount)}
                      </td>

                      {/* Face Value */}
                      <td className="p-3 border-r border-border/40 text-right font-mono font-bold text-foreground" title={`Face Value: ${formatCurr(item.faceValue)}`}>
                        {formatCurr(item.faceValue)}
                      </td>

                      {/* Settled In Inv # */}
                      <td className="p-3 border-r border-border/40 font-mono">
                        {isSettled ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate block max-w-[180px]" title={item.settledInCashMemo}>
                            {item.settledInCashMemo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-[11px]">{item.settledInCashMemo}</span>
                        )}
                      </td>

                      {/* Settled Date */}
                      <td className="p-3 border-r border-border/40 text-muted-foreground">
                        {item.settledDateTime}
                      </td>

                      {/* Status */}
                      <td className="p-3 border-r border-border/40 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block",
                            item.status === "REDEEMED"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              : item.status === "EXPIRED"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900",
                          )}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="View Voucher Lifecycle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={14} style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </>
            )}
          </tbody>

          {/* Sticky Grand Totals Footer */}
          <tfoot className="sticky bottom-0 z-20 shadow-md">
            <tr className="bg-slate-900 text-slate-100 font-bold border-t border-slate-800 text-xs">
              <td colSpan={8} className="p-3 border-r border-slate-800 text-left uppercase tracking-wider bg-slate-900 text-slate-300 font-semibold">
                Grand Totals ({items.length.toLocaleString()} Vouchers)
              </td>
              <td className="p-3 border-r border-slate-800 text-right bg-slate-900 text-slate-300 font-mono" title={`Total Discount: ${formatCurr(totals.totalDiscount)}`}>
                {formatCurr(totals.totalDiscount)}
              </td>
              <td className="p-3 border-r border-slate-800 text-right bg-slate-900 text-emerald-300 font-mono text-sm font-extrabold" title={`Total Face Value: ${formatCurr(totals.totalFaceValue)}`}>
                {formatCurr(totals.totalFaceValue)}
              </td>
              <td colSpan={4} className="p-3 bg-slate-900 text-slate-300 font-mono text-xs">
                {mode === "outstanding" ? (
                  <span className="text-amber-300" title={`Outstanding Liability: ${formatCurr(totals.totalOutstandingAmount)}`}>
                    Outstanding Liability: {formatCurr(totals.totalOutstandingAmount)} ({totals.totalOutstandingCount.toLocaleString()} unredeemed)
                  </span>
                ) : (
                  <span title={`Settled: ${formatCurr(totals.totalSettledAmount)} | Outstanding: ${formatCurr(totals.totalOutstandingAmount)}`}>
                    Settled: {formatCurr(totals.totalSettledAmount)} | Outstanding: {formatCurr(totals.totalOutstandingAmount)}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
