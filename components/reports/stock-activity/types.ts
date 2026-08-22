import {
  StockActivityBrandNode,
  StockActivityFlatRecord,
  StockActivityReportData,
  StockActivityTotals,
} from "@/lib/actions/stock-activity";

export type {
  StockActivityBrandNode,
  StockActivityFlatRecord,
  StockActivityReportData,
  StockActivityTotals,
};

export interface GroupingLevels {
  brand: boolean;
  division: boolean;
  category: boolean;
  gender: boolean;
  article: boolean;
  variant: boolean;
}

export interface StockActivityTableRow {
  id: string;
  type: "brand" | "division" | "gender" | "category" | "article" | "variant";
  label?: string;
  sku?: string;
  size?: string;
  color?: string;
  barCode?: string;
  locationName?: string;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals: StockActivityTotals;
}
