"use strict";
"use server";

import { authFetch } from "@/lib/auth";
import { MovementType } from "@/lib/api";

export async function getStockLedger(filters?: {
    warehouseId?: string;
    movementType?: MovementType;
    itemId?: string;
}) {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.warehouseId) queryParams.append("warehouseId", filters.warehouseId);
        if (filters?.movementType) queryParams.append("movementType", filters.movementType);
        if (filters?.itemId) queryParams.append("itemId", filters.itemId);

        const queryString = queryParams.toString();
        const url = `/warehouse/stock-ledger${queryString ? `?${queryString}` : ""}`;

        const response = await authFetch(url, {
            method: "GET",
        });

        const result = await response.json();
        // Backend returns array directly or wrapped in { data: [] }
        // Based on StockLedgerController, it returns the array directly. 
        // But authFetch might wrap things? existing items.ts suggests it returns result which has .data
        // Let's assume consistent backend response format { status, data } or just data.
        // My implementation of StockLedgerController returns specific array.
        // Let's standardise the return to match frontend expectation.

        // If the backend returns raw array:
        if (Array.isArray(result)) {
            return { status: true, data: result };
        }

        return result;
    } catch (error) {
        console.error("Get stock ledger error:", error);
        return { status: false, data: [], message: "Failed to fetch stock ledger" };
    }
}
