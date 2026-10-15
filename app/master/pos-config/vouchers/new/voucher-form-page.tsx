"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Loader2,
    ArrowLeft,
    Gift,
    Copy,
    CheckCircle2,
    MapPin,
    Building2,
    Plus,
    Trash2,
    Download,
    Printer,
    Layers,
    Sparkles,
    Calculator,
    Check,
    CreditCard,
    Wallet,
    Calendar,
    AlertCircle,
    FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import {
    issueVoucher,
    bulkIssueVouchers,
    Voucher,
    VoucherType,
    getMerchants,
    MerchantConfig
} from "@/lib/actions/vouchers";
import { Location } from "@/lib/actions/location";
import { LocationMultiSelect } from "../../_components/location-multi-select";
import { formatCurrency } from "@/lib/utils";
import { getCustomers, createCustomer } from "@/lib/actions/customer";
import type { Customer } from "@/lib/actions/customer";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";

interface Props { locations: Location[] }

const VOUCHER_TYPE_OPTIONS: { value: VoucherType; label: string }[] = [
    { value: "GIFT", label: "Gift Voucher" },
    { value: "CORPORATE", label: "Corporate Gift" },
];

const MAX_VOUCHER_LIMIT = 50;
const QUANTITY_PRESETS = [1, 5, 10, 20, 25, 50];

interface CustomRow {
    id: string;
    voucherType: VoucherType;
    faceValue: number | "";
    discount: number | "";
    description: string;
}

interface IssuedBatchResult {
    count: number;
    codes: string[];
    vouchers: Array<{
        id: string;
        code: string;
        faceValue: number;
        discount?: number;
        voucherType: VoucherType;
        expiresAt?: string;
    }>;
}

export function VoucherFormPage({ locations }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Mode: 'batch' (same amount) vs 'custom' (table with individual amounts)
    const [mode, setMode] = useState<"batch" | "custom">("batch");

    // ── Batch Mode Fields ──────────────────────────────────────
    const [quantity, setQuantity] = useState<number>(1);
    const [voucherType, setVoucherType] = useState<VoucherType>("GIFT");
    const [faceValue, setFaceValue] = useState<number | "">("");
    const [discount, setDiscount] = useState<number | "">("");
    const [description, setDescription] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [companyName, setCompanyName] = useState("");
    const [companyGlCode, setCompanyGlCode] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [locationIds, setLocationIds] = useState<string[]>([]);

    // ── Payment Mode (Gift Vouchers) ───────────────────────────
    const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD">("CASH");
    const [merchantId, setMerchantId] = useState<string>("");
    const [cardholderName, setCardholderName] = useState<string>("");
    const [cardLast4, setCardLast4] = useState<string>("");
    const [slipNo, setSlipNo] = useState<string>("");

    // ── Custom Multi-Grid Mode State (up to 50 rows) ───────────
    const [customRows, setCustomRows] = useState<CustomRow[]>([
        { id: "1", voucherType: "GIFT", faceValue: 1000, discount: 0, description: "" },
        { id: "2", voucherType: "GIFT", faceValue: 1000, discount: 0, description: "" },
        { id: "3", voucherType: "GIFT", faceValue: 1000, discount: 0, description: "" },
    ]);
    const [fillAmountInput, setFillAmountInput] = useState<number | "">("");

    // ── Merchants & Customers Cache ────────────────────────────
    const [merchants, setMerchants] = useState<MerchantConfig[]>([]);
    const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // ── Success Modal Result ───────────────────────────────────
    const [issuedResult, setIssuedResult] = useState<IssuedBatchResult | null>(null);

    useEffect(() => {
        setIsLoadingMerchants(true);
        getMerchants()
            .then(res => {
                if (res.status && res.data) setMerchants(res.data);
            })
            .catch(() => toast.error("Failed to load merchant terminals"))
            .finally(() => setIsLoadingMerchants(false));

        getCustomers().then(data => {
            setCustomers(data);
        });
    }, []);

    const resolveCustomerCode = (c: Customer) => {
        return c.code || c.subCode || c.traderId || (c.id ? `CUST-${c.id.slice(-6).toUpperCase()}` : "");
    };

    const customerOptions: AutocompleteOption[] = useMemo(() => {
        return customers.map((c) => {
            const code = resolveCustomerCode(c);
            return {
                value: c.id,
                label: c.name,
                description: code ? `Code: ${code}${c.contactNo ? ` • ${c.contactNo}` : ""}` : (c.contactNo || undefined),
            };
        });
    }, [customers]);

    const handleCustomerSelect = (customerId: string) => {
        setSelectedCustomerId(customerId);
        const cust = customers.find((c) => c.id === customerId);
        if (cust) {
            setCompanyName(cust.name);
            const code = resolveCustomerCode(cust);
            setCompanyGlCode(code);
        } else {
            setCompanyName("");
            setCompanyGlCode("");
        }
    };

    const handleCreateCustomer = async (typedName: string) => {
        if (!typedName.trim()) return;
        try {
            toast.loading(`Creating ERP customer "${typedName}"...`, { id: "create-cust" });
            const res = await createCustomer({ name: typedName.trim() });
            if (res?.status && res?.data) {
                const newCust = res.data;
                const code = resolveCustomerCode(newCust);
                setCustomers((prev) => [newCust, ...prev]);
                setSelectedCustomerId(newCust.id);
                setCompanyName(newCust.name);
                setCompanyGlCode(code);
                toast.success(`Customer "${newCust.name}" created with code ${code}`, { id: "create-cust" });
            } else {
                toast.error(res?.message || "Failed to create customer", { id: "create-cust" });
            }
        } catch {
            toast.error("Failed to create customer", { id: "create-cust" });
        }
    };

    const stockLocations = useMemo(() => {
        return locations.filter((loc) => loc.isStockLocation !== false);
    }, [locations]);

    const goBack = () => {
        startTransition(() => {
            router.push("/master/pos-config/vouchers");
        });
    };

    // ── Batch Financial Totals ─────────────────────────────────
    const batchSummary = useMemo(() => {
        const qty = Math.min(Math.max(Number(quantity || 1), 1), MAX_VOUCHER_LIMIT);
        const singleVal = Number(faceValue || 0);
        const singleDisc = Number(discount || 0);
        const totalFaceValue = qty * singleVal;
        const totalDiscount = qty * singleDisc;
        const totalPayable = totalFaceValue - totalDiscount;

        return {
            qty,
            singleVal,
            singleDisc,
            totalFaceValue,
            totalDiscount,
            totalPayable,
        };
    }, [quantity, faceValue, discount]);

    // ── Custom Grid Financial Totals ───────────────────────────
    const customSummary = useMemo(() => {
        const count = customRows.length;
        const totalFaceValue = customRows.reduce((acc, r) => acc + (Number(r.faceValue) || 0), 0);
        const totalDiscount = customRows.reduce((acc, r) => acc + (Number(r.discount) || 0), 0);
        const totalPayable = totalFaceValue - totalDiscount;

        return {
            count,
            totalFaceValue,
            totalDiscount,
            totalPayable,
        };
    }, [customRows]);

    // ── Custom Row Operations ──────────────────────────────────
    const addCustomRow = () => {
        if (customRows.length >= MAX_VOUCHER_LIMIT) {
            toast.error(`Maximum limit of ${MAX_VOUCHER_LIMIT} vouchers reached.`);
            return;
        }
        setCustomRows(prev => [
            ...prev,
            {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                voucherType,
                faceValue: faceValue ? Number(faceValue) : 1000,
                discount: discount ? Number(discount) : 0,
                description: "",
            }
        ]);
    };

    const addMultipleCustomRows = (count: number) => {
        const availableSlots = MAX_VOUCHER_LIMIT - customRows.length;
        if (availableSlots <= 0) {
            toast.error(`Maximum limit of ${MAX_VOUCHER_LIMIT} vouchers reached.`);
            return;
        }
        const toAdd = Math.min(count, availableSlots);
        const newRows: CustomRow[] = [];
        for (let i = 0; i < toAdd; i++) {
            newRows.push({
                id: Date.now().toString() + "-" + i + "-" + Math.random().toString(36).substring(2, 5),
                voucherType,
                faceValue: faceValue ? Number(faceValue) : 1000,
                discount: discount ? Number(discount) : 0,
                description: "",
            });
        }
        setCustomRows(prev => [...prev, ...newRows]);
        toast.info(`Added ${toAdd} voucher rows.`);
    };

    const removeCustomRow = (id: string) => {
        if (customRows.length <= 1) {
            toast.error("At least 1 voucher row is required.");
            return;
        }
        setCustomRows(prev => prev.filter(r => r.id !== id));
    };

    const updateCustomRow = (id: string, field: keyof CustomRow, val: any) => {
        setCustomRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    const handleApplyFillAmount = () => {
        if (!fillAmountInput || Number(fillAmountInput) <= 0) {
            toast.error("Please enter a valid amount to fill down.");
            return;
        }
        const val = Number(fillAmountInput);
        setCustomRows(prev => prev.map(r => ({ ...r, faceValue: val })));
        toast.success(`Updated all ${customRows.length} rows to Rs. ${val.toLocaleString()}`);
    };

    // ── Form Submission ────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Common validations
        if (voucherType === "GIFT" && paymentMode === "CARD") {
            if (!merchantId) {
                toast.error("Merchant terminal is required for card payments");
                return;
            }
            if (cardLast4 && !/^\d{4}$/.test(cardLast4)) {
                toast.error("Card last 4 digits must be exactly 4 digits");
                return;
            }
        }

        if (voucherType === "CORPORATE" && (!companyGlCode || !companyName)) {
            toast.error("Please select an ERP customer/company for corporate vouchers");
            return;
        }

        if (mode === "batch") {
            const qty = Math.min(Math.max(Number(quantity || 1), 1), MAX_VOUCHER_LIMIT);
            if (!faceValue || Number(faceValue) <= 0) {
                toast.error("Enter a valid voucher amount");
                return;
            }
            if (discount && (Number(discount) < 0 || Number(discount) >= Number(faceValue))) {
                toast.error("Discount must be positive and less than the face value");
                return;
            }

            startTransition(async () => {
                if (qty === 1) {
                    // Single voucher issuance
                    const result = await issueVoucher({
                        voucherType,
                        faceValue: Number(faceValue),
                        discount: discount ? Number(discount) : 0,
                        description: description || undefined,
                        customerId: voucherType === "CORPORATE" ? selectedCustomerId || undefined : undefined,
                        companyName: voucherType === "CORPORATE" ? companyName || undefined : undefined,
                        companyGlCode: voucherType === "CORPORATE" ? companyGlCode || undefined : undefined,
                        expiresAt: expiresAt || undefined,
                        locationIds,
                        paymentMode: voucherType === "GIFT" ? paymentMode : undefined,
                        merchantId: (voucherType === "GIFT" && paymentMode === "CARD") ? merchantId : undefined,
                        cardholderName: (voucherType === "GIFT" && paymentMode === "CARD") ? cardholderName || undefined : undefined,
                        cardLast4: (voucherType === "GIFT" && paymentMode === "CARD") ? cardLast4 || undefined : undefined,
                        slipNo: (voucherType === "GIFT" && paymentMode === "CARD") ? slipNo || undefined : undefined,
                    });

                    if (result.status && result.data) {
                        setIssuedResult({
                            count: 1,
                            codes: [result.data.code],
                            vouchers: [{
                                id: result.data.id,
                                code: result.data.code,
                                faceValue: Number(result.data.faceValue),
                                discount: Number(result.data.discount || 0),
                                voucherType: result.data.voucherType,
                                expiresAt: result.data.expiresAt,
                            }],
                        });
                        toast.success(`Voucher ${result.data.code} issued successfully!`);
                    } else {
                        toast.error(result.message || "Failed to issue voucher");
                    }
                } else {
                    // Bulk voucher issuance (e.g. 50 vouchers)
                    const result = await bulkIssueVouchers({
                        voucherType,
                        faceValue: Number(faceValue),
                        quantity: qty,
                        discount: discount ? Number(discount) : 0,
                        description: description || undefined,
                        customerId: voucherType === "CORPORATE" ? selectedCustomerId || undefined : undefined,
                        companyName: voucherType === "CORPORATE" ? companyName || undefined : undefined,
                        companyGlCode: voucherType === "CORPORATE" ? companyGlCode || undefined : undefined,
                        expiresAt: expiresAt || undefined,
                        locationIds,
                        paymentMode: voucherType === "GIFT" ? paymentMode : undefined,
                        merchantId: (voucherType === "GIFT" && paymentMode === "CARD") ? merchantId : undefined,
                        cardholderName: (voucherType === "GIFT" && paymentMode === "CARD") ? cardholderName || undefined : undefined,
                        cardLast4: (voucherType === "GIFT" && paymentMode === "CARD") ? cardLast4 || undefined : undefined,
                        slipNo: (voucherType === "GIFT" && paymentMode === "CARD") ? slipNo || undefined : undefined,
                    });

                    if (result.status && result.data) {
                        setIssuedResult({
                            count: result.data.count,
                            codes: result.data.codes,
                            vouchers: result.data.vouchers,
                        });
                        toast.success(`${result.data.count} vouchers issued successfully!`);
                    } else {
                        toast.error(result.message || "Failed to bulk issue vouchers");
                    }
                }
            });
        } else {
            // Custom Multi-Grid Mode
            if (customRows.length === 0) {
                toast.error("Please add at least 1 voucher row");
                return;
            }
            if (customRows.length > MAX_VOUCHER_LIMIT) {
                toast.error(`Maximum ${MAX_VOUCHER_LIMIT} vouchers allowed per batch`);
                return;
            }

            for (let i = 0; i < customRows.length; i++) {
                const r = customRows[i];
                if (!r.faceValue || Number(r.faceValue) <= 0) {
                    toast.error(`Row #${i + 1}: Please enter a valid face value`);
                    return;
                }
                if (r.discount && (Number(r.discount) < 0 || Number(r.discount) >= Number(r.faceValue))) {
                    toast.error(`Row #${i + 1}: Discount must be positive and less than face value`);
                    return;
                }
            }

            startTransition(async () => {
                const vouchersPayload = customRows.map(r => ({
                    voucherType: r.voucherType,
                    faceValue: Number(r.faceValue),
                    discount: r.discount ? Number(r.discount) : 0,
                    description: r.description || description || undefined,
                    customerId: r.voucherType === "CORPORATE" ? selectedCustomerId || undefined : undefined,
                    companyName: r.voucherType === "CORPORATE" ? companyName || undefined : undefined,
                    companyGlCode: r.voucherType === "CORPORATE" ? companyGlCode || undefined : undefined,
                    expiresAt: expiresAt || undefined,
                    locationIds,
                    paymentMode: r.voucherType === "GIFT" ? paymentMode : undefined,
                    merchantId: (r.voucherType === "GIFT" && paymentMode === "CARD") ? merchantId : undefined,
                    cardholderName: (r.voucherType === "GIFT" && paymentMode === "CARD") ? cardholderName || undefined : undefined,
                    cardLast4: (r.voucherType === "GIFT" && paymentMode === "CARD") ? cardLast4 || undefined : undefined,
                    slipNo: (r.voucherType === "GIFT" && paymentMode === "CARD") ? slipNo || undefined : undefined,
                }));

                const result = await bulkIssueVouchers({
                    vouchers: vouchersPayload,
                });

                if (result.status && result.data) {
                    setIssuedResult({
                        count: result.data.count,
                        codes: result.data.codes,
                        vouchers: result.data.vouchers,
                    });
                    toast.success(`${result.data.count} custom vouchers issued successfully!`);
                } else {
                    toast.error(result.message || "Failed to issue vouchers");
                }
            });
        }
    };

    // ── Export / Copy Helpers ──────────────────────────────────
    const handleCopyAllCodes = () => {
        if (!issuedResult?.codes?.length) return;
        navigator.clipboard.writeText(issuedResult.codes.join("\n"));
        toast.success(`Copied all ${issuedResult.codes.length} voucher codes to clipboard!`);
    };

    const handleDownloadCsv = () => {
        if (!issuedResult?.vouchers?.length) return;
        const headers = ["#", "Voucher Code", "Type", "Face Value (PKR)", "Discount (PKR)", "Net (PKR)", "Expiry Date", "Created At"];
        const rows = issuedResult.vouchers.map((v, idx) => [
            idx + 1,
            v.code,
            v.voucherType,
            v.faceValue,
            v.discount || 0,
            v.faceValue - (v.discount || 0),
            v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : "No Expiry",
            new Date().toLocaleString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Vouchers_Batch_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV file downloaded successfully!");
    };

    const handlePrintVouchers = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 rounded-xl hover:bg-muted">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                                <Gift className="h-5 w-5 text-primary" />
                                <span>Issue Vouchers</span>
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
                                Max {MAX_VOUCHER_LIMIT} at a time
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Generate single, batch, or multi-denomination vouchers in one transaction.
                        </p>
                    </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
                    <button
                        type="button"
                        onClick={() => setMode("batch")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            mode === "batch"
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>Batch Issuance (Same Amount)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("custom")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            mode === "custom"
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                        <span>Multi-Voucher Table ({customRows.length} Rows)</span>
                    </button>
                </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Column — Form Fields / Table */}
                    <div className="flex-1 min-w-0 space-y-6 w-full">

                        {/* MODE 1: BATCH ISSUANCE */}
                        {mode === "batch" && (
                            <div className="space-y-5">
                                {/* Quantity & Presets */}
                                <div className="bg-card border rounded-2xl p-4 space-y-3 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            <span>Number of Vouchers to Issue (1 - {MAX_VOUCHER_LIMIT}) *</span>
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Creating <strong className="text-foreground">{batchSummary.qty}</strong> voucher{batchSummary.qty > 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            max={MAX_VOUCHER_LIMIT}
                                            value={quantity}
                                            onChange={(e) => {
                                                const val = e.target.value ? Number(e.target.value) : 1;
                                                setQuantity(Math.min(Math.max(val, 1), MAX_VOUCHER_LIMIT));
                                            }}
                                            className="h-10 text-sm font-bold font-mono w-28 bg-background text-center"
                                        />

                                        {/* Quick Preset Pills */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {QUANTITY_PRESETS.map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setQuantity(preset)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                                        quantity === preset
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                                    }`}
                                                >
                                                    {preset} {preset === 1 ? "Voucher" : "Vouchers"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        💡 Generates {batchSummary.qty} unique voucher code{batchSummary.qty > 1 ? "s" : ""} with identical face values and settings in 1 transaction.
                                    </p>
                                </div>

                                {/* Voucher Type & Face Value */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">Voucher Type *</Label>
                                        <Select value={voucherType} onValueChange={(v) => setVoucherType(v as VoucherType)}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VOUCHER_TYPE_OPTIONS.map(({ value, label }) => (
                                                    <SelectItem key={value} value={value} className="text-xs">
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">Face Value per Voucher (Rs.) *</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={faceValue}
                                                onChange={(e) => setFaceValue(e.target.value ? Number(e.target.value) : "")}
                                                placeholder="e.g. 1000"
                                                className="h-10 text-sm font-mono font-bold pr-12"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                                PKR
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* GIFT Voucher Payment Mode */}
                                {voucherType === "GIFT" && (
                                    <div className="space-y-4 rounded-2xl border p-4 bg-muted/20 animate-in fade-in duration-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold flex items-center gap-1.5">
                                                    <Wallet className="h-3.5 w-3.5 text-primary" />
                                                    <span>Payment Method *</span>
                                                </Label>
                                                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CASH">Cash</SelectItem>
                                                        <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold">Discount per Voucher (Rs.)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={discount}
                                                    onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : "")}
                                                    placeholder="e.g. 0"
                                                    className="h-9 text-xs font-mono"
                                                />
                                            </div>
                                        </div>

                                        {paymentMode === "CARD" && (
                                            <div className="space-y-3 pt-3 border-t">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold flex items-center gap-1.5">
                                                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                        <span>Merchant / Bank Terminal *</span>
                                                    </Label>
                                                    <Select value={merchantId} onValueChange={setMerchantId}>
                                                        <SelectTrigger className="h-9 text-xs">
                                                            {isLoadingMerchants ? "Loading terminals..." : <SelectValue placeholder="Select merchant terminal..." />}
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {merchants.length === 0 && (
                                                                <div className="p-2 text-center text-xs text-muted-foreground italic">
                                                                    No merchant terminals configured
                                                                </div>
                                                            )}
                                                            {merchants.map(m => (
                                                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                                                    {m.bankName} - {m.description} (#{m.merchantCode})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-semibold">Cardholder Name</Label>
                                                        <Input value={cardholderName} onChange={e => setCardholderName(e.target.value)} placeholder="Name on card" className="h-8 text-xs" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-semibold">Card # (last 4)</Label>
                                                        <Input value={cardLast4} maxLength={4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, ""))} placeholder="••••" className="h-8 text-xs font-mono" />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-semibold">AUTH ID / Approval Code</Label>
                                                    <Input value={slipNo} onChange={e => setSlipNo(e.target.value)} placeholder="Slip or reference number" className="h-8 text-xs" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CORPORATE Voucher Fields */}
                                {voucherType === "CORPORATE" && (
                                    <div className="space-y-3 rounded-2xl border p-4 bg-muted/20 animate-in fade-in duration-200">
                                        <div className="space-y-1.5">
                                            <Label className="flex items-center justify-between text-xs font-bold">
                                                <span className="flex items-center gap-1.5">
                                                    <Building2 className="h-3.5 w-3.5 text-primary" />
                                                    Company / ERP Customer *
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    Search by name or code
                                                </span>
                                            </Label>
                                            <Autocomplete
                                                options={customerOptions}
                                                value={selectedCustomerId}
                                                onValueChange={handleCustomerSelect}
                                                placeholder="Select or search ERP customer..."
                                                searchPlaceholder="Search customer by name or code..."
                                                onCreate={handleCreateCustomer}
                                                emptyMessage={
                                                    <div className="p-3 text-center text-xs text-muted-foreground">
                                                        No ERP customer found. Type name to create.
                                                    </div>
                                                }
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 text-xs">
                                            <div>
                                                <span className="text-[11px] text-muted-foreground font-medium">Selected Customer:</span>
                                                <p className="font-semibold text-foreground truncate mt-0.5">
                                                    {companyName || "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-muted-foreground font-medium">Voucher GL Code *:</span>
                                                <Input
                                                    value={companyGlCode}
                                                    onChange={(e) => setCompanyGlCode(e.target.value)}
                                                    placeholder="e.g. 310001"
                                                    className="h-8 text-xs font-mono font-semibold mt-0.5 bg-background"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Optional Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Description / Notes (Optional)</Label>
                                        <Input
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="e.g. Ramadan campaign distribution"
                                            className="h-9 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            <span>Expiry Date (Optional)</span>
                                        </Label>
                                        <Input
                                            type="date"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            min={new Date().toISOString().split("T")[0]}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODE 2: CUSTOM MULTI-GRID TABLE */}
                        {mode === "custom" && (
                            <div className="space-y-4">
                                {/* Toolbar */}
                                <div className="bg-card border rounded-2xl p-3 px-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={addCustomRow}
                                            disabled={customRows.length >= MAX_VOUCHER_LIMIT}
                                            className="h-8 text-xs gap-1 font-semibold"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add 1 Row</span>
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addMultipleCustomRows(5)}
                                            disabled={customRows.length >= MAX_VOUCHER_LIMIT}
                                            className="h-8 text-xs gap-1 font-semibold"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>+5 Rows</span>
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addMultipleCustomRows(10)}
                                            disabled={customRows.length >= MAX_VOUCHER_LIMIT}
                                            className="h-8 text-xs gap-1 font-semibold"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>+10 Rows</span>
                                        </Button>

                                        <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

                                        {/* Fill Amount Quick Tool */}
                                        <div className="flex items-center gap-1.5">
                                            <Input
                                                type="number"
                                                min="1"
                                                placeholder="Fill amount..."
                                                value={fillAmountInput}
                                                onChange={(e) => setFillAmountInput(e.target.value ? Number(e.target.value) : "")}
                                                className="h-8 text-xs font-mono w-28"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={handleApplyFillAmount}
                                                className="h-8 text-xs font-semibold px-2.5"
                                            >
                                                Apply to All
                                            </Button>
                                        </div>
                                    </div>

                                    <Badge
                                        variant="outline"
                                        className={`font-mono text-xs font-bold py-1 px-2.5 ${
                                            customRows.length >= MAX_VOUCHER_LIMIT
                                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                                : "bg-primary/10 text-primary border-primary/20"
                                        }`}
                                    >
                                        {customRows.length} of {MAX_VOUCHER_LIMIT} Vouchers
                                    </Badge>
                                </div>

                                {/* Shared Settings for Custom Grid */}
                                <div className="bg-muted/20 border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold">Default Payment Method</Label>
                                        <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="CARD">Credit Card</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold">Default Expiry Date</Label>
                                        <Input
                                            type="date"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            min={new Date().toISOString().split("T")[0]}
                                            className="h-8 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold">Default Corporate Client</Label>
                                        <Input
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Company name..."
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Custom Rows Table */}
                                <div className="border rounded-2xl overflow-hidden bg-card shadow-xs">
                                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background z-10">
                                                <tr>
                                                    <th className="p-3 w-12 text-center">#</th>
                                                    <th className="p-3 min-w-[130px]">Type</th>
                                                    <th className="p-3 min-w-[140px]">Amount (Rs.) *</th>
                                                    <th className="p-3 min-w-[120px]">Discount (Rs.)</th>
                                                    <th className="p-3 min-w-[180px]">Note / Reference</th>
                                                    <th className="p-3 w-12 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {customRows.map((row, idx) => (
                                                    <tr key={row.id} className="hover:bg-muted/20 transition">
                                                        <td className="p-3 font-mono font-bold text-center text-muted-foreground">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-3">
                                                            <Select
                                                                value={row.voucherType}
                                                                onValueChange={(v) => updateCustomRow(row.id, "voucherType", v)}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs font-semibold">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {VOUCHER_TYPE_OPTIONS.map(opt => (
                                                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                            {opt.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={row.faceValue}
                                                                onChange={(e) => updateCustomRow(row.id, "faceValue", e.target.value ? Number(e.target.value) : "")}
                                                                placeholder="1000"
                                                                className="h-8 text-xs font-mono font-bold"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={row.discount}
                                                                onChange={(e) => updateCustomRow(row.id, "discount", e.target.value ? Number(e.target.value) : 0)}
                                                                placeholder="0"
                                                                className="h-8 text-xs font-mono"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <Input
                                                                value={row.description}
                                                                onChange={(e) => updateCustomRow(row.id, "description", e.target.value)}
                                                                placeholder="Optional note..."
                                                                className="h-8 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => removeCustomRow(row.id)}
                                                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column — Summary Card & Stock Locations */}
                    <div className="w-full lg:w-80 shrink-0 space-y-4 sticky top-4">
                        {/* Live Financial Calculation Card */}
                        <Card className="border rounded-2xl shadow-xs overflow-hidden">
                            <div className="p-4 bg-muted/40 border-b flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                    <Calculator className="h-4 w-4 text-primary" />
                                    <span>Issuance Summary</span>
                                </span>
                                <Badge variant="secondary" className="font-mono text-xs font-bold">
                                    {mode === "batch" ? `${batchSummary.qty} Vouchers` : `${customSummary.count} Vouchers`}
                                </Badge>
                            </div>

                            <CardContent className="p-4 space-y-3 text-xs">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Total Vouchers:</span>
                                        <span className="font-mono font-bold text-foreground">
                                            {mode === "batch" ? batchSummary.qty : customSummary.count} of {MAX_VOUCHER_LIMIT}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Gross Face Value:</span>
                                        <span className="font-mono font-bold text-foreground">
                                            {formatCurrency(mode === "batch" ? batchSummary.totalFaceValue : customSummary.totalFaceValue)}
                                        </span>
                                    </div>

                                    {(mode === "batch" ? batchSummary.totalDiscount : customSummary.totalDiscount) > 0 && (
                                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                            <span>Total Discount:</span>
                                            <span className="font-mono font-bold">
                                                -{formatCurrency(mode === "batch" ? batchSummary.totalDiscount : customSummary.totalDiscount)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t flex items-center justify-between text-sm font-bold text-foreground">
                                        <span>Net Payable / Value:</span>
                                        <span className="font-mono text-primary font-black">
                                            {formatCurrency(mode === "batch" ? batchSummary.totalPayable : customSummary.totalPayable)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending || (mode === "batch" ? !faceValue : customRows.length === 0)}
                                    className="w-full h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-xs cursor-pointer"
                                >
                                    {isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Gift className="h-4 w-4" />
                                    )}
                                    <span>
                                        Issue {mode === "batch" ? batchSummary.qty : customSummary.count} Voucher{((mode === "batch" ? batchSummary.qty : customSummary.count) > 1) ? "s" : ""}
                                    </span>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Location MultiSelect */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground px-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>Allowed Stock Locations</span>
                                <span className="text-[10px] font-normal">(empty = all stores)</span>
                            </div>
                            <LocationMultiSelect
                                locations={stockLocations}
                                selected={locationIds}
                                onChange={setLocationIds}
                                disabled={isPending}
                                stockOnly={true}
                            />
                        </div>
                    </div>
                </div>
            </form>

            {/* Success Batch Modal */}
            {issuedResult && (
                <Dialog open onOpenChange={() => { setIssuedResult(null); goBack(); }}>
                    <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-6 gap-4">
                        <DialogHeader className="text-center pb-2 border-b">
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <DialogTitle className="text-xl font-black text-foreground">
                                {issuedResult.count} Voucher{issuedResult.count > 1 ? "s" : ""} Issued Successfully!
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Total Value: <strong>{formatCurrency(issuedResult.vouchers.reduce((acc, v) => acc + v.faceValue, 0))}</strong> · Ready for distribution and redemption.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Quick Action Toolbar */}
                        <div className="flex items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-xl border text-xs">
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCopyAllCodes}
                                    className="h-8 text-xs gap-1.5 font-semibold"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy All Codes</span>
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDownloadCsv}
                                    className="h-8 text-xs gap-1.5 font-semibold"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download CSV</span>
                                </Button>
                            </div>

                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handlePrintVouchers}
                                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Print</span>
                            </Button>
                        </div>

                        {/* Scrollable Codes List */}
                        <div className="border rounded-2xl overflow-hidden flex-1">
                            <div className="max-h-[300px] overflow-y-auto divide-y text-xs">
                                {issuedResult.vouchers.map((v, idx) => (
                                    <div
                                        key={v.id || idx}
                                        className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="font-mono text-muted-foreground text-[11px] w-6 text-center">
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <span className="font-mono font-bold text-sm text-foreground tracking-wider select-all">
                                                    {v.code}
                                                </span>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                                    <span>{v.voucherType}</span>
                                                    {v.expiresAt && (
                                                        <span>• Exp: {new Date(v.expiresAt).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="font-mono font-bold text-xs bg-primary/10 text-primary">
                                                {formatCurrency(v.faceValue)}
                                            </Badge>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(v.code);
                                                    toast.success(`Copied ${v.code}`);
                                                }}
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                title="Copy code"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between sm:justify-between">
                            <span className="text-[11px] text-muted-foreground">
                                {issuedResult.count} codes copied/saved safely
                            </span>
                            <Button
                                onClick={() => {
                                    setIssuedResult(null);
                                    goBack();
                                }}
                                className="h-9 px-5 text-xs font-bold"
                            >
                                Done & Return
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
