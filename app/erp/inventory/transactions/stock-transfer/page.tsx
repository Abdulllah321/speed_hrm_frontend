'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { warehouseApi, transferRequestApi, inventoryApi, posSalesApi, stockLedgerApi, Warehouse, WarehouseLocation } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRightLeft, Search, Package, Save, History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function StockTransferPage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<WarehouseLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [sourceLocationId, setSourceLocationId] = useState<string>('unassigned');
    const [destLocationId, setDestLocationId] = useState<string>('');

    // Item Search
    const [itemQuery, setItemQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [transferQty, setTransferQty] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [sourceStock, setSourceStock] = useState<number | null>(null);

    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        try {
            const data = await warehouseApi.getAll();
            setWarehouses(data);
            if (data.length > 0) {
                setSelectedWarehouseId(data[0].id);
                loadLocations(data[0].id);
            }
        } catch (error) {
            toast.error('Failed to load warehouses');
        } finally {
            setLoading(false);
        }
    };

    const loadLocations = async (whId: string) => {
        try {
            const wh = await warehouseApi.getById(whId);
            const locs = wh.locations || [];
            // Sort: MAIN locations at the top
            const sortedLocs = [...locs].sort((a, b) => (a.type === 'MAIN' ? -1 : 1));
            setLocations(sortedLocs);

            // Auto-select defaults for quicker flow
            const mainLoc = sortedLocs.find(l => l.type === 'MAIN');
            const shopLocs = sortedLocs.filter(l => l.type === 'SHOP');

            if (mainLoc) setSourceLocationId(mainLoc.id);
            if (shopLocs.length > 0) {
                // If the only shop is the same as source (unlikely if source is MAIN), 
                // pick the next one.
                const firstShop = shopLocs.find(l => l.id !== mainLoc?.id) || shopLocs[0];
                setDestLocationId(firstShop.id);
            }
        } catch (error) {
            toast.error('Failed to load locations');
        }
    };

    const handleSearch = async () => {
        if (!itemQuery) return;
        setLoading(true);
        try {
            const res = await posSalesApi.lookup(itemQuery);
            if (res.status) {
                setSearchResults(res.data || []);
            } else {
                toast.error('Search failed or no items found');
            }
        } catch (error: any) {
            toast.error(error.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const [warehouseStockInfo, setWarehouseStockInfo] = useState<any[]>([]);

    const selectItem = async (item: any) => {
        setSelectedItem(item);
        setSearchResults([]);
        setItemQuery('');
        setSourceStock(0);
        setWarehouseStockInfo([]);

        // Load stock levels for this item across ALL locations in the warehouse
        if (selectedWarehouseId) {
            try {
                const levels = await stockLedgerApi.getLevels({
                    warehouseId: selectedWarehouseId
                });

                // Sum up ALL stock for this item in this warehouse (regardless of location)
                const itemLevels = levels.filter(l => l.itemId === item.id);
                setWarehouseStockInfo(itemLevels);

                const totalInWh = itemLevels.reduce((sum, l) => sum + Number(l.totalQty), 0);
                setSourceStock(totalInWh);
            } catch (error) {
                console.error("Failed to fetch source stock", error);
            }
        }
    };

    const handleTransfer = async () => {
        if (!selectedItem || !selectedWarehouseId || !destLocationId || transferQty <= 0) {
            toast.error('Please complete all fields');
            return;
        }

        setSubmitting(true);
        try {
            await transferRequestApi.create({
                fromWarehouseId: selectedWarehouseId,
                toWarehouseId: selectedWarehouseId, // Internal transfer
                fromLocationId: sourceLocationId === 'unassigned' ? undefined : sourceLocationId,
                toLocationId: destLocationId,
                items: [{
                    itemId: selectedItem.id,
                    quantity: transferQty
                }],
                notes: notes
            });

            toast.success('Transfer request created! Awaiting shop acceptance.');
            setSelectedItem(null);
            setTransferQty(0);
            setNotes('');
        } catch (error: any) {
            toast.error(error.message || 'Transfer failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Internal Stock Transfer</h1>
                        <p className="text-muted-foreground">Move stock between Bulk Area and Shop Locations.</p>
                    </div>
                </div>
                <Button variant="outline" asChild className="border-2 font-bold shadow-sm">
                    <Link href="/erp/inventory/transactions/stock-transfer/history">
                        <History className="h-4 w-4 mr-2" /> Transfer History
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Transfer Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Warehouse</Label>
                            <Select
                                value={selectedWarehouseId}
                                onValueChange={(val) => {
                                    setSelectedWarehouseId(val);
                                    loadLocations(val);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1 p-3 bg-primary/5 rounded-md border border-primary/10">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Source (From)</Label>
                            <div className="flex items-center gap-2 font-semibold">
                                <Package className="h-4 w-4 text-primary" />
                                <span>Main Warehouse Stock</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Moving directly from central storage pool.</p>
                        </div>

                        <div className="flex justify-center py-1">
                            <ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" />
                        </div>

                        <div className="space-y-2">
                            <Label>Destination Location (To Shop)</Label>
                            <Select value={destLocationId} onValueChange={setDestLocationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Shop" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations
                                        .filter(l => l.type === 'SHOP')
                                        .map(l => (
                                            <SelectItem key={l.id} value={l.id}>
                                                {l.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Items & Quantity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!selectedItem ? (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by SKU or Name..."
                                            className="pl-9"
                                            value={itemQuery}
                                            onChange={(e) => setItemQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                    </div>
                                    <Button onClick={handleSearch}>Search</Button>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="border rounded-md overflow-hidden bg-background">
                                        <Table>
                                            <TableBody>
                                                {searchResults.map((item) => (
                                                    <TableRow
                                                        key={item.id}
                                                        className="cursor-pointer hover:bg-muted"
                                                        onClick={() => selectItem(item)}
                                                    >
                                                        <TableCell className="font-medium">{item.sku}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span>{item.description}</span>
                                                                <span className="text-[10px] text-muted-foreground">Total System Stock: {item.stockQty || 0}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button size="sm" variant="ghost">Select</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between bg-muted/30 p-4 rounded-lg border">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">{selectedItem.sku}</h4>
                                            <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={(sourceStock || 0) > 0 ? "secondary" : "outline"} className="w-fit">
                                                    Available in Warehouse: {sourceStock || 0}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>Clear</Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="qty">Quantity to Transfer</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            min="1"
                                            value={transferQty}
                                            onChange={(e) => setTransferQty(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Input
                                            id="notes"
                                            placeholder="Reason for transfer..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 text-lg"
                                    disabled={submitting}
                                    onClick={handleTransfer}
                                >
                                    <Save className="h-5 w-5 mr-2" />
                                    {submitting ? 'Processing...' : 'Complete Transfer'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
