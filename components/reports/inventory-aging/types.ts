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

  // Aging Brackets (Months: 0-6M, 6-9M, 9-12M, 12-15M, 15-18M, >18M)
  bucket0to6mQty: number;
  bucket0to6mValue: number;
  bucket6to9mQty: number;
  bucket6to9mValue: number;
  bucket9to12mQty: number;
  bucket9to12mValue: number;
  bucket12to15mQty: number;
  bucket12to15mValue: number;
  bucket15to18mQty: number;
  bucket15to18mValue: number;
  bucket18mPlusQty: number;
  bucket18mPlusValue: number;

  avgAgeDays: number;

  locationStocks: Record<string, number>;
  warehouseStocks: Record<string, number>;
}

export interface InventoryAgingTotals {
  totalItems: number;
  totalStockQty: number;
  totalStockValue: number;
  totalBucket0to6mQty: number;
  totalBucket0to6mValue: number;
  totalBucket6to9mQty: number;
  totalBucket6to9mValue: number;
  totalBucket9to12mQty: number;
  totalBucket9to12mValue: number;
  totalBucket12to15mQty: number;
  totalBucket12to15mValue: number;
  totalBucket15to18mQty: number;
  totalBucket15to18mValue: number;
  totalBucket18mPlusQty: number;
  totalBucket18mPlusValue: number;
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
