"use server";

import { authFetch } from "@/lib/auth"; // Keeping imports for future use, even if unused now.
import { revalidatePath } from "next/cache";

export async function createVendor(data: any) {
    try {
        console.log("Creating vendor (Mock):", data);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real implementation:
        // const response = await authFetch("/procurement/vendors", {
        //     method: "POST",
        //     body: JSON.stringify(data),
        // });
        // return response.json();

        return { status: true, message: "Vendor created successfully (Mock)" };
    } catch (error) {
        console.error("Create vendor error:", error);
        return { status: false, message: "Failed to create vendor" };
    }
}
