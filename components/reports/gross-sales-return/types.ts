export interface GrossSalesReturnTotals {
  returnCount: number;
  totalItems: number;
  unitPrice?: number;
  priceWost?: number;
  grossAmount: number;
  wostAmount: number;
  discountAmount: number;
  discountWostAmount?: number;
  amountAfterDiscount?: number;
  valueExSalesTax: number;
  taxAmount: number;
  valueInclSalesTax: number;
  netAmount: number;
  cashAmount?: number;
  cardAmount?: number;
  voucherAmount?: number;
}

export interface GrossSalesReturnLineItem {
  id: string;
  returnNumber: string;
  orderNumber: string;
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
  discountWostAmount?: number;
  amountAfterDiscount?: number;
  taxAmount: number;
  subTotal: number;
}

export interface GrossSalesReturnNode {
  id: string;
  returnNumber: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  cashierName: string;
  paymentMethod: string;
  fbrInvoiceNumber: string;
  fbrStatus: string;
  totals: GrossSalesReturnTotals;
  items: GrossSalesReturnLineItem[];
}

export interface GrossSalesReturnLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  returns: GrossSalesReturnNode[];
  totals: GrossSalesReturnTotals;
}

export interface GrossSalesReturnFlatRecord {
  locationId?: string;
  cashierUserId?: string;
  locationName: string;
  returnNumber: string;
  orderNumber: string;
  returnDate: string;
  cashierName: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  fbrInvoiceNumber: string;
  fbrStatus: string;
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
  discountWostAmount?: number;
  amountAfterDiscount?: number;
  taxAmount: number;
  subTotal: number;
  returnGrossAmount: number;
  returnWostAmount?: number;
  returnDiscountAmount: number;
  returnDiscountWostAmount?: number;
  returnNetAmount: number;
  returnTaxAmount: number;
}

export interface GrossSalesReturnReportData {
  reportType: "merged" | "separate";
  locations?: GrossSalesReturnLocationNode[];
  returns: GrossSalesReturnNode[];
  flatItems: GrossSalesReturnFlatRecord[];
  grandTotals: GrossSalesReturnTotals;
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
  returnNote?: boolean;
  item?: boolean;
}

export interface GrossSalesReturnTreeNode {
  level: string; // "location" | "month" | "date" | "document" | "salesPerson" | "taxRate" | "brand" | "division" | "category" | "silhouette" | "gender" | "article" | "variant"
  value: string;
  sku?: string;
  returnNumber?: string;
  orderNumber?: string;
  fbrInvoiceNumber?: string;
  articleName?: string;
  color?: string;
  size?: string;
  barCode?: string;
  brandName?: string;
  unitPrice?: number;
  totals: GrossSalesReturnTotals;
  children: GrossSalesReturnTreeNode[];
}

export interface GrossSalesReturnTableRow {
  id: string;
  type: "location" | "returnNote" | "item";
  label?: string;
  returnNumber?: string;
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  paymentMethod?: string;
  fbrInvoiceNumber?: string;
  fbrStatus?: string;
  sku?: string;
  barCode?: string;
  description?: string;
  categoryName?: string;
  brandName?: string;
  divisionName?: string;
  genderName?: string;
  silhouetteName?: string;
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
  totals: GrossSalesReturnTotals;
}
