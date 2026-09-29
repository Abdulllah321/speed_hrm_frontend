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
      redeemedCount?: number;
      outstandingCount?: number;
      activeCount?: number;
      expiredCount?: number;
    }
  >;
  statusBreakdown?: Record<string, number>;
}

export interface VoucherRegisterReportData {
  items: VoucherRegisterItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
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
        redeemedCount?: number;
        outstandingCount?: number;
        activeCount?: number;
        expiredCount?: number;
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

/**
 * Returns the current Fiscal Year date range (01-Jul to 30-Jun).
 * In Pakistan / standard accounting FY, if month is July-Dec (months 6-11), FY starts July 1 of current year.
 * If month is Jan-June (months 0-5), FY started July 1 of previous year.
 */
export function getCurrentFiscalYearRange(): { from: Date; to: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = Jul
  const startYear = currentMonth >= 6 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  return {
    from: new Date(startYear, 6, 1, 0, 0, 0, 0), // July 1st 00:00:00
    to: new Date(endYear, 5, 30, 23, 59, 59, 999), // June 30th 23:59:59
  };
}
