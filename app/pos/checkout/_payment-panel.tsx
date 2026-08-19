"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Loader2, Plus, Trash2, CreditCard, Banknote, Building2, Ticket, BookOpen,
    CheckCircle2, XCircle, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tender, Customer, AllianceConfig, DiscountMode } from "./page";

export interface MerchantConfig {
    id: string;
    description: string;
    bankName: string;
    merchantCode: number;
    commissionRate: string | number;
    tagId: string;
    costCentreTag: string;
    bankGlCode: string;
}

interface ValidatedVoucher {
    id: string;
    code: string;
    voucherType: string;
    faceValue: number;
    description?: string;
    customerId?: string;
    requireCustomerMatch: boolean;
}

const TENDER_OPTIONS = [
    { value: "cash", label: "Cash (Alt+1)", icon: Banknote },
    { value: "card", label: "Card (Alt+2)", icon: CreditCard },
    { value: "bank_transfer", label: "Bank Transfer (Alt+3)", icon: Building2 },
    { value: "voucher", label: "Voucher (Alt+4)", icon: Ticket },
    { value: "credit_account", label: "Credit Account (Alt+5)", icon: BookOpen },
    { value: "reward_voucher", label: "Reward Voucher (Alt+6)", icon: Award },
];
interface PaymentPanelProps {
    tenders: Tender[];
    tenderMethod: string;
    tenderAmount: number;
    tenderCardholderName: string;
    tenderCardLast4: string;
    tenderSlip: string;
    tenderRemarks: string;
    balanceDue: number;
    changeAmount: number;
    discountMode: DiscountMode;
    selectedAlliance: AllianceConfig | null;
    selectedCustomer: Customer | null;
    // Merchant
    merchants: MerchantConfig[];
    selectedMerchant: MerchantConfig | null;
    isLoadingMerchants: boolean;
    onMerchantChange: (merchant: MerchantConfig | null) => void;
    // Voucher
    voucherCode: string;
    validatedVoucher: ValidatedVoucher | null;
    voucherError: string | null;
    voucherValidating: boolean;
    // Alliance meta
    allianceMeta: { cardholderName: string; cardLast4: string; merchantSlip: string; binNumber: string };
    onAllianceMetaChange: (val: { cardholderName: string; cardLast4: string; merchantSlip: string; binNumber: string }) => void;
    // Refs
    tenderAmountRef: React.RefObject<HTMLInputElement | null>;
    // Handlers
    onTenderMethodChange: (method: string) => void;
    onTenderAmountChange: (amount: number) => void;
    onTenderCardholderNameChange: (val: string) => void;
    onTenderCardLast4Change: (val: string) => void;
    onTenderSlipChange: (val: string) => void;
    onTenderRemarksChange: (val: string) => void;
    onAddTender: () => void;
    onAddVoucherTender: () => void;
    onRemoveTender: (index: number) => void;
    onVoucherCodeChange: (val: string) => void;
    onVoucherValidate: (code: string) => void;
    fmtCurrency: (v: number) => string;
}

export function PaymentPanel({
    tenders, tenderMethod, tenderAmount, tenderCardholderName, tenderCardLast4, tenderSlip, tenderRemarks,
    balanceDue, changeAmount, discountMode, selectedAlliance, selectedCustomer,
    merchants, selectedMerchant, isLoadingMerchants, onMerchantChange,
    voucherCode, validatedVoucher, voucherError, voucherValidating,
    allianceMeta, onAllianceMetaChange,
    tenderAmountRef,
    onTenderMethodChange, onTenderAmountChange,
    onTenderCardholderNameChange, onTenderCardLast4Change, onTenderSlipChange, onTenderRemarksChange,
    onAddTender, onAddVoucherTender, onRemoveTender,
    onVoucherCodeChange, onVoucherValidate,
    fmtCurrency,
}: PaymentPanelProps) {
    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Payment</span>
            </div>
            <div className="p-3 space-y-3">
                {/* Tender type + amount */}
                 <div className="space-y-2">
                    <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Tender Type
                            {(discountMode === "alliance" || discountMode === "manual") && selectedAlliance && (
                                <span className="ml-2 text-xs text-primary font-normal">(Card or Voucher payment required)</span>
                            )}
                        </Label>
                        <Select
                            value={tenderMethod}
                            onValueChange={onTenderMethodChange}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TENDER_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <SelectItem key={value} value={value}>
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-3.5 w-3.5" /> {label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount to Pay</Label>
                        <Input
                            ref={tenderAmountRef}
                            type="number"
                            min={0}
                            className="mt-1 font-mono"
                            placeholder={`${fmtCurrency(balanceDue)}`}
                            value={tenderAmount || ""}
                            onChange={(e) => onTenderAmountChange(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => e.key === "Enter" && onAddTender()}
                        />
                    </div>

                    {/* Credit account notices */}
                    {tenderMethod === "credit_account" && !selectedCustomer && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>Select a customer above to post this sale to their Credit Account (Accounts Receivable).</span>
                        </div>
                    )}
                    {tenderMethod === "credit_account" && selectedCustomer && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-700">
                            <BookOpen className="h-3.5 w-3.5 shrink-0" />
                            <span>Will be posted to <strong>{selectedCustomer.name}</strong>'s Credit Account as an outstanding receivable.</span>
                        </div>
                    )}

                    {/* Card / bank transfer extra fields */}
                    {(tenderMethod === "card" || tenderMethod === "bank_transfer") && (
                        <div className="space-y-2">
                             {/* Alliance context banner */}
                             {(discountMode === "alliance" || discountMode === "manual") && selectedAlliance && (
                                 <div className="flex items-start gap-2 rounded-lg border border-blue-300/60 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                                     <CreditCard className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                     <span>
                                         Card details below will be recorded for the{" "}
                                         <strong>{selectedAlliance.partnerName}</strong> alliance discount on this order.
                                     </span>
                                 </div>
                             )}

                             {/* ── Merchant & BIN Selector ── */}
                             <div className={cn(
                                 "grid gap-3",
                                 (discountMode === "alliance" || discountMode === "manual") && selectedAlliance && selectedAlliance.binNumbers?.length > 0
                                     ? "grid-cols-1 md:grid-cols-2"
                                     : "grid-cols-1"
                             )}>
                                {/* ── Merchant selector ── */}
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                        Merchant / Bank Terminal
                                        <span className="text-destructive ml-0.5">*</span>
                                    </Label>
                                    <Select
                                        value={selectedMerchant?.id || ""}
                                        onValueChange={(val) => {
                                            if (!val) { onMerchantChange(null); return; }
                                            const m = merchants.find(m => m.id === val);
                                            onMerchantChange(m || null);
                                        }}
                                    >
                                        <SelectTrigger 
                                            id="merchant-terminal-select"
                                            className={cn(
                                                "mt-1 h-9",
                                                !selectedMerchant && "border-amber-400 focus:ring-amber-400"
                                            )}
                                        >
                                            {isLoadingMerchants ? (
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading merchants...
                                                </span>
                                            ) : (
                                                <SelectValue placeholder="Select merchant terminal..." />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {merchants.length === 0 && !isLoadingMerchants && (
                                                <div className="p-3 text-center text-xs text-muted-foreground italic">
                                                    No merchants configured for this location
                                                </div>
                                            )}
                                            {merchants.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    <div className="flex flex-col py-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm">{m.bankName}</span>
                                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-mono">
                                                                #{m.merchantCode}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {m.description} · {(Number(m.commissionRate) * 100).toFixed(2)}% commission
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!selectedMerchant && merchants.length > 0 && (
                                        <p className="text-[10px] text-amber-600 mt-1">Select bank terminal</p>
                                    )}
                                    {selectedMerchant && (
                                        <div className="mt-1.5 flex items-center gap-3 rounded-md bg-muted/30 border px-2.5 py-1.5 text-xs">
                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium">{selectedMerchant.bankName}</span>
                                                <span className="text-muted-foreground ml-2 text-[10px]">{(Number(selectedMerchant.commissionRate) * 100).toFixed(1)}%</span>
                                            </div>
                                            <span className="font-mono text-muted-foreground text-[10px]">{selectedMerchant.tagId}</span>
                                        </div>
                                    )}
                                </div>

                                {/* ── BIN Number selector ── */}
                                {(discountMode === "alliance" || discountMode === "manual") && selectedAlliance && selectedAlliance.binNumbers?.length > 0 && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                            Card BIN Number
                                            <span className="text-destructive ml-0.5">*</span>
                                        </Label>
                                        <Select
                                            value={allianceMeta?.binNumber || ""}
                                            onValueChange={(val) => {
                                                onAllianceMetaChange({
                                                    ...allianceMeta,
                                                    binNumber: val,
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="mt-1 h-9">
                                                <SelectValue placeholder="Select BIN..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedAlliance.binNumbers.map((bin) => (
                                                    <SelectItem key={bin} value={bin}>
                                                        <span className="font-mono font-medium">{bin}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {!allianceMeta?.binNumber && (
                                            <p className="text-[10px] text-amber-600 mt-1">Select qualifying BIN number</p>
                                        )}
                                        {allianceMeta?.binNumber && (
                                            <div className="mt-1.5 flex items-center gap-3 rounded-md bg-muted/30 border px-2.5 py-1.5 text-xs">
                                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium">Selected BIN: </span>
                                                    <span className="font-mono font-bold text-primary">{allianceMeta.binNumber}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground">Cardholder Name</Label>
                                    <Input
                                        className="mt-1 h-8 text-xs"
                                        placeholder="Name on card"
                                        value={tenderCardholderName}
                                        onChange={(e) => onTenderCardholderNameChange(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Card # (last 4){(discountMode === "alliance" || discountMode === "manual") && selectedAlliance && <span className="text-destructive font-bold ml-0.5">*</span>}
                                    </Label>
                                    <Input className="mt-1 h-8 text-xs font-mono" maxLength={4} placeholder="••••"
                                        value={tenderCardLast4}
                                        onChange={(e) => onTenderCardLast4Change(e.target.value.replace(/\D/g, ""))} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        AUTH ID / Approval Code{(discountMode === "alliance" || discountMode === "manual") && selectedAlliance && <span className="text-destructive font-bold ml-0.5">*</span>}
                                    </Label>
                                    <Input className="mt-1 h-8 text-xs font-mono" maxLength={6} placeholder="6-digit Auth ID"
                                        value={tenderSlip}
                                        onChange={(e) => onTenderSlipChange(e.target.value.replace(/\D/g, ""))} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reward Voucher tender */}
                    {tenderMethod === "reward_voucher" && (
                        <div className="space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/40 dark:bg-violet-950/20 p-2.5">
                            <Label className="text-xs font-semibold text-violet-800 dark:text-violet-300 uppercase tracking-wide">
                                Remarks / Reference <span className="text-destructive ml-0.5">*</span>
                            </Label>
                            <Input
                                id="reward-voucher-remarks-input"
                                className="h-9 text-xs bg-background"
                                placeholder="Enter reward voucher remarks, ref #, or reason..."
                                value={tenderRemarks}
                                onChange={(e) => onTenderRemarksChange(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && onAddTender()}
                                autoFocus
                            />
                            <p className="text-[10px] text-muted-foreground">
                                This voucher payment will be recorded as <strong>On Credit</strong> in reconciliation reports.
                            </p>
                        </div>
                    )}

                    {/* Voucher tender */}
                    {tenderMethod === "voucher" && (
                        <div className="space-y-2">
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Voucher Code</Label>
                                <div className="relative mt-1">
                                    <Input
                                        id="voucher-code-input"
                                        className={cn(
                                            "font-mono uppercase pr-8 h-9 text-sm",
                                            validatedVoucher && "border-emerald-400 focus-visible:ring-emerald-400",
                                            voucherError && "border-destructive focus-visible:ring-destructive",
                                        )}
                                        placeholder="e.g. GFT-ABC123"
                                        value={voucherCode}
                                        onChange={(e) => onVoucherCodeChange(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && onVoucherValidate(voucherCode)}
                                        maxLength={25}
                                    />
                                    <div className="absolute right-2 top-2">
                                        {voucherValidating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {!voucherValidating && validatedVoucher && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                        {!voucherValidating && voucherError && <XCircle className="h-4 w-4 text-destructive" />}
                                    </div>
                                </div>
                                {voucherError && <p className="text-xs text-destructive mt-1">{voucherError}</p>}
                            </div>
                            {validatedVoucher && (() => {
                                const currentAmountToPay = Number(tenderAmount) || 0;
                                const redeemingAmount = Math.min(currentAmountToPay, validatedVoucher.faceValue);
                                const remainingVoucherBalance = Math.max(0, validatedVoucher.faceValue - redeemingAmount);
                                const remainingBillDue = Math.max(0, balanceDue - redeemingAmount);

                                return (
                                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 space-y-2.5 shadow-sm animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200 dark:border-emerald-800">
                                            <div className="flex items-center gap-1.5">
                                                <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 font-mono tracking-wider">
                                                    {validatedVoucher.code}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/50">
                                                {validatedVoucher.voucherType.replace("_", " ")} VOUCHER
                                            </Badge>
                                        </div>

                                        {validatedVoucher.description && (
                                            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90 italic">
                                                {validatedVoucher.description}
                                            </p>
                                        )}

                                        {/* Real-time financial calculations */}
                                        <div className="space-y-1.5 pt-1 text-xs font-mono">
                                            <div className="flex justify-between items-center text-muted-foreground">
                                                <span>Voucher Total Amount:</span>
                                                <span className="font-bold text-foreground">{fmtCurrency(validatedVoucher.faceValue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-semibold">
                                                <span>Amount Redeeming (This Bill):</span>
                                                <span>−{fmtCurrency(redeemingAmount)}</span>
                                            </div>
                                            <div className="border-t border-emerald-200 dark:border-emerald-800 pt-1.5 flex justify-between items-center text-xs">
                                                <span className={remainingVoucherBalance > 0 ? "text-blue-700 dark:text-blue-300 font-bold" : "text-muted-foreground font-semibold"}>
                                                    Remaining Voucher Balance:
                                                </span>
                                                <span className={cn(
                                                    "font-bold font-mono text-sm",
                                                    remainingVoucherBalance > 0 ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"
                                                )}>
                                                    {remainingVoucherBalance > 0 ? fmtCurrency(remainingVoucherBalance) : "PKR 0 (Fully Used)"}
                                                </span>
                                            </div>
                                            {remainingBillDue > 0 && (
                                                <div className="flex justify-between items-center text-destructive font-semibold pt-0.5">
                                                    <span>Remaining Bill Due:</span>
                                                    <span>{fmtCurrency(remainingBillDue)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Live helper note */}
                                        {remainingVoucherBalance > 0 ? (
                                            <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                                <span>ℹ️ Remaining <strong>{fmtCurrency(remainingVoucherBalance)}</strong> balance stays available on this voucher.</span>
                                            </div>
                                        ) : (
                                            <div className="rounded-md bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                                <span>✓ Voucher covers required portion completely.</span>
                                            </div>
                                        )}

                                        {validatedVoucher.requireCustomerMatch && (
                                            <p className="text-[10px] text-amber-600 font-medium">Customer-bound voucher — verified ✓</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <Button
                        className="w-full gap-2"
                        disabled={
                            (tenderMethod === "voucher" && !validatedVoucher) ||
                            ((tenderMethod === "card" || tenderMethod === "bank_transfer") && !selectedMerchant && merchants.length > 0)
                        }
                        onClick={() => {
                            if (tenderMethod === "voucher") {
                                onAddVoucherTender();
                                return;
                            }
                            if (!tenderAmount || tenderAmount <= 0) {
                                onTenderAmountChange(balanceDue);
                                return;
                            }
                            onAddTender();
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Payment
                    </Button>
                </div>

                {/* Tenders list */}
                {tenders.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_auto_auto] text-xs text-muted-foreground font-medium px-1">
                            <span>Method / Details</span><span>Amount</span><span></span>
                        </div>
                        {tenders.map((t, i) => {
                            const Icon = TENDER_OPTIONS.find((o) => o.value === t.method)?.icon ?? Banknote;
                            const isVoucher = t.method === "voucher" || t.voucherFaceValue !== undefined;
                            const faceVal = t.voucherFaceValue ?? t.amount;
                            const remainingVal = Math.max(0, faceVal - t.amount);

                            return (
                                <div key={i} className="flex flex-col gap-1 rounded-lg px-2.5 py-2 bg-muted/40 border text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 font-medium capitalize">
                                            <Icon className="h-4 w-4 text-primary" />
                                            {t.voucherType ? `${t.voucherType.replace("_", " ")} Voucher` : t.method.replace("_", " ")}
                                            {t.slipNo && (
                                                <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30 ml-1">
                                                    {t.slipNo}
                                                </Badge>
                                            )}
                                            {t.cardLast4 && <span className="text-xs text-muted-foreground font-mono">••{t.cardLast4}</span>}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-foreground">{fmtCurrency(t.amount)}</span>
                                            <button
                                                onClick={() => onRemoveTender(i)}
                                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                title="Remove tender"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Voucher / Exchange remaining details */}
                                    {isVoucher && (
                                        <div className="flex items-center justify-between text-xs text-muted-foreground bg-card/60 rounded px-2 py-1 font-mono border border-border/40 mt-0.5">
                                            <span>Voucher Total: <strong className="text-foreground">{fmtCurrency(faceVal)}</strong></span>
                                            <span>
                                                Remaining:{" "}
                                                <strong className={remainingVal > 0 ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground"}>
                                                    {remainingVal > 0 ? fmtCurrency(remainingVal) : "PKR 0"}
                                                </strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Total Remaining Voucher Credit */}
                {tenders.some(t => t.method === "voucher" && (t.voucherFaceValue ?? 0) > t.amount) && (
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <span className="flex items-center gap-1.5">
                            <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Remaining Voucher Balance (Unused):
                        </span>
                        <span className="font-mono font-bold text-sm">
                            {fmtCurrency(
                                tenders
                                    .filter(t => t.method === "voucher")
                                    .reduce((acc, t) => acc + Math.max(0, (t.voucherFaceValue || t.amount) - t.amount), 0)
                            )}
                        </span>
                    </div>
                )}

                {/* Balance due / change */}
                {!(balanceDue <= 0 && changeAmount === 0) && (
                    <div className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold",
                        balanceDue <= 0 ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                    )}>
                        <span>{balanceDue <= 0 ? (changeAmount > 0 ? "Change" : "Balance Paid ✓") : "Balance Due"}</span>
                        <span className="font-mono">
                            {balanceDue <= 0 && changeAmount > 0 ? fmtCurrency(changeAmount) : fmtCurrency(balanceDue)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
