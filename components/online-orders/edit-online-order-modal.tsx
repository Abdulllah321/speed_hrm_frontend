'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';
import {
    Pencil,
    Tag,
    Trash2,
    Plus,
    CheckCircle2,
    AlertCircle,
    Loader2,
    DollarSign,
    Save,
    RotateCcw,
    Truck,
    User,
    Package,
    Barcode,
    ScanBarcode,
    CreditCard,
    Building2,
    Search,
    Sparkles,
} from 'lucide-react';

interface EditableItem {
    id?: string;
    sku: string;
    barcode?: string;
    systemSku?: string;
    name?: string;
    brand?: string;
    size?: string;
    color?: string;
    qty: number;
    price: number;
    skuDiscounted: number;
    subTotalPrice?: number;
    isFetching?: boolean;
    stock?: {
        available: number;
        companyAvailable?: number;
        localAvailable?: number;
        isAvailable: boolean;
        isCompanyAvailable?: boolean;
        isLocallyAvailable?: boolean;
        requiresSourcing?: boolean;
        locations?: Array<{ id: string; name: string; qty: number; isWarehouse?: boolean }>;
    };
}

interface EditOnlineOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any | null;
    onSuccess: (updatedOrder: any) => void;
}

interface VoucherVerification {
    checking: boolean;
    code: string;
    type?: string; // 'VOUCHER' | 'COUPON' | 'ALLIANCE'
    voucherType?: string; // 'GIFT' | 'CORPORATE' | 'CREDIT' | 'EXCHANGE'
    discountType?: string; // 'PERCENT' | 'FIXED'
    amount?: number;
    discountPercent?: number;
    maxDiscount?: number | null;
    partnerName?: string;
    isValid?: boolean;
    message?: string;
}

export function EditOnlineOrderModal({
    open,
    onOpenChange,
    order,
    onSuccess,
}: EditOnlineOrderModalProps) {
    // Form fields
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shippingCharges, setShippingCharges] = useState<number>(0);
    const [couponCode, setCouponCode] = useState('');

    // Items list
    const [items, setItems] = useState<EditableItem[]>([]);

    // Quick Barcode Scanner Input
    const [quickScanBarcode, setQuickScanBarcode] = useState('');
    const [isQuickScanning, setIsQuickScanning] = useState(false);

    // Voucher / Alliance verification status
    const [voucherStatus, setVoucherStatus] = useState<VoucherVerification | null>(null);

    // Flag indicating payment tender was auto-suggested via Alliance
    const [allianceTenderAutoSet, setAllianceTenderAutoSet] = useState(false);

    // Saving indicator
    const [isSaving, setIsSaving] = useState(false);

    // Initialize state when order changes
    useEffect(() => {
        if (order) {
            setCustomerName(order.customerName || '');
            setPhone(order.phone || order.items?.[0]?.phone || '');
            setEmail(order.email || order.items?.[0]?.email || '');
            setCity(order.city || order.items?.[0]?.city || '');
            setAddress(order.address || order.items?.[0]?.address || '');
            setNote(order.note || order.items?.[0]?.note || '');
            setPaymentMethod(order.paymentMethod || 'Cash');
            setTrackingNumber(order.trackingNumber || '');
            setShippingCharges(Number(order.financials?.shippingCharges ?? order.items?.[0]?.shippingCharges ?? 0));
            setAllianceTenderAutoSet(false);

            const existingCode = (order.couponCode || order.voucherInfo?.code || '').trim();
            setCouponCode(existingCode);

            // Preload voucher/alliance validation state from existing order
            if (existingCode) {
                if (order.voucherInfo) {
                    const info = order.voucherInfo;
                    const isAlliance = info.type === 'ALLIANCE';
                    const faceVal = isAlliance
                        ? undefined
                        : Number(info.amount ?? info.faceValue ?? info.discountValue ?? 0);

                    setVoucherStatus({
                        checking: false,
                        code: existingCode,
                        type: info.type,
                        voucherType: info.voucherType,
                        discountType: info.discountType,
                        amount: faceVal,
                        discountPercent: info.discountPercent ? Number(info.discountPercent) : undefined,
                        maxDiscount: info.maxDiscount ? Number(info.maxDiscount) : null,
                        partnerName: info.partnerName,
                        isValid: info.isValid,
                        message: info.message || (
                            info.isValid
                                ? isAlliance
                                    ? `Bank Alliance Discount (${info.partnerName} - ${info.discountPercent}%)`
                                    : `Valid ${info.type} - Value: Rs ${Number(faceVal || 0).toLocaleString()}`
                                : (info.reason || 'Invalid voucher code')
                        ),
                    });

                    if (isAlliance) {
                        setAllianceTenderAutoSet(true);
                    }
                } else {
                    setVoucherStatus(null);
                }
            } else {
                setVoucherStatus(null);
            }

            // Map items
            const mappedItems: EditableItem[] = (order.items || []).map((it: any) => ({
                id: it.id,
                sku: it.sku || '',
                barcode: it.barcode || '',
                systemSku: it.systemSku || '',
                name: it.name || '',
                brand: it.brand || '',
                size: it.size || '',
                color: it.color || '',
                qty: Math.max(1, Number(it.qty) || 1),
                price: Math.max(0, Number(it.price) || 0),
                skuDiscounted: Math.min(100, Math.max(0, Number(it.skuActualDiscount ?? it.skuDiscounted ?? 0))),
                subTotalPrice: Number(it.price || 0) * Number(it.qty || 1),
                stock: it.stock,
            }));

            setItems(mappedItems.length > 0 ? mappedItems : [
                { sku: '', barcode: '', name: '', qty: 1, price: 0, skuDiscounted: 0 }
            ]);
        }
    }, [order]);

    // Live Voucher & Alliance verification
    const handleVerifyVoucher = useCallback(async (codeToVerify?: string) => {
        const code = (codeToVerify !== undefined ? codeToVerify : couponCode).trim();
        if (!code) {
            setVoucherStatus(null);
            setAllianceTenderAutoSet(false);
            return;
        }

        setVoucherStatus({
            checking: true,
            code,
        });

        try {
            const locId = order?.locationId || '';
            const res = await authFetch(
                `/pos-sales/online-orders/bulk-upload/validate-voucher?code=${encodeURIComponent(code)}${locId ? `&locationId=${encodeURIComponent(locId)}` : ''}`
            );

            if (res.ok && res.data?.status && res.data?.data) {
                const info = res.data.data;
                const isAlliance = info.type === 'ALLIANCE';
                const faceVal = isAlliance
                    ? undefined
                    : Number(info.type === 'VOUCHER' ? (info.faceValue ?? 0) : (info.discountValue ?? 0));

                setVoucherStatus({
                    checking: false,
                    code: info.code || code,
                    type: info.type,
                    voucherType: info.voucherType,
                    discountType: info.discountType,
                    amount: faceVal,
                    discountPercent: info.discountPercent ? Number(info.discountPercent) : undefined,
                    maxDiscount: info.maxDiscount ? Number(info.maxDiscount) : null,
                    partnerName: info.partnerName,
                    isValid: info.isValid,
                    message: info.message || (info.isValid ? 'Valid Code' : 'Invalid Code'),
                });

                if (info.isValid) {
                    if (isAlliance) {
                        // Automatically update payment tender to Card / Bank Card Alliance
                        setPaymentMethod('Card');
                        setAllianceTenderAutoSet(true);
                        toast.success(
                            `Bank Alliance detected (${info.partnerName} - ${info.discountPercent}% OFF). Payment tender auto-switched to "Card".`
                        );
                    } else if (info.type === 'VOUCHER') {
                        setAllianceTenderAutoSet(false);
                        toast.success(`Valid Voucher verified: -Rs ${Number(faceVal || 0).toLocaleString()}`);
                    } else {
                        setAllianceTenderAutoSet(false);
                        toast.success(`Coupon applied: ${info.discountType === 'PERCENT' ? info.discountValue + '%' : 'Rs ' + info.discountValue}`);
                    }
                } else {
                    toast.error(info.message || 'Voucher or coupon is invalid');
                }
            } else {
                setVoucherStatus({
                    checking: false,
                    code,
                    isValid: false,
                    message: res.data?.message || 'Code not found in system',
                });
                toast.error(res.data?.message || 'Voucher or promo code not found');
            }
        } catch (err: any) {
            setVoucherStatus({
                checking: false,
                code,
                isValid: false,
                message: err.message || 'Failed to verify code',
            });
            toast.error(err.message || 'Failed to verify voucher code');
        }
    }, [couponCode, order?.locationId]);

    // Clear Voucher
    const handleClearVoucher = () => {
        setCouponCode('');
        setVoucherStatus(null);
        setAllianceTenderAutoSet(false);
        toast.info("Voucher/coupon removed from order.");
    };

    // Update single item field
    const updateItem = (index: number, field: keyof EditableItem, value: any) => {
        setItems(prev => {
            const next = [...prev];
            const updated = { ...next[index], [field]: value };
            if (field === 'qty' && updated.stock) {
                const required = Number(value || 1);
                updated.stock = {
                    ...updated.stock,
                    isAvailable: (updated.stock.companyAvailable ?? updated.stock.available) >= required,
                    isLocallyAvailable: (updated.stock.localAvailable ?? 0) >= required,
                };
            }
            next[index] = updated;
            return next;
        });
    };

    // Fetch and populate item details by Barcode or SKU
    const handleLookupItem = async (index: number, barcodeOrSku?: string) => {
        const item = items[index];
        const term = (barcodeOrSku !== undefined ? barcodeOrSku : (item.barcode || item.sku)).trim();
        if (!term || term.length < 2) {
            toast.error('Please enter a barcode or SKU to fetch product details.');
            return;
        }

        // Set row fetching indicator
        setItems(prev => {
            const next = [...prev];
            if (next[index]) next[index] = { ...next[index], isFetching: true };
            return next;
        });

        try {
            const locId = order?.locationId || '';
            const res = await authFetch(
                `/pos-sales/online-orders/bulk-upload/resolve-item?barcode=${encodeURIComponent(term)}${locId ? `&locationId=${encodeURIComponent(locId)}` : ''}`
            );

            if (res.ok && res.data?.status && res.data?.data) {
                const prod = res.data.data;
                setItems(prev => {
                    const next = [...prev];
                    const current = next[index];
                    if (!current) return prev;
                    next[index] = {
                        ...current,
                        barcode: prod.barcode || current.barcode || term,
                        sku: prod.sku || current.sku || term,
                        systemSku: prod.systemSku || current.systemSku || '',
                        name: prod.name || current.name || '',
                        brand: prod.brand || current.brand || '',
                        size: prod.size || current.size || '',
                        color: prod.color || current.color || '',
                        price: prod.price > 0 ? prod.price : current.price,
                        skuDiscounted: current.skuDiscounted > 0 ? current.skuDiscounted : Number(prod.discountRate || 0),
                        stock: prod.stock,
                        isFetching: false,
                    };
                    return next;
                });

                toast.success(
                    `Loaded: ${prod.name} (${prod.brand || 'Brand'} ${prod.size ? '• Size ' + prod.size : ''})`
                );
            } else {
                setItems(prev => {
                    const next = [...prev];
                    if (next[index]) next[index] = { ...next[index], isFetching: false };
                    return next;
                });
                toast.error(res.data?.message || `No product found for barcode "${term}"`);
            }
        } catch (err: any) {
            setItems(prev => {
                const next = [...prev];
                if (next[index]) next[index] = { ...next[index], isFetching: false };
                return next;
            });
            toast.error(err.message || 'Failed to fetch product details.');
        }
    };

    // Quick Barcode Scanner: Fetch and append item to order
    const handleQuickScanAdd = async () => {
        const barcode = quickScanBarcode.trim();
        if (!barcode || barcode.length < 2) return;

        setIsQuickScanning(true);
        try {
            const locId = order?.locationId || '';
            const res = await authFetch(
                `/pos-sales/online-orders/bulk-upload/resolve-item?barcode=${encodeURIComponent(barcode)}${locId ? `&locationId=${encodeURIComponent(locId)}` : ''}`
            );

            if (res.ok && res.data?.status && res.data?.data) {
                const prod = res.data.data;
                const newItem: EditableItem = {
                    barcode: prod.barcode || barcode,
                    sku: prod.sku || barcode,
                    systemSku: prod.systemSku || '',
                    name: prod.name || '',
                    brand: prod.brand || '',
                    size: prod.size || '',
                    color: prod.color || '',
                    qty: 1,
                    price: Number(prod.price || 0),
                    skuDiscounted: Number(prod.discountRate || 0),
                    stock: prod.stock,
                };

                setItems(prev => {
                    // If the first row is completely empty, replace it
                    if (prev.length === 1 && !prev[0].sku && !prev[0].barcode && !prev[0].name) {
                        return [newItem];
                    }
                    return [...prev, newItem];
                });

                setQuickScanBarcode('');
                toast.success(`Scanned & added: ${prod.name} (${prod.brand || ''} ${prod.size ? 'Size ' + prod.size : ''})`);
            } else {
                toast.error(res.data?.message || `No product found for barcode "${barcode}"`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to scan product');
        } finally {
            setIsQuickScanning(false);
        }
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) {
            toast.error("An order must contain at least one item.");
            return;
        }
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { sku: '', barcode: '', name: '', qty: 1, price: 0, skuDiscounted: 0 }
        ]);
    };

    // Real-time calculations with Alliance Bank discounts
    const calculations = useMemo(() => {
        let grossSubtotal = 0;
        let itemDiscounts = 0;
        let totalUnits = 0;

        for (const item of items) {
            const qty = Math.max(1, Number(item.qty) || 1);
            const price = Math.max(0, Number(item.price) || 0);
            const discPercent = Math.min(100, Math.max(0, Number(item.skuDiscounted) || 0));

            const lineGross = price * qty;
            const lineDisc = lineGross * (discPercent / 100);

            grossSubtotal += lineGross;
            itemDiscounts += lineDisc;
            totalUnits += qty;
        }

        const itemsNet = Math.max(0, grossSubtotal - itemDiscounts);
        const shipping = Math.max(0, Number(shippingCharges) || 0);

        let voucherDeduction = 0;
        if (voucherStatus && voucherStatus.isValid) {
            if (voucherStatus.type === 'VOUCHER') {
                voucherDeduction = Math.min(Number(voucherStatus.amount || 0), itemsNet + shipping);
            } else if (voucherStatus.type === 'COUPON') {
                if (voucherStatus.discountType === 'PERCENT') {
                    voucherDeduction = itemsNet * (Number(voucherStatus.amount || 0) / 100);
                } else {
                    voucherDeduction = Math.min(Number(voucherStatus.amount || 0), itemsNet);
                }
            } else if (voucherStatus.type === 'ALLIANCE') {
                const pct = Number(voucherStatus.discountPercent || 0);
                let disc = itemsNet * (pct / 100);
                if (voucherStatus.maxDiscount && voucherStatus.maxDiscount > 0) {
                    disc = Math.min(disc, Number(voucherStatus.maxDiscount));
                }
                voucherDeduction = disc;
            }
        }
        voucherDeduction = Math.round(voucherDeduction * 100) / 100;

        const netGrandTotal = Math.max(0, Math.round(itemsNet + shipping - voucherDeduction));
        const payableAfterVoucher = netGrandTotal;

        return {
            grossSubtotal,
            itemDiscounts,
            totalUnits,
            itemsNet,
            shippingCharges: shipping,
            voucherDeduction,
            netGrandTotal,
            payableAfterVoucher,
        };
    }, [items, shippingCharges, voucherStatus]);

    // Save order changes
    const handleSave = async () => {
        if (!order?.orderNumber) return;

        // Validation
        if (items.length === 0) {
            toast.error("Order must contain at least one item.");
            return;
        }

        for (let i = 0; i < items.length; i++) {
            if (!items[i].sku && !items[i].barcode) {
                toast.error(`Item #${i + 1} requires a valid Barcode or SKU.`);
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                customerName: customerName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                city: city.trim(),
                address: address.trim(),
                note: note.trim(),
                paymentMethod: paymentMethod.trim(),
                trackingNumber: trackingNumber.trim(),
                shippingCharges: Math.max(0, Number(shippingCharges) || 0),
                couponCode: couponCode.trim() || null,
                items: items.map(it => ({
                    id: it.id,
                    sku: (it.sku || it.barcode || '').trim(),
                    barcode: it.barcode?.trim() || undefined,
                    systemSku: it.systemSku?.trim() || undefined,
                    name: it.name?.trim() || undefined,
                    brand: it.brand?.trim() || undefined,
                    size: it.size?.trim() || undefined,
                    qty: Math.max(1, Number(it.qty) || 1),
                    price: Math.max(0, Number(it.price) || 0),
                    skuDiscounted: Math.min(100, Math.max(0, Number(it.skuDiscounted) || 0)),
                    skuActualDiscount: Math.min(100, Math.max(0, Number(it.skuDiscounted) || 0)),
                })),
            };

            const res = await authFetch(
                `/pos-sales/online-orders/bulk-upload/order/${encodeURIComponent(order.orderNumber)}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                }
            );

            if (res.ok && res.data?.status && res.data?.data) {
                toast.success(`Order #${order.orderNumber} updated successfully!`);
                onSuccess(res.data.data);
                onOpenChange(false);
            } else {
                toast.error(res.data?.message || 'Failed to update online order.');
            }
        } catch (error: any) {
            console.error("Save order error", error);
            toast.error(error.message || "An unexpected error occurred while updating the order.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                noScroll
                className="w-[calc(100vw-2rem)] sm:max-w-[95vw] md:max-w-4xl lg:max-w-5xl h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card"
            >
                <DialogHeader className="p-5 md:p-6 pb-3 border-b shrink-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            <span>Edit Order #{order.orderNumber}</span>
                            <Badge variant="outline" className="text-xs bg-muted">
                                {order.marketplace || order.channel || 'Online'}
                            </Badge>
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        Modify order products by barcode, update pricing, verify bank alliance BINs/vouchers, and optimize tender details before posting.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 space-y-5">
                    {/* 1. Voucher / Bank Card Alliance BIN Management Section */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/80 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary" />
                                <Label htmlFor="coupon-code-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    Voucher, Promo & Bank Alliance BIN Verification
                                </Label>
                            </div>
                            {couponCode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearVoucher}
                                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 px-2"
                                >
                                    <RotateCcw className="h-3 w-3" /> Clear Code
                                </Button>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="coupon-code-input"
                                    placeholder="Enter voucher, promo code, or Bank Card BIN (e.g. 5140-10, 4902-87, GFT-1002)..."
                                    value={couponCode}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setCouponCode(val);
                                        if (voucherStatus && voucherStatus.code !== val) {
                                            setVoucherStatus(null);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleVerifyVoucher();
                                        }
                                    }}
                                    className="font-mono text-sm tracking-wider uppercase bg-background"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleVerifyVoucher()}
                                disabled={!couponCode.trim() || voucherStatus?.checking}
                                className="gap-1.5 shrink-0"
                            >
                                {voucherStatus?.checking ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                    <Tag className="h-4 w-4 text-primary" />
                                )}
                                Verify Code
                            </Button>
                        </div>

                        {/* Live Voucher Feedback Badge / Card */}
                        {voucherStatus && (
                            <div className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                voucherStatus.isValid
                                    ? voucherStatus.type === 'ALLIANCE'
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            }`}>
                                <div className="flex items-start sm:items-center gap-2.5">
                                    {voucherStatus.isValid ? (
                                        voucherStatus.type === 'ALLIANCE' ? (
                                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
                                        ) : (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                                        )
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                                    )}
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold">
                                                {voucherStatus.isValid
                                                    ? voucherStatus.type === 'ALLIANCE'
                                                        ? `Bank Card Alliance: ${voucherStatus.partnerName}`
                                                        : `Valid ${voucherStatus.type} (${voucherStatus.voucherType || 'PROMO'})`
                                                    : 'Invalid or Restricted Code'}
                                            </span>
                                            {voucherStatus.isValid && voucherStatus.type === 'ALLIANCE' && (
                                                <Badge className="bg-blue-600 text-white font-medium text-[10px] px-1.5 py-0">
                                                    {voucherStatus.discountPercent}% OFF{voucherStatus.maxDiscount ? ` (Cap Rs ${voucherStatus.maxDiscount.toLocaleString()})` : ''}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] opacity-90">
                                            {voucherStatus.message}
                                        </p>
                                        {voucherStatus.isValid && voucherStatus.type === 'ALLIANCE' && allianceTenderAutoSet && (
                                            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1 pt-0.5">
                                                <Sparkles className="h-3 w-3" /> Payment Tender automatically updated to &quot;Card&quot;.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {voucherStatus.isValid && (
                                    <Badge className={`${voucherStatus.type === 'ALLIANCE' ? 'bg-blue-600' : 'bg-emerald-600'} text-white font-mono shrink-0 self-end sm:self-center`}>
                                        -Rs {calculations.voucherDeduction.toLocaleString()}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Customer & Shipping Destination */}
                    <div className="p-4 bg-muted/20 rounded-xl border border-border/80 space-y-3">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <User className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Customer & Destination Details
                            </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div className="space-y-1">
                                <Label htmlFor="cust-name">Customer Name</Label>
                                <Input
                                    id="cust-name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Customer Name"
                                    className="bg-background text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="cust-phone">Phone / Mobile</Label>
                                <Input
                                    id="cust-phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Phone Number"
                                    className="bg-background text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="cust-email">Email Address</Label>
                                <Input
                                    id="cust-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="customer@example.com"
                                    className="bg-background text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="cust-city">City</Label>
                                <Input
                                    id="cust-city"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="City (e.g. Lahore, Karachi)"
                                    className="bg-background text-xs"
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <Label htmlFor="cust-address">Delivery Address</Label>
                                <Input
                                    id="cust-address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Full street address..."
                                    className="bg-background text-xs"
                                />
                            </div>
                        </div>

                        {/* Payment Mode / Tender & Shipping Fee */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="pay-method" className="flex items-center gap-1">
                                        <CreditCard className="h-3 w-3 text-primary" /> Payment Tender
                                    </Label>
                                    {allianceTenderAutoSet && (
                                        <span className="text-[10px] text-blue-600 font-medium">Alliance Match</span>
                                    )}
                                </div>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={(val) => {
                                        setPaymentMethod(val);
                                        setAllianceTenderAutoSet(false);
                                    }}
                                >
                                    <SelectTrigger id="pay-method" className="h-8 bg-background text-xs">
                                        <SelectValue placeholder="Select Payment Tender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash (Store Counter)</SelectItem>
                                        <SelectItem value="Card">Card (Credit/Debit Card)</SelectItem>
                                        <SelectItem value="Bank Card Alliance">Bank Card Alliance</SelectItem>
                                        <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                                        <SelectItem value="Online Payment">Online Payment (Wallet/Bank)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="tracking-num">Tracking Number</Label>
                                <Input
                                    id="tracking-num"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Courier tracking number"
                                    className="bg-background text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="ship-charges">Shipping Charges (Rs)</Label>
                                <Input
                                    id="ship-charges"
                                    type="number"
                                    min={0}
                                    value={shippingCharges}
                                    onChange={(e) => setShippingCharges(Math.max(0, Number(e.target.value) || 0))}
                                    className="bg-background text-xs font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Items Editor Section with Quick Barcode Scanner & Replace Capability */}
                    <div className="border rounded-xl overflow-hidden space-y-0">
                        <div className="bg-muted/50 p-3 px-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                <span>Order Items ({items.length} Lines, {calculations.totalUnits} Pcs)</span>
                            </div>

                            {/* Quick Add By Barcode Scanner */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 sm:w-64">
                                    <Input
                                        placeholder="Quick Scan Barcode to Add..."
                                        value={quickScanBarcode}
                                        onChange={(e) => setQuickScanBarcode(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleQuickScanAdd();
                                            }
                                        }}
                                        className="h-7 text-xs font-mono bg-background pr-7"
                                    />
                                    {isQuickScanning && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2 top-2 text-primary" />
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleQuickScanAdd}
                                    disabled={!quickScanBarcode.trim() || isQuickScanning}
                                    className="h-7 text-xs gap-1 bg-background shrink-0"
                                >
                                    <Barcode className="h-3 w-3 text-primary" /> Scan & Add
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="h-7 text-xs gap-1 bg-background shrink-0"
                                >
                                    <Plus className="h-3 w-3" /> Blank Row
                                </Button>
                            </div>
                        </div>

                        {/* Items Rows */}
                        <div className="divide-y text-xs">
                            {items.map((item, idx) => {
                                const qty = Math.max(1, Number(item.qty) || 1);
                                const price = Math.max(0, Number(item.price) || 0);
                                const disc = Math.min(100, Math.max(0, Number(item.skuDiscounted) || 0));
                                const lineSubtotal = Math.max(0, Math.round(price * qty * (1 - disc / 100)));

                                const companyStock = item.stock?.companyAvailable ?? item.stock?.available ?? 0;
                                const localStock = item.stock?.localAvailable ?? 0;
                                const hasCompanyStock = companyStock >= qty;
                                const hasLocalStock = localStock >= qty;

                                return (
                                    <div key={idx} className="p-3.5 space-y-2 hover:bg-muted/10 transition-colors">
                                        {/* Row Line Header: Item Index & Barcode Management */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                            {/* Barcode with Fetch / Scan Action */}
                                            <div className="md:col-span-4 space-y-1">
                                                <Label className="text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
                                                    <span className="flex items-center gap-1">
                                                        <Barcode className="h-3 w-3 text-primary" /> Barcode (Scan / Edit)
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/70">Line #{idx + 1}</span>
                                                </Label>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        value={item.barcode || ''}
                                                        onChange={(e) => updateItem(idx, 'barcode', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleLookupItem(idx, item.barcode);
                                                            }
                                                        }}
                                                        placeholder="Enter Barcode & press Enter..."
                                                        className="font-mono text-xs h-8 bg-background flex-1"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleLookupItem(idx, item.barcode)}
                                                        disabled={item.isFetching || (!item.barcode?.trim() && !item.sku?.trim())}
                                                        className="h-8 px-2 text-xs shrink-0"
                                                        title="Fetch product details by barcode"
                                                    >
                                                        {item.isFetching ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                        ) : (
                                                            <Search className="h-3.5 w-3.5 text-primary" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* SKU */}
                                            <div className="md:col-span-3 space-y-1">
                                                <Label className="text-[10px] text-muted-foreground font-semibold">SKU / Style Code</Label>
                                                <Input
                                                    value={item.sku}
                                                    onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleLookupItem(idx, item.sku);
                                                        }
                                                    }}
                                                    placeholder="Product SKU"
                                                    className="font-mono text-xs h-8 bg-background"
                                                />
                                            </div>

                                            {/* Description / Name */}
                                            <div className="md:col-span-4 space-y-1">
                                                <Label className="text-[10px] text-muted-foreground font-semibold">Product Description</Label>
                                                <Input
                                                    value={item.name || ''}
                                                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                                    placeholder="Product Description"
                                                    className="text-xs h-8 bg-background font-medium"
                                                />
                                            </div>

                                            {/* Delete Action */}
                                            <div className="md:col-span-1 flex items-end justify-end h-full pt-4">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={items.length <= 1}
                                                    onClick={() => removeItem(idx)}
                                                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                                    title="Delete Line Item"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Row Line Sub-details: Brand, Size, Qty, Unit Price, Discount %, Line Net */}
                                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center bg-muted/20 p-2 rounded-lg">
                                            {/* Brand & Size */}
                                            <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                                                {item.brand ? (
                                                    <Badge variant="outline" className="text-[10px] bg-background font-semibold">
                                                        {item.brand}
                                                    </Badge>
                                                ) : (
                                                    <Input
                                                        placeholder="Brand"
                                                        value={item.brand || ''}
                                                        onChange={(e) => updateItem(idx, 'brand', e.target.value)}
                                                        className="h-7 text-[11px] w-24 bg-background"
                                                    />
                                                )}
                                                {item.size ? (
                                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                                        Size: {item.size}
                                                    </Badge>
                                                ) : (
                                                    <Input
                                                        placeholder="Size"
                                                        value={item.size || ''}
                                                        onChange={(e) => updateItem(idx, 'size', e.target.value)}
                                                        className="h-7 text-[11px] w-20 bg-background"
                                                    />
                                                )}
                                            </div>

                                            {/* Qty */}
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">Qty</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="text-xs h-7 bg-background font-bold"
                                                />
                                            </div>

                                            {/* Price */}
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">Unit Price (Rs)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={item.price}
                                                    onChange={(e) => updateItem(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="text-xs h-7 bg-background font-semibold"
                                                />
                                            </div>

                                            {/* Discount % */}
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">Discount %</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={item.skuDiscounted}
                                                    onChange={(e) => updateItem(idx, 'skuDiscounted', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                    className="text-xs h-7 bg-background text-rose-600 font-semibold"
                                                />
                                            </div>

                                            {/* Line Net */}
                                            <div className="space-y-0.5 text-right pr-2">
                                                <Label className="text-[10px] text-muted-foreground">Line Net</Label>
                                                <p className="text-xs font-bold text-foreground">
                                                    Rs {lineSubtotal.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Dual Real-Time Stock Status Badge */}
                                        {item.stock && (
                                            <div className="pt-0.5 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {hasLocalStock ? (
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 font-medium">
                                                            <CheckCircle2 className="h-3 w-3" /> In Local Store ({localStock} available)
                                                        </Badge>
                                                    ) : hasCompanyStock ? (
                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 gap-1 font-medium">
                                                            <Truck className="h-3 w-3" /> Sourcing Needed ({companyStock} available company-wide)
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 gap-1 font-medium">
                                                            <AlertCircle className="h-3 w-3" /> Out of Stock ({companyStock} available)
                                                        </Badge>
                                                    )}

                                                    {/* Company stock details */}
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        Co. Total: {companyStock} Pcs
                                                    </span>
                                                </div>

                                                {/* Top Stock Locations Breakdown */}
                                                {item.stock.locations && item.stock.locations.length > 0 && (
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Building2 className="h-3 w-3 text-muted-foreground/80" />
                                                        <span>
                                                            Stock at: {item.stock.locations.slice(0, 2).map(l => `${l.name} (${l.qty})`).join(', ')}
                                                            {item.stock.locations.length > 2 ? ` +${item.stock.locations.length - 2} more` : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4. Dynamic Financial Ledger Preview with Tender Breakdown */}
                    <div className="p-4 bg-muted/40 rounded-xl border space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4 text-primary" /> Projected Financial Ledger & Tender Breakdown
                            </h4>
                            <span className="text-muted-foreground text-[11px]">
                                Recalculates dynamically with products, vouchers & tenders
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                            <div className="space-y-0.5">
                                <span className="text-muted-foreground">1. Gross Subtotal</span>
                                <p className="font-semibold text-foreground text-sm">
                                    Rs {calculations.grossSubtotal.toLocaleString()}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-muted-foreground">2. Item Discounts</span>
                                <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">
                                    -Rs {calculations.itemDiscounts.toLocaleString()}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-muted-foreground">3. Shipping Fee</span>
                                <p className="font-semibold text-foreground text-sm">
                                    +Rs {calculations.shippingCharges.toLocaleString()}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    4. Voucher / Alliance
                                    {voucherStatus?.type === 'ALLIANCE' && (
                                        <Badge className="bg-blue-600 text-[9px] px-1 py-0 h-4 text-white">Bank BIN</Badge>
                                    )}
                                </span>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                    -Rs {calculations.voucherDeduction.toLocaleString()}
                                </p>
                            </div>
                            <div className="space-y-0.5 bg-primary/10 p-2.5 rounded-lg border border-primary/20 col-span-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-primary text-[11px] font-bold">5. Net Grand Total</span>
                                    <Badge variant="outline" className="text-[10px] bg-background font-mono font-medium">
                                        Tender: {paymentMethod}
                                    </Badge>
                                </div>
                                <p className="font-extrabold text-primary text-base">
                                    Rs {calculations.netGrandTotal.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 px-5 md:px-6 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-semibold"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isSaving ? 'Saving Changes...' : 'Save Order Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
