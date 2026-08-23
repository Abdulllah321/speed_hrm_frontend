export interface LocationHeader {
  id: string;
  name: string;
  code?: string;
}

export interface WarehouseHeader {
  id: string;
  name: string;
  code?: string;
}

export interface InventoryAgingRecord {
  id: string;
  sku: string;
  barCode: string;
  name: string;
  description?: string;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  divisionId?: string;
  divisionName?: string;
  colorName?: string;
  sizeName?: string;
  unitCost: number;
  unitPrice: number;
  totalQty: number;
  totalValue: number;

  // Aging Brackets
  bucket0to30Qty: number;
  bucket0to30Value: number;
  bucket31to60Qty: number;
  bucket31to60Value: number;
  bucket61to90Qty: number;
  bucket61to90Value: number;
  bucket91to120Qty: number;
  bucket91to120Value: number;
  bucket121to180Qty: number;
  bucket121to180Value: number;
  bucket181PlusQty: number;
  bucket181PlusValue: number;

  avgAgeDays: number;

  locationStocks: Record<string, number>;
  warehouseStocks: Record<string, number>;
}

export interface InventoryAgingTotals {
  totalItems: number;
  totalStockQty: number;
  totalStockValue: number;
  totalBucket0to30Qty: number;
  totalBucket0to30Value: number;
  totalBucket31to60Qty: number;
  totalBucket31to60Value: number;
  totalBucket61to90Qty: number;
  totalBucket61to90Value: number;
  totalBucket91to120Qty: number;
  totalBucket91to120Value: number;
  totalBucket121to180Qty: number;
  totalBucket121to180Value: number;
  totalBucket181PlusQty: number;
  totalBucket181PlusValue: number;
  overallAvgAgeDays: number;
  locationTotals: Record<string, number>;
  warehouseTotals: Record<string, number>;
}

export interface InventoryAgingReportData {
  flatItemsList: InventoryAgingRecord[];
  grandTotals: InventoryAgingTotals;
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
}

export interface GroupingLevels {
  showBrand: boolean;
  showCategory: boolean;
  showDivision: boolean;
  showColor: boolean;
  showSize: boolean;
}
