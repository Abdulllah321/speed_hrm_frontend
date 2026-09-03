export interface SalesListTotals {
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
  // 12 requested breakdown fields
  cashSale: number;
  cashReturn: number;
  cardSale: number;
  creditSale: number;
  giftVoucherAmount: number;
  creditVoucherAmount: number;
  exchangeVoucherAmount: number;
  claimVoucherAmount: number;
  giftVoucherCorporate: number;
  creditVoucherIssuedAmount: number;
  rewardVoucherAmount: number;
  onCreditAmount: number;
}

export interface SalesListLineItem {
  id: string;
  orderNumber: string;
  sku: string;
  barCode: string;
  description: string;
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subTotal: number;
}

export interface SalesListInvoiceNode {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  cashierName: string;
  paymentMethod: string;
  fbrInvoiceNumber: string;
  fbrStatus: string;
  totals: SalesListTotals;
  items: SalesListLineItem[];
}

export interface SalesListLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  invoices: SalesListInvoiceNode[];
  totals: SalesListTotals;
}

export interface SalesListFlatRecord {
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
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subTotal: number;
  orderGrossAmount: number;
  orderDiscountAmount: number;
  orderNetAmount: number;
  orderTaxAmount: number;
  cashSale: number;
  cashReturn: number;
  cardSale: number;
  creditSale: number;
  giftVoucherAmount: number;
  creditVoucherAmount: number;
  exchangeVoucherAmount: number;
  claimVoucherAmount: number;
  giftVoucherCorporate: number;
  creditVoucherIssuedAmount: number;
  rewardVoucherAmount: number;
  onCreditAmount: number;
}

export interface SalesListReportData {
  reportType: "merged" | "separate";
  locations?: SalesListLocationNode[];
  invoices: SalesListInvoiceNode[];
  flatItems: SalesListFlatRecord[];
  grandTotals: SalesListTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export interface GroupingLevels {
  location: boolean;
  invoice: boolean;
  item: boolean;
}

export interface SalesListTableRow {
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
  sizeName?: string;
  colorName?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  subTotal?: number;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals: SalesListTotals;
}
