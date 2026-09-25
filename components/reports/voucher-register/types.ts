export interface VoucherRegisterItem {
  id: string;
  voucherNumber: string;
  voucherType: string;
  dateTime: string;
  createdAtRaw?: string;
  companyName: string;
  companyGlCode: string;
  customerDetail: string;
  customerName?: string;
  customerPhone?: string;
  outletName: string;
  baseCashMemo: string;
  validTill: string;
  expiresAtRaw?: string | null;
  isExpired?: boolean;
  daysToExpiry?: number | null;
  discountAmount: number;
  faceValue: number;
  netValue: number;
  settledInCashMemo: string;
  settledDateTime: string;
  settledAmount: number;
  outstandingAmount: number;
  status: string; // 'ACTIVE', 'REDEEMED', 'EXPIRED'
  paymentMode?: string;
  merchantName?: string;
  slipNo?: string;
  cardholderName?: string;
  cardLast4?: string;
  description?: string;
  redemptionList?: Array<{
    orderNumber: string;
    amountUsed: number;
    dateTime: string;
  }>;
}

export interface VoucherRegisterTotals {
  totalVouchers: number;
  totalFaceValue: number;
  totalDiscount: number;
  totalNetValue: number;
  totalSettledAmount: number;
  totalOutstandingAmount: number;
  totalOutstandingCount: number;
  totalRedeemedCount: number;
  totalActiveCount: number;
  totalExpiredCount: number;
  typeBreakdown: Record<string, number>;
  typeBreakdownDetails?: Record<
    string,
    {
      count: number;
      faceValue: number;
      discount: number;
      settledAmount: number;
      outstandingAmount: number;
    }
  >;
  statusBreakdown?: Record<string, number>;
}

export interface VoucherRegisterReportData {
  items: VoucherRegisterItem[];
  kpis: {
    totalVouchers: number;
    totalAmount: number;
    totalDiscount: number;
    totalNetValue: number;
    totalSettledAmount: number;
    totalOutstandingAmount: number;
    totalOutstandingCount: number;
    totalRedeemedCount: number;
    totalActiveCount: number;
    totalExpiredCount: number;
    typeBreakdown: Record<string, number>;
    typeBreakdownDetails?: Record<
      string,
      {
        count: number;
        faceValue: number;
        discount: number;
        settledAmount: number;
        outstandingAmount: number;
      }
    >;
    statusBreakdown?: Record<string, number>;
  };
  startDate: string;
  endDate: string;
  asOfDate?: string;
  isOutstandingOnly?: boolean;
}

export type VoucherReportMode = "period" | "outstanding";

export interface VoucherTabConfig {
  id: string;
  label: string;
}
