"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Printer, Receipt, Loader2, FileSpreadsheet, Download, FileText } from "lucide-react";
import type { CartItem } from "@/components/pos/new-sale/cart-table";
import type { PosSettings } from "@/hooks/use-pos-settings";
import { POS_SETTINGS_DEFAULTS } from "@/hooks/use-pos-settings";
import { useAuth } from "@/components/providers/auth-provider";
import { COMPANY_NAME, cn } from "@/lib/utils";
import { printThermal } from "@/lib/utils/print";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { toast } from "sonner";

// ── Barcode helper ───────────────────────────────────────────────────────────

function BarcodeImg({ value, height = 36, fontSize = 9, displayValue = true }: { value: string; height?: number; fontSize?: number; displayValue?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  const render = useCallback(() => {
    if (!canvasRef.current || !value) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const JsBarcode = require("jsbarcode");
      JsBarcode(canvasRef.current, value, {
        format: "CODE128",
        width: 1.5,
        height,
        displayValue,
        fontSize,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
        textAlign: "center",
        font: "monospace",
      });
      setDataUrl(canvasRef.current.toDataURL("image/png"));
    } catch {
      // jsbarcode not available (SSR) — ignore
    }
  }, [value, height, fontSize, displayValue]);

  useEffect(() => {
    render();
  }, [render]);

  if (!value) return null;

  return (
    <div style={{ textAlign: "center", lineHeight: 0, marginTop: 4, marginBottom: 2 }}>
      {/* Hidden canvas used to generate the barcode PNG */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {/* Rendered as <img> so it survives html-to-image / print snapshots */}
      {dataUrl && (
        <img
          src={dataUrl}
          alt={`Barcode: ${value}`}
          style={{ maxWidth: "100%", height: `${height + fontSize + 10}px`, objectFit: "contain" }}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
  return "";
}

function fmt(val: number) {
  return val.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDec(val: number) {
  return Math.round(val).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDate(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("-");
}

function fmtTime(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Tender {
  method: string;
  amount: number;
  cardLast4?: string;
  slipNo?: string;
  voucherFaceValue?: number;
}

interface PrintReceiptProps {
  order: any;
  cartItems?: CartItem[];
  tenders: Tender[];
  discountMode?: string;
  selectedPromo?: any;
  appliedCoupon?: any;
  selectedAlliance?: any;
  settings?: Partial<PosSettings>;
  isLoading?: boolean;
  creditVouchers?: {
    code: string;
    faceValue: number;
    expiresAt: Date | null;
  }[];
  onClose: () => void;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ReceiptSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 select-none">
      {/* Animated receipt illustration */}
      <div className="relative flex flex-col items-center">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150 animate-pulse" />

        {/* Receipt icon with spin */}
        <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
          <Receipt className="h-9 w-9 text-primary animate-pulse" />
        </div>

        {/* Orbiting dot */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-primary shadow-md shadow-primary/40"
            style={{
              top: "50%",
              left: "50%",
              transformOrigin: "0 0",
              animation: "orbit 1.4s linear infinite",
              marginTop: "-5px",
              marginLeft: "-5px",
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <p className="text-base font-bold tracking-tight">Generating Receipt</p>
        <p className="text-sm text-muted-foreground">
          Fetching order details, please wait…
        </p>
      </div>

      {/* Skeleton lines mimicking a receipt */}
      <div className="w-64 space-y-2 opacity-40">
        <div className="h-2.5 bg-muted rounded-full w-3/4 mx-auto animate-pulse" />
        <div className="h-2 bg-muted rounded-full w-1/2 mx-auto animate-pulse delay-75" />
        <div className="h-px bg-border w-full my-3" />
        {[80, 60, 90, 55, 70].map((w, i) => (
          <div
            key={i}
            className="h-2 bg-muted rounded-full animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
        <div className="h-px bg-border w-full my-3" />
        <div className="h-3 bg-muted rounded-full w-2/3 mx-auto animate-pulse" />
      </div>

      <style>{`
                @keyframes orbit {
                    from { transform: rotate(0deg) translateX(44px) rotate(0deg); }
                    to   { transform: rotate(360deg) translateX(44px) rotate(-360deg); }
                }
            `}</style>
    </div>
  );
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
  isLoading = false,
  creditVouchers,
  onClose,
}: PrintReceiptProps) {
  const settings: PosSettings = {
    ...POS_SETTINGS_DEFAULTS,
    ...settingsOverride,
  };
  const { user } = useAuth();
  const isGiftReceipt = order?.isGiftReceipt || false;
  const [mounted, setMounted] = useState(false);

  // Default layout selection to A4 if invoice grand total >= 1,000,000 PKR
  const defaultLayout =
    (Number(order?.grandTotal ?? 0) ||
      Number(order?.items?.reduce((acc: number, item: any) => acc + Number(item.lineTotal ?? 0), 0) ?? 0) ||
      Number(propCartItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0) ?? 0)) >= 1000000
      ? "a4"
      : "thermal";

  const [layout, setLayout] = useState<"thermal" | "a4">(defaultLayout);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && settings.receiptAutoPrint) {
      if (layout === "thermal") {
        const timer = setTimeout(
          () => printThermal("receipt-print-root", settings),
          400,
        );
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, settings.receiptAutoPrint, settings, layout]);

  const handlePrint = () => {
    if (layout === "thermal") {
      printThermal("receipt-print-root", settings);
    } else {
      window.print();
    }
  };

const handleDownloadPdf = async () => {
  if (isLoading) return;
  setIsDownloading(true);
  const toastId = toast.loading("Generating Invoice PDF...");

  try {
    const node = reportRef.current;
    if (!node) {
      toast.error("Failed to capture report content", { id: toastId });
      return;
    }

    // Wait for every <img> inside (e.g. FBR logo) to actually finish loading
    const images = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            })
      )
    );

    // Let the browser settle a couple of paint cycles before snapshotting
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const dataUrl = await htmlToImage.toPng(node, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
      style: {
        position: "relative",
        left: "0",
        top: "0",
      },
    });

    const imgProps = new jsPDF().getImageProperties(dataUrl);
    const pdfWidth = layout === "thermal" ? 80 : 210;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${order?.orderNumber || `invoice-${Date.now()}`}.pdf`);
    toast.success("PDF downloaded successfully", { id: toastId });
  } catch (error) {
    console.error("PDF download error:", error);
    toast.error("An error occurred while downloading the PDF", { id: toastId });
  } finally {
    setIsDownloading(false);
  }
};

  // ── Store info ────────────────────────────────────────────────────
  const storeName =
    settings.receiptStoreName ||
    (typeof user?.terminal?.location?.name === "string"
      ? user.terminal.location.name
      : "") ||
    getCookie("companyName") ||
    "Store";

  const storeAddress =
    settings.receiptAddress ||
    (typeof user?.terminal?.location?.address === "string"
      ? user.terminal.location.address
      : "") ||
    "";
  const storePhone =
    settings.receiptPhone ||
    (typeof user?.terminal?.location?.phone === "string"
      ? user.terminal.location.phone
      : "") ||
    "";
  const storeNTN =
    settings.receiptNTN ||
    (typeof user?.terminal?.location?.fbrNtn === "string"
      ? user.terminal.location.fbrNtn
      : "") ||
    "";
  const storeSTRN = settings.receiptSTRN || "";
  const terminalName =
    (typeof user?.terminal?.name === "string" ? user.terminal.name : "") ||
    (typeof user?.terminal?.code === "string" ? user.terminal.code : "") ||
    "";

  const cashierName =
    order?.cashierName ||
    order?.cashier?.name ||
    order?.cashierUser?.name ||
    (user ? `${user.firstName} ${user.lastName}`.trim() : "");

  // ── Normalise items ───────────────────────────────────────────────
  // Always prefer order.items (from database) over propCartItems (from cart)
  // because order.items has the final calculated values after all discounts
  const items: any[] =
    order?.items && order.items.length > 0
      ? order.items.map((oi: any) => ({
          id: oi.id,
          name: oi.item?.description || oi.item?.sku || "Item",
          sku: oi.item?.sku || "",
          upc: oi.item?.upc || oi.upc || "",
          size:
            typeof oi.item?.size === "object"
              ? oi.item?.size?.name
              : oi.item?.size || oi.size || "",
          price: Number(oi.unitPrice),
          quantity: Number(oi.quantity),
          discountPercent: Number(oi.discountPercent ?? 0),
          overrideDiscountPercent:
            oi.overrideDiscountPercent != null
              ? Number(oi.overrideDiscountPercent)
              : undefined,
          discountAmount: Number(oi.discountAmount ?? 0),
          taxPercent: Number(oi.taxPercent ?? 0),
          taxAmount: Number(oi.taxAmount ?? 0),
          lineTotal: oi.lineTotal != null ? Number(oi.lineTotal) : undefined,
        }))
      : (propCartItems ?? []);

  // ── Totals ────────────────────────────────────────────────────────
  // Subtotal should be sum of WOST (not retail price × quantity)
  // Always calculate from items, don't trust backend subtotal
  const isSavedOrder = !!(order && order.id);

  const subtotal = isSavedOrder
    ? Number(order.subtotal)
    : items.reduce((s, i) => {
        const taxDivisor = 1 + (i.taxPercent ?? 0) / 100;
        const wostPerUnit = i.price / taxDivisor;
        return s + wostPerUnit * i.quantity;
      }, 0);

  const itemDiscountsRaw = items.reduce(
    (s, i) => s + (i.discountAmount ?? 0),
    0,
  );
  const orderDiscount = Number(order?.globalDiscountAmount ?? 0);

  // Order-level discount suppression logic: if alliance OR manual discount is active and >= item discounts, item discounts are zeroed
  // and the order discount is distributed proportionally across items
  const isAlliance =
    discountMode === "alliance" || !!order?.alliance || !!order?.allianceId;
  const isManualDiscount =
    discountMode === "manual" ||
    (!isAlliance && !order?.promo && !order?.coupon && orderDiscount > 0);
  const suppressItemDiscounts =
    (isAlliance || isManualDiscount) &&
    Math.round(orderDiscount) >= Math.round(itemDiscountsRaw) &&
    orderDiscount > 0;
  const suppressLabel = isAlliance ? "Alliance Disc" : "Manual Disc";

  // Always calculate totalTax from items (don't trust backend taxAmount)
  // using the exact same logic as printed per-item sales tax
  const totalTax = isSavedOrder
    ? Number(order.taxAmount)
    : items.reduce((s, i) => {
        const taxPct = i.taxPercent ?? 0;
        const taxDivisor = 1 + taxPct / 100;
        const wostPerUnit = i.price / taxDivisor;
        const totalWost = wostPerUnit * i.quantity;

        const itemDiscPct = i.overrideDiscountPercent ?? i.discountPercent ?? 0;
        const rawDisc = totalWost * (itemDiscPct / 100);

        const disc = suppressItemDiscounts ? 0 : rawDisc;
        let displayDisc = disc;

        if (suppressItemDiscounts && subtotal > 0) {
          displayDisc = Math.min(
            (orderDiscount * totalWost) / subtotal,
            totalWost,
          );
        }

        const amtAfterDisc =
          totalWost - (suppressItemDiscounts ? displayDisc : disc);
        const tax = amtAfterDisc * (taxPct / 100);
        return s + tax;
      }, 0);

  const totalDiscount = isSavedOrder
    ? Number(order.discountAmount)
    : (suppressItemDiscounts ? 0 : itemDiscountsRaw) + orderDiscount;

  const valueForSales = subtotal - totalDiscount;
  const grandTotal = isSavedOrder
    ? Number(order.grandTotal)
    : valueForSales + totalTax;

  const hasFbrInfo = !!(
    (user?.terminal?.location?.fbrEnabled &&
      (user?.terminal?.location?.fbrNtn || settings.receiptNTN)) ||
    order?.fbrInvoiceNumber
  );

  const fbrPosFee = hasFbrInfo ? (Number(order?.fbrPosFee ?? 0) || 1) : 0;
  const finalGrandTotal = isSavedOrder ? grandTotal : grandTotal + fbrPosFee;
  const changeAmount = Number(order?.changeAmount ?? 0);
  const totalPaid = tenders.reduce((s, t) => s + (t.method === "voucher" && t.voucherFaceValue ? t.voucherFaceValue : t.amount), 0);

  // Alliance distribution for display - proportional to item value
  const calculateProportionalDiscount = (
    itemValue: number,
    totalValue: number,
    totalDiscount: number,
  ): number => {
    if (totalValue === 0) return 0;
    return Math.round((totalDiscount * itemValue) / totalValue);
  };

  const orderDiscountLabel = (() => {
    if (discountMode === "promo")
      return `Promo: ${selectedPromo?.code ?? order?.promo?.code ?? ""}`;
    if (discountMode === "coupon")
      return `Coupon: ${appliedCoupon?.code ?? order?.coupon?.code ?? ""}`;
    if (discountMode === "alliance")
      return `Alliance: ${selectedAlliance?.code ?? order?.alliance?.code ?? ""}`;
    if (discountMode === "manual") return "Manual Discount";
    if (order?.promo?.code) return `Promo: ${order.promo.code}`;
    if (order?.coupon?.code) return `Coupon: ${order.coupon.code}`;
    if (order?.alliance?.code) return `Alliance: ${order.alliance.code}`;
    return "Order Discount";
  })();

  const fbrVerifyUrl =
    order?.fbrInvoiceUrl ||
    `https://taxasaan.fbr.gov.pk/verify?inv=${encodeURIComponent(order?.orderNumber ?? "")}`;

  const bodyProps: ReceiptBodyProps = {
    isGiftReceipt,
    storeName,
    storeAddress,
    storePhone,
    storeNTN,
    storeSTRN,
    terminalName,
    cashierName,
    order,
    items,
    subtotal,
    totalTax,
    orderDiscount,
    totalDiscount,
    valueForSales,
    grandTotal,
    fbrPosFee,
    finalGrandTotal,
    changeAmount,
    totalPaid,
    tenders,
    orderDiscountLabel,
    fbrVerifyUrl,
    settings,
    suppressItemDiscounts,
    suppressLabel,
    creditVouchers,
    hasFbrInfo,
  };

  return (
    <>
      <style>{`
                /* Ensure print root and its descendants are rendered in solid black and white for standard/PDF rendering */
                #receipt-print-root,
                #receipt-print-root * {
                    color: #000 !important;
                    border-color: #000 !important;
                }

                @media print {
                    body *:not(#receipt-print-root):not(#receipt-print-root *) {
                        visibility: hidden !important;
                        height: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                    }

                    #receipt-print-root,
                    #receipt-print-root * {
                        visibility: visible !important;
                        color: #000 !important;
                        border-color: #000 !important;
                    }

                    #receipt-print-root {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${layout === "thermal" ? "72.1mm" : "100%"} !important;
                        max-width: ${layout === "thermal" ? "72.1mm" : "210mm"} !important;
                        padding: ${layout === "thermal" ? "2mm 1mm" : "12mm"} !important;
                        background: #fff !important;
                        color: #000 !important;
                        font-family: ${layout === "thermal" ? "'Courier New', Courier, monospace" : "inherit"} !important;
                        font-size: ${layout === "thermal" ? "9pt" : "10.5pt"} !important;
                        line-height: 1.35 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    #receipt-print-root .rpt-grid-hdr span,
                    #receipt-print-root .rpt-grid-item span:not(:first-child),
                    #receipt-print-root .rpt-grid-hdr-g span,
                    #receipt-print-root .rpt-grid-gift span:not(:first-child) {
                        white-space: nowrap !important;
                    }

                    @page {
                        margin: ${layout === "thermal" ? "0" : "15mm"};
                        size: ${layout === "thermal" ? "80mm auto" : "A4 portrait"};
                    }
                    #receipt-print-root > div > * { page-break-inside: avoid; break-inside: avoid; }
                    tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                }
            `}</style>

      {/* ── Screen: dialog preview ────────────────────────────────── */}
      <Dialog open onOpenChange={onClose}>
        <DialogContent className={cn(
          "h-[92vh] flex flex-col p-0 gap-0 transition-all duration-300",
          layout === "thermal" ? "sm:max-w-2xl w-full" : "sm:max-w-5xl w-full"
        )}>
          <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0 flex flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <FileText className="w-5 h-5 text-primary" />
                Receipt Preview
              </DialogTitle>
            </div>
            
            {/* Format Switcher */}
            {!isLoading && (
              <div className="flex items-center gap-1 bg-muted p-1 rounded-full border ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLayout("thermal")}
                  className={cn(
                    "rounded-full h-7 px-3 text-xs font-semibold gap-1 transition-all",
                    layout === "thermal"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Thermal (80mm)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLayout("a4")}
                  className={cn(
                    "rounded-full h-7 px-3 text-xs font-semibold gap-1 transition-all",
                    layout === "a4"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  A4 Premium
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto px-4 py-4 bg-muted/20 dark:bg-zinc-950/20 shadow-inner flex justify-start md:justify-center">
            {isLoading ? (
              <ReceiptSkeleton />
            ) : (
              <div className={layout === "thermal" ? "w-[320px] bg-white border shadow-md p-4 rounded-md h-fit animate-in zoom-in-95 duration-150" : "w-[210mm] min-w-[210mm] h-fit shadow-lg border rounded-sm overflow-hidden bg-white animate-in zoom-in-95 duration-150"}>
                {layout === "thermal" ? (
                  <ReceiptBody {...bodyProps} />
                ) : (
                  <A4InvoiceBody {...bodyProps} />
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button
              onClick={handleDownloadPdf}
              variant="outline"
              className="flex-1 gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              disabled={isLoading || isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> Generating PDF…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download PDF
                </>
              )}
            </Button>
            <Button
              onClick={handlePrint}
              className="flex-1 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" /> Print Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Print target — off-screen but rendered, visible only on print ── */}
      {!isLoading &&
        mounted &&
        createPortal(
          <div
            id="receipt-print-root"
            ref={reportRef}
            style={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              width: layout === "thermal" ? "72.1mm" : "100%",
              maxWidth: layout === "thermal" ? "72.1mm" : "210mm",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            {layout === "thermal" ? (
              <ReceiptBody {...bodyProps} />
            ) : (
              <A4InvoiceBody {...bodyProps} />
            )}
          </div>,
          document.body,
        )}
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
  suppressItemDiscounts: boolean;
  suppressLabel?: string;
  creditVouchers?: {
    code: string;
    faceValue: number;
    expiresAt: Date | null;
  }[];
  hasFbrInfo?: boolean;
}

function ReceiptBody({
  isGiftReceipt,
  storeName,
  storeAddress,
  storePhone,
  storeNTN,
  storeSTRN,
  terminalName,
  cashierName,
  order,
  items,
  subtotal,
  totalTax,
  orderDiscount,
  totalDiscount,
  valueForSales,
  grandTotal,
  fbrPosFee,
  finalGrandTotal,
  changeAmount,
  totalPaid,
  tenders,
  orderDiscountLabel,
  fbrVerifyUrl,
  settings,
  suppressItemDiscounts,
  suppressLabel = "Alliance Disc",
  creditVouchers,
  hasFbrInfo,
}: ReceiptBodyProps) {
  const isSavedOrder = !!(order && order.id);

  // Calculate total WOST value for proportional discount
  const totalWostValue = items.reduce((sum, item) => {
    const taxPct = item.taxPercent ?? 0;
    const taxDivisor = 1 + taxPct / 100;
    // Retail price is item.price (not adding tax)
    const retailPrice = item.price;
    const wostPerUnit = retailPrice / taxDivisor;
    return sum + wostPerUnit * item.quantity;
  }, 0);

  // Proportional discount calculation for alliance/coupon
  const calculateProportionalDiscount = (
    itemValue: number,
    totalValue: number,
    totalDiscount: number,
  ): number => {
    if (totalValue === 0) return 0;
    const proportionalDisc = Math.round(
      (totalDiscount * itemValue) / totalValue,
    );
    // Safety: discount cannot exceed item value
    return Math.min(proportionalDisc, itemValue);
  };

  const Row = ({
    label,
    value,
    bold = false,
    indent = false,
  }: {
    label: string;
    value: string;
    bold?: boolean;
    indent?: boolean;
  }) => (
    <div
      className="rpt-flex flex justify-between text-[11px]"
      style={{
        paddingLeft: indent ? "12px" : undefined,
        fontWeight: bold ? "bold" : undefined,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="font-mono text-xs w-full max-w-[72.1mm] mx-auto space-y-2">
      {/* ── Store Header ── */}
      <div className="text-center space-y-0.5">
        <p className="font-black text-sm leading-tight uppercase tracking-wide">
          {storeName}
        </p>
        {(storeAddress || storePhone) && (
          <p className="text-[11px] leading-snug">
            {storeAddress}
            {storeAddress && storePhone ? " | " : ""}
            {storePhone}
          </p>
        )}
      </div>

      <Separator />

      {/* ── Invoice Title ── */}
      {!isGiftReceipt ? (
        <div className="text-center space-y-0.5">
          <p className="font-bold text-sm tracking-widest uppercase">
            Sales Tax Invoice
          </p>
          <p className="font-black text-2xl tracking-wider">
            *{order?.orderNumber ?? ""}*
          </p>
          {order?.orderNumber && (
            <BarcodeImg value={order.orderNumber} height={32} fontSize={8} />
          )}
        </div>
      ) : (
        <div className="text-center">
          <p className="font-bold text-sm tracking-widest uppercase">
            Gift Receipt
          </p>
        </div>
      )}

      <Separator />

      {/* ── Receipt meta ── */}
      <div className="space-y-0.5 text-[11px]">
        <Row label="Receipt No." value={order?.orderNumber ?? ""} bold />
        <Row label="Date" value={`${fmtDate(order?.createdAt)} ${fmtTime(order?.createdAt)}`} />
        {cashierName && <Row label="Sales By" value={cashierName} />}
        {terminalName && <Row label="Terminal" value={terminalName} />}
      </div>

      <Separator />

      {/* ── Column headers ── */}
      {!isGiftReceipt ? (
        <div
          className="rpt-grid-hdr text-[10px] font-bold border-b pb-1"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 0.5fr 0.5fr 0.8fr 0.8fr 0.8fr",
            gap: "0 4px",
          }}
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
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 0.5fr 0.5fr",
            gap: "0 4px",
          }}
        >
          <span>Name / Code</span>
          <span style={{ textAlign: "center" }}>Size</span>
          <span style={{ textAlign: "center" }}>Qty</span>
        </div>
      )}

      {/* ── Item lines ── */}
      {items.map((item: any, idx: number) => {
        const taxPct = item.taxPercent ?? 0;
        const taxDivisor = 1 + taxPct / 100; // e.g., 1.18 for 18%, 1.25 for 25%

        // Step 1: Retail price is the unit price (item.price)
        const retailPrice = item.price;

        // Step 2: WOST = Retail / (1 + tax%) - this removes the tax to get the base price
        const wostPerUnit = retailPrice / taxDivisor;
        const totalWost = wostPerUnit * item.quantity;

        let displayDisc = 0;
        let displayDiscPct = 0;
        let amtAfterDisc = 0;
        let tax = 0;
        let valueIncludingTax = 0;

        if (isSavedOrder) {
          displayDisc = item.discountAmount ?? 0;
          displayDiscPct = item.discountPercent ?? 0;
          amtAfterDisc = totalWost - displayDisc;
          tax = item.taxAmount ?? 0;
          valueIncludingTax = item.lineTotal ?? amtAfterDisc + tax;
        } else {
          // Step 3: Discount % from item (use override if present)
          const itemDiscPct =
            item.overrideDiscountPercent ?? item.discountPercent ?? 0;
          // Discount Amount = Total WOST × Discount %
          const rawDisc = totalWost * (itemDiscPct / 100);

          // If alliance/coupon suppressed item discount, calculate proportional discount
          let disc = suppressItemDiscounts ? 0 : rawDisc;
          displayDisc = disc;
          displayDiscPct = suppressItemDiscounts ? 0 : itemDiscPct;

          if (suppressItemDiscounts) {
            // Proportional discount: (orderDiscount × itemWOST) / totalWOST
            displayDisc = calculateProportionalDiscount(
              totalWost,
              totalWostValue,
              orderDiscount,
            );
            displayDiscPct =
              totalWost > 0
                ? Math.round((displayDisc / totalWost) * 100 * 100) / 100
                : 0;
          }

          // Step 4: Amount after Discount
          amtAfterDisc =
            totalWost - (suppressItemDiscounts ? displayDisc : disc);

          // Step 5: Tax = Amount after Discount × tax%
          tax = amtAfterDisc * (taxPct / 100);

          // Step 6: Value Including Tax
          valueIncludingTax = amtAfterDisc + tax;
        }

        const uniqueNo = item.sku || item.upc || "—";

        return (
          <div
            key={item.id ?? idx}
            className="pb-2 border-b border-dashed last:border-0"
          >
            <p className="font-bold text-[11px] leading-tight mb-0.5">
              {item.name}
              {item.color && ` (Color: ${item.color})`}
            </p>

            {!isGiftReceipt ? (
              <div
                className="rpt-grid-item text-[11px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.5fr 0.5fr 0.8fr 0.8fr 0.8fr",
                  gap: "0 4px",
                }}
              >
                <span className="text-zinc-955 truncate">
                  {uniqueNo}
                </span>
                <span style={{ textAlign: "center" }}>{item.size || "—"}</span>
                <span style={{ textAlign: "center", fontWeight: "bold" }}>
                  {item.quantity}
                </span>
                <span style={{ textAlign: "right" }}>
                  {fmtDec(retailPrice)}
                </span>
                <span style={{ textAlign: "right" }}>
                  {fmtDec(wostPerUnit)}
                </span>
                <span style={{ textAlign: "right", fontWeight: "bold" }}>
                  {fmtDec(totalWost)}
                </span>
              </div>
            ) : (
              <div
                className="rpt-grid-gift text-[11px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.5fr 0.5fr",
                  gap: "0 4px",
                }}
              >
                <span className="text-zinc-955 truncate">
                  {uniqueNo}
                </span>
                <span style={{ textAlign: "center" }}>{item.size || "—"}</span>
                <span style={{ textAlign: "center", fontWeight: "bold" }}>
                  {item.quantity}
                </span>
              </div>
            )}
              <Separator />
            {!isGiftReceipt && (
              <div className="mt-1 space-y-0.5 text-[10px]">
                {!suppressItemDiscounts && (
                  <Row label="Discount %" value={`${displayDiscPct}%`} />
                )}
                <Row
                  label={
                    suppressItemDiscounts ? suppressLabel : "Discount Amount"
                  }
                  value={displayDisc > 0 ? fmtDec(displayDisc) : "—"}
                />
                <Row
                  label="Amount after Discount"
                  value={fmtDec(amtAfterDisc)}
                />
                <Row label="Sales Tax Rate" value={`${taxPct}%`} />
                <Row
                  label="Sales Tax Amount"
                  value={tax > 0 ? fmtDec(tax) : "—"}
                />
                <div
                  className="rpt-fbr-row flex justify-between font-bold text-[10px] border-t border-dashed pt-0.5 mt-0.5"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "bold",
                  }}
                >
                  <span>Value Including Sales Tax</span>
                  <span>{fmtDec(valueIncludingTax)}</span>
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
          <Row
            label={`Total Value Excluding Sales Tax (${items.length})`}
            value={fmt(Math.round(subtotal))}
          />
          <Row
            label="Total Discount"
            value={totalDiscount > 0 ? fmt(Math.round(totalDiscount)) : "—"}
          />
          <Row label="Value for Sales" value={fmt(Math.round(valueForSales))} />
          {settings.receiptShowTax && (
            <Row label="Total Sales Tax" value={fmt(Math.round(totalTax))} />
          )}
          <div
            className="rpt-flex flex justify-between font-bold text-[11px] border-t pt-0.5 mt-0.5"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
            }}
          >
            <span>Total Value Including Sales Tax</span>
            <span>{fmt(Math.round(finalGrandTotal - fbrPosFee))}</span>
          </div>
          {hasFbrInfo && fbrPosFee > 0 && (
            <Row label="FBR POS Fee" value={fmt(Math.round(fbrPosFee))} />
          )}
          <div
            className="rpt-flex flex justify-between font-black text-sm border-t pt-0.5 mt-0.5"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "900",
            }}
          >
            <span>Grand Total</span>
            <span>{fmt(Math.round(finalGrandTotal))}</span>
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
                {t.method === "card" || t.method === "bank_transfer"
                  ? order?.merchant?.description || order?.merchant?.bankName
                    ? ` (${order.merchant.description || order.merchant.bankName})`
                    : t.slipNo ? ` (${t.slipNo})` : ""
                  : t.slipNo
                    ? t.method === "voucher"
                      ? ` #${t.slipNo}`
                      : ` (${t.slipNo})`
                    : ""}
              </span>
              <span className="font-semibold">
                {t.method === "voucher" && t.voucherFaceValue
                  ? fmt(t.voucherFaceValue)
                  : fmt(t.amount)}
              </span>
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

      {/* ── Credit Vouchers ── */}
      {creditVouchers && creditVouchers.length > 0 && (
        <>
          <Separator />
          <div className="text-center space-y-2 border-2 border-dashed border-zinc-950 rounded-lg px-3 py-3 bg-zinc-50">
            <p className="font-bold text-xs uppercase tracking-wide text-zinc-950">
              Credit Voucher Issued
            </p>
            {creditVouchers.map((voucher, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-zinc-950 rounded px-2 py-2 space-y-1"
              >
                <p className="font-black text-xl tracking-widest text-zinc-950">
                  {voucher.code}
                </p>
                <BarcodeImg value={voucher.code} height={32} fontSize={8} />
                <p className="font-semibold text-sm text-zinc-900">
                  Value:{" "}
                  <span className="font-black text-base text-zinc-950">
                    Rs. {fmt(Number(voucher.faceValue))}
                  </span>
                </p>
                {voucher.expiresAt && (
                  <p className="text-[9px] text-zinc-800">
                    Expires:{" "}
                    {new Date(voucher.expiresAt).toLocaleDateString("en-PK", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))}
            <p className="text-[9px] text-zinc-800 pt-1 border-t border-dashed">
              Unused voucher balance - Use on next purchase
            </p>
          </div>
        </>
      )}

      {hasFbrInfo && <Separator />}

      {/* ── FBR Logo + QR ── */}
      {!isGiftReceipt && hasFbrInfo && (
        <>
          <p
            className="flex-1 text-[10px] text-center leading-snug"
            style={{ flex: 1, fontSize: "9pt", lineHeight: 1.3 }}
          >
            This Receipt / Invoice is verified by FBR POS Invoicing System.
            Verify through FBR Tax Asaan App or SMS at <strong>9966</strong> and
            win exciting prizes in draw.
          </p>
          <div
            className="flex items-center gap-3 justify-between"
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            <div className="rpt-img shrink-0" style={{ flexShrink: 0 }}>
              <Image
                src={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/fbr_logo.png`
                    : "/fbr_logo.png"
                }
                alt="FBR POS Invoicing System"
                width={60}
                height={60}
                className="object-contain"
                unoptimized
              />
            </div>

            <div
              className="shrink-0 flex flex-col items-center gap-0.5"
              style={{ flexShrink: 0, textAlign: "center" }}
            >
              <QRCodeSVG value={fbrVerifyUrl} size={58} level="M" />
              <p
                className="text-[9px]"
                style={{ fontSize: "8pt", marginTop: "2px" }}
              >
                Scan to verify
              </p>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* ── Terms & Conditions ── */}
      <div className="text-[10px] space-y-0.5">
        <p className="font-bold text-[11px]">TERMS &amp; CONDITIONS OF SALE</p>
        <p>No Refund.</p>
        <p>
          Exchanges on unused products within 10 days only from the outlet where
          purchased.
        </p>
        <p>Claim will not be accepted without Sales Tax Invoice.</p>
        <p>Sales and promotional items are strictly non-exchangeable.</p>
        <p>
          Item purchases at full price which go on sale will be exchanged at the
          marked down price.
        </p>
      </div>

      <Separator />

      {/* ── Footer ── */}
      <div className="text-center text-[10px] space-y-0.5 pb-1">
        {storeNTN && <p>Sales Tax No.: {storeNTN}</p>}
        {storeSTRN && <p>NTN: {storeSTRN}</p>}
        <p>{settings.receiptFooter || "*** THANK YOU FOR SHOPPING ***"}</p>
        <p className="tracking-widest font-bold">{order?.orderNumber}</p>
        <p className="text-[9px] text-zinc-550 pt-0.5">Software by Innovative Network</p>
      </div>
    </div>
  );
}

function A4InvoiceBody({
  isGiftReceipt,
  storeName,
  storeAddress,
  storePhone,
  storeNTN,
  storeSTRN,
  terminalName,
  cashierName,
  order,
  items,
  subtotal,
  totalTax,
  orderDiscount,
  totalDiscount,
  valueForSales,
  grandTotal,
  fbrPosFee,
  finalGrandTotal,
  changeAmount,
  totalPaid,
  tenders,
  orderDiscountLabel = "Promotional",
  fbrVerifyUrl,
  settings,
  suppressItemDiscounts,
  creditVouchers,
  hasFbrInfo,
  fbrInvoiceNumber,
}: ReceiptBodyProps & { fbrInvoiceNumber?: string }) {
  const isSavedOrder = !!(order && order.id);

  const customerName = order?.customer?.name || order?.customerName || "Walk-in Customer";
  const customerPhone = order?.customer?.phone || order?.customerPhone || order?.customerMobile || "";
  const cnic = order?.customer?.cnic || order?.customerCnic || "";

  const formatInvoiceDateTime = (dateStr?: string | null) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${date} ${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="font-sans text-[11px] text-black w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] p-[15mm] bg-white flex flex-col justify-between">
      {/* Top Section */}
      <div>
        {/* Masthead Header */}
        <div className="text-center border-t-4 border-b border-black py-2 mb-2">
          <h1 className="text-lg font-bold tracking-widest uppercase">
            {storeName || "Point of Sales - Corporate"}
          </h1>
          <p className="text-[10px] text-zinc-700 mt-0.5">{storeAddress || "Corporate Office"}</p>
          <p className="text-[10px] text-zinc-700">{storePhone || "021-35641339"}</p>
        </div>

        {/* Invoice Title & Meta details */}
        <div className="flex justify-between items-start mb-4 text-xs">
          <div>
            <h2 className="text-base font-bold tracking-[0.2em] uppercase">Sales Tax Invoice</h2>
            {cashierName && <p className="text-xs mt-0.5">Sales By: {cashierName}</p>}
          </div>

          <div className="text-right text-xs leading-tight">
            {hasFbrInfo && storeNTN && <p className="font-bold">FBR POS ID {storeNTN}</p>}
            <p className="mt-1">
              STI No. <span className="font-bold">{order?.orderNumber ?? ""}</span>
              {"   "}
              <span className="ml-2 font-mono font-bold">{formatInvoiceDateTime(order?.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-left text-[11px] border-collapse mb-2">
          <thead>
            <tr className="border-b border-t border-black text-[10px] font-bold uppercase">
              <th className="py-2 px-1 w-[15%]">Code</th>
              <th className="py-2 px-1 w-[38%]">Name</th>
              {!isGiftReceipt && <th className="py-2 px-1 text-center w-[8%]">Size</th>}
              <th className="py-2 px-1 text-center w-[7%]">Qty</th>
              {!isGiftReceipt && (
                <>
                  <th className="py-2 px-1 text-right w-[10%]">Rate (Rs.)</th>
                  <th className="py-2 px-1 text-right w-[11%]">Value (Rs.)</th>
                  <th className="py-2 px-1 text-right w-[11%]">Total Value (Rs.)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const taxPct = item.taxPercent ?? 0;
              const retailPrice = item.price;
              const wostPerUnit = retailPrice / (1 + taxPct / 100);
              const totalWost = wostPerUnit * item.quantity;
              const uniqueNo = item.sku || item.upc || "—";

              return (
                <tr key={item.id ?? idx} className="align-top">
                  <td className="py-1.5 px-1 font-mono text-[10px]">{uniqueNo}</td>
                  <td className="py-1.5 px-1">{item.name}</td>
                  {!isGiftReceipt && <td className="py-1.5 px-1 text-center">{item.size || "—"}</td>}
                  <td className="py-1.5 px-1 text-center">{item.quantity}</td>
                  {!isGiftReceipt && (
                    <>
                      <td className="py-1.5 px-1 text-right font-mono">{fmtDec(retailPrice)}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{fmtDec(wostPerUnit)}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{fmtDec(totalWost)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-black mb-4" />

        {/* Summary pricing block */}
        {!isGiftReceipt ? (
          <div className="flex justify-end mb-4">
            <div className="w-[50%] max-w-[360px] text-xs space-y-1">
              <Row label="SubTotal" value={fmtDec(subtotal)} />
              {totalDiscount > 0 && (
                <Row label={orderDiscountLabel} value={`(${fmtDec(totalDiscount)})`} negative />
              )}
              <Row label="Value Excluding Sales Tax" value={fmtDec(valueForSales)} />
              {settings.receiptShowTax && <Row label="Sales Tax" value={fmtDec(totalTax)} />}
              <Row label="Value Including Sales Tax" value={fmtDec(grandTotal)} />
              {hasFbrInfo && fbrPosFee > 0 && (
                <Row label="POS Services Fee Re." value={fmtDec(fbrPosFee)} />
              )}
              <div className="border-t border-black mt-1 pt-1">
                <Row label="Net Total" value={`Rs. ${fmtDec(finalGrandTotal)}`} bold />
              </div>
              <div className="border-t border-dashed border-zinc-300 mt-2 pt-2 space-y-1">
                {tenders.map((t, i) => {
                  let label = t.method === "cash" ? "Cash" : t.method.replace(/_/g, " ");
                  if (t.method === "card" || t.method === "bank_transfer") {
                    const cardSuffix = t.cardLast4 ? ` ••••${t.cardLast4}` : "";
                    const merchantName = order?.merchant?.description || order?.merchant?.bankName;
                    const merchantSuffix = merchantName
                      ? ` (${merchantName})`
                      : t.slipNo ? ` (${t.slipNo})` : "";
                    label = `${label}${cardSuffix}${merchantSuffix}`;
                  } else if (t.method === "voucher" && t.slipNo) {
                    label = `${label} #${t.slipNo}`;
                  }
                  return (
                    <Row
                      key={i}
                      label={label}
                      value={fmtDec(t.method === "voucher" && t.voucherFaceValue ? t.voucherFaceValue : t.amount)}
                    />
                  );
                })}
                {changeAmount > 0 && <Row label="Change" value={fmtDec(changeAmount)} />}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-4 text-xs text-gray-600 mb-4">
            Price details omitted — Gift Receipt. Thank you for your purchase!
          </p>
        )}

        {creditVouchers && creditVouchers.length > 0 && (
          <div className="border border-black rounded p-3 mb-4 text-[10px] max-w-sm">
            <p className="font-bold uppercase mb-1">Credit Voucher Issued</p>
            {creditVouchers.map((v, i) => (
              <div key={i} className="py-1 space-y-1">
                <div className="flex justify-between font-mono">
                  <span>{v.code}</span>
                  <span>Rs. {fmtDec(Number(v.faceValue))}</span>
                </div>
                <BarcodeImg value={v.code} height={28} fontSize={7} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Section */}
      <div className="mt-auto pt-6 border-t border-zinc-300">
        <div className="flex justify-between items-end mb-6 text-xs">
          <div className="w-[300px]">
            <div className="border-b border-black pb-1">CNIC #: {cnic || ""}</div>
          </div>
          <div className="w-[180px] text-center border-t border-black pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Authorized Signature
          </div>
        </div>

        {hasFbrInfo && (
          <>
            <div className="border-t border-black pt-3 mb-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">FBR Invoice Number</p>
              <p className="font-mono font-bold text-sm border-t border-b border-black py-1 px-8 inline-block bg-white min-w-[220px]">
                {fbrInvoiceNumber || order?.fbrInvoiceNumber || "—"}
              </p>
              {(fbrInvoiceNumber || order?.fbrInvoiceNumber) && (
                <div className="mt-1">
                  <BarcodeImg value={fbrInvoiceNumber || order?.fbrInvoiceNumber} height={36} fontSize={9} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-end">
              <p className="text-[10px] text-zinc-600 max-w-[65%] leading-relaxed">
                This Receipt / Invoice is verified by FBR POS Invoicing System. Verify this
                invoice through FBR Tax Asaan Mobile App or SMS at <strong>9966</strong> and win
                exciting prizes in draw.
              </p>
              <div className="flex items-center gap-3 shrink-0 bg-white p-2 rounded border border-zinc-200 shadow-sm">
                <div className="w-[50px] h-[50px] flex items-center justify-center">
                  <QRCodeSVG value={fbrVerifyUrl} size={50} level="M" />
                </div>
                <Image
                  src={typeof window !== "undefined" ? `${window.location.origin}/fbr_logo.png` : "/fbr_logo.png"}
                  alt="FBR POS Logo"
                  width={56}
                  height={56}
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          </>
        )}

        <div className="text-center text-[10px] text-zinc-500 mt-6 pt-3 border-t border-zinc-200">
          <p className="font-bold tracking-wider">
            {settings.receiptFooter || "*** THANK YOU FOR SHOPPING ***"}
          </p>
          <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
            Invoice Ref: {order?.orderNumber}
          </p>
          <p className="text-[9px] text-zinc-400">Software by Innovative Network</p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex justify-between py-0.5 text-xs ${bold ? "font-bold text-sm pt-1" : ""}`}>
      <span className="text-zinc-700">{label}</span>
      <span className={`font-mono ${negative ? "text-red-650" : ""}`}>{value}</span>
    </div>
  );
}
