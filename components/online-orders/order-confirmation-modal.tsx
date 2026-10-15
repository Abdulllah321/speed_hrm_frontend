'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';
import {
    Phone,
    PhoneCall,
    MessageCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Copy,
    Check,
    Loader2,
    ShoppingBag,
    User,
    MapPin,
    AlertCircle
} from 'lucide-react';

interface OrderConfirmationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any | null;
    onConfirmed: (orderNumber: string, newStatus: string, notes: string) => void;
}

export function OrderConfirmationModal({
    open,
    onOpenChange,
    order,
    onConfirmed,
}: OrderConfirmationModalProps) {
    const [selectedStatus, setSelectedStatus] = useState<string>('CONFIRMED');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    useEffect(() => {
        if (order) {
            setSelectedStatus(order.confirmationStatus && order.confirmationStatus !== 'NEEDS_CONFIRMATION' ? order.confirmationStatus : 'CONFIRMED');
            setNotes('');
        }
    }, [order]);

    if (!order) return null;

    const phone = (order.phone || order.items?.[0]?.phone || '').replace(/[^0-9+]/g, '');
    const cleanPhone = phone.startsWith('0') ? '92' + phone.substring(1) : phone.replace('+', '');
    const customerName = order.customerName || 'Customer';
    const orderNumber = order.orderNumber;
    const totalAmount = order.financials?.netGrandTotal ?? order.orderTotal ?? 0;

    // Direct WhatsApp message URL
    const whatsappGreeting = encodeURIComponent(
        `Assalam-o-Alaikum ${customerName}, this is regarding your order #${orderNumber} amounting to Rs ${totalAmount.toLocaleString()} from Speed Limit. Could you please confirm if you would like us to proceed with dispatch? Thank you!`
    );
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappGreeting}`;

    const handleCopyDetails = () => {
        const textToCopy = `Order: #${orderNumber}\nCustomer: ${customerName}\nPhone: ${phone}\nAddress: ${order.address || 'N/A'}, ${order.city || ''}\nTotal: Rs ${totalAmount.toLocaleString()}`;
        navigator.clipboard.writeText(textToCopy);
        setHasCopied(true);
        toast.success("Customer contact details copied!");
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/order/${orderNumber}/confirmation`, {
                method: 'PUT',
                body: JSON.stringify({
                    confirmationStatus: selectedStatus,
                    notes: notes.trim(),
                }),
            });

            if (res.ok && res.data?.status) {
                toast.success(`Order #${orderNumber} marked as ${selectedStatus}!`);
                onConfirmed(orderNumber, selectedStatus, notes);
                onOpenChange(false);
            } else {
                toast.error(res.data?.message || 'Failed to update confirmation status');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error occurred while updating status');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[700px] max-h-[92vh] flex flex-col overflow-hidden p-6 gap-5">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <PhoneCall className="h-5 w-5 text-primary" />
                            <span>Customer Order Confirmation</span>
                            <Badge variant="outline" className="font-mono text-xs">
                                #{orderNumber}
                            </Badge>
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                        Call the customer to verify order items, delivery address, and delivery readiness before arranging stock.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {/* Customer Contact & Quick Actions Card */}
                    <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-bold text-foreground text-sm">{customerName}</span>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {order.marketplace || order.channel || 'Online'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>{phone || 'No phone provided'}</span>
                                </div>
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
                                    <span className="line-clamp-2">{order.address || 'No address specified'}, {order.city || ''}</span>
                                </div>
                            </div>

                            {/* One-Click Dial & WhatsApp Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {phone && (
                                    <>
                                        <a
                                            href={`tel:${phone}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition"
                                            title="Direct Phone Call"
                                        >
                                            <Phone className="h-3.5 w-3.5" /> Call Customer
                                        </a>
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs shadow-xs transition"
                                            title="Open WhatsApp Chat with Pre-filled Message"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                        </a>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1"
                                    onClick={handleCopyDetails}
                                    title="Copy Contact & Address Details"
                                >
                                    {hasCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    <span>{hasCopied ? 'Copied' : 'Copy'}</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Order Products Preview */}
                    <div className="border rounded-xl p-3.5 space-y-2 bg-background">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-2">
                            <span className="flex items-center gap-1.5">
                                <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Products to Confirm ({order.items?.length || 0})
                            </span>
                            <span className="text-foreground font-bold">
                                Total: Rs {totalAmount.toLocaleString()} ({order.paymentMethod || 'COD'})
                            </span>
                        </div>
                        <div className="divide-y max-h-40 overflow-y-auto pr-1 text-xs">
                            {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="py-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground truncate">
                                            {item.name || item.sku}
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                            <span>SKU: {item.sku}</span>
                                            {item.barcode && <span>• BC: {item.barcode}</span>}
                                            {item.size && <span className="text-foreground font-medium">• Size: {item.size}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="font-bold text-foreground">
                                            Rs {Number(item.price || 0).toLocaleString()} x {item.qty}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Confirmation Status Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Call Outcome & Status
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('CONFIRMED')}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                                    selectedStatus === 'CONFIRMED'
                                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-400 ring-2 ring-blue-500/20'
                                        : 'bg-card hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                <span>Confirmed</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedStatus('CALL_BACK')}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                                    selectedStatus === 'CALL_BACK'
                                        ? 'bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-400 ring-2 ring-violet-500/20'
                                        : 'bg-card hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <Clock className="h-4 w-4 text-violet-600" />
                                <span>Call Back</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedStatus('CANCELLED')}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                                    selectedStatus === 'CANCELLED'
                                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-400 ring-2 ring-rose-500/20'
                                        : 'bg-card hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <XCircle className="h-4 w-4 text-rose-600" />
                                <span>Cancelled</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedStatus('NEEDS_CONFIRMATION')}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                                    selectedStatus === 'NEEDS_CONFIRMATION'
                                        ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-400 ring-2 ring-amber-500/20'
                                        : 'bg-card hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <span>Unconfirmed</span>
                            </button>
                        </div>
                    </div>

                    {/* Telephonic Call Notes / Remarks */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center justify-between">
                            <span>Call Notes & Delivery Instructions</span>
                            <span className="text-[11px] text-muted-foreground">Optional</span>
                        </label>
                        <Textarea
                            placeholder="e.g. Customer confirmed for Tuesday delivery, call before reaching gate, verified house number..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="text-xs resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="border-t pt-3 flex flex-row items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                            </>
                        ) : (
                            'Save Status'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
