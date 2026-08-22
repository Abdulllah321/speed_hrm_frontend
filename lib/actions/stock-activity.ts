"use server";

import { authFetch } from "@/lib/auth";

export interface StockActivityTotals {
  bf: number;
  fromWarehouse: number;
  fromOutlet: number;
  totalTrfIn: number;
  toWarehouse: number;
  toOutlet: number;
  totalTrfOut: number;
  exchg: number;
  refund: number;
  claim: number;
  sales: number;
  adj: number;
  availableStock: number;
  transit: number;
  balance: number;
}

export interface StockActivityVariantItem {
  id: string;
  size: string;
  color: string;
  barCode?: string;
  sku: string;
  totals: StockActivityTotals;
}

export interface StockActivityProductNode {
  sku: string;
  description: string;
  productLabel: string;
  sizes: StockActivityVariantItem[];
  totals: StockActivityTotals;
}

export interface StockActivityCategoryNode {
  categoryId: string;
  categoryName: string;
  products: StockActivityProductNode[];
  totals: StockActivityTotals;
}

export interface StockActivityGenderNode {
  genderId: string;
  genderName: string;
  categories: StockActivityCategoryNode[];
  totals: StockActivityTotals;
}

export interface StockActivityDivisionNode {
  divisionId: string;
  divisionName: string;
  genders: StockActivityGenderNode[];
  totals: StockActivityTotals;
}

export interface StockActivityBrandNode {
  brandId: string;
  brandName: string;
  divisions: StockActivityDivisionNode[];
  totals: StockActivityTotals;
}

export interface StockActivityFlatRecord {
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
  totals: StockActivityTotals;
}

export interface StockActivityReportData {
  brands: StockActivityBrandNode[];
  flatItems: StockActivityFlatRecord[];
  grandTotals: StockActivityTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export async function queueStockActivityPreview(opts: {
  locationId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/stock-ledger/reports/stock-activity/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return res.data || res;
  } catch (err: any) {
    return { status: false, message: err.message || "Network error while queueing report" };
  }
}

export async function getStockActivityResult(
  jobId: string,
): Promise<{ status: boolean; data?: StockActivityReportData; message?: string }> {
  try {
    const res = await authFetch(`/stock-ledger/reports/stock-activity/result/${jobId}`, {
      method: "GET",
    });
    return res.data || res;
  } catch (err: any) {
    return { status: false, message: err.message || "Network error while fetching report data" };
  }
}

export async function registerClientStockActivityExport(opts: {
  fileName: string;
  fileBase64: string;
  mimeType: string;
}): Promise<{ status: boolean; data?: { jobId: string; downloadUrl: string }; message?: string }> {
  try {
    const res = await authFetch("/stock-ledger/reports/stock-activity/export/register-client-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return res.data || res;
  } catch (err: any) {
    return { status: false, message: err.message || "Network error registering export history" };
  }
}
