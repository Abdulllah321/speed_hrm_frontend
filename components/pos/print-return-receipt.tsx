"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Printer, RotateCcw } from "lucide-react";
import type { PosSettings } from "@/hooks/use-pos-settings";
import { POS_SETTINGS_DEFAULTS } from "@/hooks/use-pos-settings";
import { useAuth } from "@/components/providers/auth-provider";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
}

function fmt(val: number) {
    return val.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(dateStr?: string | null): string {
    const d = dateStr ? new Date(dateStr) : new Date();
    return [
        String(d.getDate()).padStart(2, "0"),
        String(d.getMonth() + 1).padStart(2, "0"),
        d.getFullYear(),
    ].join("-");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReturnReceiptLine {
    name: string;
    sku: string;
    size?: string;
    brand?: string;
    returnQty: number;
    paidPerUnit: number;
    refundAmount: number;
    orderNumber: string;
    unitPrice?: number;
    discountAmount?: number;
    discountPercent?: number;
    taxAmount?: number;
    taxPercent?: number;
    /** Actual refund per unit after price rule */
    refundPerUnit?: number;
    /** True when current price was lower than original */
    priceAdjusted?: boolean;
    /** Original paid per unit before price adjustment */
    originalPaidPerUnit?: number;
    /** Order-level coupon/voucher deduction proportionally allocated to this item */
    couponDeduction?: number;
}

export interface PrintReturnReceiptProps {
    returnRef: string;
    originalOrders: { orderNumber: string; grandTotal: number }[];
    returnedLines: ReturnReceiptLine[];
    refundTotal: number;
    notes?: string;
    discountNotes?: string[];
    returnedAt?: string;
    paymentMethod?: string;
    settings?: Partial<PosSettings>;
    onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function PrintReturnReceipt({
    returnRef,
    originalOrders,
    returnedLines,
    refundTotal,
    notes,
    discountNotes,
    returnedAt,
    paymentMethod,
    settings: settingsOverride,
    onClose,
}: PrintReturnReceiptProps) {
    const settings: PosSettings = { ...POS_SETTINGS_DEFAULTS, ...settingsOverride };
    const { user } = useAuth();

    useEffect(() => {
        if (settings.receiptAutoPrint) {
            const timer = setTimeout(() => window.print(), 400);
            return () => clearTimeout(timer);
        }
    }, [settings.receiptAutoPrint]);

    // ── Store info (same priority as sales receipt) ───────────────────
    const storeName =
        settings.receiptStoreName ||
        user?.terminal?.location?.fbrSellerName ||
        user?.terminal?.location?.name ||
        getCookie("companyName") ||
        "Store";

    const storeAddress = settings.receiptAddress || user?.terminal?.location?.address || "";
    const storePhone   = settings.receiptPhone   || user?.terminal?.location?.phone   || "";
    const storeNTN     = settings.receiptNTN     || user?.terminal?.location?.fbrNtn  || "";
    const storeSTRN    = settings.receiptSTRN    || "";
    const terminalName = user?.terminal?.name    || user?.terminal?.code              || "";

    const cashierName = user ? `${user.firstName} ${user.lastName}`.trim() : "";

    const bodyProps: ReturnBodyProps = {
        storeName, storeAddress, storePhone, storeNTN, storeSTRN, terminalName,
        cashierName, returnRef, originalOrders, returnedLines, refundTotal,
        notes, discountNotes, returnedAt, paymentMethod, settings,
    };

    return (
        <>
            {/* ── Print styles — identical strategy to sales receipt ── */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }

                    #return-print-root,
                    #return-print-root * { visibility: visible !important; }

                    #return-print-root {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        padding: 4mm 3mm !important;
                        background: #fff !important;
                        color: #000 !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        font-size: 9pt !important;
                        line-height: 1.35 !important;
                    }

                    @page { margin: 0; size: 80mm auto; }
                    #return-print-root > div > * { page-break-inside: avoid; break-inside: avoid; }
                }
            `}</style>

            {/* ── Screen: dialog preview ── */}
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="max-w-2xl w-full h-[92vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-destructive" />
                            Return Receipt
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">Review before printing.</p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        <ReturnBody {...bodyProps} />
                    </div>

                    <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
                        <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
                        <Button onClick={() => window.print()} className="flex-1 gap-2">
                            <Printer className="h-4 w-4" /> Print Return Receipt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Print target — off-screen, always rendered ── */}
            <div
                id="return-print-root"
                style={{ position: "fixed", left: "-9999px", top: 0, width: "80mm", pointerEvents: "none" }}
                aria-hidden="true"
            >
                <ReturnBody {...bodyProps} />
            </div>
        </>
    );
}

// ── ReturnBody ────────────────────────────────────────────────────────────────

interface ReturnBodyProps {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeNTN: string;
    storeSTRN: string;
    terminalName: string;
    cashierName: string;
    returnRef: string;
    originalOrders: { orderNumber: string; grandTotal: number }[];
    returnedLines: ReturnReceiptLine[];
    refundTotal: number;
    notes?: string;
    discountNotes?: string[];
    returnedAt?: string;
    paymentMethod?: string;
    settings: PosSettings;
}

function ReturnBody({
    storeName, storeAddress, storePhone, storeNTN, storeSTRN, terminalName,
    cashierName, returnRef, originalOrders, returnedLines, refundTotal,
    notes, discountNotes, returnedAt, paymentMethod, settings,
}: ReturnBodyProps) {

    const Row = ({ label, value, bold = false, indent = false }: {
        label: string; value: string; bold?: boolean; indent?: boolean;
    }) => (
        <div
            className="flex justify-between text-[11px]"
            style={{ paddingLeft: indent ? "12px" : undefined, fontWeight: bold ? "bold" : undefined, display: "flex", justifyContent: "space-between" }}
        >
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );

    const totalUnits = returnedLines.reduce((s, l) => s + l.returnQty, 0);

    return (
        <div className="font-mono text-xs w-full max-w-95 mx-auto space-y-2">

            {/* ── Store Header ── */}
            <div className="text-center space-y-0.5">
                <p className="font-black text-sm leading-tight uppercase tracking-wide">{storeName}</p>
                {(storeAddress || storePhone) && (
                    <p className="text-[11px] leading-snug">
                        {storeAddress}{storeAddress && storePhone ? " | " : ""}{storePhone}
                    </p>
                )}
            </div>

            <Separator />

            {/* ── Return Invoice Title ── */}
            <div className="text-center space-y-0.5">
                <p className="font-bold text-sm tracking-widest uppercase">Return Invoice</p>
                <p className="font-black text-2xl tracking-wider">*{fmt(refundTotal)}*</p>
            </div>

            <Separator />

            {/* ── Receipt meta ── */}
            <div className="space-y-0.5 text-[11px]">
                <Row label="Return Ref."  value={returnRef} bold />
                <Row label="Date"         value={fmtDate(returnedAt)} />
                {cashierName  && <Row label="Processed By" value={cashierName}  />}
                {terminalName && <Row label="Terminal"     value={terminalName} />}
            </div>

            <Separator />

            {/* ── Original order(s) ── */}
            <div className="space-y-0.5 text-[11px]">
                <p className="font-bold">Original Receipt{originalOrders.length > 1 ? "s" : ""}:</p>
                {originalOrders.map(o => (
                    <Row key={o.orderNumber} label={o.orderNumber} value={`Rs. ${fmt(o.grandTotal)}`} indent />
                ))}
            </div>

            <Separator />

            {/* ── Column headers ── */}
            <div
                className="text-[10px] font-bold border-b pb-1"
                style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr 0.9fr", gap: "0 4px" }}
            >
                <span>Name / Code</span>
                <span style={{ textAlign: "center" }}>Size</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Refund</span>
            </div>

            {/* ── Returned item lines ── */}
            {returnedLines.map((line, idx) => {
                const qty          = line.returnQty;
                const unitPrice    = line.unitPrice ?? line.paidPerUnit;
                const lineSubtotal = unitPrice * qty;
                const discAmt      = line.discountAmount  ?? 0;
                const discPct      = line.discountPercent ?? 0;
                const taxAmt       = line.taxAmount  ?? 0;
                const taxPct       = line.taxPercent ?? 0;
                const couponDed    = line.couponDeduction ?? 0;
                const refundPerUnit = line.refundPerUnit ?? line.paidPerUnit;
                const lineRefund   = refundPerUnit * qty;
                const afterDiscount = lineSubtotal - discAmt;
                const afterTax      = afterDiscount + taxAmt;
                const afterCoupon   = afterTax - couponDed;
                const uniqueNo      = line.sku || "—";

                return (
                    <div key={idx} className="pb-2 border-b border-dashed last:border-0">

                        {/* Item name — full width bold */}
                        <p className="font-bold text-[11px] leading-tight mb-0.5">{line.name}</p>

                        {/* Data row */}
                        <div
                            className="text-[11px]"
                            style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr 0.9fr", gap: "0 4px" }}
                        >
                            <span className="truncate" style={{ color: "gray" }}>{uniqueNo}</span>
                            <span style={{ textAlign: "center" }}>{line.size || "—"}</span>
                            <span style={{ textAlign: "center", fontWeight: "bold" }}>{qty}</span>
                            <span style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(lineRefund)}</span>
                        </div>

                        {/* FBR-style breakdown */}
                        <div className="mt-1 space-y-0.5 text-[10px]">
                            <Row label="Unit Price"           value={fmt(unitPrice)} />
                            <Row label="Qty × Unit Price"     value={fmt(lineSubtotal)} />
                            {discAmt > 0 && (
                                <>
                                    <Row label={`Discount${discPct ? ` (${discPct}%)` : ""}`} value={`−${fmt(discAmt)}`} />
                                    <Row label="Amount after Discount" value={fmt(afterDiscount)} />
                                </>
                            )}
                            {taxAmt > 0 && (
                                <>
                                    <Row label={`Sales Tax${taxPct ? ` (${taxPct}%)` : ""}`} value={fmt(taxAmt)} />
                                    <Row label="Amount after Tax" value={fmt(afterTax)} />
                                </>
                            )}
                            {couponDed > 0 && (
                                <>
                                    <Row label="Coupon / Voucher" value={`−${fmt(couponDed)}`} />
                                    <Row label="After Coupon"     value={fmt(afterCoupon)} />
                                </>
                            )}
                            {line.priceAdjusted && (
                                <p className="text-[10px]">* Refunded at current lower price</p>
                            )}
                            <div
                                className="font-bold border-t border-dashed pt-0.5 mt-0.5"
                                style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}
                            >
                                <span>Line Refund</span>
                                <span>{fmt(lineRefund)}</span>
                            </div>
                        </div>

                        {/* Show source order if multi-order return */}
                        {originalOrders.length > 1 && (
                            <p className="text-[10px] mt-0.5" style={{ color: "gray" }}>
                                From: {line.orderNumber}
                            </p>
                        )}
                    </div>
                );
            })}

            <Separator />

            {/* ── Totals ── */}
            <div className="space-y-0.5 text-[11px]">
                <Row label="Items Returned" value={`${totalUnits} unit${totalUnits !== 1 ? "s" : ""}`} />
                {paymentMethod && (
                    <Row label="Refund Via" value={paymentMethod.replace(/_/g, " ")} />
                )}
                <div
                    className="font-black text-sm border-t pt-0.5 mt-0.5"
                    style={{ display: "flex", justifyContent: "space-between", fontWeight: "900" }}
                >
                    <span>Total Refund</span>
                    <span>Rs. {fmt(refundTotal)}</span>
                </div>
            </div>

            {/* ── Coupon / voucher restored ── */}
            {discountNotes && discountNotes.length > 0 && (
                <>
                    <Separator />
                    <div className="text-[10px] space-y-0.5 border border-dashed rounded px-2 py-1.5">
                        <p className="font-bold text-[11px]">Coupon / Voucher Returned:</p>
                        {discountNotes.map((note, i) => (
                            <p key={i} style={{ paddingLeft: "8px" }}>{note}</p>
                        ))}
                        <p style={{ color: "gray", marginTop: "2px" }}>
                            * Code restored and can be reused.
                        </p>
                    </div>
                </>
            )}

            {/* ── Notes ── */}
            {notes && (
                <>
                    <Separator />
                    <div className="text-[10px] space-y-0.5">
                        <p className="font-bold">Notes:</p>
                        <p style={{ paddingLeft: "8px" }}>{notes}</p>
                    </div>
                </>
            )}

            <Separator />

            {/* ── FBR Logo (no QR on return — no FBR invoice number) ── */}
            <div
                className="flex items-center gap-3"
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
            >
                <div style={{ flexShrink: 0 }}>
                    <Image
                        src="/fbr_logo.png"
                        alt="FBR POS Invoicing System"
                        width={48}
                        height={48}
                        className="object-contain"
                        unoptimized
                    />
                </div>
                <p style={{ flex: 1, fontSize: "9pt", lineHeight: 1.3 }}>
                    This return is processed against an FBR verified Sales Tax Invoice.
                    Original invoice remains on record.
                </p>
            </div>

            <Separator />

            {/* ── Terms ── */}
            <div className="text-[10px] space-y-0.5">
                <p className="font-bold text-[11px]">TERMS &amp; CONDITIONS OF SALE</p>
                <p>No Refund.</p>
                <p>Exchanges on unused products within 10 days only from the outlet where purchased.</p>
                <p>Claim will not be accepted without Sales Tax Invoice.</p>
                <p>Sales and promotional items are strictly non-exchangeable.</p>
                <p>Item purchases at full price which go on sale will be exchanged at the marked down price.</p>
            </div>

            <Separator />

            {/* ── Footer ── */}
            <div className="text-center text-[10px] space-y-0.5 pb-1">
                {storeNTN  && <p>Sales Tax No.: {storeNTN}</p>}
                {storeSTRN && <p>NTN: {storeSTRN}</p>}
                <p>{settings.receiptFooter || "*** THANK YOU ***"}</p>
                <p className="tracking-widest font-bold">{returnRef}</p>
            </div>

        </div>
    );
}
