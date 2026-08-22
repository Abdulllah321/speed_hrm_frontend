import {
  CostOfSalesBrandNode,
  CostOfSalesFlatRecord,
  CostOfSalesReportData,
} from "@/lib/actions/cost-of-sales";

export type {
  CostOfSalesBrandNode,
  CostOfSalesFlatRecord,
  CostOfSalesReportData,
};

export interface CostOfSalesTotals {
  totalProducts: number;
  quantity: number;
  totalCost: number;
  avgUnitCost: number;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: number;
}

export interface GroupingLevels {
  brand: boolean;
  division: boolean;
  category: boolean;
  gender: boolean;
  article: boolean;
  variant: boolean;
}

export interface CostOfSalesTableRow {
  id: string;
  type: "brand" | "division" | "gender" | "category" | "article" | "variant";
  label?: string;
  sku?: string;
  size?: string;
  color?: string;
  barCode?: string;
  locationName?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  unitPrice?: number;
  totalRevenue?: number;
  grossProfit?: number;
  profitMargin?: number;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals?: {
    quantity: number;
    totalCost: number;
    avgUnitCost: number;
    totalRevenue: number;
    grossProfit: number;
    profitMargin: number;
  };
}
