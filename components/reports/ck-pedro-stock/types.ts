export interface CkPedroStockRecord {
  country: string;
  date: string;
  storeName: string;
  articleNo: string;
  barCode: string;
  batch: string;
  onHandQty: number;
  unitLandedCost: number;
  unitGrossPrice: number;
  unitNetPrice: number;
  column1: string;
}

export interface CkPedroStockTotals {
  totalRecords: number;
  totalOnHandQty: number;
  totalLandedCost: number;
  totalGrossValue: number;
}

