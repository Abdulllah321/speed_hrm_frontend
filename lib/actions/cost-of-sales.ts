"use server";

import { authFetch } from "@/lib/auth";

export interface CostOfSalesSizeItem {
  id: string;
  size: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
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
  };
}

export interface CostOfSalesOutletNode {
  locationId: string;
  locationName: string;
  brands: CostOfSalesBrandNode[];
  totals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
  };
}

export interface CostOfSalesReportData {
  outlets: CostOfSalesOutletNode[];
  grandTotals: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
  };
  startDate: string;
  endDate: string;
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

export async function queueCostOfSalesExport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  search?: string;
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
