'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
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
    Building2,
    RefreshCw,
    ExternalLink,
    Sparkles,
    Check
} from 'lucide-react';
import { createTransferRequest } from '@/lib/actions/transfer-request';

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

interface LocationStockInfo {
    locationId: string;
    locationName: string;
    warehouseId?: string;
    isWarehouse: boolean;
    availableQty: number;
}

interface ItemStockData {
    item: {
        id: string;
        sku: string;
        barcode?: string;
        name?: string;
        brandName?: string;
    };
    locations: LocationStockInfo[];
    totalStock: number;
}

interface InventorySourcingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any | null;
    currentLocationId?: string;
    onTransferCreated?: (orderNumber: string, transferData: any) => void;
}

export function InventorySourcingModal({
    open,
    onOpenChange,
    order,
    currentLocationId,
    onTransferCreated,
}: InventorySourcingModalProps) {
    const { user } = useAuth();
    const destinationLocationId = currentLocationId || user?.terminal?.location?.id || (user as any)?.locationId || order?.locationId;

    const [activeTab, setActiveTab] = useState<'consolidated' | 'single'>('consolidated');
    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    const [loadingStock, setLoadingStock] = useState<boolean>(false);
    const [stockCache, setStockCache] = useState<Record<string, ItemStockData | null>>({});
    const [transferringLocId, setTransferringLocId] = useState<string | null>(null);
    const [transfersGenerated, setTransfersGenerated] = useState<Record<string, string>>({}); // key: locationId -> stnNo

    const items: OrderItem[] = order?.items || [];
    const activeItem: OrderItem | undefined = items[selectedItemIndex];

    // Batch load stock for ALL items in this order
    const loadAllItemsStock = useCallback(async () => {
        if (!order?.items || order.items.length === 0) return;

        const identifiers = order.items
            .map((i: any) => i.barcode || i.sku || i.systemSku || i.itemId)
            .filter(Boolean);

        if (identifiers.length === 0) return;

        setLoadingStock(true);
        try {
            const res = await authFetch('/pos-sales/online-orders/bulk-upload/batch-barcode-stock', {
                method: 'POST',
                body: JSON.stringify({ identifiers }),
            });

            if (res.ok && res.data?.status && res.data?.data) {
                setStockCache(prev => ({
                    ...prev,
                    ...res.data.data,
                }));
            }
        } catch (error) {
            console.error("Failed to load batch stock", error);
        } finally {
            setLoadingStock(false);
        }
    }, [order]);

    useEffect(() => {
        if (open && order) {
            loadAllItemsStock();
        }
    }, [open, order, loadAllItemsStock]);

    // Single item stock fetch fallback
    const fetchStockForActiveItem = useCallback(async (item: OrderItem) => {
        const identifier = item.barcode || item.sku || item.systemSku || item.itemId;
        if (!identifier || stockCache[identifier]) return;

        setLoadingStock(true);
        try {
            const res = await authFetch(`/pos-sales/online-orders/bulk-upload/barcode-stock/${encodeURIComponent(identifier)}`);
            if (res.ok && res.data?.status && res.data?.data) {
                setStockCache(prev => ({
                    ...prev,
                    [identifier]: res.data.data,
                }));
            }
        } catch (error) {
            console.error("Failed to load stock", error);
        } finally {
            setLoadingStock(false);
        }
    }, [stockCache]);

    // CONSOLIDATION ENGINE: Group all items in this order by Best Source Location
    const consolidatedSourceGroups = useMemo(() => {
        if (!items || items.length === 0) return [];

        const groupMap = new Map<string, {
            locationId: string;
            locationName: string;
            isWarehouse: boolean;
            warehouseId?: string;
            items: Array<{
                itemId: string;
                sku: string;
                name: string;
                quantity: number;
                availableAtLoc: number;
            }>;
            totalUnits: number;
        }>();

        items.forEach(item => {
            const isShort = item.stock ? !item.stock.isAvailable : false;
            // Also allow sourcing even if in stock if needed
            const ident = item.barcode || item.sku || item.systemSku || item.itemId || '';
            const data = stockCache[ident];

            if (data && data.locations) {
                const eligible = data.locations.filter(
                    loc => loc.locationId !== destinationLocationId && loc.availableQty > 0
                );

                if (eligible.length > 0) {
                    const bestLoc = eligible[0];
                    const locId = bestLoc.locationId;

                    if (!groupMap.has(locId)) {
                        groupMap.set(locId, {
                            locationId: locId,
                            locationName: bestLoc.locationName,
                            isWarehouse: bestLoc.isWarehouse,
                            warehouseId: bestLoc.warehouseId,
                            items: [],
                            totalUnits: 0,
                        });
                    }

                    const group = groupMap.get(locId)!;
                    const reqQty = Number(item.qty || 1);
                    group.items.push({
                        itemId: data.item.id || item.itemId || item.id || '',
                        sku: item.sku,
                        name: item.name || data.item.name || item.sku,
                        quantity: Math.min(reqQty, bestLoc.availableQty),
                        availableAtLoc: bestLoc.availableQty,
                    });
                    group.totalUnits += Math.min(reqQty, bestLoc.availableQty);
                }
            }
        });

        return Array.from(groupMap.values());
    }, [items, stockCache, destinationLocationId]);

    if (!order) return null;

    const activeIdentifier = activeItem ? (activeItem.barcode || activeItem.sku || activeItem.systemSku || activeItem.itemId || '') : '';
    const stockData = activeIdentifier ? stockCache[activeIdentifier] : null;

    // CONSOLIDATED TRANSFER CREATION: Send ALL items from this store in ONE single call!
    const handleCreateConsolidatedTransfer = async (group: typeof consolidatedSourceGroups[0]) => {
        if (!destinationLocationId) {
            toast.error("Destination store location is required to create a transfer request.");
            return;
        }

        if (group.items.length === 0) {
            toast.info("No items in this transfer group.");
            return;
        }

        setTransferringLocId(group.locationId);
        try {
            // CONSOLIDATE: items array includes every item from this location
            const payload: any = {
                items: group.items.map(i => ({
                    itemId: i.itemId,
                    quantity: i.quantity,
                })),
                toLocationId: destinationLocationId,
                notes: `Consolidated STN for Online Order #${order.orderNumber} (${group.items.length} products, ${group.totalUnits} units)`,
            };

            if (group.isWarehouse) {
                payload.transferType = 'WAREHOUSE_TO_OUTLET';
                payload.fromWarehouseId = group.warehouseId || group.locationId;
            } else {
                payload.transferType = 'OUTLET_TO_OUTLET';
                payload.fromLocationId = group.locationId;
            }

            const result = await createTransferRequest(payload);
            const requestNo = result?.data?.requestNo || result?.requestNo || result?.data?.id || 'STN-CREATED';

            toast.success(`Consolidated STN ${requestNo} generated from ${group.locationName} for ${group.items.length} items!`);

            setTransfersGenerated(prev => ({
                ...prev,
                [group.locationId]: requestNo,
            }));

            if (onTransferCreated) {
                onTransferCreated(order.orderNumber, {
                    requestNo,
                    fromLocation: group.locationName,
                    qty: group.totalUnits,
                    itemsCount: group.items.length,
                });
            }
        } catch (error: any) {
            console.error("Transfer creation error", error);
            toast.error(error.message || "Failed to create consolidated transfer request.");
        } finally {
            setTransferringLocId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[880px] max-h-[92vh] flex flex-col overflow-hidden p-6 gap-5">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            <span>Multi-Location Stock & Consolidated Sourcing</span>
                            <Badge variant="outline" className="font-mono text-xs">
                                Order #{order.orderNumber}
                            </Badge>
                        </DialogTitle>

                        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border">
                            <Button
                                size="sm"
                                variant={activeTab === 'consolidated' ? 'default' : 'ghost'}
                                onClick={() => setActiveTab('consolidated')}
                                className="h-7 text-xs font-semibold gap-1.5"
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>Consolidated View ({consolidatedSourceGroups.length} Stores)</span>
                            </Button>
                            <Button
                                size="sm"
                                variant={activeTab === 'single' ? 'default' : 'ghost'}
                                onClick={() => setActiveTab('single')}
                                className="h-7 text-xs font-semibold"
                            >
                                Single Item Inspector
                            </Button>
                        </div>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                        Consolidate multiple products coming from the same warehouse or store into <strong>ONE single Transfer Request (STN)</strong>.
                    </DialogDescription>
                </DialogHeader>

                {activeTab === 'consolidated' ? (
                    /* CONSOLIDATED SOURCING VIEW */
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {loadingStock ? (
                            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-xs">Checking real-time inventory across all stores & central warehouses...</span>
                            </div>
                        ) : consolidatedSourceGroups.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed rounded-2xl">
                                <Package className="h-8 w-8 text-muted-foreground/40" />
                                <p className="font-bold text-sm text-foreground">No Stock Available in Other Stores</p>
                                <p className="text-xs max-w-sm text-center">
                                    The items in this order are either already in stock at this store, or out of stock company-wide.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                        <span>
                                            Consolidation active: Products from the same source store will be merged into <strong>1 single STN</strong>.
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs uppercase bg-background font-bold text-primary">
                                        {consolidatedSourceGroups.length} Transfer(s) Total
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {consolidatedSourceGroups.map((group) => {
                                        const isTransferringThis = transferringLocId === group.locationId;
                                        const existingSTN = transfersGenerated[group.locationId];

                                        return (
                                            <div
                                                key={group.locationId}
                                                className="border rounded-2xl p-4 bg-card flex flex-col justify-between gap-3 shadow-xs"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                group.isWarehouse
                                                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                            }`}>
                                                                {group.isWarehouse ? <Warehouse className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-xs text-foreground">
                                                                    {group.locationName}
                                                                </h4>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    {group.isWarehouse ? 'Central Warehouse' : 'Retail Outlet'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <Badge variant="secondary" className="font-mono text-xs font-bold">
                                                            {group.items.length} items • {group.totalUnits} units
                                                        </Badge>
                                                    </div>

                                                    {/* Items list */}
                                                    <div className="divide-y text-xs border rounded-xl overflow-hidden bg-muted/20">
                                                        {group.items.map((it, idx) => (
                                                            <div key={idx} className="p-2 flex items-center justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-semibold text-foreground truncate">
                                                                        {it.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                                        {it.sku}
                                                                    </div>
                                                                </div>
                                                                <span className="font-bold font-mono text-[11px] text-primary shrink-0">
                                                                    {it.quantity} pcs
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Action */}
                                                <div>
                                                    {existingSTN ? (
                                                        <Badge variant="outline" className="w-full py-1.5 justify-center bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-xs gap-1 font-bold">
                                                            <CheckCircle2 className="h-3.5 w-3.5" /> STN #{existingSTN} Created
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleCreateConsolidatedTransfer(group)}
                                                            disabled={isTransferringThis}
                                                            className="w-full h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-xs"
                                                        >
                                                            {isTransferringThis ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Send className="h-3.5 w-3.5" />
                                                            )}
                                                            <span>Generate 1 STN ({group.items.length} Products)</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* SINGLE ITEM INSPECTOR */
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4">
                        {/* Left: Product Selector Tabs */}
                        <div className="w-full md:w-64 border rounded-xl overflow-hidden flex flex-col bg-muted/20">
                            <div className="p-2.5 px-3 border-b bg-muted/50 text-xs font-bold text-muted-foreground flex items-center justify-between">
                                <span>Order Products</span>
                                <span>{items.length} items</span>
                            </div>
                            <ScrollArea className="flex-1 max-h-[260px] md:max-h-full">
                                <div className="divide-y text-xs">
                                    {items.map((item, idx) => {
                                        const isSelected = selectedItemIndex === idx;
                                        const isAvailable = item.stock?.isAvailable ?? true;
                                        const availUnits = item.stock?.available ?? 0;

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedItemIndex(idx);
                                                    fetchStockForActiveItem(item);
                                                }}
                                                className={`w-full text-left p-3 flex flex-col gap-1 transition cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-primary/10 border-l-4 border-l-primary text-foreground font-medium'
                                                        : 'hover:bg-muted/60 text-muted-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-bold text-foreground truncate max-w-[140px]">
                                                        {item.name || item.sku}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-foreground shrink-0">
                                                        Qty: {item.qty}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                                                    <span>{item.sku}</span>
                                                    {item.size && <span>• {item.size}</span>}
                                                </div>
                                                <div className="pt-0.5">
                                                    {isAvailable ? (
                                                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> In Stock ({availUnits})
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Short: {availUnits}/{item.qty}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Right: Multi-Location Availability & Stock Distribution */}
                        <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-background">
                            {activeItem ? (
                                <>
                                    <div className="p-3.5 border-b bg-muted/30 flex items-start justify-between gap-3">
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-sm text-foreground truncate">
                                                    {activeItem.name || activeItem.sku}
                                                </h4>
                                                {activeItem.brand && (
                                                    <Badge variant="outline" className="text-[10px] uppercase">
                                                        {activeItem.brand}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono flex-wrap">
                                                <span>SKU: {activeItem.sku}</span>
                                                {activeItem.barcode && <span>• Barcode: {activeItem.barcode}</span>}
                                                {activeItem.size && <span>• Size: {activeItem.size}</span>}
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={() => fetchStockForActiveItem(activeItem)}
                                            disabled={loadingStock}
                                            title="Refresh Stock Data"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loadingStock ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="font-semibold uppercase tracking-wider">
                                                Company Stock Distribution
                                            </span>
                                            {stockData && (
                                                <span className="font-semibold text-foreground">
                                                    Total Available: <strong className="text-primary">{stockData.totalStock} units</strong>
                                                </span>
                                            )}
                                        </div>

                                        {loadingStock ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                <span className="text-xs">Checking real-time inventory across all stores...</span>
                                            </div>
                                        ) : stockData && stockData.locations.length > 0 ? (
                                            <div className="divide-y border rounded-xl overflow-hidden">
                                                {stockData.locations.map((loc) => {
                                                    const isCurrentDest = loc.locationId === destinationLocationId;
                                                    const existingStn = transfersGenerated[loc.locationId];
                                                    const hasStock = loc.availableQty > 0;

                                                    return (
                                                        <div
                                                            key={loc.locationId}
                                                            className={`p-3.5 flex items-center justify-between gap-3 ${
                                                                isCurrentDest ? 'bg-muted/30' : 'hover:bg-muted/20'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                                    loc.isWarehouse
                                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                                }`}>
                                                                    {loc.isWarehouse ? (
                                                                        <Warehouse className="h-4 w-4" />
                                                                    ) : (
                                                                        <Store className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 space-y-0.5">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-semibold text-xs text-foreground truncate">
                                                                            {loc.locationName}
                                                                        </span>
                                                                        {isCurrentDest && (
                                                                            <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-primary/10 text-primary">
                                                                                Fulfillment Location
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {loc.isWarehouse ? 'Central Warehouse' : 'Retail Outlet'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <div className="text-right">
                                                                    <span className={`font-bold text-sm ${
                                                                        hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                                                                    }`}>
                                                                        {loc.availableQty} units
                                                                    </span>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {hasStock ? 'available' : 'out of stock'}
                                                                    </p>
                                                                </div>

                                                                {existingStn ? (
                                                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-mono gap-1 py-1">
                                                                        <CheckCircle2 className="h-3 w-3" /> STN #{existingStn}
                                                                    </Badge>
                                                                ) : !isCurrentDest && hasStock ? (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => setActiveTab('consolidated')}
                                                                        className="h-8 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1 font-medium shadow-xs"
                                                                    >
                                                                        <span>Consolidate in STN</span>
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2 border rounded-xl border-dashed">
                                                <Package className="h-7 w-7 text-muted-foreground/50" />
                                                <p className="text-xs font-medium">No stock records found for this barcode across locations.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Transfers created will appear in <strong className="text-foreground">Stock Transfers</strong> for physical dispatch.
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
