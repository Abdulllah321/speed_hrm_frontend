'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Plus, Trash2, ArrowLeft, Search } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

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

interface OrderItem {
    itemId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    vendorId?: string;
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
    const [multiVendorMode, setMultiVendorMode] = useState<boolean>(false);
    const [vendorTypeFilter, setVendorTypeFilter] = useState<'all' | 'local' | 'import'>('all');
    const [multiVendorTypeFilter, setMultiVendorTypeFilter] = useState<'all' | 'local' | 'import'>('all');
    const [orderType, setOrderType] = useState<string>('');
    const [goodsType, setGoodsType] = useState<string>('');

    // Search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [price, setPrice] = useState<number>(0);
    const [currentVendorId, setCurrentVendorId] = useState<string>(''); // for multi-vendor add row
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
        searchInputRef.current?.focus();
    }, []);

    // ─── Keyboard shortcuts ─────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F2 → Focus search input
            if (e.key === "F2") {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // ─── Search Functionality ─────────────────────────────────
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        // Clear selected item if user is typing something different
        if (selectedItem && query !== (selectedItem.description || selectedItem.itemId)) {
            setSelectedItem(null);
            setPrice(0);
        }
    }, [selectedItem]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2 && !selectedItem) {
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
    }, [searchQuery, selectedItem]);

    const handleSelectItem = useCallback((item: any) => {
        setSelectedItem(item);
        setSearchQuery(item.description || item.itemId);
        setSearchResults([]);
        // Set price from item if available
        if (item.unitPrice) {
            setPrice(item.unitPrice);
        }
        toast.success(`Selected: ${item.description || item.itemId}`);
    }, []);

    const handleSearchSubmit = useCallback(async () => {
        if (!searchQuery.trim()) return;

        try {
            const res = await apiFetch<{ status: boolean; data: any }>(
                `/pos-sales/scan?barcode=${encodeURIComponent(searchQuery.trim())}`
            );
            if (res.status && res.data) {
                const item = res.data;
                setSelectedItem(item);
                setSearchQuery(item.description || item.itemId);
                setSearchResults([]);
                if (item.unitPrice) {
                    setPrice(item.unitPrice);
                }
                toast.success(`Selected: ${item.description || item.itemId}`);
            } else {
                toast.error("Item not found");
            }
        } catch {
            toast.error("Failed to find item");
        }
    }, [searchQuery]);

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

        // Auto-select types from PR
        if (pr.type) setOrderType(pr.type.toUpperCase());
        if (pr.goodsType) setGoodsType(pr.goodsType.toUpperCase());

        // Map PR items to Order Items
        const newItems = pr.items.map(prItem => {
            const masterItem = items.find(i => i.itemId === prItem.itemId);
            const qty = parseFloat(prItem.requiredQty);
            const price = masterItem?.unitPrice || 0;
            const lineTotal = qty * price;

            return {
                itemId: prItem.itemId,
                itemName: masterItem?.sku || masterItem?.itemId || 'Unknown Item',
                description: masterItem?.description || '',
                quantity: qty,
                unitPrice: price,
                lineTotal: lineTotal
            };
        });

        setOrderItems(newItems);
        if (pr.notes) setNotes(prev => prev ? `${prev}\nPR Notes: ${pr.notes}` : `PR Notes: ${pr.notes}`);
    };

    const handleAddItem = useCallback(() => {
        if (!selectedItem || !quantity || quantity <= 0 || !price || price <= 0) {
            toast.error("Please select an item and enter valid quantity and price");
            return;
        }

        if (multiVendorMode && !currentVendorId) {
            toast.error('Select vendor for this item');
            return;
        }

        // Check if item already exists
        const existingIndex = orderItems.findIndex(item => item.itemId === selectedItem.itemId);
        if (existingIndex >= 0) {
            // Update quantity of existing item
            const updatedItems = [...orderItems];
            updatedItems[existingIndex].quantity += quantity;
            updatedItems[existingIndex].lineTotal = updatedItems[existingIndex].quantity * updatedItems[existingIndex].unitPrice;
            setOrderItems(updatedItems);
            toast.success(`Updated quantity for ${selectedItem.description || selectedItem.itemId}`);
        } else {
            // Add new item
            const lineTotal = quantity * price;
            const newItem: OrderItem = {
                itemId: selectedItem.itemId,
                itemName: selectedItem.sku || selectedItem.itemId,
                description: selectedItem.description || selectedItem.sku || '',
                quantity: quantity,
                unitPrice: price,
                lineTotal: lineTotal,
                vendorId: multiVendorMode ? currentVendorId || undefined : undefined
            };
            setOrderItems(prev => [...prev, newItem]);
            toast.success(`Added ${selectedItem.description || selectedItem.itemId}`);
        }

        // Reset form
        setSelectedItem(null);
        setSearchQuery('');
        setQuantity(1);
        setPrice(0);
        setCurrentVendorId('');
        searchInputRef.current?.focus();
    }, [selectedItem, quantity, price, multiVendorMode, currentVendorId, orderItems]);

    const handleRemoveItem = useCallback((itemId: string) => {
        setOrderItems(prev => prev.filter(item => item.itemId !== itemId));
        toast.success("Item removed");
    }, []);

    const handleUpdateItem = (index: number, field: keyof OrderItem, value: string) => {
        const newItems = [...orderItems];
        const item = { ...newItems[index] };

        const numValue = parseFloat(value) || 0;
        (item as any)[field] = numValue;

        // Recalculate line total (simple multiplication without tax/discount)
        item.lineTotal = item.quantity * item.unitPrice;

        newItems[index] = item;
        setOrderItems(newItems);
    };

    const calculateTotal = () => {
        return orderItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    };

    const getFilteredVendors = (filterType: 'all' | 'local' | 'import') => {
        return vendors.filter(v => {
            if (filterType === 'all') return true;
            if (filterType === 'local') return v.type === 'LOCAL' || !v.type;
            if (filterType === 'import') return v.type === 'IMPORT' || v.type === 'INTERNATIONAL';
            return true;
        });
    };

    const handleSubmit = async () => {
        if (orderItems.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        try {
            setLoading(true);
            if (!multiVendorMode) {
                if (!selectedVendorId) {
                    toast.error('Please select a vendor');
                    return;
                }
                const po = await purchaseOrderApi.create({
                    vendorId: selectedVendorId,
                    purchaseRequisitionId: selectedPRId || undefined,
                    items: orderItems.map(item => ({
                        itemId: item.itemId,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    })),
                    notes,
                    expectedDeliveryDate: expectedDeliveryDate || undefined,
                    orderType: orderType || undefined,
                    goodsType: goodsType || undefined
                });
                toast.success(`Purchase Order ${po.poNumber} created successfully`);
                router.push(`/erp/procurement/purchase-order/${po.id}`);
            } else {
                // Group items by vendorId
                const groups: Record<string, OrderItem[]> = {};
                for (const item of orderItems) {
                    if (!item.vendorId) {
                        toast.error('Select vendor for all items');
                        setLoading(false);
                        return;
                    }
                    if (!groups[item.vendorId]) groups[item.vendorId] = [];
                    groups[item.vendorId].push(item);
                }
                const payload = {
                    awards: Object.entries(groups).map(([vendorId, items]) => ({
                        vendorId,
                        items: items.map(i => ({
                            itemId: i.itemId,
                            description: i.description,
                            quantity: i.quantity,
                            unitPrice: i.unitPrice
                        })),
                        notes,
                        expectedDeliveryDate: expectedDeliveryDate || undefined,
                        orderType: orderType || undefined,
                        goodsType: goodsType || undefined
                    }))
                };
                const result = await purchaseOrderApi.createMultiDirect(payload);
                if (Array.isArray(result) && result.length > 0) {
                    toast.success(`Created ${result.length} Purchase Orders`);
                    router.push(`/erp/procurement/purchase-order/${result[0].id}`);
                } else {
                    toast.error('Failed to create Purchase Orders');
                }
            }
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

            {/* Keyboard shortcut hints */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-muted">F2</span>
                <span>Focus Search</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Enter</span>
                <span>Select Item</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Tab</span>
                <span>Next Field</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Vendor & Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Multi-vendor mode</Label>
                            <Input
                                type="checkbox"
                                checked={multiVendorMode}
                                onChange={(e) => setMultiVendorMode(e.target.checked)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Select PR (Optional)</Label>
                            <Select value={selectedPRId} onValueChange={handlePRSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Approved PR" />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvedPRs.map((pr) => (
                                        <SelectItem key={pr.id} value={pr.id}>
                                            {pr.prNumber} - {pr.department || 'No Department'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!multiVendorMode && (
                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            <div className="flex gap-2">
                                <Select value={vendorTypeFilter} onValueChange={(v: any) => setVendorTypeFilter(v)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="local">Local</SelectItem>
                                        <SelectItem value="import">Import</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select Vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getFilteredVendors(vendorTypeFilter).map((vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name} ({vendor.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        )}

                        <div className="space-y-2">
                            <Label>Expected Delivery Date</Label>
                            <Input
                                type="date"
                                value={expectedDeliveryDate}
                                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Order Type</Label>
                            <Select value={orderType} onValueChange={setOrderType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Order Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOCAL">Local</SelectItem>
                                    <SelectItem value="IMPORT">Import</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Goods Type</Label>
                            <Select value={goodsType} onValueChange={setGoodsType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Goods Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                                    <SelectItem value="FRESH">Fresh Goods</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <CardTitle>Add Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add Item Form */}
                        <div className="space-y-3 border-b pb-4">
                            <div className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5 space-y-2">
                                    <Label className="text-sm font-semibold">Item Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            ref={searchInputRef}
                                            placeholder="Search by Item ID, SKU, Barcode, or Description..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSearchSubmit();
                                                }
                                            }}
                                            className="pl-9 bg-muted/50 border-input h-10 w-full"
                                        />

                                        {/* Autocomplete Dropdown */}
                                        {searchQuery.trim().length > 0 && 
                                         !selectedItem &&
                                         (searchResults.length > 0 || isSearching) && (
                                            <div className="absolute left-0 right-0 top-12 bg-popover border border-border shadow-md rounded-md overflow-hidden z-50 max-h-64 overflow-y-auto">
                                                {isSearching ? (
                                                    <div className="p-3 text-sm text-muted-foreground flex items-center justify-center">
                                                        Searching...
                                                    </div>
                                                ) : (
                                                    <ul className="flex flex-col">
                                                        {searchResults.map((item) => (
                                                            <li
                                                                key={item.id}
                                                                className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0"
                                                                onClick={() => handleSelectItem(item)}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-semibold">{item.description || 'Unknown Item'}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ID: {item.itemId} | SKU: {item.sku || '-'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm font-medium">
                                                                    {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : 'No price'}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Show selected item */}
                                    {selectedItem && (
                                        <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Selected: {selectedItem.description || selectedItem.itemId}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-sm font-semibold">Quantity</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddItem();
                                            }
                                        }}
                                        className="h-10"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-sm font-semibold">Unit Price</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddItem();
                                            }
                                        }}
                                        className="h-10"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={!selectedItem || !quantity || quantity <= 0 || !price || price <= 0}
                                        className="h-10 w-full"
                                    >
                                        Add Item
                                    </Button>
                                </div>
                            </div>
                            {multiVendorMode && (
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-2">
                                        <Label>Vendor for this item</Label>
                                        <div className="flex gap-2">
                                            <Select value={multiVendorTypeFilter} onValueChange={(v: any) => setMultiVendorTypeFilter(v)}>
                                                <SelectTrigger className="w-32">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Types</SelectItem>
                                                    <SelectItem value="local">Local</SelectItem>
                                                    <SelectItem value="import">Import</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select value={currentVendorId} onValueChange={setCurrentVendorId}>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select Vendor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getFilteredVendors(multiVendorTypeFilter).map((vendor) => (
                                                        <SelectItem key={vendor.id} value={vendor.id}>
                                                            {vendor.name} ({vendor.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item SKU</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
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
                                            <TableRow key={`${item.itemId}-${index}`}>
                                                <TableCell>
                                                    <div className="font-medium">{item.itemName}</div>
                                                    <div className="text-sm text-muted-foreground">{item.description}</div>
                                                </TableCell>
                                            <TableCell>
                                                {multiVendorMode ? (
                                                    <span className="text-sm">
                                                        {vendors.find(v => v.id === item.vendorId)?.name || 'No vendor'}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        {vendors.find(v => v.id === selectedVendorId)?.name || 'Select vendor above'}
                                                    </span>
                                                )}
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
                                                <TableCell className="text-right font-medium">
                                                    {item.lineTotal?.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.itemId)}>
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
