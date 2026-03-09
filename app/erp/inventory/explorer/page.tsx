'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { warehouseApi, stockLedgerApi, Warehouse, WarehouseLocation, StockLevel } from '@/lib/api';
import { toast } from 'sonner';
import { LayoutGrid, Download, RefreshCcw, Package, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InventoryExplorerPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWh, setSelectedWh] = useState<string>('');
    const [locations, setLocations] = useState<WarehouseLocation[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        try {
            const data = await warehouseApi.getAll();
            setWarehouses(data);
            if (data.length > 0) {
                setSelectedWh(data[0].id);
                loadData(data[0].id);
            }
        } catch (error) {
            toast.error('Failed to load warehouses');
        }
    };

    const loadData = async (whId: string) => {
        setLoading(true);
        try {
            // Get locations for columns
            const wh = await warehouseApi.getById(whId);
            const locs = wh.locations || [];
            // Sort to have MAIN first, then SHOPS
            const sortedLocs = [...locs].sort((a, b) => (a.type === 'MAIN' ? -1 : 1));
            setLocations(sortedLocs);

            // Get stock levels
            const levels = await stockLedgerApi.getLevels({ warehouseId: whId });
            setStockLevels(levels);
        } catch (error) {
            toast.error('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    // Process data for Matrix
    // Rows = Items, Columns = Locations
    const itemsMap = new Map();
    stockLevels.forEach(level => {
        if (!level.item) return;
        if (!itemsMap.has(level.itemId)) {
            itemsMap.set(level.itemId, {
                id: level.itemId,
                sku: level.item.sku,
                name: level.item.description || level.item.sku,
                stockByLoc: {}
            });
        }
        const itemData = itemsMap.get(level.itemId);
        itemData.stockByLoc[level.locationId || 'UNASSIGNED'] = level.totalQty;
    });

    const matrixData = Array.from(itemsMap.values());

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Explorer</h1>
                    <p className="text-muted-foreground">Matrix view of stock distribution across Bulk and Shops.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedWh} onValueChange={(val) => {
                        setSelectedWh(val);
                        loadData(val);
                    }}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => loadData(selectedWh)}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        <CardTitle>Global Stock Matrix</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[200px] border-r sticky left-0 bg-background z-10">Item Description</TableHead>
                                    {locations.map(loc => (
                                        <TableHead key={loc.id} className="text-center min-w-[120px]">
                                            <div className="flex flex-col items-center gap-1 py-2">
                                                {loc.type === 'MAIN' ? <Package className="h-4 w-4 text-blue-500" /> : <Store className="h-4 w-4 text-green-500" />}
                                                <span>{loc.name}</span>
                                                <Badge variant="outline" className="text-[10px] h-4">{loc.type}</Badge>
                                            </div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-center font-bold bg-muted/50 min-w-[100px]">Total Stock</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={locations.length + 2} className="h-32 text-center">
                                            Loading inventory matrix...
                                        </TableCell>
                                    </TableRow>
                                ) : matrixData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={locations.length + 2} className="h-32 text-center text-muted-foreground">
                                            No stock data found for the selected warehouse.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    matrixData.map((row) => {
                                        let totalRow = 0;
                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium border-r sticky left-0 bg-background z-10">
                                                    <div className="flex flex-col">
                                                        <span>{row.sku}</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">{row.name}</span>
                                                    </div>
                                                </TableCell>
                                                {locations.map(loc => {
                                                    const qty = Number(row.stockByLoc[loc.id] || 0);
                                                    totalRow += qty;
                                                    return (
                                                        <TableCell key={loc.id} className={`text-center ${qty > 0 ? 'font-semibold text-primary' : 'text-muted-foreground opacity-30'}`}>
                                                            {qty.toLocaleString()}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-center font-bold bg-muted/30">
                                                    {totalRow.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
