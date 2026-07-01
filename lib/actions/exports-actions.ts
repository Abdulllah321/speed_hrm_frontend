"use strict";
"use server";

import { authFetch } from "@/lib/auth";

export async function getFolders() {
  try {
    const response = await authFetch("/export-history/folders", { method: "GET" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Get folders error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function createFolder(name: string) {
  try {
    const response = await authFetch("/export-history/folders", {
      method: "POST",
      body: { name },
    });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Create folder error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function renameFolder(id: string, name: string) {
  try {
    const response = await authFetch(`/export-history/folders/${id}`, {
      method: "PATCH",
      body: { name },
    });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Rename folder error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function deleteFolder(id: string) {
  try {
    const response = await authFetch(`/export-history/folders/${id}`, { method: "DELETE" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Delete folder error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function getExports(filters?: {
  folderId?: string | null;
  isFavorite?: boolean;
  search?: string;
  moduleName?: string;
}) {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.folderId !== undefined && filters?.folderId !== null) {
      queryParams.append("folderId", filters.folderId);
    } else if (filters?.folderId === null) {
      queryParams.append("folderId", "null");
    }
    if (filters?.isFavorite !== undefined) {
      queryParams.append("isFavorite", String(filters.isFavorite));
    }
    if (filters?.search) {
      queryParams.append("search", filters.search);
    }
    if (filters?.moduleName) {
      queryParams.append("moduleName", filters.moduleName);
    }

    const queryString = queryParams.toString();
    const url = `/export-history${queryString ? `?${queryString}` : ""}`;

    const response = await authFetch(url, { method: "GET" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Get exports error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function updateExport(
  id: string,
  payload: { fileName?: string; isFavorite?: boolean; folderId?: string | null }
) {
  try {
    const response = await authFetch(`/export-history/${id}`, {
      method: "PATCH",
      body: payload,
    });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Update export error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function deleteExport(id: string) {
  try {
    const response = await authFetch(`/export-history/${id}`, { method: "DELETE" });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Delete export error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function bulkDeleteExports(ids: string[]) {
  try {
    const response = await authFetch("/export-history/bulk", {
      method: "DELETE",
      body: { ids },
    });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Bulk delete exports error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function bulkMoveExports(ids: string[], folderId: string | null) {
  try {
    const response = await authFetch("/export-history/bulk/move", {
      method: "PATCH",
      body: { ids, folderId },
    });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Bulk move exports error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

export async function bulkRenameExports(ids: string[], baseName: string) {
  try {
    const response = await authFetch("/export-history/bulk/rename", {
      method: "PATCH",
      body: { ids, baseName },
    });
    return response.data ?? { status: false, message: "No response from server" };
  } catch (error) {
    console.error("Bulk rename exports error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

