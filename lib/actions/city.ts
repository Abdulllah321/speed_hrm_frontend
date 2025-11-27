"use server";

import { revalidatePath } from "next/cache";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Country {
  id: string;
  name: string;
  code?: string;
  cities?: City[];
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  countryId: string;
  country?: Country;
  createdAt: string;
  updatedAt: string;
}

// Country Actions
export async function getCountries(): Promise<{ status: boolean; data: Country[] }> {
  try {
    const res = await fetch(`${API_BASE}/countries`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return { status: false, data: [] };
  }
}

export async function createCountry(formData: FormData): Promise<{ status: boolean; message: string; data?: Country }> {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create country" };
  }
}

export async function createCountries(items: { name: string; code?: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "At least one country is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create countries" };
  }
}

export async function updateCountry(id: string, formData: FormData): Promise<{ status: boolean; message: string }> {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update country" };
  }
}

export async function updateCountries(items: { id: string; name: string; code?: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/bulk`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update countries" };
  }
}

export async function deleteCountry(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/countries/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete country" };
  }
}

export async function deleteCountries(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/bulk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete countries" };
  }
}

// City Actions
export async function getCities(): Promise<{ status: boolean; data: City[] }> {
  try {
    const res = await fetch(`${API_BASE}/cities`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return { status: false, data: [] };
  }
}

export async function getCitiesByCountry(countryId: string): Promise<{ status: boolean; data: City[] }> {
  try {
    const res = await fetch(`${API_BASE}/cities/country/${countryId}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return { status: false, data: [] };
  }
}

export async function createCity(formData: FormData): Promise<{ status: boolean; message: string; data?: City }> {
  const name = formData.get("name") as string;
  const countryId = formData.get("countryId") as string;
  const lat = formData.get("lat") as string;
  const lng = formData.get("lng") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  if (!countryId) {
    return { status: false, message: "Country is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, countryId, lat, lng }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create city" };
  }
}

export async function createCities(items: { name: string; countryId: string; lat?: number; lng?: number }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "At least one city is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create cities" };
  }
}

export async function updateCity(id: string, formData: FormData): Promise<{ status: boolean; message: string }> {
  const name = formData.get("name") as string;
  const countryId = formData.get("countryId") as string;
  const lat = formData.get("lat") as string;
  const lng = formData.get("lng") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, countryId: countryId || undefined, lat, lng }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update city" };
  }
}

export async function updateCities(items: { id: string; name: string; countryId: string; lat?: number; lng?: number }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/bulk`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update cities" };
  }
}

export async function deleteCity(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/cities/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete city" };
  }
}

export async function deleteCities(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/bulk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete cities" };
  }
}

