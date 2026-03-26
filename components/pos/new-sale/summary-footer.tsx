"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface SummaryFooterProps {
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    onCheckout: () => void;
    disabled?: boolean;
}

export function SummaryFooter({
    subtotal,
    discount,
    tax,
    grandTotal,
    onCheckout,
    disabled = false,
}: SummaryFooterProps) {
    return (
        <div className="sticky bottom-0 z-0 rounded-xl border bg-card shadow-md p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Summary values */}
                <div className="flex items-center gap-8 flex-wrap">
                    {/* Subtotal */}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Subtotal
                        </span>
                        <span className="text-xl font-bold tabular-nums">
                            {subtotal.toLocaleString()}
                        </span>
                    </div>

                    {/* Discount */}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Discount
                        </span>
                        <span className="text-xl font-bold tabular-nums text-primary">
                            {discount.toLocaleString()}
                        </span>
                    </div>

                    {/* Tax */}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Tax
                        </span>
                        <span className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {tax.toLocaleString()}
                        </span>
                    </div>

                    {/* Grand Total */}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Grand Total
                        </span>
                        <span className="text-3xl font-extrabold tabular-nums">
                            {grandTotal.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Checkout Button */}
                <Button
                    onClick={onCheckout}
                    disabled={disabled}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl transition-all min-w-[200px]"
                >
                    CHECKOUT
                    <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
            </div>
        </div>
    );
}
