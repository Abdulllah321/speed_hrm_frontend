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

export interface GrossSalesSummaryCategoryNode {
  categoryName: string;
  brandName: string;
  divisionName?: string;
  genderName?: string;
  silhouetteName?: string;
  totals: GrossSalesSummaryTotals;
  items: GrossSalesSummaryLineItem[];
}

export interface GrossSalesSummaryLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  categories: GrossSalesSummaryCategoryNode[];
  totals: GrossSalesSummaryTotals;
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
  locations?: GrossSalesSummaryLocationNode[];
  categories: GrossSalesSummaryCategoryNode[];
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

export interface GrossSalesSummaryTableRow {
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
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
  subTotal?: number;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals: GrossSalesSummaryTotals;
}
