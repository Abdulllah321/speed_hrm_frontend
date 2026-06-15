'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { inventoryApi } from '@/lib/api';
import { getVendors } from '@/lib/actions/procurement';
import { getPurchaseOrder, updatePurchaseOrder } from '@/lib/actions/purchase-order';
import { toast } from 'sonner';
import { ArrowLeft, Search, CheckCircle2, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Autocomplete } from '@/components/ui/autocomplete';
import { cn, formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface OrderItem {
    itemId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    itemName?: string;
    lineTotal?: number;
}

export default function EditPurchaseOrder({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);

    // Form State
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [notes, setNotes] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [orderType, setOrderType] = useState('LOCAL');
    const [goodsType, setGoodsType] = useState('CONSUMABLE');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [poNumber, setPoNumber] = useState('');
    const [status, setStatus] = useState('');

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        Promise.all([loadPo(), loadVendors()]).finally(() => setLoading(false));
    }, [id]);

    const loadPo = async () => {
        try {
            const data = await getPurchaseOrder(id);
            if (!data) { toast.error('Purchase Order not found'); router.back(); return; }
            if (data.status !== 'PENDING_CHECKER' && data.status !== 'PENDING_AUTHORIZER') {
                toast.error('Only pending purchase orders can be edited');
                router.push(`/erp/procurement/purchase-order/${id}`);
                return;
            }
            setPoNumber(data.poNumber);
            setStatus(data.status);
            setSelectedVendorId(data.vendorId || '');
            setNotes(data.notes || '');
            setOrderType(data.orderType || 'LOCAL');
            setGoodsType(data.goodsType || 'CONSUMABLE');
            if (data.expectedDeliveryDate) {
                setExpectedDeliveryDate(new Date(data.expectedDeliveryDate).toISOString().split('T')[0]);
            }
            if (data.items) {
                setOrderItems(data.items.map((item: any) => ({
                    itemId: item.itemId,
                    itemName: item.item?.sku || item.itemId,
                    description: item.description || item.item?.description || '',
                    quantity: parseFloat(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    lineTotal: parseFloat(item.lineTotal),
                })));
            }
        } catch {
            toast.error('Failed to load purchase order');
        }
    };

    const loadVendors = async () => {
        try {
            const data = await getVendors();
            if (data?.data) setVendors(data.data);
        } catch { /* ignore */ }
    };

    const handleSearchChange = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const res = await inventoryApi.search(query.trim());
            if (res.status && res.data) {
                setSearchResults(res.data.map((item: any) => ({
                    value: item.id,
                    label: `${item.sku} - ${item.description}`,
                    item: { ...item, availableStock: item.totalQuantity ?? 0 },
                })));
                if (!isPopoverOpen) setIsPopoverOpen(true);
            } else {
                setSearchResults([]);
            }
        } catch { setSearchResults([]); }
        finally { setIsSearching(false); }
    }, [isPopoverOpen]);

    const handleSelectItem = useCallback((item: any) => {
        const existingIndex = orderItems.findIndex(i => i.itemId === (item.itemId || item.id));
        if (existingIndex >= 0) {
            const updated = [...orderItems];
            updated[existingIndex].quantity += quantity;
            updated[existingIndex].lineTotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
            setOrderItems(updated);
            toast.info(`Updated quantity for ${item.description}`);
        } else {
            const unitPrice = price || Number(item.unitPrice ?? 0);
            setOrderItems(prev => [...prev, {
                itemId: item.itemId || item.id,
                itemName: item.sku,
                description: item.description,
                quantity,
                unitPrice,
                lineTotal: quantity * unitPrice,
            }]);
            toast.success(`Added ${item.description}`);
        }
        setIsPopoverOpen(false);
        setSearchQuery('');
        setSearchResults([]);
    }, [orderItems, quantity, price]);

    const handleUpdateItem = (index: number, field: 'quantity' | 'unitPrice', value: string) => {
        const newItems = [...orderItems];
        (newItems[index] as any)[field] = parseFloat(value) || 0;
        newItems[index].lineTotal = newItems[index].quantity * newItems[index].unitPrice;
        setOrderItems(newItems);
    };

    const handleRemoveItem = (itemId: string) => {
        setOrderItems(prev => prev.filter(i => i.itemId !== itemId));
    };

    const calculateTotal = () => orderItems.reduce((s, i) => s + (i.lineTotal || 0), 0);

    const handleSave = async () => {
        if (orderItems.length === 0) { toast.error('Please add at least one item'); return; }
        if (!selectedVendorId) { toast.error('Please select a vendor'); return; }
        try {
            setSaving(true);
            await updatePurchaseOrder(id, {
                vendorId: selectedVendorId,
                items: orderItems.map(i => ({
                    itemId: i.itemId,
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
                notes,
                expectedDeliveryDate: expectedDeliveryDate || undefined,
                orderType,
                goodsType,
            });
            toast.success('Purchase Order updated successfully');
            router.push(`/erp/procurement/purchase-order/${id}`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update Purchase Order');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading...</div>;

    return (
        <PermissionGuard permissions="erp.procurement.po.update">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Edit Purchase Order</h1>
                        <p className="text-muted-foreground text-sm">{poNumber} · <span className="font-semibold text-amber-600">{status.replace('_', ' ')}</span></p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving || orderItems.length === 0} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left sidebar */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader><CardTitle>Vendor &amp; Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            <Autocomplete
                                options={vendors.map(v => ({ value: v.id, label: `${v.name} (${v.code})` }))}
                                value={selectedVendorId}
                                onValueChange={setSelectedVendorId}
                                placeholder="Select Vendor"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Expected Delivery Date</Label>
                            <DatePicker
                                value={expectedDeliveryDate}
                                onChange={setExpectedDeliveryDate}
                                placeholder="Select delivery date"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Order Type</Label>
                            <Autocomplete
                                options={[{ value: 'LOCAL', label: 'Local' }, { value: 'IMPORT', label: 'Import' }]}
                                value={orderType}
                                onValueChange={setOrderType}
                                placeholder="Select Order Type"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Goods Type</Label>
                            <Autocomplete
                                options={[{ value: 'CONSUMABLE', label: 'Consumable' }, { value: 'FRESH', label: 'FINISH GOODS' }]}
                                value={goodsType}
                                onValueChange={setGoodsType}
                                placeholder="Select Goods Type"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Right panel - Items */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Items</span>
                            {orderItems.length > 0 && <Badge variant="secondary">{orderItems.length} items</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add item row */}
                        <div className="space-y-3 border-b pb-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="flex gap-3 items-end flex-wrap">
                                <div className="flex-1 min-w-[200px] space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Search &amp; Select Item</Label>
                                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    ref={searchInputRef}
                                                    placeholder="Type SKU or description…"
                                                    value={searchQuery}
                                                    onChange={e => handleSearchChange(e.target.value)}
                                                    onFocus={() => searchResults.length > 0 && setIsPopoverOpen(true)}
                                                    className="h-10 pl-10 border-primary/20"
                                                />
                                                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl" align="start" onOpenAutoFocus={e => e.preventDefault()}>
                                            <Command shouldFilter={false}>
                                                <CommandList className="max-h-[320px]">
                                                    {searchResults.length === 0 ? (
                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                            {isSearching ? 'Searching…' : searchQuery.length > 0 ? `No items match "${searchQuery}"` : 'Type at least 2 characters'}
                                                        </div>
                                                    ) : (
                                                        <CommandGroup>
                                                            <div className="px-3 py-1.5 border-b border-muted/50">
                                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Results ({searchResults.length}) — click to add</span>
                                                            </div>
                                                            <ScrollArea className="h-[260px]">
                                                                {searchResults.map((opt: any) => {
                                                                    const item = opt.item;
                                                                    const isAdded = orderItems.some(i => i.itemId === (item.itemId || item.id));
                                                                    return (
                                                                        <CommandItem key={item.id} value={`${item.sku} ${item.description}`} onSelect={() => handleSelectItem(item)}
                                                                            className={cn('flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-b border-muted/50 last:border-0',
                                                                                isAdded ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-accent')}>
                                                                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold',
                                                                                        isAdded ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-muted-foreground/20')}>
                                                                                        {item.sku}
                                                                                    </span>
                                                                                    <span className={cn('truncate text-sm', isAdded ? 'font-bold text-primary' : 'font-medium')}>{item.description}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                                                    <span>Stock: <span className={cn('font-bold', item.availableStock > 0 ? 'text-foreground' : 'text-destructive')}>{item.availableStock ?? 0}</span></span>
                                                                                    <span>•</span>
                                                                                    <span>Price: <span className="font-bold text-foreground">{formatCurrency(item.unitPrice || 0)}</span></span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="shrink-0">
                                                                                {isAdded ? <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" /> : <Plus className="h-4 w-4 text-muted-foreground opacity-50" />}
                                                                            </div>
                                                                        </CommandItem>
                                                                    );
                                                                })}
                                                            </ScrollArea>
                                                        </CommandGroup>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Qty</Label>
                                    <Input type="number" step="0.01" min="0.01" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="h-10" />
                                </div>
                                <div className="w-28 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                                    <Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(Number(e.target.value))} className="h-10" placeholder="0.00" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic">Click an item in the dropdown to add it with the qty/price above.</p>
                        </div>

                        {/* Items table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item SKU</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orderItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No items added yet</TableCell>
                                        </TableRow>
                                    ) : orderItems.map((item, index) => (
                                        <TableRow key={`${item.itemId}-${index}`}>
                                            <TableCell>
                                                <div className="font-medium">{item.itemName || item.itemId}</div>
                                                <div className="text-sm text-muted-foreground">{item.description}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => handleUpdateItem(index, 'quantity', e.target.value)}
                                                    className="w-20 ml-auto h-8 text-right"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={e => handleUpdateItem(index, 'unitPrice', e.target.value)}
                                                    className="w-24 ml-auto h-8 text-right"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal || 0)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.itemId)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end pt-4">
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total Amount</div>
                                <div className="text-2xl font-bold">{formatCurrency(calculateTotal())}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </PermissionGuard>
    );
}
