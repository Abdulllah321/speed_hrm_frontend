"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NewSaleTopBar } from "@/components/pos/new-sale/top-bar";
import { CartTable, type CartItem } from "@/components/pos/new-sale/cart-table";
import { SummaryFooter } from "@/components/pos/new-sale/summary-footer";
import { toast } from "sonner";
import axios from "axios";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

// Helper to get cookie
function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
}

async function apiFetch<T>(endpoint: string, options?: any): Promise<T> {
    const companyId = getCookie("companyId");
    const companyCode = getCookie("companyCode");

    const response = await axios({
        url: `${API_BASE}${endpoint}`,
        method: options?.method || "GET",
        data: options?.body,
        headers: {
            "Content-Type": "application/json",
            ...(companyId ? { "x-company-id": companyId } : {}),
            ...(companyCode ? { "x-tenant-id": companyCode } : {}),
        },
        withCredentials: true,
    });
    return response.data;
}

// ─── Helpers ────────────────────────────────────────────────────────
function computeLineItem(
    product: any,
    quantity: number,
    discountPercent: number
): CartItem {
    const price = Number(product.unitPrice) || 0;
    const subtotal = price * quantity;
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const afterDiscount = subtotal - discountAmount;
    const taxPercent = Number(product.taxRate1) || 0;
    const taxAmount = Math.round(afterDiscount * (taxPercent / 100));
    const total = afterDiscount + taxAmount;

    return {
        id: product.id,
        upc: product.barCode || product.itemId || "-",
        sku: product.sku || "-",
        name: product.description || "Unknown Item",
        brand: product.brand || "-",
        size: product.size || "-",
        color: product.color || "-",
        quantity,
        price,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        total,
        inStock: product.inStock ?? true,
    };
}

export default function NewSalePage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ─── Auto-focus search on mount ─────────────────────────────────
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // ─── Keyboard shortcuts ─────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F2 → Focus search / product lookup
            if (e.key === "F2") {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }

            // F9 → Checkout
            if (e.key === "F9") {
                e.preventDefault();
                if (cartItems.length > 0 && !isProcessing) {
                    handleCheckout();
                }
            }

            // Escape → Clear cart
            if (e.key === "Escape") {
                e.preventDefault();
                if (cartItems.length > 0) {
                    setCartItems([]);
                    toast.info("Cart cleared");
                    searchInputRef.current?.focus();
                }
            }

            // F4 → Tender/Pay (same as checkout for now)
            if (e.key === "F4") {
                e.preventDefault();
                if (cartItems.length > 0 && !isProcessing) {
                    handleCheckout();
                }
            }

            // F8 → Hold / New order (clear cart + start fresh)
            if (e.key === "F8") {
                e.preventDefault();
                setCartItems([]);
                setSearchQuery("");
                toast.info("New order started");
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cartItems, isProcessing]);

    // ─── Debounced Live Search for Autocomplete ─────────────────────
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const res = await apiFetch<{ status: boolean; data: any[] }>(
                        `/pos-sales/lookup?q=${encodeURIComponent(searchQuery.trim())}`
                    );
                    if (res.status && res.data) {
                        setSearchResults(res.data);
                    } else {
                        setSearchResults([]);
                    }
                } catch {
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ─── Barcode scan / Search submit (Enter key) ───────────────────
    const handleSearchSubmit = useCallback(async () => {
        if (!searchQuery.trim()) return;

        try {
            const res = await apiFetch<{
                status: boolean;
                data: any;
                message?: string;
            }>(`/pos-sales/scan?barcode=${encodeURIComponent(searchQuery.trim())}`);

            if (res.status && res.data) {
                const product = res.data;
                setCartItems((prev) => {
                    const existing = prev.find((i) => i.id === product.id);
                    if (existing) {
                        return prev.map((i) =>
                            i.id === product.id
                                ? computeLineItem(
                                    product,
                                    i.quantity + 1,
                                    i.discountPercent
                                )
                                : i
                        );
                    }
                    return [...prev, computeLineItem(product, 1, 0)];
                });
                toast.success(`Added: ${product.description || product.sku}`);
            } else {
                toast.error(res.message || "Item not found");
            }
        } catch {
            toast.error("Failed to scan item. Check connection.");
        }

        setSearchQuery("");
        searchInputRef.current?.focus();
    }, [searchQuery]);

    // ─── Select from Autocomplete ───────────────────────────────────
    const handleSelectProduct = useCallback((product: any) => {
        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === product.id
                        ? computeLineItem(
                            product,
                            i.quantity + 1,
                            i.discountPercent
                        )
                        : i
                );
            }
            return [...prev, computeLineItem(product, 1, 0)];
        });
        toast.success(`Added: ${product.description || product.sku}`);
        setSearchQuery("");
        setSearchResults([]);
        searchInputRef.current?.focus();
    }, []);

    // ─── Cart operations ────────────────────────────────────────────
    const handleQuantityChange = useCallback((id: string, quantity: number) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const subtotal = item.price * quantity;
                const discountAmount = Math.round(subtotal * (item.discountPercent / 100));
                const afterDiscount = subtotal - discountAmount;
                const taxAmount = Math.round(afterDiscount * (item.taxPercent / 100));
                const total = afterDiscount + taxAmount;
                return { ...item, quantity, discountAmount, taxAmount, total };
            })
        );
    }, []);

    const handleDiscountChange = useCallback(
        (id: string, discountPercent: number) => {
            const clamped = Math.min(100, Math.max(0, discountPercent));
            setCartItems((prev) =>
                prev.map((item) => {
                    if (item.id !== id) return item;
                    const subtotal = item.price * item.quantity;
                    const discountAmount = Math.round(subtotal * (clamped / 100));
                    const afterDiscount = subtotal - discountAmount;
                    const taxAmount = Math.round(afterDiscount * (item.taxPercent / 100));
                    const total = afterDiscount + taxAmount;
                    return { ...item, discountPercent: clamped, discountAmount, taxAmount, total };
                })
            );
        },
        []
    );

    const handleRemoveItem = useCallback((id: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    // ─── Checkout ───────────────────────────────────────────────────
    const handleCheckout = useCallback(() => {
        if (cartItems.length === 0) return;
        // Save cart to sessionStorage for the checkout screen
        sessionStorage.setItem("pos_cart", JSON.stringify(cartItems));
        router.push("/pos/checkout");
    }, [cartItems, router]);

    // ─── Derived state ──────────────────────────────────────────────
    const subtotal = cartItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
    );
    const totalDiscount = cartItems.reduce(
        (acc, item) => acc + item.discountAmount,
        0
    );
    const totalTax = cartItems.reduce((acc, item) => acc + item.taxAmount, 0);
    const grandTotal = cartItems.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="space-y-4 mt-4">
            {/* Keyboard shortcut hints */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-muted">F2</span>
                <span>Search</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Enter</span>
                <span>Scan</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">F9</span>
                <span>Checkout</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Esc</span>
                <span>Clear</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">F8</span>
                <span>New Order</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Ctrl+N</span>
                <span>New Sale</span>
            </div>

            {/* Top bar */}
            <NewSaleTopBar
                itemCount={cartItems.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearchSubmit}
                searchResults={searchResults}
                isSearching={isSearching}
                onSelectProduct={handleSelectProduct}
                searchInputRef={searchInputRef}
            />

            {/* Cart table — fills remaining space */}
            <CartTable
                items={cartItems}
                onQuantityChange={handleQuantityChange}
                onDiscountChange={handleDiscountChange}
                onRemoveItem={handleRemoveItem}
            />

            {/* Footer totals */}
            <SummaryFooter
                subtotal={subtotal}
                discount={totalDiscount}
                tax={totalTax}
                grandTotal={grandTotal}
                onCheckout={handleCheckout}
                disabled={cartItems.length === 0 || isProcessing}
            />
        </div >
    );
}
