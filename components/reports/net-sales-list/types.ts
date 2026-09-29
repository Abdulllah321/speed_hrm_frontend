export type NetSalesDocType = "SALE" | "RETURN";
export type NetSalesFilterDocType = "ALL" | "SALES_ONLY" | "RETURNS_ONLY";
export type NetSalesListViewMode = "audit" | "standard" | "grid";

export interface NetSalesListTotals {
  totalDocuments: number;
  salesOrderCount: number;
  returnCount: number;

  totalItemsSold: number;
  totalItemsReturned: number;
  netItems: number;

  grossSalesAmount: number;
  grossReturnAmount: number;
  netGrossAmount: number;

  wostSalesAmount: number;
  wostReturnAmount: number;
  netWostAmount: number;

  discountSalesAmount: number;
  discountReturnAmount: number;
  netDiscountAmount: number;

  discountWostSalesAmount: number;
  discountWostReturnAmount: number;
  netDiscountWostAmount: number;

  amountAfterDiscount: number;

  taxSalesAmount: number;
  taxReturnAmount: number;
  netTaxAmount: number;

  netSalesAmount: number;
  netReturnAmount: number;
  totalNetAmount: number;

  cashSale: number;
  cashRefund: number;
  netCash: number;

  cardSale: number;
  cardRefund: number;
  netCard: number;

  creditSale: number;

  giftVoucherAmount: number;
  giftVoucherCorporate: number;

  exchangeVoucherRedeemed: number;
  exchangeVoucherIssued: number;
  netExchangeVoucher: number;

  creditVoucherRedeemed: number;
  creditVoucherIssued: number;
  netCreditVoucher: number;

  claimVoucherRedeemed: number;
  claimVoucherIssued: number;
  netClaimVoucher: number;

  rewardVoucherAmount: number;
}

export interface NetSalesListLineItem {
  id: string;
  docType: NetSalesDocType;
  docNumber: string;
  refDocNumber?: string;
  sku: string;
  barCode: string;
  description: string;
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  priceWost: number;
  valueExcl: number;
  discountPercent: number;
  discountAmount: number;
  discountAmountWost: number;
  amountAfterDiscount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  returnReason?: string;
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

export interface NetSalesListTenderDetails {
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
  exchangeIssued?: VoucherTenderInfo[];
  claimIssued?: VoucherTenderInfo[];
  cashReturn?: {
    amount?: number;
    reason?: string;
  };
  cashRefund?: number;
  cardRefund?: number;
}

export interface NetSalesListDocumentNode {
  id: string;
  docType: NetSalesDocType;
  docNumber: string;
  refDocNumber?: string;
  subTypeLabel: string;
  createdAt: string;
  locationId?: string;
  locationName: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  customerCnic?: string;
  customerCode?: string;
  paymentMethod: string;
  merchant?: string;
  fbrInvoiceNumber?: string;
  fbrStatus?: string;
  notes?: string;
  totals: {
    totalItems: number;
    grossAmount: number;
    wostAmount: number;
    discountAmount: number;
    discountWostAmount: number;
    amountAfterDiscount: number;
    taxAmount: number;
    netAmount: number;

    cashAmount: number;
    cardAmount: number;
    creditSaleAmount: number;
    giftVoucherAmount: number;
    exchangeVoucherAmount: number;
    creditVoucherAmount: number;
    claimVoucherAmount: number;
    rewardVoucherAmount: number;
    corporateVoucherAmount: number;
  };
  items: NetSalesListLineItem[];
  tenderDetails?: NetSalesListTenderDetails;
  discountDetails?: any;
}

export interface NetSalesListLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  documents: NetSalesListDocumentNode[];
  totals: NetSalesListTotals;
}

export interface NetSalesListFlatRecord {
  id: string;
  docType: NetSalesDocType;
  docNumber: string;
  refDocNumber?: string;
  subTypeLabel: string;
  docDate: string;
  locationName: string;
  locationId?: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  customerCnic?: string;
  customerCode?: string;
  paymentMethod: string;
  merchant?: string;
  fbrInvoiceNumber?: string;
  fbrStatus?: string;
  notes?: string;
  sku: string;
  barCode: string;
  description: string;
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  priceWost: number;
  valueExcl: number;
  discountPercent: number;
  discountAmount: number;
  discountAmountWost: number;
  amountAfterDiscount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  cashSale: number;
  cashRefund: number;
  cardSale: number;
  cardRefund: number;
  creditSale: number;
  giftVoucher: number;
  exchangeVoucher: number;
  creditVoucher: number;
  claimVoucher: number;
  rewardVoucher: number;
  returnReason?: string;
}

export interface NetSalesListReportData {
  reportType: "merged" | "separate";
  dateRange: { start?: string; end?: string };
  locationNames: string;
  locations: NetSalesListLocationNode[];
  grandTotals: NetSalesListTotals;
  documents: NetSalesListDocumentNode[];
  flatItems: NetSalesListFlatRecord[];
}

export interface NetSalesListFilterState {
  locationId: string;
  startDate?: string;
  endDate?: string;
  cashierUserId?: string;
  docTypeFilter: NetSalesFilterDocType;
  reportType: "merged" | "separate";
  search: string;
  paymentModeGroup?: string;
  minAmount?: number;
  maxAmount?: number;
  fbrOnly?: boolean;
  fiscalYear?: string;
  year?: number | string;
}

export type NetSalesListTableRow =
  | {
      type: "location-header";
      id: string;
      locationKey: string;
      locationName: string;
      totals: NetSalesListTotals;
      isExpanded: boolean;
    }
  | {
      type: "document-header";
      id: string;
      locationKey: string;
      document: NetSalesListDocumentNode;
      isExpanded: boolean;
    }
  | {
      type: "line-item";
      id: string;
      documentId: string;
      docType: NetSalesDocType;
      docNumber: string;
      item: NetSalesListLineItem;
    };
