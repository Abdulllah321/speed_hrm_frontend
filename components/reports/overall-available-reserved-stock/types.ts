"use client";

export interface LocationHeader {
    id: string;
    code: string;
    name: string;
    type: "outlet" | "warehouse";
}

export interface FlatItemRecord {
    itemId: string;
    brand: string;
    division: string;
    category: string;
    gender: string;
    silhouette: string;
    sku: string;
    articleName: string;
    barCode: string;
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
    locationStocks?: Record<string, number>;
    warehouseStocks?: Record<string, number>;
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
    locationStocks?: Record<string, number>;
    warehouseStocks?: Record<string, number>;
}
