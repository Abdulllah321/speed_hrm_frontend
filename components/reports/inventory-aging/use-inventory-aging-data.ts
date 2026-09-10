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
  selectedLocationIds?: string[];
  selectedWarehouseIds?: string[];
  searchQuery: string;
  selectedBrandId?: string;
  selectedCategoryId?: string;
  selectedAgeBucket?: string; // "all" | "0-6m" | "6-9m" | "9-12m" | "12-15m" | "15-18m" | "18+m"
  isPosLevel?: boolean;
}

export function useInventoryAgingData({
  rawItems,
  locations,
  warehouses,
  selectedLocationIds = [],
  selectedWarehouseIds = [],
  searchQuery,
  selectedBrandId,
  selectedCategoryId,
  selectedAgeBucket = "all",
  isPosLevel = false,
}: UseInventoryAgingDataProps) {
  // 1. Filtered & Value-Mapped Items (0ms instant in-memory client slicing)
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const hasLocationFilter = selectedLocationIds.length > 0;
    const hasWarehouseFilter = selectedWarehouseIds.length > 0;

    const mappedList: InventoryAgingRecord[] = [];

    for (const item of rawItems) {
      const price = isPosLevel ? item.unitPrice : item.unitCost;
      let effectiveQty = item.totalQty;
      let b0to6 = item.bucket0to6mQty;
      let b6to9 = item.bucket6to9mQty;
      let b9to12 = item.bucket9to12mQty;
      let b12to15 = item.bucket12to15mQty;
      let b15to18 = item.bucket15to18mQty;
      let b18plus = item.bucket18mPlusQty;

      // Filter by selected stores / warehouses in-memory
      if (hasLocationFilter || hasWarehouseFilter) {
        let selectedQty = 0;
        if (hasLocationFilter) {
          for (const locId of selectedLocationIds) {
            selectedQty += item.locationStocks[locId] || 0;
          }
        }
        if (hasWarehouseFilter) {
          for (const whId of selectedWarehouseIds) {
            selectedQty += item.warehouseStocks[whId] || 0;
          }
        }
        if (selectedQty <= 0) continue;

        const ratio = item.totalQty > 0 ? selectedQty / item.totalQty : 0;
        effectiveQty = selectedQty;
        b0to6 = Math.round(item.bucket0to6mQty * ratio);
        b6to9 = Math.round(item.bucket6to9mQty * ratio);
        b9to12 = Math.round(item.bucket9to12mQty * ratio);
        b12to15 = Math.round(item.bucket12to15mQty * ratio);
        b15to18 = Math.round(item.bucket15to18mQty * ratio);
        b18plus = Math.round(item.bucket18mPlusQty * ratio);
      }

      // Search query filter
      if (query) {
        const matchesSku = item.sku.toLowerCase().includes(query);
        const matchesBarcode = item.barCode.toLowerCase().includes(query);
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = (item.description || "").toLowerCase().includes(query);
        const matchesBrand = (item.brandName || "").toLowerCase().includes(query);
        const matchesCat = (item.categoryName || "").toLowerCase().includes(query);

        if (!matchesSku && !matchesBarcode && !matchesName && !matchesDesc && !matchesBrand && !matchesCat) {
          continue;
        }
      }

      // Brand filter
      if (selectedBrandId && selectedBrandId !== "all" && item.brandId !== selectedBrandId) {
        continue;
      }

      // Category filter
      if (selectedCategoryId && selectedCategoryId !== "all" && item.categoryId !== selectedCategoryId) {
        continue;
      }

      // Age Bucket filter (0-6m, 6-9m, 9-12m, 12-15m, 15-18m, 18+m)
      if (selectedAgeBucket && selectedAgeBucket !== "all") {
        if (selectedAgeBucket === "0-6m" && b0to6 <= 0) continue;
        if (selectedAgeBucket === "6-9m" && b6to9 <= 0) continue;
        if (selectedAgeBucket === "9-12m" && b9to12 <= 0) continue;
        if (selectedAgeBucket === "12-15m" && b12to15 <= 0) continue;
        if (selectedAgeBucket === "15-18m" && b15to18 <= 0) continue;
        if (selectedAgeBucket === "18+m" && b18plus <= 0) continue;
      }

      mappedList.push({
        ...item,
        totalQty: effectiveQty,
        totalValue: effectiveQty * price,
        bucket0to6mQty: b0to6,
        bucket0to6mValue: b0to6 * price,
        bucket6to9mQty: b6to9,
        bucket6to9mValue: b6to9 * price,
        bucket9to12mQty: b9to12,
        bucket9to12mValue: b9to12 * price,
        bucket12to15mQty: b12to15,
        bucket12to15mValue: b12to15 * price,
        bucket15to18mQty: b15to18,
        bucket15to18mValue: b15to18 * price,
        bucket18mPlusQty: b18plus,
        bucket18mPlusValue: b18plus * price,
      });
    }

    return mappedList;
  }, [
    rawItems,
    selectedLocationIds,
    selectedWarehouseIds,
    searchQuery,
    selectedBrandId,
    selectedCategoryId,
    selectedAgeBucket,
    isPosLevel,
  ]);

  // 2. Computed Dynamic Grand Totals
  const grandTotals = useMemo<InventoryAgingTotals>(() => {
    const totals: InventoryAgingTotals = {
      totalItems: filteredItems.length,
      totalStockQty: 0,
      totalStockValue: 0,
      totalBucket0to6mQty: 0,
      totalBucket0to6mValue: 0,
      totalBucket6to9mQty: 0,
      totalBucket6to9mValue: 0,
      totalBucket9to12mQty: 0,
      totalBucket9to12mValue: 0,
      totalBucket12to15mQty: 0,
      totalBucket12to15mValue: 0,
      totalBucket15to18mQty: 0,
      totalBucket15to18mValue: 0,
      totalBucket18mPlusQty: 0,
      totalBucket18mPlusValue: 0,
      overallAvgAgeDays: 0,
      locationTotals: {},
      warehouseTotals: {},
    };

    let totalAgeWeightedSum = 0;

    for (const item of filteredItems) {
      totals.totalStockQty += item.totalQty;
      totals.totalStockValue += item.totalValue;

      totals.totalBucket0to6mQty += item.bucket0to6mQty;
      totals.totalBucket0to6mValue += item.bucket0to6mValue;
      totals.totalBucket6to9mQty += item.bucket6to9mQty;
      totals.totalBucket6to9mValue += item.bucket6to9mValue;
      totals.totalBucket9to12mQty += item.bucket9to12mQty;
      totals.totalBucket9to12mValue += item.bucket9to12mValue;
      totals.totalBucket12to15mQty += item.bucket12to15mQty;
      totals.totalBucket12to15mValue += item.bucket12to15mValue;
      totals.totalBucket15to18mQty += item.bucket15to18mQty;
      totals.totalBucket15to18mValue += item.bucket15to18mValue;
      totals.totalBucket18mPlusQty += item.bucket18mPlusQty;
      totals.totalBucket18mPlusValue += item.bucket18mPlusValue;

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
