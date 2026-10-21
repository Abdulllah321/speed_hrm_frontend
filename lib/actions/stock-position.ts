"use server";

import { authFetch } from "@/lib/auth";

export interface StockPositionTotals {
  launchQty: number;
  beginning: number;
  netSales: number;
  end: number;
  totalQty: number;
  sellThroughPercent: number;
  opening: number;
  purchases: number;
  purchaseReturns: number;
  netPurchases: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  netAdjustments: number;
  sales: number;
  salesReturns: number;
}

export interface StockPositionVariantItem {
  id: string;
  sku: string;
  barCode: string;
  size: string;
  color: string;
  division: string;
  department: string;
  productCategory: string;
  silhouette: string;
  class: string;
  subclass: string;
  season: string;
  oldSeason: string;
  gender: string;
  case: string;
  band: string;
  movementType: string;
  heelHeight: string;
  width: string;
  channelClass: string;
  discountPercent: number;
  rirRp: number;
  currentRp: number;
  fob: number;
  launchDate: string;
  lastGrnNumber: string;
  lastGrnDate: string;
  lastLcNumber?: string;
  lastLcDate?: string;
  lastSaleDate: string;
  lastSaleOutletBreakdown?: string;
  totals: StockPositionTotals;
}

export interface StockPositionProductNode {
  sku: string;
  itemName?: string;
  description?: string;
  productLabel?: string;
  discountPercent?: number;
  rirRp?: number;
  currentRp?: number;
  fob?: number;
  launchDate?: string;
  lastGrnNumber?: string;
  lastGrnDate?: string;
  lastLcNumber?: string;
  lastLcDate?: string;
  lastSaleDate?: string;
  lastSaleOutletBreakdown?: string;
  sizes: StockPositionVariantItem[];
  totals: StockPositionTotals;
}

export interface StockPositionCategoryNode {
  categoryId?: string;
  categoryName: string;
  products: StockPositionProductNode[];
  totals: StockPositionTotals;
  genders?: StockPositionGenderNode[];
}

export interface StockPositionGenderNode {
  genderId?: string;
  genderName: string;
  categories?: StockPositionCategoryNode[];
  products?: StockPositionProductNode[];
  totals: StockPositionTotals;
}

export interface StockPositionDivisionNode {
  divisionId?: string;
  divisionName: string;
  genders?: StockPositionGenderNode[];
  categories?: StockPositionCategoryNode[];
  totals: StockPositionTotals;
}

export interface StockPositionBrandNode {
  brandId?: string;
  brandName: string;
  divisions: StockPositionDivisionNode[];
  totals: StockPositionTotals;
}

export interface StockPositionFlatRecord {
  brand: string;
  sku: string;
  itemName: string;
  barCode: string;
  size: string;
  color: string;
  division: string;
  department: string;
  productCategory: string;
  silhouette: string;
  class: string;
  subclass: string;
  season: string;
  oldSeason: string;
  gender: string;
  case: string;
  band: string;
  movementType: string;
  heelHeight: string;
  width: string;
  channelClass: string;
  discountPercent: number;
  rirRp: number;
  currentRp: number;
  fob: number;
  launchDate: string;
  launchQty: number;
  beginning: number;
  sellThroughPercent: number;
  netSales: number;
  end: number;
  lastGrnNumber: string;
  lastGrnDate: string;
  lastLcNumber?: string;
  lastLcDate?: string;
  lastSaleDate: string;
  totalQty: number;
  lastSaleOutletBreakdown?: string;
}

export interface StockPositionReportData {
  brands: StockPositionBrandNode[];
  flatItems: StockPositionFlatRecord[];
  grandTotals: StockPositionTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export async function queueStockPositionPreview(opts: {
  locationId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  brandIds?: string[];
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/stock-ledger/reports/stock-position/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return res.data;
  } catch (err: any) {
    return {
      status: false,
      message: err.message || "Network error while queueing report",
    };
  }
}

export async function getStockPositionResult(
  jobId: string,
): Promise<{ status: boolean; data?: StockPositionReportData; message?: string }> {
  try {
    const res = await authFetch(
      `/stock-ledger/reports/stock-position/result/${jobId}`,
      {
        method: "GET",
      },
    );
    return res.data;
  } catch (err: any) {
    return {
      status: false,
      message: err.message || "Network error while fetching report data",
    };
  }
}

export async function registerClientStockPositionExport(opts: {
  fileName: string;
  fileBase64: string;
  mimeType: string;
}): Promise<{
  status: boolean;
  data?: { jobId: string; downloadUrl: string };
  message?: string;
}> {
  try {
    const res = await authFetch(
      "/stock-ledger/reports/stock-position/export/register-client-export",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      },
    );
    return res.data;
  } catch (err: any) {
    return {
      status: false,
      message: err.message || "Network error registering export history",
    };
  }
}
