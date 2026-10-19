"use strict";
"use server";

import { authFetch } from "@/lib/auth";

export async function getImportHistory(filters?: {
  moduleName?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.moduleName) params.set("moduleName", filters.moduleName);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const query = params.toString();
    const url = query ? `/import-history?${query}` : "/import-history";
    const response = await authFetch(url, { method: "GET" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Get import history error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function getImportDetail(uploadId: string) {
  try {
    const response = await authFetch(`/import-history/${uploadId}`, { method: "GET" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Get import detail error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function getImportModules() {
  try {
    const response = await authFetch("/import-history/modules", { method: "GET" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Get import modules error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}
