'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { purchaseOrderApi, itemApi, MasterItem, purchaseRequisitionApi, PurchaseRequisition } from '@/lib/api';
import { getVendors } from '@/lib/actions/procurement';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

interface OrderItem {
    itemId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxPercent?: number;
    discountPercent?: number;
    // Display only
    itemName?: string;
    lineTotal?: number;
}

export default function CreateDirectPurchaseOrder() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [items, setItems] = useState<MasterItem[]>([]);
    const [approvedPRs, setApprovedPRs] = useState<PurchaseRequisition[]>([]);

    // Form State
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');
    const [selectedPRId, setSelectedPRId] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    // Item Input State
    const [currentItemId, setCurrentItemId] = useState<string>('');
    const [currentQty, setCurrentQty] = useState<string>('');
    const [currentPrice, setCurrentPrice] = useState<string>('');
    const [currentTax, setCurrentTax] = useState<string>('0');
    const [currentDiscount, setCurrentDiscount] = useState<string>('0');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [vendorsData, itemsData, prsData] = await Promise.all([
                getVendors(),
                itemApi.getAll(),
                purchaseRequisitionApi.getAll('APPROVED')
            ]);

            if (vendorsData?.data) {
                setVendors(vendorsData.data);
            }
            if (itemsData?.data) {
                setItems(itemsData.data);
            }
            if (prsData) {
                setApprovedPRs(prsData);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data');
        }
    };

    const handlePRSelect = (prId: string) => {
        setSelectedPRId(prId);
        const pr = approvedPRs.find(p => p.id === prId);
        if (!pr || !pr.items) return;

        // Map PR items to Order Items
        const newItems = pr.items.map(prItem => {
            const masterItem = items.find(i => i.id === prItem.itemId || i.itemId === prItem.itemId);
            const qty = parseFloat(prItem.requiredQty);
            const price = masterItem?.unitPrice || 0;
            const tax = masterItem?.taxRate1 || 0;
            const discount = masterItem?.discountRate || 0;
            const lineTotal = (qty * price) + ((qty * price * tax) / 100) - ((qty * price * discount) / 100);

            return {
                itemId: prItem.itemId,
                itemName: masterItem?.sku || masterItem?.itemId || 'Unknown Item',
                description: prItem.description || masterItem?.description || '',
                quantity: qty,
                unitPrice: price,
                taxPercent: tax,
                discountPercent: discount,
                lineTotal: lineTotal
            };
        });

        setOrderItems(newItems);
        if (pr.notes) setNotes(prev => prev ? `${prev}\nPR Notes: ${pr.notes}` : `PR Notes: ${pr.notes}`);
    };

    const handleItemSelect = (itemId: string) => {
        setCurrentItemId(itemId);
        const selectedItem = items.find(i => i.id === itemId || i.itemId === itemId);
        if (selectedItem) {
            setCurrentPrice(selectedItem.unitPrice?.toString() || '');
            setCurrentTax(selectedItem.taxRate1?.toString() || '0');
            setCurrentDiscount(selectedItem.discountRate?.toString() || '0');
        }
    };

    const handleAddItem = () => {
        if (!currentItemId || !currentQty || !currentPrice) {
            toast.error('Please fill in all item fields');
            return;
        }

        const selectedItem = items.find(i => i.id === currentItemId);
        if (!selectedItem) return;

        const qty = parseFloat(currentQty);
        const price = parseFloat(currentPrice);
        const tax = parseFloat(currentTax || '0');
        const discount = parseFloat(currentDiscount || '0');

        const lineTotal = (qty * price) + ((qty * price * tax) / 100) - ((qty * price * discount) / 100);

        const newItem: OrderItem = {
            itemId: currentItemId,
            itemName: selectedItem.sku || selectedItem.itemId,
            description: selectedItem.description || selectedItem.sku || '',
            quantity: qty,
            unitPrice: price,
            taxPercent: tax,
            discountPercent: discount,
            lineTotal: lineTotal
        };

        setOrderItems([...orderItems, newItem]);

        // Reset inputs
        setCurrentItemId('');
        setCurrentQty('');
        setCurrentPrice('');
        setCurrentTax('0');
        setCurrentDiscount('0');
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    const handleUpdateItem = (index: number, field: keyof OrderItem, value: string) => {
        const newItems = [...orderItems];
        const item = { ...newItems[index] };

        const numValue = parseFloat(value) || 0;
        (item as any)[field] = numValue;

        // Recalculate line total
        const qty = item.quantity;
        const price = item.unitPrice;
        const tax = item.taxPercent || 0;
        const discount = item.discountPercent || 0;

        item.lineTotal = (qty * price) + ((qty * price * tax) / 100) - ((qty * price * discount) / 100);

        newItems[index] = item;
        setOrderItems(newItems);
    };

    const calculateTotal = () => {
        return orderItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    };

    const handleSubmit = async () => {
        if (!selectedVendorId) {
            toast.error('Please select a vendor');
            return;
        }
        if (orderItems.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        try {
            setLoading(true);
            const po = await purchaseOrderApi.create({
                vendorId: selectedVendorId,
                items: orderItems.map(item => ({
                    itemId: item.itemId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxPercent: item.taxPercent,
                    discountPercent: item.discountPercent
                })),
                notes,
                expectedDeliveryDate: expectedDeliveryDate || undefined
            });

            toast.success(`Purchase Order ${po.poNumber} created successfully`);
            router.push(`/erp/procurement/purchase-order/${po.id}`);
        } catch (error: any) {
            console.error('Failed to create PO:', error);
            toast.error(error.message || 'Failed to create Purchase Order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Create Direct Purchase Order</h1>
                </div>
                <Button onClick={handleSubmit} disabled={loading || orderItems.length === 0}>
                    {loading ? 'Creating...' : 'Create Purchase Order'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Vendor & Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select PR (Optional)</Label>
                            <Select value={selectedPRId} onValueChange={handlePRSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Approved PR" />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvedPRs.map((pr) => (
                                        <SelectItem key={pr.id} value={pr.id}>
                                            {pr.prNumber} - {pr.requestedBy}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((vendor) => (
                                        <SelectItem key={vendor.id} value={vendor.id}>
                                            {vendor.name} ({vendor.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Expected Delivery Date</Label>
                            <Input
                                type="date"
                                value={expectedDeliveryDate}
                                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add Item Form */}
                        <div className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                            <div className="col-span-4 space-y-2">
                                <Label>Item</Label>
                                <Select value={currentItemId} onValueChange={handleItemSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.sku || item.itemId} {item.description ? `- ${item.description}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Qty</Label>
                                <Input
                                    type="number"
                                    value={currentQty}
                                    onChange={(e) => setCurrentQty(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Price</Label>
                                <Input
                                    type="number"
                                    value={currentPrice}
                                    onChange={(e) => setCurrentPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Tax %</Label>
                                <Input
                                    type="number"
                                    value={currentTax}
                                    onChange={(e) => setCurrentTax(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <Label>Disc %</Label>
                                <Input
                                    type="number"
                                    value={currentDiscount}
                                    onChange={(e) => setCurrentDiscount(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-1">
                                <Button size="icon" onClick={handleAddItem}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Tax %</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orderItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                                No items added yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orderItems.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <div className="font-medium">{item.itemName}</div>
                                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                                                        className="w-20 ml-auto h-8 text-right"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                                                        className="w-24 ml-auto h-8 text-right"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        value={item.taxPercent}
                                                        onChange={(e) => handleUpdateItem(index, 'taxPercent', e.target.value)}
                                                        className="w-16 ml-auto h-8 text-right"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {item.lineTotal?.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end pt-4">
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total Amount</div>
                                <div className="text-2xl font-bold">{calculateTotal().toFixed(2)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
