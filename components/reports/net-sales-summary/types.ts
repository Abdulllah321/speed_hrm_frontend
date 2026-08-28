export interface NetSalesSummaryTotals {
  orderCount: number;
  unitPrice?: number;
  totalItemsSold: number;
  totalItemsReturned: number;
  netItems: number;
  retailSalesValue: number;
  wostAmount: number;
  discountAmount: number;
  valueExSalesTax: number;
  taxAmount: number;
  valueInclSalesTax: number;

  // Legacy field aliases
  grossSalesAmount: number;
  returnAmount: number;
  netSalesAmount: number;
}

export interface NetSalesSummaryLineItem {
  id: string;
  docNo?: string;
  docDate?: string;
  docMonth?: string;
  salesPerson?: string;
  taxRatePercent?: number;
  taxRateName?: string;
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
  unitPrice: number;
  soldQty: number;
  returnQty: number;
  netQty: number;
  retailSalesValue: number;
  wostAmount: number;
  discountAmount: number;
  valueExSalesTax: number;
  taxAmount: number;
  valueInclSalesTax: number;

  // Legacy field aliases
  grossAmount: number;
  returnAmount: number;
  netAmount: number;
}

export interface NetSalesSummaryFlatRecord {
  locationName: string;
  docNo?: string;
  docDate?: string;
  docMonth?: string;
  salesPerson?: string;
  taxRatePercent?: number;
  taxRateName?: string;
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
  unitPrice?: number;
  soldQty: number;
  returnQty: number;
  netQty: number;
  retailSalesValue?: number;
  wostAmount?: number;
  grossAmount: number;
  returnAmount: number;
  discountAmount: number;
  valueExSalesTax?: number;
  taxAmount: number;
  valueInclSalesTax?: number;
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
  month?: boolean;
  date?: boolean;
  document?: boolean;
  salesPerson?: boolean;
  taxRate?: boolean;
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
  level: string; // "location" | "month" | "date" | "document" | "salesPerson" | "taxRate" | "brand" | "division" | "category" | "gender" | "silhouette" | "article" | "variant"
  value: string;
  sku?: string;
  articleName?: string;
  color?: string;
  size?: string;
  barCode?: string;
  brandName?: string;
  unitPrice?: number;
  totals: NetSalesSummaryTotals;
  children: NetSalesSummaryTreeNode[];
}
