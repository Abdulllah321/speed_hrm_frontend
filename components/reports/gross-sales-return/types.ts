export interface GrossSalesReturnTotals {
  returnCount: number;
  totalItems: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  cashAmount: number;
  cardAmount: number;
  voucherAmount: number;
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
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
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
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  subTotal: number;
  returnGrossAmount: number;
  returnDiscountAmount: number;
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
  location: boolean;
  returnNote: boolean;
  item: boolean;
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
