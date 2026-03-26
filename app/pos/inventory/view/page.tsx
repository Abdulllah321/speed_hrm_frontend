"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Grid, List, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StockLocationDrawer } from "@/components/pos/inventory/stock-location-drawer";
import { useDebounce } from "@/hooks/use-debounce";
import { posSalesApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

interface InventoryItem {
    id: string;
    sku: string;
    description: string;
    imageUrl?: string;
    stockQty: number;
    unitPrice?: number;
    brand?: string;
}

export default function InventoryViewPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        async function fetchInventory() {
            setIsLoading(true);
            try {
                const res = await posSalesApi.lookup(debouncedSearch);
                if (res.status && res.data) {
                    setItems(res.data);
                } else {
                    setItems([]);
                }
            } catch (error) {
                console.error("Failed to fetch inventory", error);
                setItems([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchInventory();
    }, [debouncedSearch]);

    const handleItemClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsDrawerOpen(true);
    };

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-6 lg:-m-8">
            {/* Header */}
            <div className="flex-none p-4 md:p-6 pb-2 border-b bg-muted/20 backdrop-blur-xl border-border/50 sticky z-10"
                style={{
                    top: "calc(var(--banner-height) + 4rem)"
                }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Inventory Check
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">
                            Search stock across all outlets and warehouses
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode("list")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="relative w-full max-w-2xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                    <Input
                        placeholder="Search by Item Name, Description, or SKU..."
                        className="pl-10 py-6 text-base bg-muted/30 border-border/50 focus-visible:ring-ring"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Content */}
            {/* <ScrollArea className="flex-1"> */}
                <div className="p-4 md:p-6 pb-20">
                    {isLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-48 rounded-lg bg-muted/50 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                            <PackageOpen className="w-16 h-16 text-muted/30 mb-4" />
                            <h3 className="text-lg font-medium text-foreground">
                                No items found
                            </h3>
                            <p className="text-muted-foreground mt-1 max-w-sm">
                                We couldn't find anything matching "{searchQuery}". Try a
                                different search term or clear the search.
                            </p>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {items.map((item) => (
                                <Card
                                    key={item.id}
                                    className="overflow-hidden hover:shadow-md transition-all cursor-pointer border-border group flex flex-col bg-card"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div className="aspect-square bg-muted/30 flex items-center justify-center p-4 relative">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.description}
                                                className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <PackageOpen className="w-12 h-12 text-muted/50" />
                                        )}
                                    </div>
                                    <CardContent className="p-3 flex flex-col flex-1 justify-between">
                                        <div>
                                            <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 truncate uppercase">
                                                {item.sku}
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                {item.description}
                                            </h3>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between">
                                            <Badge
                                                variant={
                                                    item.stockQty > 10
                                                        ? "default"
                                                        : item.stockQty > 0
                                                            ? "secondary"
                                                            : "destructive"
                                                }
                                                className="font-mono text-[10px] px-1.5 py-0"
                                            >
                                                {item.stockQty} in stock
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {items.map((item) => (
                                <Card
                                    key={item.id}
                                    className="hover:shadow-sm transition-shadow cursor-pointer border-border bg-card"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <CardContent className="p-3 flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-md bg-muted/30 flex-none flex items-center justify-center">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.description}
                                                    className="object-contain w-full h-full mix-blend-multiply"
                                                />
                                            ) : (
                                                <PackageOpen className="w-6 h-6 text-muted/50" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded uppercase">
                                                    {item.sku}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground truncate">
                                                {item.description}
                                            </h3>
                                        </div>
                                        <div className="flex-none text-right flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Global Available</span>
                                            <Badge
                                                variant={
                                                    item.stockQty > 10
                                                        ? "default"
                                                        : item.stockQty > 0
                                                            ? "secondary"
                                                            : "destructive"
                                                }
                                                className="font-mono text-sm px-2 py-0.5"
                                            >
                                                {item.stockQty}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            {/* </ScrollArea> */}

            {/* Details Side Drawer */}
            <StockLocationDrawer
                item={selectedItem ? {
                    id: selectedItem.id,
                    sku: selectedItem.sku,
                    description: selectedItem.description,
                    totalQuantity: selectedItem.stockQty
                } : null}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    );
}
