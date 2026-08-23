export interface GrossSalesSummaryTotals {
  orderCount: number;
  totalItems: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
}

export interface GrossSalesSummaryLineItem {
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
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  subTotal: number;
}

export interface GrossSalesSummaryFlatRecord {
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
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  subTotal: number;
}

export interface GrossSalesSummaryReportData {
  reportType: "merged" | "separate";
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
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

export interface GrossSalesSummaryTreeNode {
  level: string; // "location" | "brand" | "division" | "category" | "gender" | "silhouette" | "article" | "variant"
  value: string;
  sku?: string;
  articleName?: string;
  color?: string;
  size?: string;
  barCode?: string;
  brandName?: string;
  totals: GrossSalesSummaryTotals;
  children: GrossSalesSummaryTreeNode[];
}
