export interface NetSalesSummaryTotals {
  orderCount: number;
  totalItemsSold: number;
  totalItemsReturned: number;
  netItems: number;
  grossSalesAmount: number;
  returnAmount: number;
  discountAmount: number;
  taxAmount: number;
  netSalesAmount: number;
}

export interface NetSalesSummaryLineItem {
  id: string;
  sku: string;
  barCode: string;
  description: string;
  categoryName: string;
  brandName: string;
  divisionName?: string;
  genderName?: string;
  silhouetteName?: string;
  sizeName: string;
  colorName: string;
  soldQty: number;
  returnQty: number;
  netQty: number;
  grossAmount: number;
  returnAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
}

export interface NetSalesSummaryCategoryNode {
  categoryName: string;
  brandName: string;
  divisionName?: string;
  genderName?: string;
  silhouetteName?: string;
  totals: NetSalesSummaryTotals;
  items: NetSalesSummaryLineItem[];
}

export interface NetSalesSummaryLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  categories: NetSalesSummaryCategoryNode[];
  totals: NetSalesSummaryTotals;
}

export interface NetSalesSummaryFlatRecord {
  locationName: string;
  categoryName: string;
  brandName: string;
  divisionName?: string;
  genderName?: string;
  silhouetteName?: string;
  sku: string;
  barCode: string;
  description: string;
  sizeName: string;
  colorName: string;
  soldQty: number;
  returnQty: number;
  netQty: number;
  grossAmount: number;
  returnAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
}

export interface NetSalesSummaryReportData {
  reportType: "merged" | "separate";
  locations?: NetSalesSummaryLocationNode[];
  categories: NetSalesSummaryCategoryNode[];
  flatItems: NetSalesSummaryFlatRecord[];
  grandTotals: NetSalesSummaryTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export interface GroupingLevels {
  brand: boolean;
  division: boolean;
  category: boolean;
  gender: boolean;
  silhouette: boolean;
  article: boolean;
  variant: boolean;
  location?: boolean;
}

export interface NetSalesSummaryTableRow {
  id: string;
  type: "location" | "category" | "brand" | "division" | "gender" | "silhouette" | "article" | "item";
  label?: string;
  categoryName?: string;
  brandName?: string;
  divisionName?: string;
  genderName?: string;
  silhouetteName?: string;
  sku?: string;
  barCode?: string;
  description?: string;
  sizeName?: string;
  colorName?: string;
  soldQty?: number;
  returnQty?: number;
  netQty?: number;
  grossAmount?: number;
  returnAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  netAmount?: number;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals: NetSalesSummaryTotals;
}
