"use client";

import { useMemo } from "react";
import { TransferRecord, AttributeOptions, TransferGrandTotals } from "./types";

interface UseDataOptions {
    rawTransfers: TransferRecord[];
    searchQuery: string;
    selectedSourceIds: string[];
    selectedDestIds: string[];
    filterTransferTypes: Set<string>;
    filterStatuses: Set<string>;
    filterBrands: Set<string>;
    filterDivisions: Set<string>;
    filterCategories: Set<string>;
    filterGenders: Set<string>;
    filterSilhouettes: Set<string>;
    filterSizes: Set<string>;
    filterColors: Set<string>;
}

export const ROUTE_MAP: Record<string, string> = {
    "Warehouse → Outlet": "WAREHOUSE_TO_OUTLET",
    "Outlet → Warehouse (Return)": "OUTLET_TO_WAREHOUSE",
    "Outlet → Outlet": "OUTLET_TO_OUTLET",
    "Warehouse → Warehouse": "WAREHOUSE_TO_WAREHOUSE",
};

export const STATUS_MAP: Record<string, string> = {
    "Completed": "COMPLETED",
    "Pending": "PENDING",
    "In-Transit": "IN_TRANSIT",
    "Cancelled": "CANCELLED",
};

export function useStockTransferData({
    rawTransfers,
    searchQuery,
    selectedSourceIds,
    selectedDestIds,
    filterTransferTypes,
    filterStatuses,
    filterBrands,
    filterDivisions,
    filterCategories,
    filterGenders,
    filterSilhouettes,
    filterSizes,
    filterColors,
}: UseDataOptions) {
    // Extract available options for filter dropdowns from all line items
    const attributeOptions = useMemo<AttributeOptions>(() => {
        const brands = new Set<string>();
        const divisions = new Set<string>();
        const categories = new Set<string>();
        const genders = new Set<string>();
        const silhouettes = new Set<string>();
        const sizes = new Set<string>();
        const colors = new Set<string>();

        for (const tr of rawTransfers) {
            for (const item of tr.items || []) {
                if (item.brand && item.brand !== "No Brand") brands.add(item.brand);
                if (item.division && item.division !== "No Division") divisions.add(item.division);
                if (item.category && item.category !== "No Category") categories.add(item.category);
                if (item.gender && item.gender !== "No Gender") genders.add(item.gender);
                if (item.silhouette && item.silhouette !== "No Silhouette") silhouettes.add(item.silhouette);
                if (item.size && item.size !== "Default") sizes.add(item.size);
                if (item.color && item.color !== "Default") colors.add(item.color);
            }
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
    }, [rawTransfers]);

    // Filter transfers and recalculate item lines & totals
    const { filteredTransfers, computedTotals } = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const hasItemFilter =
            filterBrands.size > 0 ||
            filterDivisions.size > 0 ||
            filterCategories.size > 0 ||
            filterGenders.size > 0 ||
            filterSilhouettes.size > 0 ||
            filterSizes.size > 0 ||
            filterColors.size > 0;

        let totalSent = 0;
        let totalReceived = 0;
        let totalPending = 0;
        let totalCost = 0;
        let totalRetail = 0;
        let totalLines = 0;

        const statusCounts = {
            completed: 0,
            pending: 0,
            inTransit: 0,
            cancelled: 0,
        };

        const typeCounts = {
            warehouseToOutlet: 0,
            outletToWarehouse: 0,
            outletToOutlet: 0,
            warehouseToWarehouse: 0,
            other: 0,
        };

        const list: TransferRecord[] = [];

        // Map selected route labels to keys
        const selectedRouteKeys = new Set(
            Array.from(filterTransferTypes).map((label) => ROUTE_MAP[label] || label)
        );

        // Map selected status labels to keys
        const selectedStatusKeys = new Set(
            Array.from(filterStatuses).map((label) => STATUS_MAP[label] || label)
        );

        for (const tr of rawTransfers) {
            // Source Location / Warehouse filter
            if (selectedSourceIds.length > 0) {
                const matchSource = selectedSourceIds.some(
                    (id) => tr.fromLocationId === id || tr.fromWarehouseId === id
                );
                if (!matchSource) continue;
            }

            // Destination Location / Warehouse filter
            if (selectedDestIds.length > 0) {
                const matchDest = selectedDestIds.some(
                    (id) => tr.toLocationId === id || tr.toWarehouseId === id
                );
                if (!matchDest) continue;
            }

            // Transfer Type filter
            if (selectedRouteKeys.size > 0 && !selectedRouteKeys.has(tr.transferType)) {
                continue;
            }

            // Status filter
            if (selectedStatusKeys.size > 0) {
                const s = tr.status.toUpperCase();
                let matchesStatus = false;
                for (const key of selectedStatusKeys) {
                    if (key === "COMPLETED" && s === "COMPLETED") matchesStatus = true;
                    else if (
                        key === "PENDING" &&
                        ["PENDING", "PENDING_CHECKER", "CHECKED", "AUTHORIZED", "SOURCE_APPROVED", "PENDING_AUTHORIZER"].includes(s)
                    ) {
                        matchesStatus = true;
                    } else if (key === "IN_TRANSIT" && ["IN_TRANSIT", "SOURCE_APPROVED"].includes(s)) {
                        matchesStatus = true;
                    } else if (key === "CANCELLED" && ["CANCELLED", "REJECTED"].includes(s)) {
                        matchesStatus = true;
                    } else if (s === key) {
                        matchesStatus = true;
                    }
                }
                if (!matchesStatus) continue;
            }

            // Check item-level attribute matches
            let matchingItems = tr.items || [];
            if (hasItemFilter) {
                matchingItems = matchingItems.filter((item) => {
                    if (filterBrands.size > 0 && !filterBrands.has(item.brand)) return false;
                    if (filterDivisions.size > 0 && !filterDivisions.has(item.division)) return false;
                    if (filterCategories.size > 0 && !filterCategories.has(item.category)) return false;
                    if (filterGenders.size > 0 && !filterGenders.has(item.gender)) return false;
                    if (filterSilhouettes.size > 0 && !filterSilhouettes.has(item.silhouette)) return false;
                    if (filterSizes.size > 0 && !filterSizes.has(item.size)) return false;
                    if (filterColors.size > 0 && !filterColors.has(item.color)) return false;
                    return true;
                });
                if (matchingItems.length === 0) continue;
            }

            // Search query matching
            if (q) {
                const matchHeader =
                    tr.requestNo?.toLowerCase().includes(q) ||
                    tr.outboundNo?.toLowerCase().includes(q) ||
                    tr.inboundNo?.toLowerCase().includes(q) ||
                    tr.receiptNo?.toLowerCase().includes(q) ||
                    tr.sourceName?.toLowerCase().includes(q) ||
                    tr.destinationName?.toLowerCase().includes(q) ||
                    tr.creatorName?.toLowerCase().includes(q) ||
                    tr.checkerName?.toLowerCase().includes(q) ||
                    tr.authorizerName?.toLowerCase().includes(q) ||
                    tr.acceptedByName?.toLowerCase().includes(q) ||
                    tr.riderName?.toLowerCase().includes(q) ||
                    tr.courierName?.toLowerCase().includes(q) ||
                    tr.trackingNumber?.toLowerCase().includes(q) ||
                    tr.receiverPerson?.toLowerCase().includes(q) ||
                    tr.notes?.toLowerCase().includes(q);

                const matchItem = matchingItems.some(
                    (it) =>
                        it.sku?.toLowerCase().includes(q) ||
                        it.articleName?.toLowerCase().includes(q) ||
                        it.barCode?.toLowerCase().includes(q) ||
                        it.brand?.toLowerCase().includes(q) ||
                        it.category?.toLowerCase().includes(q)
                );

                if (!matchHeader && !matchItem) continue;
            }

            // Compute line sums for matching items
            let trSent = 0;
            let trRecv = 0;
            let trCost = 0;
            let trRet = 0;

            for (const it of matchingItems) {
                trSent += it.sentQty;
                trRecv += it.receivedQty;
                trCost += it.totalCost;
                trRet += it.totalRetail;
                totalLines++;
            }

            const trPend = Math.max(0, trSent - trRecv);

            totalSent += trSent;
            totalReceived += trRecv;
            totalPending += trPend;
            totalCost += trCost;
            totalRetail += trRet;

            // Status count
            const s = tr.status.toUpperCase();
            if (s === "COMPLETED") statusCounts.completed++;
            else if (s === "CANCELLED" || s === "REJECTED") statusCounts.cancelled++;
            else if (s === "IN_TRANSIT" || s === "SOURCE_APPROVED") statusCounts.inTransit++;
            else statusCounts.pending++;

            // Type count
            if (tr.transferType === "WAREHOUSE_TO_OUTLET") typeCounts.warehouseToOutlet++;
            else if (tr.transferType === "OUTLET_TO_WAREHOUSE") typeCounts.outletToWarehouse++;
            else if (tr.transferType === "OUTLET_TO_OUTLET") typeCounts.outletToOutlet++;
            else if (tr.transferType === "WAREHOUSE_TO_WAREHOUSE") typeCounts.warehouseToWarehouse++;
            else typeCounts.other++;

            list.push({
                ...tr,
                totalSentQty: trSent,
                totalReceivedQty: trRecv,
                totalPendingQty: trPend,
                totalCostValue: trCost,
                totalRetailValue: trRet,
                itemCount: matchingItems.length,
                items: matchingItems,
            });
        }

        const totals: TransferGrandTotals = {
            totalTransfers: list.length,
            totalItems: totalLines,
            totalSentQty: totalSent,
            totalReceivedQty: totalReceived,
            totalPendingQty: totalPending,
            totalCostValue: totalCost,
            totalRetailValue: totalRetail,
            statusCounts,
            typeCounts,
        };

        return { filteredTransfers: list, computedTotals: totals };
    }, [
        rawTransfers,
        searchQuery,
        selectedSourceIds,
        selectedDestIds,
        filterTransferTypes,
        filterStatuses,
        filterBrands,
        filterDivisions,
        filterCategories,
        filterGenders,
        filterSilhouettes,
        filterSizes,
        filterColors,
    ]);

    return {
        attributeOptions,
        filteredTransfers,
        computedTotals,
    };
}
