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
  selectedAgeBucket?: string; // "all" | "0-6m" | "6-9m" | "9-12m" | "12-15m" | "15-18m" | "18+m"
  isPosLevel?: boolean;
}

export function useInventoryAgingData({
  rawItems,
  locations,
  warehouses,
  searchQuery,
  selectedBrandId,
  selectedCategoryId,
  selectedAgeBucket = "all",
  isPosLevel = false,
}: UseInventoryAgingDataProps) {
  // 1. Filtered & Value-Mapped Items
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rawItems
      .map((item) => {
        // Adjust values for POS level (Retail Price) vs ERP level (Cost Price)
        const price = isPosLevel ? item.unitPrice : item.unitCost;
        const totalVal = item.totalQty * price;

        return {
          ...item,
          totalValue: totalVal,
          bucket0to6mValue: item.bucket0to6mQty * price,
          bucket6to9mValue: item.bucket6to9mQty * price,
          bucket9to12mValue: item.bucket9to12mQty * price,
          bucket12to15mValue: item.bucket12to15mQty * price,
          bucket15to18mValue: item.bucket15to18mQty * price,
          bucket18mPlusValue: item.bucket18mPlusQty * price,
        };
      })
      .filter((item) => {
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

        // Age Bucket filter (0-6m, 6-9m, 9-12m, 12-15m, 15-18m, 18+m)
        if (selectedAgeBucket && selectedAgeBucket !== "all") {
          if (selectedAgeBucket === "0-6m" && item.bucket0to6mQty <= 0) return false;
          if (selectedAgeBucket === "6-9m" && item.bucket6to9mQty <= 0) return false;
          if (selectedAgeBucket === "9-12m" && item.bucket9to12mQty <= 0) return false;
          if (selectedAgeBucket === "12-15m" && item.bucket12to15mQty <= 0) return false;
          if (selectedAgeBucket === "15-18m" && item.bucket15to18mQty <= 0) return false;
          if (selectedAgeBucket === "18+m" && item.bucket18mPlusQty <= 0) return false;
        }

        return true;
      });
  }, [rawItems, searchQuery, selectedBrandId, selectedCategoryId, selectedAgeBucket, isPosLevel]);

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
