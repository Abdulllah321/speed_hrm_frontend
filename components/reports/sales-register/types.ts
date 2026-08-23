export interface SalesRegisterTotals {
  orderCount: number;
  totalItems: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  paidAmount: number;
  cashAmount: number;
  cardAmount: number;
  walletAmount: number;
  creditAmount: number;
}

export interface SalesRegisterLineItem {
  id: string;
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

export interface SalesRegisterInvoiceNode {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  cashierName: string;
  paymentMethod: string;
  fbrInvoiceNumber: string;
  fbrStatus: string;
  totals: SalesRegisterTotals;
  items: SalesRegisterLineItem[];
}

export interface SalesRegisterLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  invoices: SalesRegisterInvoiceNode[];
  totals: SalesRegisterTotals;
}

export interface SalesRegisterFlatRecord {
  locationName: string;
  orderNumber: string;
  orderDate: string;
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
  orderGrossAmount: number;
  orderDiscountAmount: number;
  orderNetAmount: number;
  orderTaxAmount: number;
}

export interface SalesRegisterReportData {
  reportType: "merged" | "separate";
  locations?: SalesRegisterLocationNode[];
  invoices: SalesRegisterInvoiceNode[];
  flatItems: SalesRegisterFlatRecord[];
  grandTotals: SalesRegisterTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export interface GroupingLevels {
  location: boolean;
  invoice: boolean;
  item: boolean;
}

export interface SalesRegisterTableRow {
  id: string;
  type: "location" | "invoice" | "item";
  label?: string;
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
  totals: SalesRegisterTotals;
}
