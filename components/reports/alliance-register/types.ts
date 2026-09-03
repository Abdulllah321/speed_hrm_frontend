export interface AllianceRegisterRecord {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  retailPrice: number;
  retailWost: number;
  discount: number;
  sTax: number;
  netSale: number;
  cash: number;
  card: number;
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
  binNo: string;
  prefixCardNo: string;
  authId: string;
  cardNo: string;
  cardLast4: string;
  cardName: string;
  allianceOption: string;
  remarks: string;
  giftVoucherCode: string;
  giftVoucherAmt: number;
  creditCode: string;
  creditAmt: number;
  claimCode: string;
  claimAmt: number;
  corporateCode: string;
  corporateAmt: number;
  exchangeCode: string;
  exchangeAmt: number;
  creditVoucherIssued: string;
  creditVoucherIssuedAmt: number;
}

export interface AllianceRegisterTotals {
  count: number;
  retailPrice: number;
  retailWost: number;
  discount: number;
  sTax: number;
  netSale: number;
  cash: number;
  card: number;
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
  giftVoucherAmt: number;
  creditAmt: number;
  claimAmt: number;
  corporateAmt: number;
  exchangeAmt: number;
  creditVoucherIssuedAmt: number;
}

export interface AllianceRegisterReportData {
  records: AllianceRegisterRecord[];
  grandTotals: AllianceRegisterTotals;
  dateRange: { startDate?: string; endDate?: string };
  locationNames: string;
}
