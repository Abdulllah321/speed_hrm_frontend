"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Tag, TicketPercent, Handshake, Wallet, Loader2, Search,
    CheckCircle2, XCircle, ChevronDown, ChevronUp, Percent,
    Sparkles,
} from "lucide-react";
import type { CartItem } from "@/components/pos/new-sale/cart-table";
import { cn } from "@/lib/utils";
import type { PromoConfig, AllianceConfig, AppliedCoupon, DiscountMode, Tender } from "./page";

// ─── Smart Cart Intelligence & Alliance Classification ───────────────────

export interface CartContext {
    hasTagHeuer: boolean;
    hasWatches: boolean;
    watchBrandNames: string[];
    tagHeuerCount: number;
    watchCount: number;
}

const KNOWN_WATCH_BRANDS = [
    "TAG HEUER", "TAGHEUER", "TAG-HEUER", "TISSOT", "RADO", "TIMEX",
    "CASIO", "G-SHOCK", "BABY-G", "EDIFICE", "CITIZEN", "SEIKO",
    "FOSSIL", "DANISH DESIGN", "ORIS", "ROAMER", "CERTINA", "LONGINES",
    "SWATCH", "POLICE", "NAUTICA", "GUESS", "FENDI"
];

export function analyzeCartContext(cartItems: CartItem[]): CartContext {
    let tagHeuerCount = 0;
    let watchCount = 0;
    const watchBrandsFound = new Set<string>();

    for (const item of cartItems) {
        const brand = (item.brand || "").trim().toUpperCase();
        const name = (item.name || "").trim().toUpperCase();
        const qty = item.quantity || 1;

        const isTag =
            brand.includes("TAG HEUER") ||
            brand.includes("TAGHEUER") ||
            name.includes("TAG HEUER") ||
            name.includes("TAGHEUER");

        const isKnownWatch =
            isTag ||
            KNOWN_WATCH_BRANDS.some((wb) => brand.includes(wb)) ||
            name.includes("WATCH") ||
            brand.includes("WATCH") ||
            name.includes("CHRONOGRAPH");

        if (isTag) {
            tagHeuerCount += qty;
            watchBrandsFound.add("TAG HEUER");
        } else if (isKnownWatch) {
            watchCount += qty;
            if (brand) watchBrandsFound.add(brand);
            else watchBrandsFound.add("Watch");
        }
    }

    return {
        hasTagHeuer: tagHeuerCount > 0,
        hasWatches: (tagHeuerCount + watchCount) > 0,
        watchBrandNames: Array.from(watchBrandsFound),
        tagHeuerCount,
        watchCount,
    };
}

export type AllianceCategory = "tagheuer" | "watches" | "standard";

export function getAllianceCategory(a: AllianceConfig): AllianceCategory {
    const text = `${a.code} ${a.partnerName} ${a.description || ""}`.toUpperCase();
    if (
        text.includes("TAGHEUER") ||
        text.includes("TAG HEUER") ||
        text.includes("TAG-HEUER") ||
        a.code === "510201"
    ) {
        return "tagheuer";
    }
    if (text.includes("WATCH") || a.code === "510102") {
        return "watches";
    }
    return "standard";
}

export interface AllianceMatchMeta {
    category: AllianceCategory;
    isRecommended: boolean;
    badgeText: string;
    badgeClass: string;
    score: number;
    helperText?: string;
    matchedBin?: string;
}

export function getAllianceMatchMeta(
    a: AllianceConfig,
    cartCtx: CartContext,
    searchTerm: string
): AllianceMatchMeta {
    const cat = getAllianceCategory(a);
    const cleanSearch = searchTerm.trim();

    // Check if a searched numeric BIN matches any binNumber
    const matchedBin = cleanSearch && cleanSearch.match(/^\d+/)
        ? a.binNumbers.find((bin) => bin.startsWith(cleanSearch) || cleanSearch.startsWith(bin))
        : undefined;

    let score = 0;
    let isRecommended = false;
    let badgeText = "";
    let badgeClass = "";
    let helperText = "";

    if (cat === "tagheuer") {
        if (cartCtx.hasTagHeuer) {
            isRecommended = true;
            score = 100;
            badgeText = "TAG Heuer (200k Cap)";
            badgeClass = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold";
            helperText = "Matches TAG Heuer in cart (Rs. 200,000 cap)";
        } else if (cartCtx.hasWatches) {
            score = 25;
            badgeText = "TAG Heuer (200k Cap)";
            badgeClass = "bg-muted text-muted-foreground border-border";
            helperText = "For TAG Heuer watches";
        } else {
            score = 10;
        }
    } else if (cat === "watches") {
        if (!cartCtx.hasTagHeuer && cartCtx.hasWatches) {
            isRecommended = true;
            score = 90;
            badgeText = "Watches (20k Cap)";
            badgeClass = "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-semibold";
            helperText = "Matches watches in cart (Rs. 20,000 cap)";
        } else if (cartCtx.hasTagHeuer) {
            score = 45;
            badgeText = "Watches (20k Cap)";
            badgeClass = "bg-muted text-muted-foreground border-border";
            helperText = "For general watches";
        } else {
            score = 15;
        }
    } else {
        // Standard retail alliance (normal baseline, no badges or highlights)
        score = 50;
    }

    // Boost if searched BIN explicitly matches
    if (matchedBin) {
        score += 200;
    }

    return {
        category: cat,
        isRecommended,
        badgeText,
        badgeClass,
        score,
        helperText,
        matchedBin,
    };
}

interface DiscountPanelProps {
    // Modes & data
    discountMode: DiscountMode;
    isLoadingConfig: boolean;
    canPromo: boolean;
    canCoupon: boolean;
    canAlliance: boolean;
    canManualDiscount: boolean;
    tenders?: Tender[];
    // Computed
    orderDiscount: number;
    itemDiscounts: number;
    finalItemDiscounts: number;
    subtotal: number;
    subtotalAfterItems: number;
    cartItems: CartItem[];
    // Promos
    promos: PromoConfig[];
    selectedPromo: PromoConfig | null;
    promoScopeAll: boolean;
    promoScopedItems: Set<string>;
    showPromoScope: boolean;
    onSelectPromo: (promo: PromoConfig) => void;
    onSetPromoScopeAll: (v: boolean) => void;
    onSetPromoScopedItems: (items: Set<string>) => void;
    onTogglePromoScope: () => void;
    // Coupon
    couponInput: string;
    couponError: string;
    isValidatingCoupon: boolean;
    appliedCoupon: AppliedCoupon | null;
    couponInputRef: React.RefObject<HTMLInputElement | null>;
    onCouponInputChange: (val: string) => void;
    onValidateCoupon: () => void;
    // Alliance
    alliances: AllianceConfig[];
    selectedAlliance: AllianceConfig | null;
    allianceSearch: string;
    allianceDetailsRef: React.RefObject<HTMLDetailsElement | null>;
    allianceSearchRef: React.RefObject<HTMLInputElement | null>;
    onAllianceSearch: (val: string) => void;
    onSelectAlliance: (a: AllianceConfig | null, binNumber?: string) => void;
    // Manual discount
    manualDiscountType: "percent" | "flat";
    manualDiscountValue: number;
    onManualDiscountTypeChange: (t: "percent" | "flat") => void;
    onManualDiscountValueChange: (v: number) => void;
    managerVerified?: boolean;
    grandTotalBeforeManual?: number;
    // Clear
    onClearDiscount: () => void;
    // Helpers
    fmtCurrency: (v: number) => string;
    calcPromoDiscount: (promo: PromoConfig, subtotal: number) => number;
}

export function DiscountPanel({
    discountMode, isLoadingConfig, canPromo, canCoupon, canAlliance, canManualDiscount,
    tenders = [],
    orderDiscount, itemDiscounts, finalItemDiscounts, subtotal, subtotalAfterItems, cartItems,
    promos, selectedPromo, promoScopeAll, promoScopedItems, showPromoScope,
    onSelectPromo, onSetPromoScopeAll, onSetPromoScopedItems, onTogglePromoScope,
    couponInput, couponError, isValidatingCoupon, appliedCoupon, couponInputRef,
    onCouponInputChange, onValidateCoupon,
    alliances, selectedAlliance, allianceSearch,
    allianceDetailsRef, allianceSearchRef,
    onAllianceSearch, onSelectAlliance,
    manualDiscountType, manualDiscountValue,
    onManualDiscountTypeChange, onManualDiscountValueChange,
    managerVerified, grandTotalBeforeManual,
    onClearDiscount, fmtCurrency, calcPromoDiscount,
}: DiscountPanelProps) {
    const [activeAllianceIndex, setActiveAllianceIndex] = React.useState(-1);
    const [prevManualDiscountValue, setPrevManualDiscountValue] = useState(manualDiscountValue);
    const [tempManualDiscountValue, setTempManualDiscountValue] = useState<string>(
        manualDiscountValue ? String(manualDiscountValue) : ""
    );
    const [manualAllianceSearch, setManualAllianceSearch] = useState("");

    if (manualDiscountValue !== prevManualDiscountValue) {
        setPrevManualDiscountValue(manualDiscountValue);
        setTempManualDiscountValue(manualDiscountValue ? String(manualDiscountValue) : "");
    }

    // Analyze cart items to distinguish TAG Heuer vs Watches vs Fashion/Sports
    const cartCtx = React.useMemo(() => analyzeCartContext(cartItems), [cartItems]);

    // Filter, score, and rank alliances intelligently based on cart context
    const filteredAlliances = React.useMemo(() => {
        const clean = allianceSearch.trim().toLowerCase();
        const matches = alliances.filter((a) => {
            if (!clean) return true;
            const inPartner = a.partnerName.toLowerCase().includes(clean);
            const inCode = a.code.toLowerCase().includes(clean);
            const inDesc = a.description?.toLowerCase().includes(clean);
            const inBins = a.binNumbers.some(
                (bin) => bin.startsWith(clean) || clean.startsWith(bin)
            );
            return inPartner || inCode || inDesc || inBins;
        });

        return matches
            .map((a) => ({
                alliance: a,
                meta: getAllianceMatchMeta(a, cartCtx, allianceSearch),
            }))
            .sort((x, y) => y.meta.score - x.meta.score);
    }, [alliances, allianceSearch, cartCtx]);

    const filteredManualAlliances = React.useMemo(() => {
        const clean = manualAllianceSearch.trim().toLowerCase();
        const matches = alliances.filter((a) => {
            if (!clean) return true;
            const inPartner = a.partnerName.toLowerCase().includes(clean);
            const inCode = a.code.toLowerCase().includes(clean);
            const inDesc = a.description?.toLowerCase().includes(clean);
            const inBins = a.binNumbers.some(
                (bin) => bin.startsWith(clean) || clean.startsWith(bin)
            );
            return inPartner || inCode || inDesc || inBins;
        });

        return matches
            .map((a) => ({
                alliance: a,
                meta: getAllianceMatchMeta(a, cartCtx, manualAllianceSearch),
            }))
            .sort((x, y) => y.meta.score - x.meta.score);
    }, [alliances, manualAllianceSearch, cartCtx]);

    React.useEffect(() => {
        setActiveAllianceIndex(-1);
    }, [allianceSearch, alliances]);

    const handleAllianceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (filteredAlliances.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveAllianceIndex((idx) => (idx + 1) % filteredAlliances.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveAllianceIndex(
                (idx) => (idx - 1 + filteredAlliances.length) % filteredAlliances.length
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            const idx = activeAllianceIndex >= 0 ? activeAllianceIndex : 0;
            if (idx < filteredAlliances.length) {
                const item = filteredAlliances[idx];
                const targetBin =
                    item.meta.matchedBin ||
                    (item.alliance.binNumbers.length === 1 ? item.alliance.binNumbers[0] : item.alliance.binNumbers[0]);
                onSelectAlliance(item.alliance, targetBin);
                setActiveAllianceIndex(-1);
            }
        }
    };

    const hasCashTender = tenders.some((t) => t.method === "cash");

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5">

            {/* Active discount chip */}
            {discountMode !== "none" && orderDiscount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 text-sm">
                        <span className="font-medium">
                            {discountMode === "promo" && selectedPromo?.name}
                            {discountMode === "coupon" && `Coupon: ${appliedCoupon?.code}`}
                            {discountMode === "alliance" && selectedAlliance?.partnerName}
                            {discountMode === "manual" && "Manual Discount"}
                        </span>
                        <span className="text-muted-foreground ml-2 font-mono">
                            −{fmtCurrency(discountMode === "manual" && manualDiscountType === "flat" ? manualDiscountValue : orderDiscount)}
                        </span>
                        {discountMode === "alliance" && finalItemDiscounts === 0 && itemDiscounts > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">(replaces item discounts)</span>
                        )}
                    </div>
                    <button onClick={onClearDiscount} className="text-muted-foreground hover:text-foreground">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Alliance selected but item discounts are better */}
            {discountMode === "alliance" && selectedAlliance && orderDiscount === 0 && itemDiscounts > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                    <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 text-sm">
                        <span className="font-medium text-amber-700 dark:text-amber-400">{selectedAlliance.partnerName}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                            Item discounts ({fmtCurrency(itemDiscounts)}) are more beneficial — alliance not applied
                        </span>
                    </div>
                    <button onClick={onClearDiscount} className="text-muted-foreground hover:text-foreground">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Discount accordion */}
            <div className="rounded-xl border bg-card overflow-hidden">

                {/* ── Promos ── */}
                {canPromo && (
                    <details
                        className={cn("group", discountMode !== "none" && discountMode !== "promo" && "opacity-50 pointer-events-none")}
                        open
                    >
                        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-muted/30 hover:bg-muted/50 transition-colors border-b">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm flex-1">Promo Campaigns</span>
                            {selectedPromo && <Badge variant="secondary" className="text-xs">{selectedPromo.code}</Badge>}
                            {discountMode !== "none" && discountMode !== "promo" && (
                                <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                            )}
                        </summary>
                        <div className="p-3">
                            {isLoadingConfig ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                </div>
                            ) : promos.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">No active promos for this location.</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="max-h-[200px] overflow-y-auto">
                                        <div className="space-y-2 pr-1">
                                            {promos.map((promo) => {
                                                const discount = calcPromoDiscount(promo, subtotalAfterItems);
                                                const isSelected = selectedPromo?.id === promo.id && discountMode === "promo";
                                                const disabled = discountMode !== "none" && !isSelected;
                                                return (
                                                    <div key={promo.id}>
                                                        <button
                                                            disabled={disabled}
                                                            onClick={() => {
                                                                if (isSelected) { onClearDiscount(); return; }
                                                                onSelectPromo(promo);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left rounded-lg border px-3 py-2 transition-all text-sm",
                                                                isSelected ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:border-muted-foreground",
                                                                disabled && "opacity-40 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-semibold">{promo.name}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono">{promo.code}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-primary font-mono">−{fmtCurrency(discount)}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {promo.type === "percent" ? `${promo.value}%` : promo.type === "fixed" ? `Flat ${fmtCurrency(Number(promo.value))} off` : "Buy X Get Y"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>

                                                        {/* Per-item scope selector */}
                                                        {isSelected && (
                                                            <div className="mt-2 border rounded-lg px-3 py-2 bg-muted/20 space-y-2">
                                                                <button
                                                                    onClick={onTogglePromoScope}
                                                                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                                >
                                                                    {showPromoScope ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                                    Apply to: {promoScopeAll ? "All items" : `${promoScopedItems.size} item(s)`}
                                                                </button>
                                                                {showPromoScope && (
                                                                    <div className="space-y-1.5">
                                                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                                            <Checkbox
                                                                                checked={promoScopeAll}
                                                                                onCheckedChange={(v) => {
                                                                                    onSetPromoScopeAll(!!v);
                                                                                    if (v) onSetPromoScopedItems(new Set(cartItems.map((i) => i.id)));
                                                                                    else onSetPromoScopedItems(new Set());
                                                                                }}
                                                                            />
                                                                            <span className="font-medium">All items</span>
                                                                        </label>
                                                                        {cartItems.map((item) => (
                                                                            <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer ml-1">
                                                                                <Checkbox
                                                                                    checked={promoScopedItems.has(item.id)}
                                                                                    onCheckedChange={(v) => {
                                                                                        const next = new Set(promoScopedItems);
                                                                                        if (v) {
                                                                                            next.add(item.id);
                                                                                        } else {
                                                                                            next.delete(item.id);
                                                                                        }
                                                                                        onSetPromoScopedItems(next);
                                                                                        onSetPromoScopeAll(next.size === cartItems.length);
                                                                                    }}
                                                                                />
                                                                                <span className="truncate">{item.name}</span>
                                                                                <span className="font-mono text-muted-foreground ml-auto">{fmtCurrency(item.total)}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </details>
                )}

                {canCoupon && <Separator />}

                {/* ── Coupon Code ── */}
                {canCoupon && (
                    <details className={cn(discountMode !== "none" && discountMode !== "coupon" && "opacity-50 pointer-events-none")}>
                        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-muted/30 hover:bg-muted/50 transition-colors border-b">
                            <TicketPercent className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm flex-1">Coupon / Voucher Code</span>
                            {appliedCoupon && <Badge variant="secondary" className="text-xs">{appliedCoupon.code}</Badge>}
                            {discountMode !== "none" && discountMode !== "coupon" && (
                                <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                            )}
                        </summary>
                        <div className="p-3 space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    ref={couponInputRef}
                                    className="uppercase font-mono flex-1"
                                    placeholder="Coupon or voucher code... (F2)"
                                    value={couponInput}
                                    onChange={(e) => onCouponInputChange(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && onValidateCoupon()}
                                    disabled={!!appliedCoupon || (discountMode !== "none" && discountMode !== "coupon")}
                                />
                                <Button size="sm" onClick={onValidateCoupon}
                                    disabled={isValidatingCoupon || !couponInput.trim() || (discountMode !== "none" && discountMode !== "coupon")}>
                                    {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                                </Button>
                            </div>
                            {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                            {appliedCoupon?.description && <p className="text-xs text-muted-foreground">{appliedCoupon.description}</p>}
                        </div>
                    </details>
                )}

                {canAlliance && <Separator />}

                {/* ── Alliances ── */}
                {canAlliance && (
                    <details
                        ref={allianceDetailsRef}
                        className={cn(
                            (discountMode !== "none" && discountMode !== "alliance") && "opacity-50 pointer-events-none",
                            hasCashTender && "opacity-50 pointer-events-none"
                        )}
                        open={hasCashTender ? false : undefined}
                    >
                        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-muted/30 hover:bg-muted/50 transition-colors">
                            <Handshake className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm flex-1">Alliance / Bank Card</span>
                            {selectedAlliance && <Badge variant="secondary" className="text-xs">{selectedAlliance.code}</Badge>}
                            {hasCashTender ? (
                                <Badge variant="destructive" className="text-[10px]">Disabled (Cash added)</Badge>
                            ) : discountMode !== "none" && discountMode !== "alliance" && (
                                <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                            )}
                        </summary>
                        <div className="p-3 space-y-2.5">
                            {/* Smart Cart Context Indicator */}
                            {cartCtx.hasTagHeuer ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-md">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                        Cart contains <strong>TAG Heuer</strong> ({cartCtx.tagHeuerCount} item{cartCtx.tagHeuerCount > 1 ? "s" : ""}) — <strong>TAG Heuer 200k Capping</strong> prioritized.
                                    </span>
                                </div>
                            ) : cartCtx.hasWatches ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-sky-800 dark:text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2.5 py-1.5 rounded-md">
                                    <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                    <span>
                                        Cart contains <strong>Watches ({cartCtx.watchBrandNames.join(", ") || "General"})</strong> — <strong>Watches 20k Capping</strong> prioritized.
                                    </span>
                                </div>
                            ) : null}

                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    ref={allianceSearchRef}
                                    className="pl-8 text-sm"
                                    placeholder="Search bank, card type, or BIN... (F3)"
                                    value={allianceSearch}
                                    onChange={(e) => onAllianceSearch(e.target.value)}
                                    onKeyDown={handleAllianceKeyDown}
                                />
                            </div>

                            {isLoadingConfig ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading alliances...
                                </div>
                            ) : (
                                <div className="max-h-[240px] overflow-y-auto">
                                    <div className="space-y-2 pr-1">
                                        {filteredAlliances.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic py-1">No matching alliances found.</p>
                                        )}
                                        {filteredAlliances.map(({ alliance: a, meta }, idx) => {
                                            let disc = 0;
                                            const allianceBase = subtotal;
                                            if (a.maxDiscount) {
                                                disc = Math.min(
                                                    Math.round(allianceBase * (Number(a.discountPercent) / 100) * 100) / 100,
                                                    Number(a.maxDiscount)
                                                );
                                            } else {
                                                disc = Math.round(allianceBase * (Number(a.discountPercent) / 100) * 100) / 100;
                                            }
                                            const isSelected = selectedAlliance?.id === a.id && discountMode === "alliance";
                                            const disabled = discountMode !== "none" && !isSelected;
                                            const targetBin =
                                                meta.matchedBin ||
                                                (a.binNumbers.length === 1 ? a.binNumbers[0] : a.binNumbers[0] || "");

                                            return (
                                                <div key={a.id} className="space-y-1">
                                                    <button
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                onClearDiscount();
                                                                return;
                                                            }
                                                            onSelectAlliance(a, targetBin);
                                                        }}
                                                        className={cn(
                                                            "w-full text-left rounded-lg border p-2.5 transition-all text-sm relative",
                                                            isSelected
                                                                ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                                                                : meta.isRecommended
                                                                    ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10 shadow-sm"
                                                                    : "hover:border-muted-foreground bg-card",
                                                            idx === activeAllianceIndex && "ring-2 ring-primary border-primary",
                                                            disabled && "opacity-40 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-semibold text-xs text-foreground">
                                                                        {a.partnerName}
                                                                    </span>
                                                                    {meta.badgeText && (
                                                                        <span
                                                                            className={cn(
                                                                                "text-[9px] px-1.5 py-0.5 rounded-full font-medium border flex items-center gap-1",
                                                                                meta.badgeClass
                                                                            )}
                                                                        >
                                                                            {meta.isRecommended && (
                                                                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                                                                            )}
                                                                            {meta.badgeText}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="text-[11px] text-muted-foreground line-clamp-1 font-medium">
                                                                    {a.description || a.code}
                                                                </p>

                                                                {/* Interactive BIN Pills */}
                                                                {a.binNumbers.length > 0 && (
                                                                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                                        <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                                                                            BINs:
                                                                        </span>
                                                                        {a.binNumbers.slice(0, 4).map((bin) => {
                                                                            const isMatched = meta.matchedBin === bin;
                                                                            return (
                                                                                <button
                                                                                    type="button"
                                                                                    key={bin}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (!disabled) onSelectAlliance(a, bin);
                                                                                    }}
                                                                                    title={`Select alliance with BIN ${bin}`}
                                                                                    className={cn(
                                                                                        "font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                                                                        isMatched
                                                                                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-bold"
                                                                                            : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground"
                                                                                    )}
                                                                                >
                                                                                    {bin}
                                                                                    {isMatched && " ✓"}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                        {a.binNumbers.length > 4 && (
                                                                            <span className="text-[9px] text-muted-foreground font-mono">
                                                                                +{a.binNumbers.length - 4} more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="text-right shrink-0 ml-1">
                                                                <p className="font-bold text-primary font-mono text-sm leading-tight">
                                                                    −{fmtCurrency(disc)}
                                                                </p>
                                                                <p className="text-[10px] font-semibold text-foreground mt-0.5">
                                                                    {a.discountPercent}% off
                                                                </p>
                                                                {a.maxDiscount && (
                                                                    <p className="text-[9px] text-muted-foreground font-mono">
                                                                        Cap {fmtCurrency(Number(a.maxDiscount))}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {/* Active alliance status */}
                                                    {isSelected && (
                                                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                                <span>
                                                                    Alliance applied • Selected BIN: <strong className="font-mono">{targetBin || "Ready"}</strong>
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] opacity-80">(Auto-passed to Payment)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </details>
                )}

                {canManualDiscount && <Separator />}

                {/* ── Manual Global Discount ── */}
                {canManualDiscount && (
                    <details className={cn(discountMode !== "none" && discountMode !== "manual" && "opacity-50 pointer-events-none")}>
                        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-muted/30 hover:bg-muted/50 transition-colors">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm flex-1">Manual Discount</span>
                            {discountMode === "manual" && orderDiscount > 0 &&
                                <Badge variant="secondary" className="text-xs">
                                    −{fmtCurrency(manualDiscountType === "flat" ? manualDiscountValue : orderDiscount)}
                                </Badge>}
                            {discountMode !== "none" && discountMode !== "manual" && (
                                <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                            )}
                        </summary>
                        <div className="p-3 space-y-3">
                            {!managerVerified && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    🔒 Manager / Admin verification required
                                </p>
                            )}
                            <RadioGroup
                                value={manualDiscountType}
                                onValueChange={(v) => onManualDiscountTypeChange(v as "percent" | "flat")}
                                className="flex gap-4"
                                disabled={discountMode !== "none" && discountMode !== "manual"}
                            >
                                <div className="flex items-center gap-1.5">
                                    <RadioGroupItem value="percent" id="disc-pct" />
                                    <Label htmlFor="disc-pct" className="text-sm flex items-center gap-1">
                                        <Percent className="h-3 w-3" /> Percentage (max 50%)
                                    </Label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <RadioGroupItem value="flat" id="disc-flat" />
                                    <Label htmlFor="disc-flat" className="text-sm">Flat PKR</Label>
                                </div>
                            </RadioGroup>
                            {(() => {
                                 const typedVal = parseFloat(tempManualDiscountValue) || 0;
                                 const maxAllowedFlat = Math.round((grandTotalBeforeManual || 0) * 0.5);
                                 const isOverLimit = manualDiscountType === "percent"
                                     ? typedVal > 50
                                     : typedVal > maxAllowedFlat;
                                 
                                 const limitErrorMessage = manualDiscountType === "percent"
                                     ? "Manual discount cannot exceed 50%"
                                     : `Manual discount cannot exceed ${fmtCurrency(maxAllowedFlat)} (50% of Grand Total)`;

                                 return (
                                     <>
                                         <div className="flex gap-2">
                                             <Input
                                                 type="number"
                                                 className={cn("font-mono", isOverLimit && "border-destructive focus-visible:ring-destructive")}
                                                 placeholder={manualDiscountType === "percent" ? "0 – 50" : `Max ${fmtCurrency(maxAllowedFlat)}`}
                                                 value={tempManualDiscountValue}
                                                 onChange={(e) => {
                                                     setTempManualDiscountValue(e.target.value);
                                                 }}
                                                 onKeyDown={(e) => {
                                                     if (e.key === "Enter" && !isOverLimit) {
                                                         onManualDiscountValueChange(typedVal);
                                                     }
                                                 }}
                                                 disabled={discountMode !== "none" && discountMode !== "manual"}
                                             />
                                             {tempManualDiscountValue !== "" && typedVal !== manualDiscountValue && (
                                                 <Button
                                                     size="sm"
                                                     disabled={isOverLimit}
                                                     onClick={() => {
                                                         onManualDiscountValueChange(typedVal);
                                                     }}
                                                 >
                                                     Apply
                                                 </Button>
                                             )}
                                             {discountMode === "manual" && (
                                                 <Button variant="ghost" size="icon" onClick={() => {
                                                     setTempManualDiscountValue("");
                                                     onClearDiscount();
                                                 }}>
                                                     <XCircle className="h-4 w-4 text-muted-foreground" />
                                                 </Button>
                                             )}
                                         </div>
                                         {isOverLimit && (
                                             <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                                                 ⚠️ {limitErrorMessage}
                                             </p>
                                         )}
                                     </>
                                 );
                             })()}
                             {discountMode === "manual" && orderDiscount > 0 && (
                                 <p className="text-xs text-primary font-semibold">
                                     Discount (WOST): −{fmtCurrency(orderDiscount)}
                                     {manualDiscountType === "flat" && ` (WST: −${fmtCurrency(manualDiscountValue)})`}
                                 </p>
                             )}
                             {discountMode === "manual" && (
                                 <div className="space-y-2 pt-2 border-t border-dashed">
                                     <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                         Attach Alliance / Bank Card (Optional, for reporting)
                                     </Label>
                                     <div className="relative">
                                         <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                         <Input
                                             className="pl-8 h-8 text-xs placeholder:text-[10px]"
                                             placeholder="Search bank name, code, or BIN..."
                                             value={manualAllianceSearch}
                                             onChange={(e) => setManualAllianceSearch(e.target.value)}
                                         />
                                     </div>
                                     <div className="max-h-[220px] overflow-y-auto border rounded-lg p-1.5 bg-muted/20 space-y-1.5">
                                          <button
                                              type="button"
                                              onClick={() => onSelectAlliance(null)}
                                              className={cn(
                                                  "w-full text-left rounded-lg px-3 py-2 transition-all text-xs flex justify-between items-center border",
                                                  !selectedAlliance 
                                                      ? "bg-primary/10 text-primary font-semibold border-primary ring-1 ring-primary" 
                                                      : "border-transparent hover:bg-muted text-muted-foreground"
                                              )}
                                          >
                                              <span className="font-medium">-- No Alliance Attached --</span>
                                              {!selectedAlliance && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                          </button>
                                          {filteredManualAlliances.map(({ alliance: a, meta }) => {
                                              const isSelected = selectedAlliance?.id === a.id;
                                              const targetBin =
                                                  meta.matchedBin ||
                                                  (a.binNumbers?.length === 1 ? a.binNumbers[0] : a.binNumbers?.[0] || "");
                                              return (
                                                  <button
                                                      type="button"
                                                      key={a.id}
                                                      onClick={() => onSelectAlliance(a, targetBin)}
                                                      className={cn(
                                                          "w-full text-left rounded-lg px-3 py-2 transition-all text-xs flex justify-between items-center border",
                                                          isSelected 
                                                              ? "bg-primary/10 text-primary border-primary ring-1 ring-primary" 
                                                              : "border-border/60 hover:bg-muted hover:border-muted-foreground/40 bg-card"
                                                      )}
                                                  >
                                                      <div className="flex flex-col min-w-0 pr-2">
                                                          <span className="font-semibold text-xs text-foreground truncate">{a.partnerName}</span>
                                                          {(a.description || a.code) && (
                                                              <span className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate">
                                                                  {a.description || a.code}
                                                              </span>
                                                          )}
                                                          {a.binNumbers?.length > 0 && (
                                                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                                                                  BIN: {a.binNumbers.join(", ")}
                                                              </span>
                                                          )}
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0">
                                                          <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                                              {a.discountPercent}% off
                                                          </span>
                                                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                      </div>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                 </div>
                             )}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
