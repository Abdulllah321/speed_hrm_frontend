import {
  StockPositionBrandNode,
  StockPositionDivisionNode,
  StockPositionCategoryNode,
  StockPositionGenderNode,
  StockPositionProductNode,
  StockPositionVariantItem,
  StockPositionFlatRecord,
  StockPositionReportData,
  StockPositionTotals,
} from "@/lib/actions/stock-position";

export type {
  StockPositionBrandNode,
  StockPositionDivisionNode,
  StockPositionCategoryNode,
  StockPositionGenderNode,
  StockPositionProductNode,
  StockPositionVariantItem,
  StockPositionFlatRecord,
  StockPositionReportData,
  StockPositionTotals,
};

export interface GroupingLevels {
  brand: boolean;
  division: boolean;
  category: boolean;
  gender: boolean;
  article: boolean;
  variant: boolean;
}

export interface StockPositionTableRow {
  id: string;
  type: "brand" | "division" | "category" | "gender" | "article" | "variant";
  label?: string;
  brand?: string;
  sku?: string;
  itemName?: string;
  barCode?: string;
  size?: string;
  color?: string;
  division?: string;
  department?: string;
  productCategory?: string;
  silhouette?: string;
  class?: string;
  subclass?: string;
  season?: string;
  oldSeason?: string;
  gender?: string;
  case?: string;
  band?: string;
  movementType?: string;
  heelHeight?: string;
  width?: string;
  channelClass?: string;
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
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals: StockPositionTotals;
}
