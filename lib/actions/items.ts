"use strict";
"use server";

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function sanitizeItemData(data: any) {
    const sanitized = { ...data };
    // List of keys that are optional UUIDs or might be empty strings should be removed or set to undefined
    const keysToCheck = [
        "brandId", "divisionId", "categoryId", "subCategoryId",
        "itemClassId", "itemSubclassId", "channelClassId",
        "genderId", "seasonId", "uomId", "segmentId",
        "sizeId", "colorId", "silhouetteId"
    ];

    for (const key of keysToCheck) {
        if (sanitized[key] === "" || sanitized[key] === "undefined" || sanitized[key] === null) {
            sanitized[key] = undefined;
        }
    }

    // Also sanitizing other string fields if they are empty
    if (sanitized.barCode === "") sanitized.barCode = undefined;
    if (sanitized.hsCode === "") sanitized.hsCode = undefined;
    if (sanitized.description === "") sanitized.description = undefined;
    if (sanitized.case === "") sanitized.case = undefined;
    if (sanitized.band === "") sanitized.band = undefined;
    if (sanitized.movementType === "") sanitized.movementType = undefined;
    if (sanitized.heelHeight === "") sanitized.heelHeight = undefined;
    if (sanitized.width === "") sanitized.width = undefined;

    return sanitized;
}

export async function createItem(data: any) {
    try {
        const sanitizedData = sanitizeItemData(data);
        const response = await authFetch("/master/erp/item", {
            method: "POST",
            body: JSON.stringify(sanitizedData),
        });

        const result = await response.json();
        if (result.status) {
            revalidatePath("/erp/items/list");
        }
        return result;
    } catch (error) {
        console.error("Create item error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getItems() {
    try {
        const response = await authFetch("/master/erp/item", {
            method: "GET",
        });

        const result = await response.json();
        return result; // Backend now returns { status: true, data: Item[] }
    } catch (error) {
        console.error("Get items error:", error);
        return { status: false, data: [] };
    }
}

export async function getItemById(id: string) {
    try {
        const response = await authFetch(`/master/erp/item/${id}`, {
            method: "GET",
        });

        return response.json();
    } catch (error) {
        console.error("Get item error:", error);
        return { status: false, data: null };
    }
}

export async function updateItem(id: string, data: any) {
    try {
        const sanitizedData = sanitizeItemData(data);
        const response = await authFetch(`/master/erp/item/${id}`, {
            method: "PUT",
            body: JSON.stringify(sanitizedData),
        });

        const result = await response.json();
        if (result.status) {
            revalidatePath("/erp/items/list");
        }
        return result;
    } catch (error) {
        console.error("Update item error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function deleteItem(id: string) {
    try {
        const response = await authFetch(`/master/erp/item/${id}`, {
            method: "DELETE",
        });

        const result = await response.json();
        if (result.status) {
            revalidatePath("/erp/items/list");
        }
        return result;
    } catch (error) {
        console.error("Delete item error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}
