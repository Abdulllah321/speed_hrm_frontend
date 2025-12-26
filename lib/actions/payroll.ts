"use server";

import { revalidatePath } from "next/cache";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function previewPayroll(data: {
    month: string;
    year: string;
    employeeIds?: string[];
}) {
    try {
        const response = await fetch(`${BACKEND_URL}/payroll/preview`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                status: false,
                message: result.message || "Failed to preview payroll",
            };
        }

        return {
            status: true,
            message: "Payroll preview generated",
            data: result,
        };
    } catch (error) {
        console.error("Preview payroll error:", error);
        return {
            status: false,
            message: "An error occurred while previewing payroll",
        };
    }
}

export async function confirmPayroll(data: {
    month: string;
    year: string;
    generatedBy: string;
    details: any[];
}) {
    try {
        const response = await fetch(`${BACKEND_URL}/payroll/confirm`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                status: false,
                message: result.message || "Failed to confirm payroll",
            };
        }

        revalidatePath("/dashboard/payroll");
        return {
            status: true,
            message: "Payroll confirmed and saved successfully",
            data: result,
        };
    } catch (error) {
        console.error("Confirm payroll error:", error);
        return {
            status: false,
            message: "An error occurred while confirming payroll",
        };
    }
}
