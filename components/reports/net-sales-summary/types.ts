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

export interface NetSalesSummaryTreeNode {
  level: string; // "location" | "brand" | "division" | "category" | "gender" | "silhouette" | "article" | "variant"
  value: string;
  sku?: string;
  articleName?: string;
  color?: string;
  size?: string;
  barCode?: string;
  brandName?: string;
  totals: NetSalesSummaryTotals;
  children: NetSalesSummaryTreeNode[];
}
