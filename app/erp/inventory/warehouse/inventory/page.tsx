"use client";

import { useState, useEffect } from "react";
import { stockLedgerApi, StockLevel } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { ListError } from "@/components/dashboard/list-error";

export default function InventoryPage() {
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadStockLevels();
    }, []);

    const loadStockLevels = async () => {
        try {
            setLoading(true);
            const data = await stockLedgerApi.getLevels();
            // Ensure data is an array
            if (Array.isArray(data)) {
                setStockLevels(data);
            } else {
                // If backend returns wrapped response, try to access data property or default to empty
                setStockLevels((data as any).data || []);
            }
        } catch (err) {
            console.error("Failed to load stock levels:", err);
            setError("Failed to load inventory data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const filteredStock = stockLevels.filter((level) => {
        const query = searchQuery.toLowerCase();
        return (
            level.item?.sku.toLowerCase().includes(query) ||
            level.item?.itemId.toLowerCase().includes(query) ||
            level.item?.description?.toLowerCase().includes(query) ||
            level.warehouse?.name.toLowerCase().includes(query)
        );
    });

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ListError title="Error loading inventory" message={error} />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Inventory Explorer</h2>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Current Stock Levels</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items or warehouse..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Code / SKU</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Warehouse</TableHead>
                                <TableHead className="text-right">Total Quantity</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        Loading inventory...
                                    </TableCell>
                                </TableRow>
                            ) : filteredStock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No inventory found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStock.map((level, index) => (
                                    <TableRow key={`${level.itemId}-${level.warehouseId}-${index}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{level.item?.sku || "N/A"}</span>
                                                <span className="text-xs text-muted-foreground">{level.item?.itemId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{level.item?.description || "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{level.warehouse?.code}</Badge>
                                                <span>{level.warehouse?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-lg">
                                            {Number(level.totalQty).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(level.totalQty) > 0 ? (
                                                <Badge className="bg-green-500">In Stock</Badge>
                                            ) : Number(level.totalQty) < 0 ? (
                                                <Badge variant="destructive">Negative</Badge>
                                            ) : (
                                                <Badge variant="secondary">Out of Stock</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
