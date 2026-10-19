'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Layers,
    Warehouse,
    Store,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Send,
    Package,
    RefreshCw,
    ExternalLink,
    Search,
    ShoppingBag,
    Building2,
    Check,
    X,
    FileCheck,
    AlertCircle,
    Info,
    ChevronRight,
    Sparkles,
    SlidersHorizontal,
    Box,
    Upload,
    Filter,
    ClipboardList
} from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { OnlineOrderNav } from '@/components/online-orders/online-order-nav';
import { OnlineOrderBulkUploadModal } from '@/components/online-orders/online-order-bulk-upload-modal';
import { createTransferRequest } from '@/lib/actions/transfer-request';
import Link from 'next/link';

interface OrderItem {
    id?: string;
    itemId?: string;
    sku: string;
    barcode?: string;
    systemSku?: string;
    name?: string;
    brand?: string;
    size?: string;
    qty: number;
    price: number;
    stock?: {
        available: number;
        isAvailable: boolean;
    };
    [key: string]: any;
}

interface SourcingOrder {
    orderNumber: string;
    customerName: string;
    orderedAt?: string;
    confirmationStatus: string;
    status: string;
    allStockAvailable: boolean;
    items: OrderItem[];
    [key: string]: any;
}

const normalizeConfirmationStatus = (status?: string | null): string => {
    if (!status) return 'NEEDS_CONFIRMATION';
    const s = status.trim().toUpperCase();
    if (['CONFIRMED', 'APPROVED', 'VERIFIED'].includes(s)) return 'CONFIRMED';
    if (['CALL_BACK', 'CALLBACK', 'RETRY'].includes(s)) return 'CALL_BACK';
    if (['CANCELLED', 'CANCELED', 'REJECTED'].includes(s)) return 'CANCELLED';
    return 'NEEDS_CONFIRMATION';
};

interface LocationStock {
    locationId: string;
    locationName: string;
    warehouseId?: string;
    isWarehouse: boolean;
    availableQty: number;
}

interface ItemStockCache {
    item: {
        id: string;
        sku: string;
        barcode?: string;
        name?: string;
        brandName?: string;
    };
    locations: LocationStock[];
    totalStock: number;
}

interface ShortageItemEntry {
    uniqueKey: string;
    orderNumber: string;
    customerName: string;
    item: OrderItem;
    requiredQty: number;
    stockData: ItemStockCache | null;
}

interface SourcingPlanItem {
    uniqueKey: string;
    orderNumber: string;
    itemId: string;
    sku: string;
    barcode?: string;
    name: string;
    size?: string;
    requiredQty: number;
    selectedLocationId: string;
    selectedLocationName: string;
    isWarehouse: boolean;
    warehouseId?: string;
    availableAtSource: number;
}

interface ConsolidatedTransferGroup {
    sourceKey: string;
    sourceName: string;
    isWarehouse: boolean;
    sourceLocationId?: string;
    sourceWarehouseId?: string;
    items: {
        itemId: string;
        sku: string;
        name: string;
        size?: string;
        quantity: number;
        orderNumbers: string[];
    }[];
    totalUnits: number;
}

export default function InventorySourcingPage() {
    const { user } = useAuth();
    const destinationLocationId = 
        user?.terminal?.location?.id || 
        (user as any)?.locationId || 
        (user as any)?.terminal?.locationId;

    const [orders, setOrders] = useState<SourcingOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeView, setActiveView] = useState<'consolidated' | 'items'>('consolidated');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Bulk Uploader Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Confirmation status filter: 'ALL' | 'CONFIRMED'
    const [confirmationFilter, setConfirmationFilter] = useState<'ALL' | 'CONFIRMED'>('ALL');

    // Order Scope Filter (Specific order numbers)
    const [selectedOrderNumbersFilter, setSelectedOrderNumbersFilter] = useState<Set<string>>(new Set());
    const [isOrderFilterModalOpen, setIsOrderFilterModalOpen] = useState(false);
    const [orderPasteInput, setOrderPasteInput] = useState('');
    const [orderFilterSearch, setOrderFilterSearch] = useState('');

    // Per-Store unchecked items: key is `${sourceKey}-${itemId}`
    const [unselectedStoreItemIds, setUnselectedStoreItemIds] = useState<Set<string>>(new Set());

    // Stock Cache per barcode/SKU
    const [stockCache, setStockCache] = useState<Record<string, ItemStockCache>>({});

    // Sourcing Item Selections: key -> SourcingPlanItem
    const [sourcingSelections, setSourcingSelections] = useState<Record<string, SourcingPlanItem>>({});
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    // Generated STNs: key: sourceKey -> stnNo
    const [generatingGroupKey, setGeneratingGroupKey] = useState<string | null>(null);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [generatedSTNs, setGeneratedSTNs] = useState<Array<{
        stnNo: string;
        sourceName: string;
        sourceKey: string;
        itemsCount: number;
        totalUnits: number;
        createdAt: string;
    }>>([]);

    // Fetch unposted online orders
    const fetchOrders = useCallback(async (silent = false) => {
        if (!silent) setLoadingOrders(true);
        else setRefreshing(true);

        try {
            const res = await authFetch('/pos-sales/online-orders/bulk-upload');
            if (res.ok && res.data?.status && res.data?.data) {
                const formatted: SourcingOrder[] = res.data.data
                    .filter((o: any) => o.itemStatus !== 'posted')
                    .map((o: any) => ({
                        ...o,
                        customerName: o.customerName || 'Customer',
                        confirmationStatus: normalizeConfirmationStatus(o.confirmationStatus || o.realMarketStatus),
                        status: o.itemStatus || 'pending',
                    }));
                setOrders(formatted);
            } else {
                toast.error(res.data?.message || 'Failed to load orders');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error loading orders');
        } finally {
            setLoadingOrders(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Batch fetch multi-location stock for all shortage items
    useEffect(() => {
        if (orders.length === 0) return;

        const identifiersToFetch = new Set<string>();
        orders.forEach(order => {
            order.items?.forEach(item => {
                const isShort = item.stock ? !item.stock.isAvailable : false;
                const ident = item.barcode || item.sku || item.systemSku || item.itemId;
                if (isShort && ident && !stockCache[ident]) {
                    identifiersToFetch.add(ident);
                }
            });
        });

        const list = Array.from(identifiersToFetch);
        if (list.length === 0) return;

        const loadBatchStock = async () => {
            try {
                const res = await authFetch('/pos-sales/online-orders/bulk-upload/batch-barcode-stock', {
                    method: 'POST',
                    body: JSON.stringify({ identifiers: list }),
                });

                if (res.ok && res.data?.status && res.data?.data) {
                    setStockCache(prev => ({
                        ...prev,
                        ...res.data.data,
                    }));
                }
            } catch (e) {
                console.error("Batch stock lookup error", e);
            }
        };

        loadBatchStock();
    }, [orders, stockCache]);

    // Build Shortage Items with guaranteed unique keys & Order Scope Filters applied
    const allShortageItems = useMemo<ShortageItemEntry[]>(() => {
        const list: ShortageItemEntry[] = [];

        orders.forEach(order => {
            // Filter by confirmation status
            if (confirmationFilter === 'CONFIRMED' && order.confirmationStatus !== 'CONFIRMED') {
                return;
            }

            // Filter by specific order numbers if specified
            if (selectedOrderNumbersFilter.size > 0 && !selectedOrderNumbersFilter.has(order.orderNumber)) {
                return;
            }

            order.items?.forEach((item, idx) => {
                const isShort = item.stock ? !item.stock.isAvailable : false;
                if (isShort) {
                    const ident = item.barcode || item.sku || item.systemSku || item.itemId || '';
                    const uniqueKey = `${order.orderNumber}-${item.id || item.itemId || item.sku}-${idx}`;

                    list.push({
                        uniqueKey,
                        orderNumber: order.orderNumber,
                        customerName: order.customerName,
                        item,
                        requiredQty: Number(item.qty || 1),
                        stockData: stockCache[ident] || null,
                    });
                }
            });
        });

        return list;
    }, [orders, stockCache, confirmationFilter, selectedOrderNumbersFilter]);

    // Auto-allocate Sourcing Plan Items once stock cache is ready
    useEffect(() => {
        if (allShortageItems.length === 0) return;

        const newPlans: Record<string, SourcingPlanItem> = { ...sourcingSelections };
        const initialSelectedKeys = new Set(selectedKeys);
        let hasChanges = false;

        allShortageItems.forEach(entry => {
            const { uniqueKey, orderNumber, item, stockData } = entry;

            if (stockData && !newPlans[uniqueKey]) {
                const eligibleLocations = stockData.locations.filter(
                    loc => loc.locationId !== destinationLocationId && loc.availableQty > 0
                );

                if (eligibleLocations.length > 0) {
                    const bestLoc = eligibleLocations[0];
                    newPlans[uniqueKey] = {
                        uniqueKey,
                        orderNumber,
                        itemId: stockData.item.id || item.itemId || item.id || '',
                        sku: item.sku,
                        barcode: item.barcode || stockData.item.barcode,
                        name: item.name || stockData.item.name || item.sku,
                        size: item.size,
                        requiredQty: entry.requiredQty,
                        selectedLocationId: bestLoc.locationId,
                        selectedLocationName: bestLoc.locationName,
                        isWarehouse: bestLoc.isWarehouse,
                        warehouseId: bestLoc.warehouseId,
                        availableAtSource: bestLoc.availableQty,
                    };
                    initialSelectedKeys.add(uniqueKey);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            setSourcingSelections(newPlans);
            setSelectedKeys(initialSelectedKeys);
        }
    }, [allShortageItems, destinationLocationId]);

    // CONSOLIDATION ENGINE: Group selected items by Source Store / Warehouse
    // "10 PRODUCTS FROM ONE STORE -> CONSOLIDATED INTO EXACTLY 1 TRANSFER REQUEST"
    const consolidatedGroups = useMemo<ConsolidatedTransferGroup[]>(() => {
        const groupMap = new Map<string, ConsolidatedTransferGroup>();

        selectedKeys.forEach(uniqueKey => {
            const plan = sourcingSelections[uniqueKey];
            if (!plan || !plan.itemId || !plan.selectedLocationId) return;

            const groupKey = plan.selectedLocationId;
            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, {
                    sourceKey: groupKey,
                    sourceName: plan.selectedLocationName,
                    isWarehouse: plan.isWarehouse,
                    sourceLocationId: plan.isWarehouse ? undefined : plan.selectedLocationId,
                    sourceWarehouseId: plan.isWarehouse ? (plan.warehouseId || plan.selectedLocationId) : undefined,
                    items: [],
                    totalUnits: 0,
                });
            }

            const group = groupMap.get(groupKey)!;
            const existingItem = group.items.find(i => i.itemId === plan.itemId);

            if (existingItem) {
                existingItem.quantity += plan.requiredQty;
                if (!existingItem.orderNumbers.includes(plan.orderNumber)) {
                    existingItem.orderNumbers.push(plan.orderNumber);
                }
            } else {
                group.items.push({
                    itemId: plan.itemId,
                    sku: plan.sku,
                    name: plan.name,
                    size: plan.size,
                    quantity: plan.requiredQty,
                    orderNumbers: [plan.orderNumber],
                });
            }

            group.totalUnits += plan.requiredQty;
        });

        return Array.from(groupMap.values());
    }, [selectedKeys, sourcingSelections]);

    // Count items company-wide unavailable
    const unavailableItemsCount = useMemo(() => {
        return allShortageItems.filter(entry => {
            if (!entry.stockData) return false;
            const eligible = entry.stockData.locations.filter(
                l => l.locationId !== destinationLocationId && l.availableQty > 0
            );
            return eligible.length === 0;
        }).length;
    }, [allShortageItems, destinationLocationId]);

    // Handle source location override for an individual item
    const handleLocationChange = (uniqueKey: string, newLoc: LocationStock) => {
        setSourcingSelections(prev => {
            const current = prev[uniqueKey];
            if (!current) return prev;
            return {
                ...prev,
                [uniqueKey]: {
                    ...current,
                    selectedLocationId: newLoc.locationId,
                    selectedLocationName: newLoc.locationName,
                    isWarehouse: newLoc.isWarehouse,
                    warehouseId: newLoc.warehouseId,
                    availableAtSource: newLoc.availableQty,
                },
            };
        });
    };

    // GENERATE 1 CONSOLIDATED STN FOR A STORE (Includes ONLY checked items from that store)
    const handleGenerateSingleConsolidatedSTN = async (group: ConsolidatedTransferGroup) => {
        const destLoc = destinationLocationId || orders[0]?.locationId || orders[0]?.items?.[0]?.locationId;
        if (!destLoc) {
            toast.error("Destination store location context is required.");
            return;
        }

        // Only include items that are NOT unselected by the user in this store
        const itemsToTransfer = group.items.filter(
            item => !unselectedStoreItemIds.has(`${group.sourceKey}-${item.itemId}`)
        );

        if (itemsToTransfer.length === 0) {
            toast.info(`Please check at least one product from ${group.sourceName} to transfer.`);
            return;
        }

        const totalUnitsToTransfer = itemsToTransfer.reduce((acc, i) => acc + i.quantity, 0);

        setGeneratingGroupKey(group.sourceKey);
        try {
            // CONSOLIDATION: Send ALL selected items from this store in ONE single payload
            const payload: any = {
                items: itemsToTransfer.map(item => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                })),
                toLocationId: destLoc,
                notes: `Consolidated STN for Online Orders: ${Array.from(new Set(itemsToTransfer.flatMap(i => i.orderNumbers))).slice(0, 5).join(', ')} (${itemsToTransfer.length} items, ${totalUnitsToTransfer} units)`,
            };

            if (group.isWarehouse) {
                payload.transferType = 'WAREHOUSE_TO_OUTLET';
                payload.fromWarehouseId = group.sourceWarehouseId;
            } else {
                payload.transferType = 'OUTLET_TO_OUTLET';
                payload.fromLocationId = group.sourceLocationId;
            }

            const result = await createTransferRequest(payload);
            const requestNo = result?.data?.requestNo || result?.requestNo || result?.data?.id || 'STN-CREATED';

            toast.success(`Consolidated STN #${requestNo} generated from ${group.sourceName} with ${itemsToTransfer.length} items!`);

            setGeneratedSTNs(prev => [
                {
                    stnNo: requestNo,
                    sourceName: group.sourceName,
                    sourceKey: group.sourceKey,
                    itemsCount: itemsToTransfer.length,
                    totalUnits: totalUnitsToTransfer,
                    createdAt: new Date().toLocaleTimeString(),
                },
                ...prev,
            ]);

            // Deselect processed items from pending state
            const processedItemIds = new Set(itemsToTransfer.map(i => i.itemId));
            setSelectedKeys(prev => {
                const next = new Set(prev);
                allShortageItems.forEach(entry => {
                    const plan = sourcingSelections[entry.uniqueKey];
                    if (plan && plan.selectedLocationId === group.sourceKey && processedItemIds.has(plan.itemId)) {
                        next.delete(entry.uniqueKey);
                    }
                });
                return next;
            });
        } catch (error: any) {
            console.error("STN creation error", error);
            toast.error(error.message || `Failed to create transfer from ${group.sourceName}`);
        } finally {
            setGeneratingGroupKey(null);
        }
    };

    // GENERATE ALL CONSOLIDATED STNs AT ONCE
    const handleGenerateAllSTNs = async () => {
        if (consolidatedGroups.length === 0) {
            toast.info("No items or stores ready for consolidated transfers.");
            return;
        }

        setIsGeneratingAll(true);
        let successCount = 0;

        for (const group of consolidatedGroups) {
            try {
                await handleGenerateSingleConsolidatedSTN(group);
                successCount++;
            } catch (e) {
                // error toasted per group
            }
        }

        setIsGeneratingAll(false);
        if (successCount > 0) {
            toast.success(`Completed! Generated ${successCount} consolidated STN(s).`);
        }
    };

    const toggleSelectAllShortages = (checked: boolean) => {
        if (checked) {
            setSelectedKeys(new Set(allShortageItems.map(i => i.uniqueKey)));
        } else {
            setSelectedKeys(new Set());
        }
    };

    const toggleItemSelection = (uniqueKey: string, checked: boolean) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (checked) next.add(uniqueKey);
            else next.delete(uniqueKey);
            return next;
        });
    };

    // Apply Order Numbers from Paste Input
    const handleApplyPastedOrders = () => {
        if (!orderPasteInput.trim()) {
            setSelectedOrderNumbersFilter(new Set());
            setIsOrderFilterModalOpen(false);
            return;
        }

        // Split by comma, newline, spaces, or tabs
        const parsed = orderPasteInput
            .split(/[\n,\s\t]+/)
            .map(s => s.trim().replace(/^#/, ''))
            .filter(Boolean);

        if (parsed.length === 0) {
            toast.error("No valid order numbers found in input.");
            return;
        }

        const newSet = new Set(parsed);
        setSelectedOrderNumbersFilter(newSet);
        setIsOrderFilterModalOpen(false);
        toast.success(`Filtered to ${newSet.size} specific orders!`);
    };

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return allShortageItems;
        const q = searchTerm.toLowerCase();
        return allShortageItems.filter(entry => 
            entry.orderNumber.toLowerCase().includes(q) ||
            entry.item.sku.toLowerCase().includes(q) ||
            (entry.item.name || '').toLowerCase().includes(q) ||
            entry.customerName.toLowerCase().includes(q)
        );
    }, [allShortageItems, searchTerm]);

    const totalShortageUnits = useMemo(() => {
        return allShortageItems.reduce((acc, i) => acc + i.requiredQty, 0);
    }, [allShortageItems]);

    // Filterable Orders List inside the Order Filter Dialog
    const modalOrdersList = useMemo(() => {
        if (!orderFilterSearch.trim()) return orders;
        const q = orderFilterSearch.toLowerCase();
        return orders.filter(o => 
            o.orderNumber.toLowerCase().includes(q) || 
            o.customerName.toLowerCase().includes(q)
        );
    }, [orders, orderFilterSearch]);

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Top Navigation */}
            <OnlineOrderNav counts={{
                totalOrders: orders.length,
                stockShortage: allShortageItems.length,
            }} />

            {/* Header with Uploader & Master Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                        <Layers className="h-6 w-6 text-primary" />
                        <span>Inventory Arrangement & Consolidated Transfers</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Groups shortage products by store into <strong>1 single STN</strong>. Select exactly which orders or products to include.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Bulk Upload Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="gap-2 text-xs h-9 bg-card hover:bg-muted font-semibold"
                        title="Import new Shopify/marketplace orders from CSV or Excel"
                    >
                        <Upload className="h-4 w-4 text-primary" />
                        <span>Upload Orders File</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrders(true)}
                        disabled={refreshing || loadingOrders}
                        className="gap-2 text-xs h-9"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh Stock</span>
                    </Button>

                    {/* Master 1-Click Generate All STNs */}
                    {consolidatedGroups.length > 0 && (
                        <Button
                            size="sm"
                            disabled={isGeneratingAll || Boolean(generatingGroupKey)}
                            onClick={handleGenerateAllSTNs}
                            className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 shadow-sm"
                        >
                            {isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            <span>Generate All ({consolidatedGroups.length} Consolidated STNs)</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Order Scope Filter Bar */}
            <div className="bg-muted/40 border rounded-2xl p-3 px-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-primary" />
                        <span>Order Scope:</span>
                    </span>

                    {/* Toggle: All vs Confirmed Only */}
                    <div className="flex items-center rounded-lg border bg-background p-0.5">
                        <button
                            type="button"
                            onClick={() => setConfirmationFilter('ALL')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                                confirmationFilter === 'ALL'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            All Unposted Orders
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmationFilter('CONFIRMED')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                                confirmationFilter === 'CONFIRMED'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            ✓ Only Confirmed Orders
                        </button>
                    </div>

                    {/* Filter by Specific Orders Trigger */}
                    <Button
                        variant={selectedOrderNumbersFilter.size > 0 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIsOrderFilterModalOpen(true)}
                        className={`h-7 text-xs font-semibold gap-1.5 ${
                            selectedOrderNumbersFilter.size > 0
                                ? 'bg-primary text-primary-foreground'
                                : 'border-dashed'
                        }`}
                    >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>
                            {selectedOrderNumbersFilter.size > 0
                                ? `Specific Orders: ${selectedOrderNumbersFilter.size} Selected`
                                : 'Choose / Paste Specific Orders (e.g. 17 orders)'}
                        </span>
                    </Button>

                    {selectedOrderNumbersFilter.size > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrderNumbersFilter(new Set())}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear Filter
                        </Button>
                    )}
                </div>

                <div className="text-muted-foreground text-xs">
                    Showing products for <strong className="text-foreground">{selectedOrderNumbersFilter.size > 0 ? `${selectedOrderNumbersFilter.size} selected` : orders.length} orders</strong>
                </div>
            </div>

            {/* High-Level KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Total Shortage
                            </span>
                            <div className="text-2xl font-black text-rose-600">
                                {allShortageItems.length} items
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                {totalShortageUnits} units required
                            </span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Source Stores
                            </span>
                            <div className="text-2xl font-black text-primary">
                                {consolidatedGroups.length} Stores
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                Ready to generate STNs
                            </span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Store className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Transfer Units
                            </span>
                            <div className="text-2xl font-black text-emerald-600">
                                {consolidatedGroups.reduce((acc, g) => acc + g.totalUnits, 0)} units
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                Auto-allocated to stores
                            </span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                STNs Generated
                            </span>
                            <div className="text-2xl font-black text-foreground">
                                {generatedSTNs.length}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                Created this session
                            </span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                            <FileCheck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* View Selector Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                <div className="flex items-center gap-1.5">
                    <Button
                        variant={activeView === 'consolidated' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveView('consolidated')}
                        className="h-8 text-xs font-bold gap-1.5"
                    >
                        <Warehouse className="h-3.5 w-3.5" />
                        <span>Consolidated STNs by Store ({consolidatedGroups.length})</span>
                    </Button>

                    <Button
                        variant={activeView === 'items' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveView('items')}
                        className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground"
                    >
                        <Box className="h-3.5 w-3.5" />
                        <span>All Shortage Items ({allShortageItems.length})</span>
                    </Button>
                </div>

                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search SKU, product, order #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs"
                    />
                </div>
            </div>

            {/* VIEW 1: CONSOLIDATED STNs BY STORE */}
            {activeView === 'consolidated' && (
                <div className="space-y-4">
                    {loadingOrders ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs">Analyzing stock availability across company stores...</span>
                        </div>
                    ) : consolidatedGroups.length === 0 ? (
                        <Card className="border border-dashed rounded-2xl p-12 text-center text-muted-foreground space-y-3">
                            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
                            <h3 className="font-bold text-base text-foreground">No Stock Transfers Required!</h3>
                            <p className="text-xs max-w-md mx-auto text-muted-foreground">
                                All items in current online orders are either already in stock at this location, or have already been arranged into transfer requests.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {consolidatedGroups.map((group) => {
                                const isGeneratingThis = generatingGroupKey === group.sourceKey;
                                const generatedForGroup = generatedSTNs.find(s => s.sourceKey === group.sourceKey);
                                const isExpanded = expandedGroups[group.sourceKey] ?? false;

                                // Filter products currently selected inside this store card
                                const selectedInThisGroup = group.items.filter(
                                    it => !unselectedStoreItemIds.has(`${group.sourceKey}-${it.itemId}`)
                                );
                                const selectedUnitsInThisGroup = selectedInThisGroup.reduce((acc, it) => acc + it.quantity, 0);
                                const isAllInGroupSelected = selectedInThisGroup.length === group.items.length;
                                const isSomeInGroupSelected = selectedInThisGroup.length > 0 && selectedInThisGroup.length < group.items.length;

                                return (
                                    <Card key={group.sourceKey} className="border rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                                        <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                        group.isWarehouse
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                    }`}>
                                                        {group.isWarehouse ? <Warehouse className="h-4.5 w-4.5" /> : <Store className="h-4.5 w-4.5" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-sm text-foreground truncate">
                                                            {group.sourceName}
                                                        </h3>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {group.isWarehouse ? 'Central Warehouse' : 'Retail Outlet'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Badge variant="outline" className="font-mono text-xs bg-background py-1 px-2.5 font-bold text-primary border-primary/30 shrink-0">
                                                    {group.items.length} Products • {group.totalUnits} Units
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                                            {/* Products selection list inside this STN */}
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={isAllInGroupSelected ? true : isSomeInGroupSelected ? "indeterminate" : false}
                                                            onCheckedChange={(checked) => {
                                                                setUnselectedStoreItemIds(prev => {
                                                                    const next = new Set(prev);
                                                                    group.items.forEach(it => {
                                                                        const k = `${group.sourceKey}-${it.itemId}`;
                                                                        if (checked) next.delete(k);
                                                                        else next.add(k);
                                                                    });
                                                                    return next;
                                                                });
                                                            }}
                                                            aria-label="Toggle all in this store"
                                                        />
                                                        <span>
                                                            Selected for STN ({selectedInThisGroup.length} of {group.items.length}):
                                                        </span>
                                                    </div>

                                                    {group.items.length > 4 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedGroups(prev => ({ ...prev, [group.sourceKey]: !isExpanded }))}
                                                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                                                        >
                                                            {isExpanded ? 'Collapse' : `View all ${group.items.length}`}
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={`divide-y text-xs border rounded-xl overflow-hidden bg-background ${isExpanded ? 'max-h-[480px]' : 'max-h-[220px]'} overflow-y-auto`}>
                                                    {group.items.map((item, idx) => {
                                                        const itemStoreKey = `${group.sourceKey}-${item.itemId}`;
                                                        const isChecked = !unselectedStoreItemIds.has(itemStoreKey);

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`p-2.5 flex items-center justify-between gap-2.5 transition ${
                                                                    isChecked ? 'hover:bg-muted/30' : 'bg-muted/10 opacity-60'
                                                                }`}
                                                            >
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) => {
                                                                        setUnselectedStoreItemIds(prev => {
                                                                            const next = new Set(prev);
                                                                            if (checked) next.delete(itemStoreKey);
                                                                            else next.add(itemStoreKey);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    aria-label={`Select ${item.name}`}
                                                                />

                                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                                    <div className={`font-semibold text-foreground truncate ${!isChecked ? 'line-through text-muted-foreground' : ''}`}>
                                                                        {item.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 flex-wrap">
                                                                        <span>SKU: {item.sku}</span>
                                                                        {item.size && <span>• Size: {item.size}</span>}
                                                                        <span className="text-primary font-semibold">
                                                                            • Ord #{item.orderNumbers.join(', ')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <Badge variant="secondary" className="font-mono text-xs shrink-0 font-bold bg-primary/10 text-primary">
                                                                    {item.quantity} pcs
                                                                </Badge>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Action: If generated show link, else 1-click button */}
                                            {generatedForGroup ? (
                                                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
                                                    <div className="space-y-0.5 min-w-0">
                                                        <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                            <span>STN #{generatedForGroup.stnNo} Generated!</span>
                                                        </span>
                                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                                            All {generatedForGroup.itemsCount} products ({generatedForGroup.totalUnits} units) bundled into 1 STN.
                                                        </p>
                                                    </div>
                                                    <Link
                                                        href="/erp/inventory/transactions/stock-transfer"
                                                        className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-0.5 shrink-0 bg-white dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-300"
                                                    >
                                                        <span>View STN</span>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleGenerateSingleConsolidatedSTN(group)}
                                                        disabled={isGeneratingThis || isGeneratingAll || selectedInThisGroup.length === 0}
                                                        className="w-full h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 shadow-xs cursor-pointer"
                                                    >
                                                        {isGeneratingThis ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Send className="h-3.5 w-3.5" />
                                                        )}
                                                        <span>
                                                            Generate 1 STN ({selectedInThisGroup.length} Selected Products, {selectedUnitsInThisGroup} Units)
                                                        </span>
                                                    </Button>
                                                    <p className="text-[10px] text-center text-muted-foreground">
                                                        ⚡ Bundles only the {selectedInThisGroup.length} selected products into 1 single STN request.
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* VIEW 2: ALL SHORTAGE ITEMS TABLE */}
            {activeView === 'items' && (
                <Card className="border rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 w-10 text-center">
                                        <Checkbox
                                            checked={allShortageItems.length > 0 && selectedKeys.size === allShortageItems.length}
                                            onCheckedChange={toggleSelectAllShortages}
                                            aria-label="Select all shortages"
                                        />
                                    </th>
                                    <th className="p-3 min-w-[120px]">Order #</th>
                                    <th className="p-3 min-w-[200px]">Product / SKU</th>
                                    <th className="p-3 min-w-[80px] text-center">Deficit</th>
                                    <th className="p-3 min-w-[220px]">Assigned Source Store</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {loadingOrders ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                                            <span>Loading shortage records...</span>
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                            <p className="font-bold text-sm text-foreground">No shortage items found for current order filter.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map(({ uniqueKey, orderNumber, customerName, item, requiredQty, stockData }) => {
                                        const isSelected = selectedKeys.has(uniqueKey);
                                        const plan = sourcingSelections[uniqueKey];
                                        const availableLocations = stockData?.locations?.filter(
                                            loc => loc.locationId !== destinationLocationId && loc.availableQty > 0
                                        ) || [];

                                        return (
                                            <tr
                                                key={uniqueKey}
                                                className={`transition ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                                            >
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => toggleItemSelection(uniqueKey, !!checked)}
                                                        disabled={availableLocations.length === 0}
                                                        aria-label={`Select item ${item.sku}`}
                                                    />
                                                </td>

                                                <td className="p-3 font-mono">
                                                    <span className="font-bold text-foreground">#{orderNumber}</span>
                                                    <p className="text-[10px] text-muted-foreground font-sans truncate max-w-[110px]">
                                                        {customerName}
                                                    </p>
                                                </td>

                                                <td className="p-3 space-y-0.5">
                                                    <div className="font-bold text-foreground text-xs truncate max-w-[240px]">
                                                        {item.name || item.sku}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                                                        <span>{item.sku}</span>
                                                        {item.size && <span>• Size: {item.size}</span>}
                                                    </div>
                                                </td>

                                                <td className="p-3 text-center">
                                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-mono text-[11px] py-0.5 px-2 font-bold">
                                                        {requiredQty} pcs
                                                    </Badge>
                                                </td>

                                                <td className="p-3">
                                                    {availableLocations.length > 0 ? (
                                                        <select
                                                            value={plan?.selectedLocationId || ''}
                                                            onChange={(e) => {
                                                                const selected = availableLocations.find(l => l.locationId === e.target.value);
                                                                if (selected) handleLocationChange(uniqueKey, selected);
                                                            }}
                                                            className="w-full h-8 text-xs bg-background border border-border rounded-lg px-2 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                        >
                                                            {availableLocations.map(loc => (
                                                                <option key={loc.locationId} value={loc.locationId}>
                                                                    {loc.locationName} ({loc.availableQty} units available) {loc.isWarehouse ? '[WH]' : '[Store]'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                                            <AlertCircle className="h-3.5 w-3.5" /> Out of Stock Company-Wide
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Generated STNs History */}
            {generatedSTNs.length > 0 && (
                <Card className="border rounded-2xl overflow-hidden shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b bg-emerald-500/5">
                        <CardTitle className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Recently Generated Transfer Requests ({generatedSTNs.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 divide-y text-xs">
                        {generatedSTNs.map((stn, idx) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <div className="font-mono font-bold text-sm text-foreground flex items-center gap-2">
                                        <span>#{stn.stnNo}</span>
                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-sans">
                                            STN Created
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        From {stn.sourceName} • {stn.itemsCount} products ({stn.totalUnits} units)
                                    </p>
                                </div>
                                <Link
                                    href="/erp/inventory/transactions/stock-transfer"
                                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                                >
                                    <span>View STN Details</span>
                                    <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Online Orders Bulk Upload Modal */}
            <OnlineOrderBulkUploadModal
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                onSuccess={() => {
                    fetchOrders(false);
                    toast.success("Orders uploaded successfully! Sourcing updated.");
                }}
            />

            {/* Order Filter Modal (Select or Paste Order Numbers) */}
            <Dialog open={isOrderFilterModalOpen} onOpenChange={setIsOrderFilterModalOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-6 gap-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            <span>Select or Paste Order Numbers to Source</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Target your inventory arrangement to only specific orders (e.g. 17 orders), excluding other unposted orders.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Quick Paste Box */}
                    <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border">
                        <label className="text-[11px] font-bold text-foreground">
                            Quick Paste Order Numbers:
                        </label>
                        <Textarea
                            placeholder="Paste comma or newline separated order numbers (e.g. 94013, 94019, 94022...)"
                            value={orderPasteInput}
                            onChange={(e) => setOrderPasteInput(e.target.value)}
                            className="text-xs h-20 font-mono resize-none"
                        />
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-muted-foreground">
                                Comma, newline, or space separated
                            </span>
                            <Button
                                size="sm"
                                onClick={handleApplyPastedOrders}
                                className="h-7 text-xs font-semibold px-3"
                            >
                                Apply Pasted Orders
                            </Button>
                        </div>
                    </div>

                    {/* Or Select from List */}
                    <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">Or Pick from Active Orders:</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOrderNumbersFilter(new Set(orders.map(o => o.orderNumber)))}
                                    className="text-[10px] text-primary hover:underline font-semibold"
                                >
                                    Select All ({orders.length})
                                </button>
                                <span>•</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedOrderNumbersFilter(new Set(orders.filter(o => o.confirmationStatus === 'CONFIRMED').map(o => o.orderNumber)))}
                                    className="text-[10px] text-emerald-600 hover:underline font-semibold"
                                >
                                    Select Confirmed Only ({orders.filter(o => o.confirmationStatus === 'CONFIRMED').length})
                                </button>
                                <span>•</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedOrderNumbersFilter(new Set())}
                                    className="text-[10px] text-muted-foreground hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <Input
                            placeholder="Search orders..."
                            value={orderFilterSearch}
                            onChange={(e) => setOrderFilterSearch(e.target.value)}
                            className="h-8 text-xs"
                        />

                        <div className="divide-y text-xs border rounded-xl overflow-y-auto max-h-[200px]">
                            {modalOrdersList.map(o => {
                                const isChecked = selectedOrderNumbersFilter.has(o.orderNumber);
                                const isConfirmed = o.confirmationStatus === 'CONFIRMED';

                                return (
                                    <div
                                        key={o.orderNumber}
                                        onClick={() => {
                                            setSelectedOrderNumbersFilter(prev => {
                                                const next = new Set(prev);
                                                if (isChecked) next.delete(o.orderNumber);
                                                else next.add(o.orderNumber);
                                                return next;
                                            });
                                        }}
                                        className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                                            isChecked ? 'bg-primary/10' : 'hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Checkbox
                                                checked={isChecked}
                                                aria-label={`Select order ${o.orderNumber}`}
                                            />
                                            <div className="min-w-0">
                                                <span className="font-mono font-bold text-foreground">
                                                    #{o.orderNumber}
                                                </span>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {o.customerName} • {o.items?.length || 0} items
                                                </p>
                                            </div>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={`text-[9px] py-0 px-1.5 ${
                                                isConfirmed
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {isConfirmed ? 'Confirmed' : o.confirmationStatus}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            {selectedOrderNumbersFilter.size > 0
                                ? `${selectedOrderNumbersFilter.size} order(s) selected`
                                : 'All orders will be shown'}
                        </span>
                        <Button
                            size="sm"
                            onClick={() => setIsOrderFilterModalOpen(false)}
                            className="h-8 text-xs font-semibold px-4"
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
