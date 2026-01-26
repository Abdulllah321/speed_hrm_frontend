"use server";

import { revalidatePath } from "next/cache";

import { getAccessToken } from '../auth';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
    const token = await getAccessToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

export async function createTransfer(data: {
    employeeId: string;
    transferDate: string;
    newLocationId: string;
    newCityId?: string;
    newStateId?: string;
    reason?: string;
}) {
    try {
        const res = await fetch(`${API_URL}/employee-transfer`, {
            method: "POST",
            headers: await getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            return { status: false, message: error.message || "Failed to create transfer" };
        }

        revalidatePath("/hr/employee/list");
        revalidatePath("/hr/employee/view/[id]");
        return { status: true, message: "Employee transferred successfully" };
    } catch (error) {
        console.error("Create transfer error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getTransferHistory(employeeId: string) {
    try {
        const res = await fetch(`${API_URL}/employee-transfer/employee/${employeeId}`, {
            headers: await getAuthHeaders(),
            cache: "no-store",
        });

        if (!res.ok) {
            return { status: false, data: [] };
        }

        const data = await res.json();
        return { status: true, data };
    } catch (error) {
        console.error("Get transfer history error:", error);
        return { status: false, data: [] };
    }
}
