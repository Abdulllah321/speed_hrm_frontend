"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import type { CartItem } from "@/components/pos/new-sale/cart-table";

function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
}

function fmtCurrency(val: number) {
    return val.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Tender { method: string; amount: number; cardLast4?: string; slipNo?: string; }

interface PrintReceiptProps {
    order: any;
    cartItems?: CartItem[];
    tenders: Tender[];
    discountMode?: string;
    selectedPromo?: any;
    appliedCoupon?: any;
    selectedAlliance?: any;
    onClose: () => void;
}

export function PrintReceipt({
    order,
    cartItems: propCartItems,
    tenders,
    discountMode,
    selectedPromo,
    appliedCoupon,
    selectedAlliance,
    onClose
}: PrintReceiptProps) {
    // If cartItems not provided, try to extract from order.items
    const cartItems: any[] = propCartItems || order?.items?.map((oi: any) => ({
        id: oi.id,
        name: oi.item?.description || "Item",
        sku: oi.item?.sku,
        price: oi.unitPrice,
        quantity: oi.quantity,
        total: (oi.unitPrice - (oi.discountAmount || 0)) * oi.quantity,
        discountAmount: (oi.discountAmount || 0) * oi.quantity,
        taxAmount: (oi.taxAmount || 0) * oi.quantity,
    })) || [];

    const orderDiscount = order?.discountAmount ?? 0;
    const grandTotal = order?.grandTotal ?? 0;
    const changeAmount = order?.changeAmount ?? 0;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md print:shadow-none print:border-none">
                <DialogHeader className="print:hidden">
                    <DialogTitle>Receipt Preview</DialogTitle>
                    <p className="text-sm text-muted-foreground">Review the receipt before printing.</p>
                </DialogHeader>

                {/* Receipt content */}
                <div id="receipt-content" className="font-mono text-sm space-y-2">
                    <div className="text-center space-y-0.5">
                        <p className="font-bold text-base">{getCookie("companyName") || "Store"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order?.createdAt || Date.now()).toLocaleString("en-PK")}</p>
                        <p className="text-xs font-semibold">Receipt #: {order?.orderNumber}</p>
                    </div>

                    <Separator />

                    {/* Items */}
                    <div className="space-y-1">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-xs font-bold text-muted-foreground">
                            <span>Item</span><span>Qty</span><span>Price</span><span className="text-right">Total</span>
                        </div>
                        {cartItems.map((item: any, i: number) => (
                            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-xs">
                                <div>
                                    <p className="font-medium truncate">{item.name}</p>
                                    {item.discountPercent > 0 && (
                                        <p className="text-destructive">-{item.discountPercent}% off</p>
                                    )}
                                </div>
                                <span>{item.quantity}</span>
                                <span className="font-mono">{fmtCurrency(item.price)}</span>
                                <span className="font-mono text-right">{fmtCurrency(item.total)}</span>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-mono">{fmtCurrency(order?.subTotal || cartItems.reduce((a, i) => a + (i.price * i.quantity), 0))}</span>
                        </div>
                        {(order?.itemDiscountAmount || cartItems.reduce((a, i) => a + (i.discountAmount || 0), 0)) > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>Item Discounts</span>
                                <span className="font-mono">-{fmtCurrency(order?.itemDiscountAmount || cartItems.reduce((a, i) => a + (i.discountAmount || 0), 0))}</span>
                            </div>
                        )}
                        {orderDiscount > 0 && (
                            <div className="flex justify-between text-primary">
                                <span>
                                    {discountMode === "promo" && `Promo: ${selectedPromo?.code || order?.promo?.code}`}
                                    {discountMode === "coupon" && `Coupon: ${appliedCoupon?.code || order?.coupon?.code}`}
                                    {discountMode === "alliance" && `Alliance: ${selectedAlliance?.code || order?.alliance?.code}`}
                                    {discountMode === "manual" && "Manual Discount"}
                                    {!discountMode && "Order Discount"}
                                </span>
                                <span className="font-mono">-{fmtCurrency(orderDiscount)}</span>
                            </div>
                        )}
                        {(order?.taxAmount || cartItems.reduce((a, i) => a + (i.taxAmount || 0), 0)) > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax</span>
                                <span className="font-mono">{fmtCurrency(order?.taxAmount || cartItems.reduce((a, i) => a + (i.taxAmount || 0), 0))}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base pt-1 border-t">
                            <span>Total</span>
                            <span className="font-mono">{fmtCurrency(grandTotal)}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Payment */}
                    <div className="space-y-1 text-xs">
                        {tenders.map((t: Tender, i: number) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-muted-foreground capitalize">{t.method.replace("_", " ")}{t.cardLast4 ? ` ••••${t.cardLast4}` : ""}</span>
                                <span className="font-mono font-medium">{fmtCurrency(t.amount)}</span>
                            </div>
                        ))}
                        {changeAmount > 0 && (
                            <div className="flex justify-between font-semibold text-primary">
                                <span>Change</span>
                                <span className="font-mono">{fmtCurrency(changeAmount)}</span>
                            </div>
                        )}
                    </div>

                    <Separator />
                    <p className="text-center text-xs text-muted-foreground">*** THANK YOU FOR SHOPPING ***</p>
                    <p className="text-center text-xs text-muted-foreground font-mono tracking-widest">{order?.orderNumber}</p>
                </div>

                <DialogFooter className="print:hidden">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={() => window.print()} className="gap-2">
                        <Printer className="h-4 w-4" /> Print Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
