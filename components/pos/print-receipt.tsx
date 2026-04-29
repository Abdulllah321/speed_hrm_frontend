"use client";

import { useEffect } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import type { CartItem } from "@/components/pos/new-sale/cart-table";
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

interface Tender { method: string; amount: number; cardLast4?: string; slipNo?: string; }

interface PrintReceiptProps {
    order: any;
    cartItems?: CartItem[];
    tenders: Tender[];
    discountMode?: string;
    selectedPromo?: any;
    appliedCoupon?: any;
    selectedAlliance?: any;
    settings?: Partial<PosSettings>;
    onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function PrintReceipt({
    order,
    cartItems: propCartItems,
    tenders,
    discountMode,
    selectedPromo,
    appliedCoupon,
    selectedAlliance,
    settings: settingsOverride,
    onClose,
}: PrintReceiptProps) {
    const settings: PosSettings = { ...POS_SETTINGS_DEFAULTS, ...settingsOverride };
    const { user } = useAuth();
    const isGiftReceipt = order?.isGiftReceipt || false;

    useEffect(() => {
        if (settings.receiptAutoPrint) {
            const timer = setTimeout(() => window.print(), 400);
            return () => clearTimeout(timer);
        }
    }, [settings.receiptAutoPrint]);

    // ── Store info ────────────────────────────────────────────────────
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

    const cashierName =
        order?.cashierName ||
        order?.cashier?.name ||
        order?.cashierUser?.name ||
        (user ? `${user.firstName} ${user.lastName}`.trim() : "");

    // ── Normalise items ───────────────────────────────────────────────
    const items: any[] = propCartItems?.length
        ? propCartItems
        : (order?.items ?? []).map((oi: any) => ({
            id:              oi.id,
            name:            oi.item?.description || oi.item?.sku || "Item",
            sku:             oi.item?.sku   || "",
            upc:             oi.item?.upc   || oi.upc  || "",
            size:            oi.item?.size  || oi.size || "",
            price:           Number(oi.unitPrice),
            quantity:        Number(oi.quantity),
            discountPercent: Number(oi.discountPercent ?? 0),
            discountAmount:  Number(oi.discountAmount  ?? 0),
            taxPercent:      Number(oi.taxPercent  ?? 0),
            taxAmount:       Number(oi.taxAmount   ?? 0),
        }));

    // ── Totals ────────────────────────────────────────────────────────
    const subtotal        = Number(order?.subtotal ?? 0) || items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalTax        = Number(order?.taxAmount ?? 0) || items.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
    const orderDiscount   = Number(order?.globalDiscountAmount ?? 0);
    const totalDiscount   = items.reduce((s, i) => s + (i.discountAmount ?? 0), 0) + orderDiscount;
    const valueForSales   = subtotal - totalDiscount;
    const grandTotal      = Number(order?.grandTotal ?? 0) || (valueForSales + totalTax);
    const fbrPosFee       = Number(order?.fbrPosFee ?? 0);
    const finalGrandTotal = grandTotal + fbrPosFee;
    const changeAmount    = Number(order?.changeAmount ?? 0);
    const totalPaid       = tenders.reduce((s, t) => s + t.amount, 0);

    const orderDiscountLabel = (() => {
        if (discountMode === "promo")    return `Promo: ${selectedPromo?.code    ?? order?.promo?.code    ?? ""}`;
        if (discountMode === "coupon")   return `Coupon: ${appliedCoupon?.code   ?? order?.coupon?.code   ?? ""}`;
        if (discountMode === "alliance") return `Alliance: ${selectedAlliance?.code ?? order?.alliance?.code ?? ""}`;
        if (discountMode === "manual")   return "Manual Discount";
        if (order?.promo?.code)    return `Promo: ${order.promo.code}`;
        if (order?.coupon?.code)   return `Coupon: ${order.coupon.code}`;
        if (order?.alliance?.code) return `Alliance: ${order.alliance.code}`;
        return "Order Discount";
    })();

    const fbrVerifyUrl = order?.fbrInvoiceUrl ||
        `https://taxasaan.fbr.gov.pk/verify?inv=${encodeURIComponent(order?.orderNumber ?? "")}`;

    const bodyProps: ReceiptBodyProps = {
        isGiftReceipt, storeName, storeAddress, storePhone, storeNTN, storeSTRN,
        terminalName, cashierName, order, items, subtotal, totalTax, orderDiscount,
        totalDiscount, valueForSales, grandTotal, fbrPosFee, finalGrandTotal,
        changeAmount, totalPaid, tenders, orderDiscountLabel, fbrVerifyUrl, settings,
    };

    return (
        <>
            {/* ── Print styles ──────────────────────────────────────────────
                Strategy: hide the entire page, show only #receipt-print-root.
                We avoid setting display:block on everything (breaks grids/flex).
                Instead we let the receipt-print-root subtree render normally
                with its own inline styles that don't rely on Tailwind utilities.
            ─────────────────────────────────────────────────────────────── */}
            <style>{`
                @media print {
                    /* Hide everything */
                    body * { visibility: hidden !important; }

                    /* Show only the receipt */
                    #receipt-print-root,
                    #receipt-print-root * { visibility: visible !important; }

                    /* Move it into the printable area */
                    #receipt-print-root {
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

                    /* Prevent content from being cut across pages */
                    #receipt-print-root > div > * { page-break-inside: avoid; break-inside: avoid; }
                }
            `}</style>

            {/* ── Screen: dialog preview ────────────────────────────────── */}
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="max-w-2xl w-full h-[92vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
                        <DialogTitle>Receipt Preview</DialogTitle>
                        <p className="text-sm text-muted-foreground">Review before printing.</p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        <ReceiptBody {...bodyProps} />
                    </div>

                    <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
                        <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
                        <Button onClick={() => window.print()} className="flex-1 gap-2">
                            <Printer className="h-4 w-4" /> Print Receipt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Print target — off-screen but rendered, visible only on print ── */}
            <div
                id="receipt-print-root"
                style={{ position: "fixed", left: "-9999px", top: 0, width: "80mm", pointerEvents: "none" }}
                aria-hidden="true"
            >
                <ReceiptBody {...bodyProps} />
            </div>
        </>
    );
}

// ── ReceiptBody ───────────────────────────────────────────────────────────────

interface ReceiptBodyProps {
    isGiftReceipt: boolean;
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeNTN: string;
    storeSTRN: string;
    terminalName: string;
    cashierName: string;
    order: any;
    items: any[];
    subtotal: number;
    totalTax: number;
    orderDiscount: number;
    totalDiscount: number;
    valueForSales: number;
    grandTotal: number;
    fbrPosFee: number;
    finalGrandTotal: number;
    changeAmount: number;
    totalPaid: number;
    tenders: Tender[];
    orderDiscountLabel: string;
    fbrVerifyUrl: string;
    settings: PosSettings;
}

function ReceiptBody({
    isGiftReceipt, storeName, storeAddress, storePhone, storeNTN, storeSTRN,
    terminalName, cashierName, order, items, subtotal, totalTax, orderDiscount,
    totalDiscount, valueForSales, grandTotal, fbrPosFee, finalGrandTotal,
    changeAmount, totalPaid, tenders, orderDiscountLabel, fbrVerifyUrl, settings,
}: ReceiptBodyProps) {

    // Shared row: label left, value right
    const Row = ({ label, value, bold = false, indent = false }: {
        label: string; value: string; bold?: boolean; indent?: boolean;
    }) => (
        <div
            className="rpt-flex flex justify-between text-[11px]"
            style={{ paddingLeft: indent ? "12px" : undefined, fontWeight: bold ? "bold" : undefined }}
        >
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );

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

            {/* ── Invoice Title ── */}
            {!isGiftReceipt ? (
                <div className="text-center space-y-0.5">
                    <p className="font-bold text-sm tracking-widest uppercase">Sales Tax Invoice</p>
                    <p className="font-black text-2xl tracking-wider">*{fmt(finalGrandTotal)}*</p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="font-bold text-sm tracking-widest uppercase">Gift Receipt</p>
                </div>
            )}

            <Separator />

            {/* ── Receipt meta ── */}
            <div className="space-y-0.5 text-[11px]">
                <Row label="Receipt No." value={order?.orderNumber ?? ""} bold />
                <Row label="Date"        value={fmtDate(order?.createdAt)} />
                {cashierName  && <Row label="Sales By" value={cashierName}  />}
                {terminalName && <Row label="Terminal" value={terminalName} />}
            </div>

            <Separator />

            {/* ── Column headers ── */}
            {!isGiftReceipt ? (
                <div
                    className="rpt-grid-hdr text-[10px] font-bold border-b pb-1"
                    style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr 0.8fr 0.8fr 0.8fr", gap: "0 4px" }}
                >
                    <span>Name / Code</span>
                    <span style={{ textAlign: "center" }}>Size</span>
                    <span style={{ textAlign: "center" }}>Qty</span>
                    <span style={{ textAlign: "right" }}>Retail</span>
                    <span style={{ textAlign: "right" }}>WOST</span>
                    <span style={{ textAlign: "right" }}>Total</span>
                </div>
            ) : (
                <div
                    className="rpt-grid-hdr-g text-[10px] font-bold border-b pb-1"
                    style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr", gap: "0 4px" }}
                >
                    <span>Name / Code</span>
                    <span style={{ textAlign: "center" }}>Size</span>
                    <span style={{ textAlign: "center" }}>Qty</span>
                </div>
            )}

            {/* ── Item lines ── */}
            {items.map((item: any, idx: number) => {
                const wostPerUnit  = item.price;
                const disc         = item.discountAmount  ?? 0;
                const discPct      = item.discountPercent ?? 0;
                const tax          = item.taxAmount  ?? 0;
                const taxPct       = item.taxPercent ?? 0;
                const taxPerUnit   = item.quantity > 0 ? tax / item.quantity : 0;
                const retailPrice  = wostPerUnit + taxPerUnit;
                const amtAfterDisc = (wostPerUnit * item.quantity) - disc;
                const valueInclTax = amtAfterDisc + tax;
                const uniqueNo     = item.sku || item.upc || "—";

                return (
                    <div key={item.id ?? idx} className="pb-2 border-b border-dashed last:border-0">

                        {/* Item name */}
                        <p className="font-bold text-[11px] leading-tight mb-0.5">{item.name}</p>

                        {/* Data row */}
                        {!isGiftReceipt ? (
                            <div
                                className="rpt-grid-item text-[11px]"
                                style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr 0.8fr 0.8fr 0.8fr", gap: "0 4px" }}
                            >
                                <span className="text-muted-foreground truncate">{uniqueNo}</span>
                                <span style={{ textAlign: "center" }}>{item.size || "—"}</span>
                                <span style={{ textAlign: "center", fontWeight: "bold" }}>{item.quantity}</span>
                                <span style={{ textAlign: "right" }}>{fmt(retailPrice)}</span>
                                <span style={{ textAlign: "right" }}>{fmt(wostPerUnit)}</span>
                                <span style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(valueInclTax)}</span>
                            </div>
                        ) : (
                            <div
                                className="rpt-grid-gift text-[11px]"
                                style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr", gap: "0 4px" }}
                            >
                                <span className="text-muted-foreground truncate">{uniqueNo}</span>
                                <span style={{ textAlign: "center" }}>{item.size || "—"}</span>
                                <span style={{ textAlign: "center", fontWeight: "bold" }}>{item.quantity}</span>
                            </div>
                        )}

                        {/* FBR breakdown */}
                        {!isGiftReceipt && (
                            <div className="mt-1 space-y-0.5 text-[10px]">
                                <Row label="Discount %"             value={`${discPct}%`} />
                                <Row label="Discount Amount"        value={disc > 0 ? fmt(disc) : "—"} />
                                <Row label="Amount after Discount"  value={fmt(amtAfterDisc)} />
                                <Row label="Sales Tax Rate"         value={`${taxPct}%`} />
                                <Row label="Sales Tax Amount"       value={tax > 0 ? fmt(tax) : "—"} />
                                <div
                                    className="rpt-fbr-row flex justify-between font-bold text-[10px] border-t border-dashed pt-0.5 mt-0.5"
                                    style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}
                                >
                                    <span>Value Including Sales Tax</span>
                                    <span>{fmt(valueInclTax)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <Separator />

            {/* ── Summary totals ── */}
            {!isGiftReceipt ? (
                <div className="space-y-0.5 text-[11px]">
                    <Row label={`Total Value Excl. Sales Tax (${items.length})`} value={fmt(subtotal)} />
                    <Row label="Total Discount"  value={totalDiscount > 0 ? fmt(totalDiscount) : "—"} />
                    {orderDiscount > 0 && (
                        <Row label={orderDiscountLabel} value={`−${fmt(orderDiscount)}`} indent />
                    )}
                    <Row label="Value for Sales" value={fmt(valueForSales)} />
                    {settings.receiptShowTax && (
                        <Row label="Total Sales Tax" value={fmt(totalTax)} />
                    )}
                    <div
                        className="rpt-flex flex justify-between font-bold text-[11px] border-t pt-0.5 mt-0.5"
                        style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}
                    >
                        <span>Total Value Incl. Sales Tax</span>
                        <span>{fmt(grandTotal)}</span>
                    </div>
                    {fbrPosFee > 0 && (
                        <Row label="FBR POS Fee" value={fmt(fbrPosFee)} />
                    )}
                    <div
                        className="rpt-flex flex justify-between font-black text-sm border-t pt-0.5 mt-0.5"
                        style={{ display: "flex", justifyContent: "space-between", fontWeight: "900" }}
                    >
                        <span>Grand Total</span>
                        <span>{fmt(finalGrandTotal)}</span>
                    </div>
                </div>
            ) : (
                <p className="text-center text-[11px] py-2">
                    Price information not included — this is a gift for you.
                </p>
            )}

            <Separator />

            {/* ── Payment breakdown ── */}
            {!isGiftReceipt && (
                <div className="space-y-0.5 text-[11px]">
                    {tenders.map((t, i) => (
                        <div
                            key={i}
                            className="rpt-flex flex justify-between"
                            style={{ display: "flex", justifyContent: "space-between" }}
                        >
                            <span className="capitalize">
                                {t.method.replace(/_/g, " ")}
                                {t.cardLast4 ? ` ••••${t.cardLast4}` : ""}
                                {t.slipNo ? (t.method === "voucher" ? ` #${t.slipNo}` : ` (${t.slipNo})`) : ""}
                            </span>
                            <span className="font-semibold">{fmt(t.amount)}</span>
                        </div>
                    ))}
                    {totalPaid > 0 && totalPaid !== finalGrandTotal && (
                        <Row label="Total Paid" value={fmt(totalPaid)} />
                    )}
                    {changeAmount > 0 && (
                        <Row label="Change" value={fmt(changeAmount)} bold />
                    )}
                </div>
            )}

            <Separator />

            {/* ── FBR Logo + QR ── */}
            {!isGiftReceipt && (
                <div
                    className="flex items-center gap-3"
                    style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                    <div className="rpt-img shrink-0" style={{ flexShrink: 0 }}>
                        <Image
                            src="/fbr_logo.png"
                            alt="FBR POS Invoicing System"
                            width={52}
                            height={52}
                            className="object-contain"
                            unoptimized
                        />
                    </div>

                    <p className="flex-1 text-[10px] leading-snug" style={{ flex: 1, fontSize: "9pt", lineHeight: 1.3 }}>
                        This Receipt / Invoice is verified by FBR POS Invoicing System.
                        Verify through FBR Tax Asaan App or SMS at{" "}
                        <strong>9966</strong> and win exciting prizes in draw.
                    </p>

                    <div className="shrink-0 flex flex-col items-center gap-0.5" style={{ flexShrink: 0, textAlign: "center" }}>
                        <QRCodeSVG value={fbrVerifyUrl} size={58} level="M" />
                        <p className="text-[9px]" style={{ fontSize: "8pt", marginTop: "2px" }}>Scan to verify</p>
                    </div>
                </div>
            )}

            <Separator />

            {/* ── Terms & Conditions ── */}
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
                <p>{settings.receiptFooter || "*** THANK YOU FOR SHOPPING ***"}</p>
                <p className="tracking-widest font-bold">{order?.orderNumber}</p>
            </div>

        </div>
    );
}
