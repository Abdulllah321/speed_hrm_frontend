"use server";

import { authFetch } from "@/lib/auth";

export interface CostOfSalesSizeItem {
  id: string;
  size: string;
  color: string;
  barCode?: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  unitPrice: number;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: number;
}

export interface CostOfSalesProductNode {
  sku: string;
  description: string;
  productLabel: string;
  sizes: CostOfSalesSizeItem[];
  totals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
}

export interface CostOfSalesCategoryNode {
  categoryId: string;
  categoryName: string;
  products: CostOfSalesProductNode[];
  totals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
}

export interface CostOfSalesGenderNode {
  genderId: string;
  genderName: string;
  categories: CostOfSalesCategoryNode[];
  totals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
}

export interface CostOfSalesDivisionNode {
  divisionId: string;
  divisionName: string;
  genders: CostOfSalesGenderNode[];
  totals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
}

export interface CostOfSalesBrandNode {
  brandId: string;
  brandName: string;
  divisions: CostOfSalesDivisionNode[];
  totals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
}

export interface CostOfSalesFlatRecord {
  id: string;
  brand: string;
  division: string;
  category: string;
  gender: string;
  silhouette: string;
  sku: string;
  articleName: string;
  color: string;
  size: string;
  barCode: string;
  locationName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitPrice: number;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: number;
}

export interface CostOfSalesReportData {
  brands: CostOfSalesBrandNode[];
  flatItems: CostOfSalesFlatRecord[];
  grandTotals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
  startDate: string;
  endDate: string;
  meta?: {
    totalItems: number;
    locationsCount: number;
  };
}

export interface GetCostOfSalesReportParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getCostOfSalesReport(
  params: GetCostOfSalesReportParams,
): Promise<{ status: boolean; data?: CostOfSalesReportData; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/cost-of-sales", {
      params: {
        locationId: params.locationId || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        search: params.search || undefined,
      },
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to load report" };
  } catch (error: any) {
    console.error("getCostOfSalesReport error:", error);
    return { status: false, message: error?.message || "Network error loading report" };
  }
}

export async function queueCostOfSalesPreview(
  params: GetCostOfSalesReportParams,
): Promise<{ status: boolean; data?: { jobId: string; queuePosition: number; waitingCount: number }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/cost-of-sales/queue", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue preview calculation job" };
  } catch (error: any) {
    console.error("queueCostOfSalesPreview error:", error);
    return { status: false, message: error?.message || "Error queueing calculation job" };
  }
}

export async function getCostOfSalesResult(
  jobId: string,
): Promise<{ status: boolean; data?: CostOfSalesReportData; message?: string }> {
  try {
    const res = await authFetch(`/pos-sales/reports/cost-of-sales/result/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch calculation result" };
  } catch (error: any) {
    console.error("getCostOfSalesResult error:", error);
    return { status: false, message: error?.message || "Error fetching result" };
  }
}

export async function queueCostOfSalesExport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  exportType?: "hierarchical" | "flat";
  search?: string;
  previewJobId?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/cost-of-sales/export", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue export job" };
  } catch (error: any) {
    console.error("queueCostOfSalesExport error:", error);
    return { status: false, message: error?.message || "Network error queueing export" };
  }
}

export async function registerClientCostOfSalesExport(opts: {
  fileName: string;
  fileBase64: string;
  mimeType: string;
}): Promise<{ status: boolean; data?: { jobId: string; s3Url?: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/cost-of-sales/export/register-client-export", {
      method: "POST",
      body: JSON.stringify(opts),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to register client export" };
  } catch (error: any) {
    console.error("registerClientCostOfSalesExport error:", error);
    return { status: false, message: error?.message || "Error registering export file" };
  }
}

export async function getCostOfSalesExportStatus(
  jobId: string,
): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
  try {
    const res = await authFetch(`/pos-sales/reports/cost-of-sales/export-status/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch export status" };
  } catch (error: any) {
    console.error("getCostOfSalesExportStatus error:", error);
    return { status: false, message: error?.message || "Error checking job status" };
  }
}
