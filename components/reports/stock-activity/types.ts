import {
  StockActivityBrandNode,
  StockActivityLocationNode,
  StockActivityFlatRecord,
  StockActivityReportData,
  StockActivityTotals,
} from "@/lib/actions/stock-activity";

export type {
  StockActivityBrandNode,
  StockActivityLocationNode,
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
  type: "location" | "brand" | "division" | "gender" | "category" | "article" | "variant";
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
