export interface GrossSalesSummaryTotals {
  orderCount: number;
  totalItems: number;
  unitPrice?: number;
  priceWost?: number;
  grossAmount: number;
  wostAmount: number;
  discountAmount: number;
  valueExSalesTax: number;
  taxAmount: number;
  valueInclSalesTax: number;
  netAmount: number;
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
  wostAmount: number;
  discountAmount: number;
  taxAmount: number;
  subTotal: number;
}

export interface GrossSalesSummaryFlatRecord {
  locationId?: string;
  cashierUserId?: string;
  createdAt?: string | Date;
  orderNumber?: string;
  fbrInvoiceNumber?: string;
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
  wostAmount: number;
  discountAmount: number;
  taxAmount: number;
  subTotal: number;
}

export interface GrossSalesSummaryReportData {
  reportType: "merged" | "separate";
  categories?: any[];
  flatItems: GrossSalesSummaryFlatRecord[];
  grandTotals: GrossSalesSummaryTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export interface GroupingLevels {
  brand: boolean;
  division: boolean;
  category: boolean;
  silhouette: boolean;
  article: boolean;
  variant: boolean;
  gender?: boolean;
  location?: boolean;
  month?: boolean;
  date?: boolean;
  document?: boolean;
  salesPerson?: boolean;
  taxRate?: boolean;
}

export interface GrossSalesSummaryTreeNode {
  level: string; // "location" | "month" | "date" | "document" | "salesPerson" | "taxRate" | "brand" | "division" | "category" | "silhouette" | "gender" | "article" | "variant"
  value: string;
  sku?: string;
  orderNumber?: string;
  fbrInvoiceNumber?: string;
  articleName?: string;
  color?: string;
  size?: string;
  barCode?: string;
  brandName?: string;
  unitPrice?: number;
  totals: GrossSalesSummaryTotals;
  children: GrossSalesSummaryTreeNode[];
}
