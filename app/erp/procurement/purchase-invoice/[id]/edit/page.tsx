'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { PermissionGuard } from '@/components/auth/permission-guard';
import {
    ArrowLeft, Save, Trash2, Plus, Search, Loader2,
    AlertCircle, FileText, Building2, Layers
} from 'lucide-react';
import {
    getPurchaseInvoice,
    updatePurchaseInvoice,
    searchItemsForDirectPI,
} from '@/lib/actions/purchase-invoice';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditInvoiceItem {
    id?: string;
    itemId: string;
    grnItemId?: string;
    landedCostItemId?: string;
    sku?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountRate: number;
    brand?: string;
    size?: string;
    color?: string;
}

export default function EditPurchaseInvoicePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);

    // Form fields
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [staxEInvoiceNumber, setStaxEInvoiceNumber] = useState('');
    const [staxEInvoiceDate, setStaxEInvoiceDate] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [advanceTaxRate, setAdvanceTaxRate] = useState(0.5);

    // Items
    const [items, setItems] = useState<EditInvoiceItem[]>([]);

    // Item Search (for adding items)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!id) return;
        loadInvoice();
    }, [id]);

    const loadInvoice = async () => {
        try {
            setLoading(true);
            const data = await getPurchaseInvoice(id);
            if (!data) {
                toast.error('Purchase invoice not found');
                router.push('/erp/procurement/purchase-invoice');
                return;
            }

            if (data.status !== 'DRAFT') {
                toast.error('Only DRAFT purchase invoices can be edited');
                router.push(`/erp/procurement/purchase-invoice/${id}`);
                return;
            }

            setInvoice(data);
            setInvoiceNumber(data.invoiceNumber || '');
            setInvoiceDate(data.invoiceDate ? new Date(data.invoiceDate).toISOString().split('T')[0] : '');
            setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
            setNotes(data.notes || '');
            setStaxEInvoiceNumber(data.staxEInvoiceNumber || '');
            setStaxEInvoiceDate(data.staxEInvoiceDate ? new Date(data.staxEInvoiceDate).toISOString().split('T')[0] : '');
            setDiscountAmount(Number(data.discountAmount || 0));
            setAdvanceTaxRate(Number(data.advanceTaxRate ?? 0.5));

            if (data.items && Array.isArray(data.items)) {
                const mappedItems: EditInvoiceItem[] = data.items.map((i: any) => ({
                    id: i.id,
                    itemId: i.itemId,
                    grnItemId: i.grnItemId,
                    landedCostItemId: i.landedCostItemId,
                    sku: i.item?.sku || '',
                    description: i.description || i.item?.description || '',
                    quantity: Number(i.quantity || 0),
                    unitPrice: Number(i.unitPrice || 0),
                    taxRate: Number(i.taxRate || 0),
                    discountRate: Number(i.discountRate || 0),
                    brand: i.item?.brand?.name || '',
                    size: i.item?.size?.name || '',
                    color: i.item?.color?.name || '',
                }));
                setItems(mappedItems);
            }
        } catch (error: any) {
            console.error('Error loading invoice:', error);
            toast.error(error.message || 'Failed to load purchase invoice');
        } finally {
            setLoading(false);
        }
    };

    // Item Search Handler
    const handleSearchQueryChange = (query: string) => {
        setSearchQuery(query);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        searchDebounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchItemsForDirectPI(query.trim());
                setSearchResults(Array.isArray(results) ? results : []);
            } catch (err) {
                console.error('Item search failed:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const handleAddItem = (item: any) => {
        const itemIdentifier = item.id || item.itemId;
        const existingIndex = items.findIndex(i => i.itemId === itemIdentifier);

        if (existingIndex >= 0) {
            const updated = [...items];
            updated[existingIndex].quantity += 1;
            setItems(updated);
            toast.info(`Increased quantity for ${item.sku || item.description}`);
        } else {
            setItems(prev => [
                ...prev,
                {
                    itemId: itemIdentifier,
                    sku: item.sku || '',
                    description: item.description || item.sku || '',
                    quantity: 1,
                    unitPrice: Number(item.costPrice || item.unitPrice || 0),
                    taxRate: Number(item.taxRate1 || 0),
                    discountRate: 0,
                    brand: item.brand?.name || '',
                    size: item.size?.name || '',
                    color: item.color?.name || '',
                }
            ]);
            toast.success(`Added ${item.sku || item.description}`);
        }

        setSearchQuery('');
        setSearchResults([]);
        setIsSearchOpen(false);
    };

    const handleUpdateItem = (index: number, field: keyof EditInvoiceItem, value: any) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            return {
                ...item,
                [field]: value
            };
        }));
    };

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) {
            toast.error('Invoice must have at least one item');
            return;
        }
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Recalculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalItemDiscounts = 0;

        items.forEach(item => {
            const qty = Number(item.quantity || 0);
            const price = Number(item.unitPrice || 0);
            const discRate = Number(item.discountRate || 0);
            const taxRate = Number(item.taxRate || 0);

            const lineGross = qty * price;
            const lineDisc = lineGross * (discRate / 100);
            const lineTaxable = lineGross - lineDisc;
            const lineTax = lineTaxable * (taxRate / 100);

            subtotal += lineTaxable;
            totalTax += lineTax;
            totalItemDiscounts += lineDisc;
        });

        const overallDiscount = Number(discountAmount || 0);
        const baseTotal = subtotal + totalTax - overallDiscount;
        const advTaxAmt = baseTotal * (Number(advanceTaxRate || 0) / 100);
        const grandTotal = baseTotal + advTaxAmt;

        return {
            subtotal,
            totalTax,
            totalItemDiscounts,
            advanceTaxAmount: advTaxAmt,
            grandTotal: Math.max(0, grandTotal),
        };
    };

    const { subtotal, totalTax, advanceTaxAmount, grandTotal } = calculateTotals();

    const handleSave = async () => {
        if (!invoiceDate) {
            toast.error('Invoice date is required');
            return;
        }

        if (items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        for (const item of items) {
            if (!item.quantity || item.quantity <= 0) {
                toast.error(`Invalid quantity for item ${item.sku || item.description}`);
                return;
            }
            if (item.unitPrice < 0) {
                toast.error(`Unit price cannot be negative for item ${item.sku || item.description}`);
                return;
            }
        }

        try {
            setSaving(true);

            const payload = {
                invoiceDate: new Date(invoiceDate).toISOString(),
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                notes: notes || undefined,
                staxEInvoiceNumber: staxEInvoiceNumber || undefined,
                staxEInvoiceDate: staxEInvoiceDate ? new Date(staxEInvoiceDate).toISOString() : undefined,
                discountAmount: Number(discountAmount) || 0,
                advanceTaxRate: Number(advanceTaxRate) || 0,
                items: items.map(item => ({
                    itemId: item.itemId,
                    grnItemId: item.grnItemId || undefined,
                    landedCostItemId: item.landedCostItemId || undefined,
                    description: item.description || undefined,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: Number(item.taxRate || 0),
                    discountRate: Number(item.discountRate || 0),
                })),
            };

            await updatePurchaseInvoice(id, payload);
            toast.success('Purchase invoice updated successfully');
            router.push(`/erp/procurement/purchase-invoice/${id}`);
        } catch (error: any) {
            console.error('Error updating purchase invoice:', error);
            toast.error(error.message || 'Failed to update purchase invoice');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-gray-500 text-sm">Loading purchase invoice details...</p>
            </div>
        );
    }

    if (!invoice) return null;

    return (
        <PermissionGuard permissions="erp.procurement.pi.update">
            <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/erp/procurement/purchase-invoice/${id}`)}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                    Edit Invoice {invoiceNumber}
                                </h1>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                                    {invoice.status}
                                </Badge>
                                <Badge variant="outline">
                                    {invoice.invoiceType?.replace('_', ' ')}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Modify invoice header, items, pricing, and taxes
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/erp/procurement/purchase-invoice/${id}`)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary text-primary-foreground min-w-[130px]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Primary Info & Supplier Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Invoice Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="invoiceNumber" className="text-xs text-gray-500">Invoice Number</Label>
                                    <Input
                                        id="invoiceNumber"
                                        value={invoiceNumber}
                                        disabled
                                        className="bg-muted font-mono font-medium"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Invoice Date *</Label>
                                    <DatePicker
                                        date={invoiceDate ? new Date(invoiceDate) : undefined}
                                        onSelect={(date) => setInvoiceDate(date ? date.toISOString().split('T')[0] : '')}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Due Date</Label>
                                    <DatePicker
                                        date={dueDate ? new Date(dueDate) : undefined}
                                        onSelect={(date) => setDueDate(date ? date.toISOString().split('T')[0] : '')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <Label htmlFor="staxEInvoiceNumber" className="text-xs text-gray-500">Sales Tax / E-Invoice #</Label>
                                    <Input
                                        id="staxEInvoiceNumber"
                                        placeholder="ST-XXXXXXX"
                                        value={staxEInvoiceNumber}
                                        onChange={(e) => setStaxEInvoiceNumber(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Sales Tax / E-Invoice Date</Label>
                                    <DatePicker
                                        date={staxEInvoiceDate ? new Date(staxEInvoiceDate) : undefined}
                                        onSelect={(date) => setStaxEInvoiceDate(date ? date.toISOString().split('T')[0] : '')}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes" className="text-xs text-gray-500">Notes / Remarks</Label>
                                <Textarea
                                    id="notes"
                                    rows={2}
                                    placeholder="Enter additional invoice remarks..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supplier / Reference Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                Supplier & Origin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <div className="text-xs text-gray-500">Supplier</div>
                                <div className="font-semibold text-base text-gray-900 mt-0.5">
                                    {invoice.supplier?.name || '—'}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    Code: {invoice.supplier?.code || '—'}
                                </div>
                            </div>

                            {invoice.grn && (
                                <div className="pt-2 border-t">
                                    <div className="text-xs text-gray-500">Referenced GRN</div>
                                    <div className="font-medium font-mono text-primary mt-0.5">
                                        {invoice.grn.grnNumber}
                                    </div>
                                    {invoice.grn.purchaseOrder?.poNumber && (
                                        <div className="text-xs text-gray-500 font-mono">
                                            PO: {invoice.grn.purchaseOrder.poNumber}
                                        </div>
                                    )}
                                </div>
                            )}

                            {invoice.landedCost && (
                                <div className="pt-2 border-t">
                                    <div className="text-xs text-gray-500">Referenced Landed Cost</div>
                                    <div className="font-medium font-mono text-primary mt-0.5">
                                        {invoice.landedCost.landedCostNumber}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t">
                                <div className="text-xs text-gray-500">Created At</div>
                                <div className="text-xs text-gray-700 mt-0.5">
                                    {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '—'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Items Section */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" />
                                Invoice Items ({items.length})
                            </CardTitle>

                            {/* Add Item button & popover search */}
                            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 border-dashed">
                                        <Plus className="w-4 h-4" />
                                        Add Line Item
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-80 md:w-96" align="end">
                                    <Command shouldFilter={false}>
                                        <div className="flex items-center border-b px-3">
                                            <Search className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                                            <input
                                                placeholder="Search by SKU, item name, barcode..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearchQueryChange(e.target.value)}
                                                className="w-full py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
                                            />
                                            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                                        </div>
                                        <CommandList>
                                            <ScrollArea className="max-h-60">
                                                {searchResults.length === 0 && searchQuery.trim() && !isSearching && (
                                                    <div className="p-4 text-center text-xs text-gray-500">
                                                        No matching items found
                                                    </div>
                                                )}
                                                {searchResults.length === 0 && !searchQuery.trim() && (
                                                    <div className="p-4 text-center text-xs text-gray-400">
                                                        Type SKU or product name to search
                                                    </div>
                                                )}
                                                <CommandGroup>
                                                    {searchResults.map((item: any) => (
                                                        <CommandItem
                                                            key={item.id || item.itemId}
                                                            onSelect={() => handleAddItem(item)}
                                                            className="cursor-pointer p-2.5 hover:bg-accent flex flex-col items-start gap-1"
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="font-semibold text-xs font-mono">{item.sku}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    Rs. {Number(item.costPrice || item.unitPrice || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-600 line-clamp-1">
                                                                {item.description || item.itemName}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </ScrollArea>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs font-medium text-gray-500 border-y">
                                    <tr>
                                        <th className="p-3 text-left w-10">#</th>
                                        <th className="p-3 text-left min-w-[200px]">Item / SKU</th>
                                        <th className="p-3 text-left min-w-[180px]">Description</th>
                                        <th className="p-3 text-right w-24">Qty</th>
                                        <th className="p-3 text-right w-32">Unit Price</th>
                                        <th className="p-3 text-right w-24">Disc %</th>
                                        <th className="p-3 text-right w-24">Tax %</th>
                                        <th className="p-3 text-right w-32">Line Total</th>
                                        <th className="p-3 text-center w-12">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, idx) => {
                                        const qty = Number(item.quantity || 0);
                                        const price = Number(item.unitPrice || 0);
                                        const discRate = Number(item.discountRate || 0);
                                        const taxRate = Number(item.taxRate || 0);
                                        const lineGross = qty * price;
                                        const lineDisc = lineGross * (discRate / 100);
                                        const lineTaxable = lineGross - lineDisc;
                                        const lineTax = lineTaxable * (taxRate / 100);
                                        const lineTotal = lineTaxable + lineTax;

                                        return (
                                            <tr key={item.id || `${item.itemId}-${idx}`} className="hover:bg-muted/20">
                                                <td className="p-3 text-gray-400 text-xs font-mono text-center">
                                                    {idx + 1}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-900 font-mono text-xs">
                                                        {item.sku || '—'}
                                                    </div>
                                                    {(item.brand || item.size || item.color) && (
                                                        <div className="text-[11px] text-gray-500 flex gap-1 mt-0.5">
                                                            {item.brand && <span>{item.brand}</span>}
                                                            {item.size && <span>• {item.size}</span>}
                                                            {item.color && <span>• {item.color}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <Input
                                                        value={item.description}
                                                        onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                                        placeholder="Description"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={item.discountRate}
                                                        onChange={(e) => handleUpdateItem(idx, 'discountRate', parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={item.taxRate}
                                                        onChange={(e) => handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="p-3 text-right font-mono font-medium text-xs">
                                                    {Math.round(lineTotal).toLocaleString()}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleRemoveItem(idx)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Summary & Calculations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Taxes & Adjustments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="overallDiscount" className="text-xs text-gray-500">
                                        Overall Discount Amount (Rs.)
                                    </Label>
                                    <Input
                                        id="overallDiscount"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                        className="font-mono text-sm mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="advanceTaxRate" className="text-xs text-gray-500">
                                        Advance Tax Rate (%)
                                    </Label>
                                    <Input
                                        id="advanceTaxRate"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={advanceTaxRate}
                                        onChange={(e) => setAdvanceTaxRate(parseFloat(e.target.value) || 0)}
                                        className="font-mono text-sm mt-1"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Standard filer rate is typically 0.5%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Invoice Totals</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal (Excl. Tax)</span>
                                <span className="font-mono font-medium">Rs. {Math.round(subtotal).toLocaleString()}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Additional Discount</span>
                                    <span className="font-mono font-medium">- Rs. {Math.round(discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600">
                                <span>Sales Tax</span>
                                <span className="font-mono font-medium">Rs. {Math.round(totalTax).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Advance Tax ({advanceTaxRate}%)</span>
                                <span className="font-mono font-medium">Rs. {Math.round(advanceTaxAmount).toLocaleString()}</span>
                            </div>
                            <div className="pt-2.5 border-t flex justify-between font-bold text-base text-gray-900">
                                <span>Grand Total</span>
                                <span className="font-mono text-primary text-lg">Rs. {Math.round(grandTotal).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PermissionGuard>
    );
}
