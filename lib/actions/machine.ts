"use server";
import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface Machine {
  id: string;
  name: string;
  status: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Machine Actions
export async function getMachines(): Promise<{ status: boolean; data: Machine[]; message?: string }> {
  try {
    const res = await authFetch(`/machines`, {
    });
    const result = await res.json();
    if (!result.data && !Array.isArray(result)) {
      console.error("Fetch machines failed:", result);
    }
    return result;
  } catch (error) {
    console.error("Failed to fetch machines:", error);
    return { status: false, data: [], message: "Failed to fetch machines" };
  }
}

export async function getMachineById(id: string): Promise<{ status: boolean; data: Machine | null }> {
  try {
    const res = await authFetch(`/machines/${id}`, {
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch machine:", error);
    return { status: false, data: null };
  }
}

export async function createMachines(names: string[]): Promise<{ status: boolean; message: string; data?: Machine[] }> {
  if (!names.length) {
    return { status: false, message: "At least one name is required" };
  }
  try {
    const results = await Promise.all(names.map(name => 
      authFetch(`/machines`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }).then(r => r.json())
    ));
    
    // Check if all succeeded (assuming success if id is present or status is not explicitly false)
    const allSuccess = results.every(r => r.id || r.status !== false); 
    
    if (allSuccess) {
        revalidatePath("/master/machine/list");
        return { status: true, message: "Machines created successfully" };
    }
    return { status: false, message: "Some machines failed to create" };

  } catch (error) {
    return { status: false, message: "Failed to create machines" };
  }
}

export async function updateMachine(id: string, formData: FormData): Promise<{ status: boolean; message: string }> {
  const name = formData.get("name") as string;
  try {
    const res = await authFetch(`/machines/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.id || data.status) {
      revalidatePath("/master/machine/list");
      return { status: true, message: "Machine updated successfully" };
    }
    return { status: false, message: data.message || "Failed to update machine" };
  } catch (error) {
    return { status: false, message: "Failed to update machine" };
  }
}

export async function updateMachines(items: { id: string; name: string }[]): Promise<{ status: boolean; message: string }> {
  try {
    await Promise.all(items.map(item => 
      authFetch(`/machines/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: item.name }),
      })
    ));
    revalidatePath("/master/machine/list");
    return { status: true, message: "Machines updated successfully" };
  } catch (error) {
    return { status: false, message: "Failed to update machines" };
  }
}

export async function deleteMachine(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const res = await authFetch(`/machines/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.id || data.status) {
      revalidatePath("/erp/inventory-master/machine");
      return { status: true, message: "Machine deleted successfully" };
    }
    return { status: false, message: data.message || "Failed to delete machine" };
  } catch (error) {
    return { status: false, message: "Failed to delete machine" };
  }
}

export async function deleteMachines(ids: string[]): Promise<{ status: boolean; message: string }> {
  try {
    await Promise.all(ids.map(id => 
      authFetch(`/machines/${id}`, {
        method: "DELETE",
      })
    ));
    revalidatePath("/erp/inventory-master/machine");
    return { status: true, message: "Machines deleted successfully" };
  } catch (error) {
    return { status: false, message: "Failed to delete machines" };
  }
}
