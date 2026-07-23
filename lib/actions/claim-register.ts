"use server";

import { authFetch } from "@/lib/auth";

export interface ClaimRegisterReportItem {
  id: string;
  baseCmNumber: string;
  baseCmDate: string;
  claimNumber: string;
  claimDate: string;
  settledInvNumber: string;
  settledDate: string;
  productDescription: string;
  productSku: string;
  size: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  unitPriceWot: number;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  netTotal: number;
}

export interface ClaimGroup {
  claimNumber: string;
  claimId: string;
  items: ClaimRegisterReportItem[];
  totals: {
    quantity: number;
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    netTotal: number;
  };
}

export interface OutletClaimGroup {
  locationId: string;
  locationName: string;
  claims: ClaimGroup[];
  totals: {
    quantity: number;
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    netTotal: number;
  };
}

export interface ClaimRegisterReportData {
  outlets: OutletClaimGroup[];
  grandTotals: {
    quantity: number;
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    netTotal: number;
  };
  startDate: string;
  endDate: string;
}

export interface GetClaimRegisterReportParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getClaimRegisterReport(
  params: GetClaimRegisterReportParams,
): Promise<{ status: boolean; data?: ClaimRegisterReportData; message?: string }> {
  try {
    const res = await authFetch("/pos-claims/reports/claim-register", {
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
    console.error("getClaimRegisterReport error:", error);
    return { status: false, message: error?.message || "Network error loading report" };
  }
}

export async function queueClaimRegisterReportExport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  search?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-claims/reports/claim-register/export", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue export job" };
  } catch (error: any) {
    console.error("queueClaimRegisterReportExport error:", error);
    return { status: false, message: error?.message || "Network error queueing export" };
  }
}

export async function getClaimRegisterReportExportStatus(
  jobId: string,
): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
  try {
    const res = await authFetch(`/pos-claims/reports/claim-register/export-status/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch export status" };
  } catch (error: any) {
    console.error("getClaimRegisterReportExportStatus error:", error);
    return { status: false, message: error?.message || "Error checking job status" };
  }
}
