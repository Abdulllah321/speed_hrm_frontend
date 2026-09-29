export type SalesListViewMode = "audit" | "standard" | "grid";

export interface SalesListTotals {
  orderCount: number;
  totalItems: number;
  grossAmount: number;
  wostAmount?: number;
  discountAmount: number;
  discountWostAmount?: number;
  amountAfterDiscount?: number;
  netAmount: number;
  taxAmount: number;
  paidAmount: number;
  cashAmount: number;
  cardAmount: number;
  walletAmount: number;
  creditAmount: number;
  // Breakdown columns (11 distinct channels)
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
}

export interface SalesListDiscountDetails {
  hasOverrideDiscount: boolean;
  overrideDiscountItemsCount: number;
  overrideDiscountNotes?: string[];
  overrideDiscountPercents?: number[];
  hasManualDiscount: boolean;
  manualDiscountType?: 'PERCENT' | 'FLAT_PKR' | 'MIXED';
  manualDiscountPercent?: number;
  manualDiscountAmount?: number;
  manualDiscountNote?: string;
  alliance?: {
    partnerName: string;
    code: string;
    discountPercent: number;
    description?: string;
  };
  promo?: {
    name: string;
    code: string;
    type: string;
    value: number;
  };
  coupon?: {
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
  };
  retailDiscount: number;
  wostDiscount: number;
}

export interface SalesListCustomerDetails {
  id?: string;
  name: string;
  phone?: string;
  cnic?: string;
  code?: string;
  email?: string;
  address?: string;
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
  priceWost: number;
  valueExcl?: number;
  discountPercent: number;
  discountAmount: number;
  discountAmountWost: number;
  amountAfterDiscount?: number;
  hasOverrideDiscount: boolean;
  overrideDiscountPercent?: number;
  overrideDiscountNote?: string;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  subTotal?: number;
  valueIncl?: number;
}

export interface CardTenderInfo {
  merchant?: string;
  cardholderName?: string;
  cardLast4?: string;
  authId?: string;
  binNo?: string;
  amount?: number;
}

export interface VoucherTenderInfo {
  code: string;
  amount: number;
  description?: string;
  companyName?: string;
  remarks?: string;
  voucherType?: string;
  paymentMode?: string;
  cardholderName?: string;
  cardLast4?: string;
  slipNo?: string;
}

export interface SalesListTenderDetails {
  card?: CardTenderInfo;
  giftVouchers?: VoucherTenderInfo[];
  exchangeVouchers?: VoucherTenderInfo[];
  claimVouchers?: VoucherTenderInfo[];
  creditVouchers?: VoucherTenderInfo[];
  corporateVouchers?: VoucherTenderInfo[];
  rewardVouchers?: VoucherTenderInfo[];
  creditSale?: {
    customerName?: string;
    customerPhone?: string;
    balance?: number;
  };
  creditIssued?: VoucherTenderInfo[];
  cashReturn?: {
    amount?: number;
    reason?: string;
  };
}

export interface SalesListInvoiceNode {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerCode?: string;
  cashierName: string;
  cashierUserId?: string;
  locationId?: string;
  locationName?: string;
  paymentMethod: string;
  merchant?: string;
  fbrInvoiceNumber: string;
  fbrStatus: string;
  notes?: string;
  totals: SalesListTotals;
  items: SalesListLineItem[];
  discountDetails?: SalesListDiscountDetails;
  customerDetails?: SalesListCustomerDetails;
  tenderDetails?: SalesListTenderDetails;
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
  customerCnic?: string;
  customerCode?: string;
  paymentMethod: string;
  merchant?: string;
  fbrInvoiceNumber: string;
  fbrStatus: string;
  orderNotes?: string;
  sku: string;
  barCode: string;
  description: string;
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  priceWost?: number;
  valueExcl?: number;
  discountPercent?: number;
  discountAmount: number;
  discountAmountWost?: number;
  amountAfterDiscount?: number;
  hasOverrideDiscount?: boolean;
  overrideDiscountPercent?: number;
  overrideDiscountNote?: string;
  manualDiscountNote?: string;
  manualDiscountType?: string;
  manualDiscountPercent?: number;
  manualDiscountAmount?: number;
  alliancePartner?: string;
  allianceCode?: string;
  promoCode?: string;
  couponCode?: string;
  voucherCodes?: string;
  cardLast4?: string;
  cardSlipNo?: string;
  taxAmount?: number;
  subTotal: number;
  valueIncl?: number;
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
  customerCnic?: string;
  customerCode?: string;
  cashierName?: string;
  paymentMethod?: string;
  merchant?: string;
  fbrInvoiceNumber?: string;
  fbrStatus?: string;
  notes?: string;
  sku?: string;
  barCode?: string;
  description?: string;
  sizeName?: string;
  colorName?: string;
  quantity?: number;
  unitPrice?: number;
  priceWost?: number;
  valueExcl?: number;
  discountPercent?: number;
  discountAmount?: number;
  discountAmountWost?: number;
  amountAfterDiscount?: number;
  hasOverrideDiscount?: boolean;
  overrideDiscountPercent?: number;
  overrideDiscountNote?: string;
  taxPercent?: number;
  taxAmount?: number;
  subTotal?: number;
  valueIncl?: number;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  nodeId?: string;
  totals: SalesListTotals;
  discountDetails?: SalesListDiscountDetails;
  customerDetails?: SalesListCustomerDetails;
  tenderDetails?: SalesListTenderDetails;
  items?: SalesListLineItem[];
}
