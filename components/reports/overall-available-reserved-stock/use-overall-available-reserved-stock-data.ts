"use client";

import { useMemo, useDeferredValue } from "react";
import { FlatItemRecord, LocationHeader, StockTotals, StockAvailabilityFilter } from "./types";
import { Location } from "@/lib/actions/location";
import { Warehouse } from "@/lib/actions/warehouse";

function createEmptyTotals(): StockTotals {
    return {
        quantity: 0,
        transit: 0,
        reserved: 0,
        total: 0,
        unitPrice: 0,
        value: 0,
        unitCost: 0,
        costingValue: 0,
        locationStocks: {},
        warehouseStocks: {},
    };
}

export function useOverallAvailableReservedStockData({
    rawItems,
    locations,
    warehouses,
    selectedLocationIds,
    selectedWarehouseIds,
    searchQuery,
    stockFilter = "all",
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
}: {
    rawItems: FlatItemRecord[];
    locations: Location[];
    warehouses: Warehouse[];
    selectedLocationIds: string[];
    selectedWarehouseIds: string[];
    searchQuery: string;
    stockFilter?: StockAvailabilityFilter;
    filterBrands: Set<string>;
    filterDivisions: Set<string>;
    filterCategories: Set<string>;
    filterGenders: Set<string>;
    filterSilhouettes: Set<string>;
    filterSizes: Set<string>;
    filterColors: Set<string>;
}) {
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // 1. Build Location Headers for dynamic columns (Warehouses then Outlets)
    const locationHeaders = useMemo<LocationHeader[]>(() => {
        const headers: LocationHeader[] = [];

        const selLocs = new Set(selectedLocationIds);
        const selWhs = new Set(selectedWarehouseIds);

        // Active Warehouses
        for (const wh of warehouses) {
            if (selWhs.size > 0 && !selWhs.has(wh.id)) continue;
            headers.push({
                id: wh.id,
                code: wh.code || wh.name,
                name: wh.name,
                type: "warehouse",
            });
        }

        // Active Outlets (Stock Locations)
        for (const loc of locations) {
            if (selLocs.size > 0 && !selLocs.has(loc.id)) continue;
            headers.push({
                id: loc.id,
                code: (loc as any).shortCode || loc.code || loc.name,
                name: loc.name,
                type: "outlet",
            });
        }

        return headers;
    }, [locations, warehouses, selectedLocationIds, selectedWarehouseIds]);

    // 2. Extract distinct attribute options from rawItems for filter dropdowns
    const attributeOptions = useMemo(() => {
        const brands = new Set<string>();
        const divisions = new Set<string>();
        const categories = new Set<string>();
        const genders = new Set<string>();
        const silhouettes = new Set<string>();
        const sizes = new Set<string>();
        const colors = new Set<string>();

        for (const item of rawItems) {
            if (item.brand) brands.add(item.brand);
            if (item.division) divisions.add(item.division);
            if (item.category) categories.add(item.category);
            if (item.gender) genders.add(item.gender);
            if (item.silhouette) silhouettes.add(item.silhouette);
            if (item.size) sizes.add(item.size);
            if (item.color) colors.add(item.color);
        }

        return {
            brands: Array.from(brands).sort(),
            divisions: Array.from(divisions).sort(),
            categories: Array.from(categories).sort(),
            genders: Array.from(genders).sort(),
            silhouettes: Array.from(silhouettes).sort(),
            sizes: Array.from(sizes).sort(),
            colors: Array.from(colors).sort(),
        };
    }, [rawItems]);

    // 3. Filter raw items based on search text, attribute filters, and stock availability
    const filteredItems = useMemo(() => {
        const q = deferredSearchQuery.trim().toLowerCase();
        const hasSelectedLocs = selectedLocationIds.length > 0;
        const hasSelectedWhs = selectedWarehouseIds.length > 0;
        const isScoped = hasSelectedLocs || hasSelectedWhs;

        return rawItems.filter((item) => {
            // Attribute filters
            if (filterBrands.size > 0 && !filterBrands.has(item.brand)) return false;
            if (filterDivisions.size > 0 && !filterDivisions.has(item.division)) return false;
            if (filterCategories.size > 0 && !filterCategories.has(item.category)) return false;
            if (filterGenders.size > 0 && !filterGenders.has(item.gender)) return false;
            if (filterSilhouettes.size > 0 && !filterSilhouettes.has(item.silhouette)) return false;
            if (filterSizes.size > 0 && !filterSizes.has(item.size)) return false;
            if (filterColors.size > 0 && !filterColors.has(item.color)) return false;

            // Search query matching
            if (q) {
                const matchBar = item.barCode?.toLowerCase().includes(q);
                const matchSku = item.sku?.toLowerCase().includes(q);
                const matchDesc = item.articleName?.toLowerCase().includes(q);
                const matchBrand = item.brand?.toLowerCase().includes(q);
                const matchCat = item.category?.toLowerCase().includes(q);
                if (!matchBar && !matchSku && !matchDesc && !matchBrand && !matchCat) {
                    return false;
                }
            }

            // Calculate relevant stock in selected scope (or overall if no scope selected)
            let relevantStock = 0;
            if (isScoped) {
                if (hasSelectedLocs) {
                    for (const locId of selectedLocationIds) {
                        relevantStock += Number(item.locationStocks?.[locId] || 0);
                    }
                }
                if (hasSelectedWhs) {
                    for (const whId of selectedWarehouseIds) {
                        relevantStock += Number(item.warehouseStocks?.[whId] || 0);
                    }
                }
            } else {
                relevantStock = Number(item.quantity || 0);
            }

            // Stock Availability Filter
            if (stockFilter === "in_stock" && relevantStock <= 0) return false;
            if (stockFilter === "zero" && relevantStock !== 0) return false;
            if (stockFilter === "negative" && relevantStock >= 0) return false;

            return true;
        });
    }, [
        rawItems,
        deferredSearchQuery,
        filterBrands,
        filterDivisions,
        filterCategories,
        filterGenders,
        filterSilhouettes,
        filterSizes,
        filterColors,
        selectedLocationIds,
        selectedWarehouseIds,
        stockFilter,
    ]);

    // 4. Calculate Grand Totals across filtered items and location columns
    const grandTotals = useMemo<StockTotals>(() => {
        const totals = createEmptyTotals();
        totals.locationStocks = {};
        totals.warehouseStocks = {};

        for (const header of locationHeaders) {
            if (header.type === "warehouse") totals.warehouseStocks[header.id] = 0;
            else totals.locationStocks[header.id] = 0;
        }

        const hasSelectedLocs = selectedLocationIds.length > 0;
        const hasSelectedWhs = selectedWarehouseIds.length > 0;
        const isScoped = hasSelectedLocs || hasSelectedWhs;

        for (const item of filteredItems) {
            let itemAvailableQty = Number(item.quantity || 0);
            if (isScoped) {
                let scopedQty = 0;
                for (const header of locationHeaders) {
                    if (header.type === "warehouse") {
                        scopedQty += Number(item.warehouseStocks?.[header.id] || 0);
                    } else {
                        scopedQty += Number(item.locationStocks?.[header.id] || 0);
                    }
                }
                itemAvailableQty = scopedQty;
            }

            const itemUnitPrice = Number(item.unitPrice || 0);
            const itemUnitCost = Number(item.unitCost || 0);
            const itemTransit = Number(item.transit || 0);
            const itemReserved = Number(item.reserved || 0);
            const itemTotal = itemAvailableQty + itemTransit + itemReserved;

            totals.quantity += itemAvailableQty;
            totals.transit += itemTransit;
            totals.reserved += itemReserved;
            totals.total += itemTotal;
            totals.value += itemAvailableQty * itemUnitPrice;
            totals.costingValue += itemAvailableQty * itemUnitCost;

            if (item.warehouseStocks) {
                for (const [whId, qty] of Object.entries(item.warehouseStocks)) {
                    if (totals.warehouseStocks[whId] !== undefined) {
                        totals.warehouseStocks[whId] += Number(qty || 0);
                    }
                }
            }

            if (item.locationStocks) {
                for (const [locId, qty] of Object.entries(item.locationStocks)) {
                    if (totals.locationStocks[locId] !== undefined) {
                        totals.locationStocks[locId] += Number(qty || 0);
                    }
                }
            }
        }

        return totals;
    }, [filteredItems, locationHeaders, selectedLocationIds, selectedWarehouseIds]);

    return {
        locationHeaders,
        attributeOptions,
        filteredItems,
        grandTotals,
    };
}
