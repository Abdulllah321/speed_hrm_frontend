"use client";

import { useMemo, useDeferredValue } from "react";
import { FlatItemRecord, GroupingLevels, StockTotals, TreeNode } from "./types";

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
    };
}

function addTotals(target: StockTotals, source: StockTotals) {
    target.quantity += source.quantity;
    target.transit += source.transit;
    target.reserved += source.reserved;
    target.total += source.total;
    target.value += source.value;
    target.costingValue += source.costingValue;
}

export function useOverallAvailableReservedStockData({
    rawItems,
    selectedLocationIds,
    selectedWarehouseIds,
    searchQuery,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
    reportType,
    groupingLevels,
}: {
    rawItems: FlatItemRecord[];
    selectedLocationIds: string[];
    selectedWarehouseIds: string[];
    searchQuery: string;
    filterBrands: Set<string>;
    filterDivisions: Set<string>;
    filterCategories: Set<string>;
    filterGenders: Set<string>;
    filterSilhouettes: Set<string>;
    filterSizes: Set<string>;
    filterColors: Set<string>;
    reportType: "merged" | "separate";
    groupingLevels: GroupingLevels;
}) {
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // 1. Extract distinct attribute options from rawItems for filter dropdowns
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

    // 2. Filter raw items based on selected locations, warehouses, search text, and attribute filters
    const filteredItems = useMemo(() => {
        const q = deferredSearchQuery.trim().toLowerCase();
        const selLocs = new Set(selectedLocationIds);
        const selWhs = new Set(selectedWarehouseIds);
        const hasLocFilter = selLocs.size > 0 || selWhs.size > 0;

        return rawItems.filter((item) => {
            // Location/Warehouse filtering
            if (hasLocFilter) {
                const matchLoc = item.locationId && selLocs.has(item.locationId);
                const matchWh = item.warehouseId && selWhs.has(item.warehouseId);
                if (!matchLoc && !matchWh) return false;
            }

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
                const matchLoc = item.locationName?.toLowerCase().includes(q);
                if (!matchBar && !matchSku && !matchDesc && !matchBrand && !matchCat && !matchLoc) {
                    return false;
                }
            }

            return true;
        });
    }, [
        rawItems,
        selectedLocationIds,
        selectedWarehouseIds,
        deferredSearchQuery,
        filterBrands,
        filterDivisions,
        filterCategories,
        filterGenders,
        filterSilhouettes,
        filterSizes,
        filterColors,
    ]);

    // 3. Build dynamic hierarchy tree & calculate grand totals
    const { treeData, grandTotals } = useMemo(() => {
        const root: TreeNode[] = [];
        const grandTotals = createEmptyTotals();

        const activeLevels: (keyof GroupingLevels)[] = [];
        if (groupingLevels.brand) activeLevels.push("brand");
        if (groupingLevels.division) activeLevels.push("division");
        if (groupingLevels.category) activeLevels.push("category");
        if (groupingLevels.gender) activeLevels.push("gender");
        if (groupingLevels.silhouette) activeLevels.push("silhouette");
        if (groupingLevels.article) activeLevels.push("article");
        if (groupingLevels.variant) activeLevels.push("variant");

        const levels = reportType === "separate" ? (["location", ...activeLevels] as string[]) : (activeLevels as string[]);

        for (const item of filteredItems) {
            const metrics: StockTotals = {
                quantity: Number(item.quantity) || 0,
                transit: Number(item.transit) || 0,
                reserved: Number(item.reserved) || 0,
                total: Number(item.total) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                value: Number(item.value) || 0,
                unitCost: Number(item.unitCost) || 0,
                costingValue: Number(item.costingValue) || 0,
            };

            addTotals(grandTotals, metrics);

            let currentLevelNodes = root;

            for (let i = 0; i < levels.length; i++) {
                const levelName = levels[i];
                let nodeVal = "";
                let extraFields: Partial<TreeNode> = {};

                if (levelName === "location") {
                    nodeVal = item.locationName;
                } else if (levelName === "brand") {
                    nodeVal = item.brand || "No Brand";
                } else if (levelName === "division") {
                    nodeVal = item.division || "No Division";
                } else if (levelName === "category") {
                    nodeVal = item.category || "No Category";
                } else if (levelName === "gender") {
                    nodeVal = item.gender || "No Gender";
                } else if (levelName === "silhouette") {
                    nodeVal = item.silhouette || "No Silhouette";
                } else if (levelName === "article") {
                    nodeVal = item.sku;
                    extraFields.sku = item.sku;
                    extraFields.articleName = item.articleName || "Unknown Article";
                    extraFields.barCode = item.barCode;
                } else if (levelName === "variant") {
                    nodeVal = item.barCode
                        ? `[${item.barCode}] ${item.color || "Default"}-${item.size || "Default"}`
                        : `${item.color || "Default"}-${item.size || "Default"}`;
                    extraFields.color = item.color || "Default";
                    extraFields.size = item.size || "Default";
                    extraFields.barCode = item.barCode;
                }

                let existingNode = currentLevelNodes.find(
                    (n) => n.level === levelName && n.value === nodeVal
                );

                if (!existingNode) {
                    existingNode = {
                        level: levelName,
                        value: nodeVal,
                        totals: createEmptyTotals(),
                        ...extraFields,
                        children: [],
                    };
                    currentLevelNodes.push(existingNode);
                }

                addTotals(existingNode.totals, metrics);

                if (levelName === "article" || levelName === "variant") {
                    existingNode.totals.unitPrice = metrics.unitPrice;
                    existingNode.totals.unitCost = metrics.unitCost;
                }

                currentLevelNodes = existingNode.children;
            }
        }

        return { treeData: root, grandTotals };
    }, [filteredItems, reportType, groupingLevels]);

    return {
        attributeOptions,
        filteredItems,
        treeData,
        grandTotals,
    };
}
