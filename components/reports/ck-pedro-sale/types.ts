export interface CkPedroReportRecord {
  country: string;
  date: string;
  location: string;
  article: string;
  barCode: string;
  soldQty: number;
  unitCost: number;
  grossPrice: number;
  netPrice: number;
  netpriceSGD: number;
  transactionID: string;
  staffID: number | string;
  emp_Code: number | string;
  column1: string;
  column2: string;
  price_W_O_T: number;
  total_Price_W_O_T: number;
  discountAmount: number;
  valueExSalesTax: number;
  salesTax: number;
  additionalSalesTax: number;
  totalSalesTax: number;
  valueInclSalesTax: number;
}

export interface CkPedroReportTotals {
  totalRecords: number;
  totalSoldQty: number;
  totalPriceWOT: number;
  totalDiscount: number;
  totalValueExSalesTax: number;
  totalSalesTax: number;
  totalValueInclSalesTax: number;
}

