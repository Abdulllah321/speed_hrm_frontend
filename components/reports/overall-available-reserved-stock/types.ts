"use client";

export interface FlatItemRecord {
    itemId: string;
    locationId: string | null;
    warehouseId: string | null;
    locationName: string;
    locationType: "outlet" | "warehouse";
    sku: string;
    articleName: string;
    barCode: string;
    brand: string;
    division: string;
    category: string;
    gender: string;
    silhouette: string;
    size: string;
    color: string;
    unitPrice: number;
    value: number;
    unitCost: number;
    costingValue: number;
    quantity: number; // Available Stock Qty
    transit: number;  // In Transit Qty
    reserved: number; // Reserved Qty
    total: number;    // Total Balance Qty
}

export interface GroupingLevels {
    brand: boolean;
    division: boolean;
    category: boolean;
    gender: boolean;
    silhouette: boolean;
    article: boolean;
    variant: boolean;
}

export interface StockTotals {
    quantity: number;
    transit: number;
    reserved: number;
    total: number;
    unitPrice: number;
    value: number;
    unitCost: number;
    costingValue: number;
}

export interface TreeNode {
    level: string;
    value: string;
    sku?: string;
    articleName?: string;
    barCode?: string;
    size?: string;
    color?: string;
    totals: StockTotals;
    children: TreeNode[];
}
