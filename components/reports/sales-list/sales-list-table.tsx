import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { SalesListTableRow, SalesListTotals } from "./types";
import {
  Barcode,
  ChevronRight,
  ChevronDown,
  UnfoldVertical,
  FoldVertical,
  Info,
  Receipt,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Coins,
  Gift,
  Ticket,
  Repeat,
  ShieldAlert,
  Building2,
  Award,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

interface SalesListTableProps {
  rows: SalesListTableRow[];
  grandTotals: SalesListTotals;
  onToggleNode?: (nodeId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

function TenderHoverValue({
  val,
  type,
  row,
  className,
}: {
  val?: number;
  type:
    | "cash"
    | "cashReturn"
    | "card"
    | "creditSale"
    | "giftVoucher"
    | "creditVoucher"
    | "exchangeVoucher"
    | "claimVoucher"
    | "corporateVoucher"
    | "creditIssued"
    | "rewardVoucher"
    | "onCredit";
  row: SalesListTableRow;
  className?: string;
}) {
  if (val === undefined || val === 0) {
    return <span>-</span>;
  }

  const details = row.tenderDetails;
  const formattedVal = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (row.type === "location") {
    return <span className={className}>{formattedVal}</span>;
  }

  let title = "Tender Settlement";
  let icon = <Coins className="h-4 w-4 text-slate-500" />;
  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  let content: React.ReactNode = null;

  if (type === "card") {
    title = "Card Payment Details";
    icon = <CreditCard className="h-4 w-4 text-indigo-500" />;
    badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300";
    const card = details?.card;
    const merchant = card?.merchant || row.merchant || "Bank Card Acquirer";
    const cardholder = card?.cardholderName || "Walk-in Cardholder";
    const last4 = card?.cardLast4 ? `**** ${card.cardLast4}` : "Card on File";
    const authId = card?.authId || "Approved";
    const binNo = card?.binNo;

    content = (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Merchant / Bank</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={merchant}>
              {merchant}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Card Number</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
              {last4}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Cardholder Name</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block" title={cardholder}>
              {cardholder}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Auth ID / Slip #</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
              {authId}
            </span>
          </div>
        </div>
        {binNo && (
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
            <span>BIN Prefix:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{binNo}</span>
          </div>
        )}
      </div>
    );
  } else if (type === "giftVoucher") {
    title = "Gift Voucher Settlement";
    icon = <Gift className="h-4 w-4 text-violet-500" />;
    badgeColor = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300";
    const list = details?.giftVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-violet-700 dark:text-violet-400 block">{v.code}</span>
                {v.description && <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{v.description}</span>}
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Redeemed Gift Voucher at checkout
          </div>
        )}
      </div>
    );
  } else if (type === "exchangeVoucher") {
    title = "Exchange Voucher Settlement";
    icon = <Repeat className="h-4 w-4 text-orange-500" />;
    badgeColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300";
    const list = details?.exchangeVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-orange-700 dark:text-orange-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">Return Exchange Voucher</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Exchange Voucher redeemed against return
          </div>
        )}
      </div>
    );
  } else if (type === "claimVoucher") {
    title = "Claim Voucher Settlement";
    icon = <ShieldAlert className="h-4 w-4 text-amber-500" />;
    badgeColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300";
    const list = details?.claimVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-amber-700 dark:text-amber-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">Warranty Claim Voucher</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Claim voucher redeemed at counter
          </div>
        )}
      </div>
    );
  } else if (type === "corporateVoucher") {
    title = "Corporate Gift Voucher";
    icon = <Building2 className="h-4 w-4 text-purple-500" />;
    badgeColor = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300";
    const list = details?.corporateVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{v.companyName || "Corporate Account"}</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Corporate institutional gift voucher
          </div>
        )}
      </div>
    );
  } else if (type === "creditVoucher") {
    title = "Credit Voucher / Note";
    icon = <Ticket className="h-4 w-4 text-blue-500" />;
    badgeColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
    const list = details?.creditVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-blue-700 dark:text-blue-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">Customer Credit Note</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Store credit voucher redeemed
          </div>
        )}
      </div>
    );
  } else if (type === "rewardVoucher") {
    title = "Reward Voucher / Loyalty";
    icon = <Award className="h-4 w-4 text-emerald-500" />;
    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300";
    const list = details?.rewardVouchers || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-emerald-700 dark:text-emerald-400 block">{v.code || "Reward Voucher"}</span>
                {v.remarks && <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{v.remarks}</span>}
              </div>
              <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Loyalty reward voucher points redeemed
          </div>
        )}
      </div>
    );
  } else if (type === "creditSale" || type === "onCredit") {
    title = "Credit Sale Account Details";
    icon = <UserCheck className="h-4 w-4 text-sky-500" />;
    badgeColor = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300";
    const cs = details?.creditSale;
    const cust = cs?.customerName || row.customerName || "Customer Account";
    const phone = cs?.customerPhone || row.customerPhone || "-";
    content = (
      <div className="space-y-2 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Customer:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{cust}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Phone:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{phone}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 text-[11px]">
          <span className="text-slate-500">Unpaid Balance / Due:</span>
          <span className="font-mono font-extrabold text-sky-700 dark:text-sky-400">Rs. {formattedVal}</span>
        </div>
      </div>
    );
  } else if (type === "creditIssued") {
    title = "Credit Voucher Issued";
    icon = <Receipt className="h-4 w-4 text-rose-500" />;
    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
    const list = details?.creditIssued || [];
    content = (
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.length > 0 ? (
          list.map((v, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[11px] text-rose-700 dark:text-rose-400 block">{v.code}</span>
                <span className="text-[10px] text-slate-400 block">New Voucher Issued</span>
              </div>
              <span className="font-mono font-extrabold text-xs text-rose-800 dark:text-rose-200">
                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <div className="p-2 text-center text-slate-500 text-[11px]">
            Issued Credit Voucher balance
          </div>
        )}
      </div>
    );
  } else if (type === "cashReturn") {
    title = "Cash Return / Refund";
    icon = <Undo2 className="h-4 w-4 text-rose-500" />;
    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
    content = (
      <div className="space-y-1.5 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500">Refund Amount:</span>
          <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400">Rs. {formattedVal}</span>
        </div>
        <p className="text-[10px] text-slate-400 px-1">Cash returned directly to customer at register</p>
      </div>
    );
  } else if (type === "cash") {
    title = "Cash Payment";
    icon = <Coins className="h-4 w-4 text-teal-500" />;
    badgeColor = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300";
    content = (
      <div className="space-y-1.5 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Tender:</span>
            <span className="font-bold text-teal-700 dark:text-teal-400">Physical Cash</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Cashier:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{row.cashierName || "Counter"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-slate-500">Collected:</span>
          <span className="font-mono font-extrabold text-teal-800 dark:text-teal-300">Rs. {formattedVal}</span>
        </div>
      </div>
    );
  }

  return (
    <HoverCard openDelay={100} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "cursor-pointer font-mono font-bold transition-all duration-150 inline-flex items-center gap-1 group/tender hover:opacity-85 select-none",
            className
          )}
        >
          <span className="underline decoration-dotted underline-offset-3 decoration-slate-300 dark:decoration-slate-600 group-hover/tender:decoration-current">
            {formattedVal}
          </span>
          <span className="w-1 h-1 rounded-full bg-current opacity-60 group-hover/tender:scale-125 transition-transform" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        side="top"
        sideOffset={6}
        className="w-72 p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 text-xs"
      >
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg border", badgeColor)}>
              {icon}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block leading-tight">
                {title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {row.orderNumber ? `Order: ${row.orderNumber}` : "Invoice Tender"}
              </span>
            </div>
          </div>
          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-slate-100">
            Rs. {formattedVal}
          </span>
        </div>
        <div className="p-3">{content}</div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function SalesListTable({
  rows,
  grandTotals,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
}: SalesListTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatVal = (val?: number) =>
    val === undefined || val === 0 ? "-" : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-2.5">
      {/* Expand / Collapse Controls */}
      <div className="flex items-center justify-between px-1 no-print">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{rows.length.toLocaleString()}</span> sales hierarchy rows
        </span>
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
      </div>

      {/* Clean Minimalist Matrix Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden no-print">
        <div ref={parentRef} className="overflow-auto max-h-[700px] relative">
          <table className="w-full text-left border-collapse min-w-[3200px] text-xs">
            {/* Clean Light-Themed Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs">
              <tr>
                <th className="py-3 px-3.5 w-[280px] shrink-0 border-r border-slate-200 dark:border-slate-700">
                  Location / Invoice # / Item Description
                </th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Date & Time</th>
                <th className="py-3 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700">Customer</th>
                <th className="py-3 px-3 w-[100px] shrink-0 border-r border-slate-200 dark:border-slate-700">Cashier</th>
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Payment Mode</th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">Merchant</th>
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700">FBR Inv #</th>
                <th className="py-3 px-3 w-[110px] shrink-0 border-r border-slate-200 dark:border-slate-700">SKU / Barcode</th>
                <th className="py-3 px-3 w-[65px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Size</th>
                <th className="py-3 px-3 w-[75px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-center">Color</th>

                {/* Qty */}
                <th className="py-3 px-3 w-[70px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Total items sold on invoice.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Gross Amount */}
                <th className="py-3 px-3 w-[105px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Amt</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Gross price before discounts.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Discount */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-amber-600 dark:text-amber-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Discount</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-amber-600 hover:text-amber-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Promotions, coupons, or cart discount applied.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Taxes */}
                <th className="py-3 px-3 w-[95px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Taxes</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Sales tax / FBR tax collected.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* Net Sales Amount */}
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Sales</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-emerald-600 hover:text-emerald-800">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-[11px] font-medium bg-slate-900 text-slate-100">
                        Final collected revenue (Gross - Discount + Taxes).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>

                {/* 1. Cash Sale */}
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                  Cash Sale
                </th>

                {/* 2. Cash Return */}
                <th className="py-3 px-3 w-[120px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                  Cash Return
                </th>

                {/* 3. Card Sale */}
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                  Card Sale
                </th>

                {/* 4. Credit Sale */}
                <th className="py-3 px-3 w-[115px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                  Credit Sale
                </th>

                {/* 5. Gift Voucher Amount */}
                <th className="py-3 px-3 w-[135px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-violet-700 dark:text-violet-400 whitespace-nowrap">
                  Gift Voucher
                </th>

                {/* 6. Credit Voucher Amount */}
                <th className="py-3 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                  Credit Voucher
                </th>

                {/* 7. Exchange Voucher Amount */}
                <th className="py-3 px-3 w-[155px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                  Exchange Voucher
                </th>

                {/* 8. Claim Voucher Amount */}
                <th className="py-3 px-3 w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                  Claim Voucher
                </th>

                {/* 9. Gift Voucher Amount Corporate */}
                <th className="py-3 px-3 w-[170px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                  Corporate Voucher
                </th>

                {/* 10. Credit Voucher Issued Amount */}
                <th className="py-3 px-3 w-[165px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                  Credit Issued
                </th>

                {/* 11. Reward Voucher Amount */}
                <th className="py-3 px-3 w-[150px] shrink-0 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  Reward Voucher
                </th>

                {/* 12. On Credit Amount */}
                <th className="py-3 px-3.5 w-[130px] shrink-0 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  On Credit
                </th>
              </tr>
            </thead>

            {/* Clean Light-Themed Body */}
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={27} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={27} className="p-14 text-center text-muted-foreground font-medium text-xs">
                    No sales invoices found matching the selected store, cashier, or date range filters.
                  </td>
                </tr>
              ) : (
                virtualItems.map((virtualRow) => {
                  const item = rows[virtualRow.index];
                  if (!item) return null;

                  const isLocation = item.type === "location";
                  const isInvoice = item.type === "invoice";
                  const isItem = item.type === "item";

                  const t = item.totals;

                  const depthIndentClass =
                    item.depth === 1 ? "pl-6 font-semibold" :
                    item.depth === 2 ? "pl-10 text-muted-foreground text-[11px]" :
                    "font-bold text-slate-800 dark:text-slate-200";

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
                        isLocation ? "bg-slate-100/80 dark:bg-slate-800/80 font-bold hover:bg-slate-200/60 dark:hover:bg-slate-800" :
                        isInvoice ? "bg-slate-50/50 dark:bg-slate-900/40 font-semibold hover:bg-slate-100/60 dark:hover:bg-slate-800/40" :
                        "hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {/* Label with Expand / Collapse Chevron */}
                      <td className={cn("py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800/60 truncate", depthIndentClass)}>
                        <div className="flex items-center gap-2">
                          {item.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.nodeId && onToggleNode) onToggleNode(item.nodeId);
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

                          {isInvoice ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                              <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                              <span>{item.orderNumber}</span>
                            </div>
                          ) : isItem ? (
                            <span className="truncate">{item.description}</span>
                          ) : (
                            <span className="truncate font-extrabold">{item.label}</span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "-"}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium truncate">
                        {item.customerName ? `${item.customerName} (${item.customerPhone})` : "-"}
                      </td>

                      {/* Cashier */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium">
                        {item.cashierName || "-"}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono font-semibold">
                        {item.paymentMethod ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px]",
                            item.paymentMethod.includes("CASH") ? "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300" :
                            item.paymentMethod.includes("CARD") ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300" :
                            "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                          )}>
                            {item.paymentMethod}
                          </span>
                        ) : "-"}
                      </td>

                      {/* Merchant */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={item.merchant}>
                        {isInvoice ? item.merchant || "-" : "-"}
                      </td>

                      {/* FBR Inv # */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        {item.fbrInvoiceNumber || "-"}
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                        {isItem ? item.barCode || item.sku || "-" : "-"}
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-medium">
                        {isItem ? item.sizeName || "N/A" : "-"}
                      </td>

                      {/* Color */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center">
                        {isItem ? item.colorName || "N/A" : "-"}
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-semibold">
                        {isItem ? item.quantity : t.totalItems.toLocaleString()}
                      </td>

                      {/* Gross Amt */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatVal(t.grossAmount)}
                      </td>

                      {/* Discount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatVal(t.discountAmount)}
                      </td>

                      {/* Taxes */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatVal(t.taxAmount)}
                      </td>

                      {/* Net Sales */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVal(t.netAmount)}
                      </td>

                      {/* 1. CashSale */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                        <TenderHoverValue val={t.cashSale} type="cash" row={item} className="text-teal-700 dark:text-teal-400" />
                      </td>

                      {/* 2. CashRetrun */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        <TenderHoverValue val={t.cashReturn} type="cashReturn" row={item} className="text-rose-600 dark:text-rose-400" />
                      </td>

                      {/* 3. CardSale */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        <TenderHoverValue val={t.cardSale} type="card" row={item} className="text-indigo-700 dark:text-indigo-400" />
                      </td>

                      {/* 4. CreditSale */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                        <TenderHoverValue val={t.creditSale} type="creditSale" row={item} className="text-sky-700 dark:text-sky-400" />
                      </td>

                      {/* 5. GiftVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        <TenderHoverValue val={t.giftVoucherAmount} type="giftVoucher" row={item} className="text-violet-700 dark:text-violet-400" />
                      </td>

                      {/* 6. CreditVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        <TenderHoverValue val={t.creditVoucherAmount} type="creditVoucher" row={item} className="text-blue-700 dark:text-blue-400" />
                      </td>

                      {/* 7. ExchangeVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        <TenderHoverValue val={t.exchangeVoucherAmount} type="exchangeVoucher" row={item} className="text-orange-700 dark:text-orange-400" />
                      </td>

                      {/* 8. ClaimVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        <TenderHoverValue val={t.claimVoucherAmount} type="claimVoucher" row={item} className="text-amber-700 dark:text-amber-400" />
                      </td>

                      {/* 9. GiftVoucherAmount_Corporate */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        <TenderHoverValue val={t.giftVoucherCorporate} type="corporateVoucher" row={item} className="text-purple-700 dark:text-purple-400" />
                      </td>

                      {/* 10. CreditVoucherIssuedAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-rose-700 dark:text-rose-400 font-bold">
                        <TenderHoverValue val={t.creditVoucherIssuedAmount} type="creditIssued" row={item} className="text-rose-700 dark:text-rose-400" />
                      </td>

                      {/* 11. RewardVoucherAmount */}
                      <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-right font-mono text-slate-700 dark:text-slate-300">
                        <TenderHoverValue val={t.rewardVoucherAmount} type="rewardVoucher" row={item} className="text-emerald-700 dark:text-emerald-400" />
                      </td>

                      {/* 12. OnCreditAmount */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        <TenderHoverValue val={t.onCreditAmount} type="onCredit" row={item} className="text-slate-800 dark:text-slate-200" />
                      </td>
                    </tr>
                  );
                })
              )}

              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={27} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>

            {/* Clean Light-Themed Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase text-[11px] font-mono font-bold shadow-sm border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold" colSpan={10}>
                  GRAND TOTAL (ALL SELECTED SALES INVOICES)
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-900 dark:text-slate-100">
                  {grandTotals.totalItems.toLocaleString()}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.grossAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-amber-600 dark:text-amber-400">
                  {formatVal(grandTotals.discountAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-600 dark:text-slate-400">
                  {formatVal(grandTotals.taxAmount)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatVal(grandTotals.netAmount)}
                </td>
                {/* 1. CashSale */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-teal-700 dark:text-teal-400">
                  {formatVal(grandTotals.cashSale)}
                </td>
                {/* 2. CashRetrun */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-600 dark:text-rose-400">
                  {formatVal(grandTotals.cashReturn)}
                </td>
                {/* 3. CardSale */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-indigo-700 dark:text-indigo-400">
                  {formatVal(grandTotals.cardSale)}
                </td>
                {/* 4. CreditSale */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-sky-700 dark:text-sky-400">
                  {formatVal(grandTotals.creditSale)}
                </td>
                {/* 5. GiftVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.giftVoucherAmount)}
                </td>
                {/* 6. CreditVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.creditVoucherAmount)}
                </td>
                {/* 7. ExchangeVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.exchangeVoucherAmount)}
                </td>
                {/* 8. ClaimVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.claimVoucherAmount)}
                </td>
                {/* 9. GiftVoucherAmount_Corporate */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.giftVoucherCorporate)}
                </td>
                {/* 10. CreditVoucherIssuedAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-rose-700 dark:text-rose-400">
                  {formatVal(grandTotals.creditVoucherIssuedAmount)}
                </td>
                {/* 11. RewardVoucherAmount */}
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono">
                  {formatVal(grandTotals.rewardVoucherAmount)}
                </td>
                {/* 12. OnCreditAmount */}
                <td className="py-3 px-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                  {formatVal(grandTotals.onCreditAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
