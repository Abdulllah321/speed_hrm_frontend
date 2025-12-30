"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

async function getHeaders(isJson = true) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export interface Country {
  id: string;
  name: string;
  nicename?: string;
  iso?: string;
  iso3?: string;
  phoneCode?: number;
  numcode?: number;
  code?: string;
  cities?: City[];
  createdAt: string;
  updatedAt: string;
}

export interface State {
  id: string;
  name: string;
  countryId: string;
  country?: Country;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  name: string;
  countryId: string;
  stateId: string;
  country?: Country;
  state?: State;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Country Actions
export async function getCountries(): Promise<{
  status: boolean;
  data?: Country[];
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/countries`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Failed to fetch countries" }));

      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return {
      status: false,
      data: [],
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch countries. Please check your connection.",
    };
  }
}

export async function createCountry(
  formData: FormData
): Promise<{ status: boolean; message: string; data?: Country }> {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ name, code }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create country" };
  }
}

export async function createCountries(
  items: { name: string; code?: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "At least one country is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/bulk`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create countries" };
  }
}

export async function updateCountry(
  id: string,
  formData: FormData
): Promise<{ status: boolean; message: string }> {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify({ id, name, code }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update country" };
  }
}

export async function updateCountries(
  items: { id: string; name: string; code?: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/bulk`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update countries" };
  }
}

export async function deleteCountry(
  id: string
): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/countries/${id}`, {
      method: "DELETE",
      headers: await getHeaders(false),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/country");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete country" };
  }
}

export async function deleteCountries(
  ids: string[]
): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const res = await fetch(`${API_BASE}/countries/bulk`, {
      method: "DELETE",
      headers: await getHeaders(),
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
export async function getCities(): Promise<{
  status: boolean;
  data?: City[];
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/cities`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Failed to fetch cities" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return {
      status: false,
      data: [],
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch cities. Please check your connection.",
    };
  }
}

export async function getCitiesByCountry(
  countryId: string
): Promise<{ status: boolean; data: City[] }> {
  try {
    const res = await fetch(`${API_BASE}/cities/country/${countryId}`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return { status: false, data: [] };
  }
}

// State Actions
export async function getStates(): Promise<{
  status: boolean;
  data?: State[];
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/states`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Failed to fetch states" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch states:", error);
    return {
      status: false,
      data: [],
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch states. Please check your connection.",
    };
  }
}

export async function getStatesByCountry(
  countryId: string
): Promise<{ status: boolean; data?: State[]; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states/country/${countryId}`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Failed to fetch states" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch states:", error);
    return {
      status: false,
      data: [],
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch states. Please check your connection.",
    };
  }
}

export async function getCitiesByState(
  stateId: string
): Promise<{ status: boolean; data?: City[]; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/cities/state/${stateId}`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Failed to fetch cities" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return {
      status: false,
      data: [],
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch cities. Please check your connection.",
    };
  }
}

// State CRUD Actions
export async function getStateById(
  id: string
): Promise<{ status: boolean; data?: State; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states/${id}`, {
      cache: "no-store",
      headers: await getHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Failed to fetch state" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch state:", error);
    return {
      status: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch state. Please check your connection.",
    };
  }
}

export async function createState(data: {
  name: string;
  countryId: string;
  status?: string;
}): Promise<{ status: boolean; data?: State; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.status) revalidatePath("/dashboard/master/state");
    return result;
  } catch (error) {
    return { status: false, message: "Failed to create state" };
  }
}

export async function createStates(
  items: { name: string; countryId: string; status?: string }[]
): Promise<{ status: boolean; message?: string }> {
  if (!items.length) {
    return { status: false, message: "At least one state is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/states/bulk`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/state");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create states" };
  }
}

export async function updateState(
  id: string,
  data: { name: string; countryId?: string; status?: string }
): Promise<{ status: boolean; data?: State; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify({ ...data, id }),
    });
    const result = await res.json();
    if (result.status) revalidatePath("/dashboard/master/state");
    return result;
  } catch (error) {
    return { status: false, message: "Failed to update state" };
  }
}

export async function updateStates(
  items: { id: string; name: string; countryId?: string; status?: string }[]
): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states/bulk`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/state");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update states" };
  }
}

export async function deleteState(
  id: string
): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states/${id}`, {
      method: "DELETE",
      headers: await getHeaders(false),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/state");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete state" };
  }
}

export async function deleteStates(
  ids: string[]
): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/states/bulk`, {
      method: "DELETE",
      headers: await getHeaders(),
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/state");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete states" };
  }
}

export async function createCity(
  formData: FormData
): Promise<{ status: boolean; message: string; data?: City }> {
  const name = formData.get("name") as string;
  const countryId = formData.get("countryId") as string;
  const stateId = formData.get("stateId") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  if (!countryId) {
    return { status: false, message: "Country is required" };
  }
  if (!stateId) {
    return { status: false, message: "State is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ name, countryId, stateId }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create city" };
  }
}

export async function createCities(
  items: { name: string; countryId: string; stateId: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "At least one city is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/bulk`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create cities" };
  }
}

export async function updateCity(
  id: string,
  formData: FormData
): Promise<{ status: boolean; message: string }> {
  const name = formData.get("name") as string;
  const countryId = formData.get("countryId") as string;
  const stateId = formData.get("stateId") as string;

  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  if (!stateId) {
    return { status: false, message: "State is required" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify({
        id,
        name,
        countryId: countryId || undefined,
        stateId,
      }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update city" };
  }
}

export async function updateCities(
  items: { id: string; name: string; countryId: string; stateId: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/bulk`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update cities" };
  }
}

export async function deleteCity(
  id: string
): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/cities/${id}`, {
      method: "DELETE",
      headers: await getHeaders(false),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete city" };
  }
}

export async function deleteCities(
  ids: string[]
): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const res = await fetch(`${API_BASE}/cities/bulk`, {
      method: "DELETE",
      headers: await getHeaders(),
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/city");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete cities" };
  }
}
