"use client";

import { useMemo } from "react";
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

export function useAvailableStockData({
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
        const q = searchQuery.trim().toLowerCase();
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
                const matchBar = item.barCode.toLowerCase().includes(q);
                const matchSku = item.sku.toLowerCase().includes(q);
                const matchDesc = item.articleName.toLowerCase().includes(q);
                const matchBrand = item.brand.toLowerCase().includes(q);
                const matchCat = item.category.toLowerCase().includes(q);
                const matchLoc = item.locationName.toLowerCase().includes(q);
                if (!matchBar && !matchSku && !matchDesc && !matchBrand && !matchCat && !matchLoc) return false;
            }

            return true;
        });
    }, [
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
    ]);

    // 3. Build dynamic hierarchy tree & calculate grand totals
    const { treeData, grandTotals } = useMemo(() => {
        const isSeparate = reportType === "separate";
        const levels: string[] = [];

        if (isSeparate) levels.push("location");
        if (groupingLevels.brand) levels.push("brand");
        if (groupingLevels.division) levels.push("division");
        if (groupingLevels.category) levels.push("category");
        if (groupingLevels.gender) levels.push("gender");
        if (groupingLevels.silhouette) levels.push("silhouette");
        if (groupingLevels.article) levels.push("article");
        if (groupingLevels.variant) levels.push("variant");

        if (levels.length === 0) {
            levels.push(isSeparate ? "location" : "brand");
        }

        const root: TreeNode[] = [];

        for (const item of filteredItems) {
            const metrics: StockTotals = {
                quantity: item.quantity,
                transit: item.transit,
                reserved: item.reserved,
                total: item.total,
                unitPrice: item.unitPrice,
                value: item.value,
                unitCost: item.unitCost,
                costingValue: item.costingValue,
            };

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
                    nodeVal = `${item.color || "Default"}-${item.size || "Default"}`;
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
                    existingNode.totals.unitPrice = item.unitPrice;
                    existingNode.totals.unitCost = item.unitCost;
                }

                if (i < levels.length - 1) {
                    currentLevelNodes = existingNode.children;
                }
            }
        }

        const totals = createEmptyTotals();
        for (const node of root) {
            addTotals(totals, node.totals);
        }

        return { treeData: root, grandTotals: totals };
    }, [filteredItems, reportType, groupingLevels]);

    return {
        attributeOptions,
        filteredItems,
        treeData,
        grandTotals,
    };
}
