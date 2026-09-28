export type ReturnSubType = 'EXCHANGE_SR' | 'REFUND_RF' | 'CLAIM_CLM' | 'ALL';

export interface SalesReturnTotals {
  returnCount: number;
  totalItems: number;
  grossAmount: number;
  wostAmount: number;
  discountAmount: number;
  discountWostAmount: number;
  amountAfterDiscount: number;
  taxAmount: number;
  netAmount: number;
  cashRefund: number;
  cardRefund: number;
  voucherIssuedAmount: number;
  exchangeVoucherAmount: number;
  creditVoucherAmount: number;
  claimVoucherAmount: number;
  rewardVoucherAmount: number;
}

export interface SalesReturnCustomerDetails {
  id?: string;
  name: string;
  phone?: string;
  cnic?: string;
  code?: string;
  email?: string;
  address?: string;
}

export interface SalesReturnVoucherDetails {
  id?: string;
  code: string;
  voucherType: string;
  faceValue: number;
  isRedeemed?: boolean;
  description?: string;
}

export interface SalesReturnLineItem {
  id: string;
  returnNumber: string;
  originalOrderNumber?: string;
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

export interface SalesReturnNode {
  id: string;
  returnNumber: string;
  originalOrderNumber: string;
  createdAt: string;
  subType: 'EXCHANGE_SR' | 'REFUND_RF' | 'CLAIM_CLM';
  subTypeLabel: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerCode?: string;
  cashierName: string;
  cashierUserId?: string;
  locationId?: string;
  locationName?: string;
  refundMode: string;
  reason?: string;
  claimStatus?: string;
  voucherCode?: string;
  voucherAmount?: number;
  totals: SalesReturnTotals;
  items: SalesReturnLineItem[];
  customerDetails?: SalesReturnCustomerDetails;
  voucherDetails?: SalesReturnVoucherDetails;
}

export interface SalesReturnLocationNode {
  locationKey: string;
  locationId?: string;
  locationName: string;
  returns: SalesReturnNode[];
  totals: SalesReturnTotals;
}

export interface SalesReturnFlatRecord {
  id: string;
  returnNumber: string;
  originalOrderNumber: string;
  returnDate: string;
  subType: 'EXCHANGE_SR' | 'REFUND_RF' | 'CLAIM_CLM';
  subTypeLabel: string;
  locationName: string;
  locationId?: string;
  cashierName: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerCode?: string;
  refundMode: string;
  returnReason: string;
  claimStatus?: string;
  voucherCode: string;
  voucherAmount: number;
  voucherType?: string;
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
  cashRefund: number;
  cardRefund: number;
  voucherIssuedAmount: number;
}

export interface SalesReturnListReportData {
  reportType: 'merged' | 'separate';
  locations?: SalesReturnLocationNode[];
  returns: SalesReturnNode[];
  flatItems?: SalesReturnFlatRecord[];
  grandTotals: SalesReturnTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}

export type SalesReturnMatrixRow =
  | {
      type: 'subType-header';
      id: string;
      subType: 'EXCHANGE_SR' | 'REFUND_RF' | 'CLAIM_CLM';
      subTypeLabel: string;
      itemCount: number;
      totals: SalesReturnTotals;
      isExpanded: boolean;
      depth: number;
    }
  | {
      type: 'location-header';
      id: string;
      locationKey: string;
      locationName: string;
      itemCount: number;
      totals: SalesReturnTotals;
      isExpanded: boolean;
      depth: number;
    }
  | {
      type: 'return-row';
      id: string;
      data: SalesReturnNode;
      isExpanded: boolean;
      depth: number;
    }
  | {
      type: 'item-row';
      id: string;
      data: SalesReturnLineItem;
      parentReturn: SalesReturnNode;
      depth: number;
    };
