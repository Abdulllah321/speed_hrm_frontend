import { useMemo } from "react";
import {
  InventoryAgingRecord,
  InventoryAgingTotals,
  LocationHeader,
  WarehouseHeader,
} from "./types";

interface UseInventoryAgingDataProps {
  rawItems: InventoryAgingRecord[];
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
  searchQuery: string;
  selectedBrandId?: string;
  selectedCategoryId?: string;
  selectedAgeBucket?: string; // "all" | "0-30" | "31-60" | "61-90" | "91-120" | "121-180" | "181+"
}

export function useInventoryAgingData({
  rawItems,
  locations,
  warehouses,
  searchQuery,
  selectedBrandId,
  selectedCategoryId,
  selectedAgeBucket = "all",
}: UseInventoryAgingDataProps) {
  // 1. Filtered Items
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rawItems.filter((item) => {
      // Search query filter
      if (query) {
        const matchesSku = item.sku.toLowerCase().includes(query);
        const matchesBarcode = item.barCode.toLowerCase().includes(query);
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = (item.description || "").toLowerCase().includes(query);
        const matchesBrand = (item.brandName || "").toLowerCase().includes(query);
        const matchesCat = (item.categoryName || "").toLowerCase().includes(query);

        if (!matchesSku && !matchesBarcode && !matchesName && !matchesDesc && !matchesBrand && !matchesCat) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrandId && selectedBrandId !== "all" && item.brandId !== selectedBrandId) {
        return false;
      }

      // Category filter
      if (selectedCategoryId && selectedCategoryId !== "all" && item.categoryId !== selectedCategoryId) {
        return false;
      }

      // Age Bucket filter
      if (selectedAgeBucket && selectedAgeBucket !== "all") {
        if (selectedAgeBucket === "0-30" && item.bucket0to30Qty <= 0) return false;
        if (selectedAgeBucket === "31-60" && item.bucket31to60Qty <= 0) return false;
        if (selectedAgeBucket === "61-90" && item.bucket61to90Qty <= 0) return false;
        if (selectedAgeBucket === "91-120" && item.bucket91to120Qty <= 0) return false;
        if (selectedAgeBucket === "121-180" && item.bucket121to180Qty <= 0) return false;
        if (selectedAgeBucket === "181+" && item.bucket181PlusQty <= 0) return false;
      }

      return true;
    });
  }, [rawItems, searchQuery, selectedBrandId, selectedCategoryId, selectedAgeBucket]);

  // 2. Computed Dynamic Grand Totals
  const grandTotals = useMemo<InventoryAgingTotals>(() => {
    const totals: InventoryAgingTotals = {
      totalItems: filteredItems.length,
      totalStockQty: 0,
      totalStockValue: 0,
      totalBucket0to30Qty: 0,
      totalBucket0to30Value: 0,
      totalBucket31to60Qty: 0,
      totalBucket31to60Value: 0,
      totalBucket61to90Qty: 0,
      totalBucket61to90Value: 0,
      totalBucket91to120Qty: 0,
      totalBucket91to120Value: 0,
      totalBucket121to180Qty: 0,
      totalBucket121to180Value: 0,
      totalBucket181PlusQty: 0,
      totalBucket181PlusValue: 0,
      overallAvgAgeDays: 0,
      locationTotals: {},
      warehouseTotals: {},
    };

    let totalAgeWeightedSum = 0;

    for (const item of filteredItems) {
      totals.totalStockQty += item.totalQty;
      totals.totalStockValue += item.totalValue;

      totals.totalBucket0to30Qty += item.bucket0to30Qty;
      totals.totalBucket0to30Value += item.bucket0to30Value;
      totals.totalBucket31to60Qty += item.bucket31to60Qty;
      totals.totalBucket31to60Value += item.bucket31to60Value;
      totals.totalBucket61to90Qty += item.bucket61to90Qty;
      totals.totalBucket61to90Value += item.bucket61to90Value;
      totals.totalBucket91to120Qty += item.bucket91to120Qty;
      totals.totalBucket91to120Value += item.bucket91to120Value;
      totals.totalBucket121to180Qty += item.bucket121to180Qty;
      totals.totalBucket121to180Value += item.bucket121to180Value;
      totals.totalBucket181PlusQty += item.bucket181PlusQty;
      totals.totalBucket181PlusValue += item.bucket181PlusValue;

      totalAgeWeightedSum += item.avgAgeDays * item.totalQty;

      for (const loc of locations) {
        const q = item.locationStocks[loc.id] || 0;
        totals.locationTotals[loc.id] = (totals.locationTotals[loc.id] || 0) + q;
      }
      for (const wh of warehouses) {
        const q = item.warehouseStocks[wh.id] || 0;
        totals.warehouseTotals[wh.id] = (totals.warehouseTotals[wh.id] || 0) + q;
      }
    }

    totals.overallAvgAgeDays = totals.totalStockQty > 0
      ? Math.round(totalAgeWeightedSum / totals.totalStockQty)
      : 0;

    return totals;
  }, [filteredItems, locations, warehouses]);

  return {
    filteredItems,
    grandTotals,
  };
}
