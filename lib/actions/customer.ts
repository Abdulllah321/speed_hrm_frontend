'use server';

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface Customer {
  id: string;
  traderId?: string;
  code?: string;
  subCode?: string;
  name: string;
  company?: string;
  brands?: string;
  baseMargin?: number;
  cashMargin?: number;
  remarks?: string;
  address?: string;
  deliveryAddress?: string;
  contactNo?: string;
  email?: string;
  cnicNo?: string;
  ntn?: string;
  strn?: string;
  balance?: number;
}

export async function getNextCustomerCode() {
  try {
    const response = await authFetch("/sales/customers/next-code");
    return response.data;
  } catch (error) {
    return { status: false, code: "310001" };
  }
}

export async function getCustomers() {
  try {
    const response = await authFetch("/sales/customers");
    const result = response.data;
    return Array.isArray(result) ? result : (result?.data ?? []);
  } catch (error) {
    return [];
  }
}

export async function createCustomer(data: Omit<Customer, "id">) {
  try {
    const response = await authFetch("/sales/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = response.data;
    if (result?.status) {
      revalidatePath("/erp/sales/customers");
    }
    return result;
  } catch (error) {
    return { status: false, message: "Failed to create customer" };
  }
}

export async function updateCustomer(id: string, data: Partial<Omit<Customer, "id">>) {
  try {
    const response = await authFetch(`/sales/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const result = response.data;
    if (result?.status) {
      revalidatePath("/erp/sales/customers");
    }
    return result;
  } catch (error) {
    return { status: false, message: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const response = await authFetch(`/sales/customers/${id}`, {
      method: "DELETE",
    });
    const result = response.data;
    if (result?.status) {
      revalidatePath("/erp/sales/customers");
    }
    return result;
  } catch (error) {
    return { status: false, message: "Failed to delete customer" };
  }
}
