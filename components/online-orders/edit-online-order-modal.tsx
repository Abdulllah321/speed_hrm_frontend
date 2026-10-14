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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    Package
} from 'lucide-react';

interface EditableItem {
    id?: string;
    sku: string;
    barcode?: string;
    systemSku?: string;
    name?: string;
    brand?: string;
    size?: string;
    qty: number;
    price: number;
    skuDiscounted: number;
    subTotalPrice?: number;
    stock?: {
        available: number;
        isAvailable: boolean;
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
    type?: string;
    voucherType?: string;
    amount?: number;
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

    // Voucher verification status
    const [voucherStatus, setVoucherStatus] = useState<VoucherVerification | null>(null);

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
            
            const existingCode = (order.couponCode || order.voucherInfo?.code || '').trim();
            setCouponCode(existingCode);

            // Preload voucher validation state from existing order
            if (existingCode) {
                if (order.voucherInfo) {
                    setVoucherStatus({
                        checking: false,
                        code: existingCode,
                        type: order.voucherInfo.type,
                        voucherType: order.voucherInfo.voucherType,
                        amount: order.voucherInfo.amount,
                        isValid: order.voucherInfo.isValid,
                        message: order.voucherInfo.isValid
                            ? `Valid ${order.voucherInfo.type} - Value: Rs ${Number(order.voucherInfo.amount || 0).toLocaleString()}`
                            : (order.voucherInfo.reason || 'Invalid voucher code'),
                    });
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
                qty: Math.max(1, Number(it.qty) || 1),
                price: Math.max(0, Number(it.price) || 0),
                skuDiscounted: Math.min(100, Math.max(0, Number(it.skuActualDiscount ?? it.skuDiscounted ?? 0))),
                subTotalPrice: Number(it.price || 0) * Number(it.qty || 1),
                stock: it.stock,
            }));

            setItems(mappedItems.length > 0 ? mappedItems : [
                { sku: '', name: '', qty: 1, price: 0, skuDiscounted: 0 }
            ]);
        }
    }, [order]);

    // Live Voucher verification
    const handleVerifyVoucher = useCallback(async (codeToVerify?: string) => {
        const code = (codeToVerify !== undefined ? codeToVerify : couponCode).trim();
        if (!code) {
            setVoucherStatus(null);
            return;
        }

        setVoucherStatus({
            checking: true,
            code,
        });

        try {
            const res = await authFetch(
                `/pos-sales/online-orders/bulk-upload/validate-voucher?code=${encodeURIComponent(code)}`
            );

            if (res.ok && res.data?.status && res.data?.data) {
                const info = res.data.data;
                const faceVal = info.type === 'VOUCHER' ? info.faceValue : info.discountValue;
                setVoucherStatus({
                    checking: false,
                    code: info.code || code,
                    type: info.type,
                    voucherType: info.voucherType,
                    amount: faceVal,
                    isValid: info.isValid,
                    message: info.message || (info.isValid ? 'Valid Voucher' : 'Invalid Voucher'),
                });
            } else {
                setVoucherStatus({
                    checking: false,
                    code,
                    isValid: false,
                    message: res.data?.message || 'Voucher not found in system',
                });
            }
        } catch (err: any) {
            setVoucherStatus({
                checking: false,
                code,
                isValid: false,
                message: err.message || 'Failed to verify voucher code',
            });
        }
    }, [couponCode]);

    // Clear Voucher
    const handleClearVoucher = () => {
        setCouponCode('');
        setVoucherStatus(null);
        toast.info("Voucher removed from order.");
    };

    // Item changes
    const updateItem = (index: number, field: keyof EditableItem, value: any) => {
        setItems(prev => {
            const next = [...prev];
            const updated = { ...next[index], [field]: value };
            if (field === 'qty' && updated.stock) {
                updated.stock = {
                    ...updated.stock,
                    isAvailable: updated.stock.available >= Number(value || 1),
                };
            }
            next[index] = updated;
            return next;
        });
    };

    const handleCheckItemStock = async (index: number) => {
        const item = items[index];
        const skuToLookup = item?.sku?.trim();
        if (!skuToLookup || skuToLookup.length < 2) return;

        try {
            const locId = order?.locationId;
            const res = await authFetch(`/pos-sales/lookup`, {
                params: {
                    q: skuToLookup,
                    ...(locId ? { locationId: locId } : {}),
                },
            });
            if (res.ok && res.data?.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
                const found = res.data.data[0];
                const avail = Number(found.stockQty ?? 0);
                setItems(prev => {
                    const next = [...prev];
                    const current = next[index];
                    if (!current) return prev;
                    next[index] = {
                        ...current,
                        name: current.name || found.description || found.name || '',
                        brand: current.brand || (typeof found.brand === 'object' ? found.brand?.name : found.brand) || '',
                        size: current.size || (typeof found.size === 'object' ? found.size?.name : found.size) || '',
                        price: current.price > 0 ? current.price : Number(found.unitPrice || 0),
                        stock: {
                            available: avail,
                            isAvailable: avail >= (Number(current.qty) || 1),
                        },
                    };
                    return next;
                });
            }
        } catch {
            // Silently continue
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
            { sku: '', name: '', qty: 1, price: 0, skuDiscounted: 0 }
        ]);
    };

    // Real-time calculations
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
                // If percent discount or fixed
                voucherDeduction = Math.min(Number(voucherStatus.amount || 0), itemsNet);
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
            if (!items[i].sku || !items[i].sku.trim()) {
                toast.error(`Item #${i + 1} requires a valid SKU.`);
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
                    sku: it.sku.trim(),
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
                className="w-[calc(100vw-2rem)] sm:max-w-[95vw] md:max-w-4xl lg:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card"
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
                        Modify order items, pricing, customer details, or fix wrongly applied vouchers before posting to POS Sales.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 space-y-5">
                    {/* 1. Voucher / Promo Code Editor Section */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/80 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary" />
                                <Label htmlFor="coupon-code-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Voucher / Promo Code Management
                                </Label>
                            </div>
                            {couponCode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearVoucher}
                                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 px-2"
                                >
                                    <RotateCcw className="h-3 w-3" /> Clear Voucher
                                </Button>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="coupon-code-input"
                                    placeholder="Enter voucher or coupon code (e.g. GFT-1002, PROMO20)..."
                                    value={couponCode}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setCouponCode(val);
                                        // Reset status if changed
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
                            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                                voucherStatus.isValid
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {voucherStatus.isValid ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                    )}
                                    <div className="space-y-0.5">
                                        <span className="font-bold">
                                            {voucherStatus.isValid ? 'Valid Code' : 'Invalid or Restricted Voucher'}
                                        </span>
                                        <p className="text-[11px] opacity-90">
                                            {voucherStatus.message}
                                        </p>
                                    </div>
                                </div>
                                {voucherStatus.isValid && (
                                    <Badge className="bg-emerald-600 text-white font-mono shrink-0">
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

                        {/* Payment Mode & Shipping Fee */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t">
                            <div className="space-y-1">
                                <Label htmlFor="pay-method">Payment Method</Label>
                                <Input
                                    id="pay-method"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    placeholder="COD / Cash / Card"
                                    className="bg-background text-xs"
                                />
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

                    {/* 3. Items Editor Table */}
                    <div className="border rounded-xl overflow-hidden space-y-0">
                        <div className="bg-muted/50 p-3 px-4 border-b flex items-center justify-between text-xs font-bold text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                <span>Order Items ({items.length} Lines, {calculations.totalUnits} Pcs)</span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="h-7 text-xs gap-1 bg-background"
                            >
                                <Plus className="h-3 w-3" /> Add Item
                            </Button>
                        </div>

                        <div className="divide-y text-xs">
                            {items.map((item, idx) => {
                                const qty = Math.max(1, Number(item.qty) || 1);
                                const price = Math.max(0, Number(item.price) || 0);
                                const disc = Math.min(100, Math.max(0, Number(item.skuDiscounted) || 0));
                                const lineSubtotal = Math.max(0, Math.round(price * qty * (1 - disc / 100)));

                                return (
                                    <div key={idx} className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-muted/10">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 flex-1 w-full">
                                            {/* SKU */}
                                            <div className="space-y-1 col-span-2 sm:col-span-2">
                                                <Label className="text-[10px] text-muted-foreground">SKU / Barcode</Label>
                                                <Input
                                                    value={item.sku}
                                                    onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                                                    onBlur={() => handleCheckItemStock(idx)}
                                                    placeholder="Item SKU"
                                                    className="font-mono text-xs h-8 bg-background"
                                                />
                                            </div>

                                            {/* Item Name */}
                                            <div className="space-y-1 col-span-2 sm:col-span-2">
                                                <Label className="text-[10px] text-muted-foreground">Product Description</Label>
                                                <Input
                                                    value={item.name || ''}
                                                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                                    placeholder="Product Name"
                                                    className="text-xs h-8 bg-background"
                                                />
                                            </div>

                                            {/* Qty */}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Qty</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="text-xs h-8 bg-background font-semibold"
                                                />
                                            </div>

                                            {/* Price */}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Unit Price (Rs)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={item.price}
                                                    onChange={(e) => updateItem(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="text-xs h-8 bg-background"
                                                />
                                            </div>

                                            {/* Discount % */}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Discount %</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={item.skuDiscounted}
                                                    onChange={(e) => updateItem(idx, 'skuDiscounted', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                    className="text-xs h-8 bg-background"
                                                />
                                            </div>

                                            {/* Line Total */}
                                            <div className="space-y-1 col-span-2 sm:col-span-1 flex flex-col justify-end">
                                                <Label className="text-[10px] text-muted-foreground">Line Net</Label>
                                                <div className="h-8 flex items-center font-bold text-foreground">
                                                    Rs {lineSubtotal.toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Live Stock Badge */}
                                            {item.stock && (
                                                <div className="col-span-2 sm:col-span-4 md:col-span-6 pt-1 flex items-center gap-1.5">
                                                    {item.stock.available >= qty ? (
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 font-medium">
                                                            <CheckCircle2 className="h-3 w-3" /> Location Stock: {item.stock.available} available (Requires {qty})
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 gap-1 font-medium">
                                                            <AlertCircle className="h-3 w-3" /> Out of Stock: only {item.stock.available} available at this location (Requires {qty})
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove row */}
                                        <div className="shrink-0 self-end md:self-center">
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
                                );
                            })}
                        </div>
                    </div>

                    {/* 4. Dynamic Financial Ledger Preview */}
                    <div className="p-4 bg-muted/40 rounded-xl border space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4 text-primary" /> Projected Financial Ledger
                            </h4>
                            <span className="text-muted-foreground text-[11px]">
                                Recalculates dynamically with your changes
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
                                <span className="text-muted-foreground">4. Voucher Applied</span>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                    -Rs {calculations.voucherDeduction.toLocaleString()}
                                </p>
                            </div>
                            <div className="space-y-0.5 bg-primary/10 p-2.5 rounded-lg border border-primary/20 col-span-2">
                                <span className="text-primary text-[11px] font-bold">5. Net Grand Total (Payable)</span>
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
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
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
