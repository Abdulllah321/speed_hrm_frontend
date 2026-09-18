export interface WholesaleReturnTotals {
  ReturnCount?: number;
  totalItems: number;
  grossAmount: number;
  wostAmount: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  addTaxAmount: number;
  taxPayable: number;
}

export interface WholesaleReturnLineItem {
  id: string;
  sku: string;
  barCode: string;
  description: string;
  categoryName: string;
  brandName: string;
  divisionName: string;
  genderName: string;
  silhouetteName: string;
  sizeName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  wostAmount: number;
  discountAmount: number;
  taxAmount: number;
  addTaxAmount: number;
  taxPayable: number;
  subTotal: number;
}

export interface WholesaleReturnFlatRecord {
  customerId: string;
  customerName: string;
  customerPhone: string;
  returnNumber: string;
  returnDate: string;
  status: string;
  categoryName: string;
  brandName: string;
  divisionName: string;
  genderName: string;
  silhouetteName: string;
  sku: string;
  description: string;
  sizeName: string;
  colorName: string;
  taxRate: number;
  quantity: number;
  unitPrice: number;
  wostAmount: number;
  discountAmount: number;
  taxAmount: number;
  addTaxAmount: number;
  taxPayable: number;
  subTotal: number;
}

export interface WholesaleReturnRegisterData {
  reportType: "merged" | "separate";
  customers?: any[];
  flatItems: WholesaleReturnFlatRecord[];
  grandTotals: WholesaleReturnTotals;
  dateRange: { startDate?: string; endDate?: string };
}

export interface GroupingLevels {
  month: boolean;
  date: boolean;
  document: boolean;
  salesPerson: boolean;
  taxRate: boolean;
  customer: boolean;
  document: boolean;
  brand: boolean;
  division: boolean;
  category: boolean;
  gender: boolean;
  silhouette: boolean;
  product: boolean;
  variant: boolean;
}

export interface WholesaleReturnTreeNode {
  level: string; // "customer" | "Return" | "category" | "product" | "variant"
  value: string;
  
  // Specific fields based on level
  customerId?: string;
  customerName?: string;
  returnNumber?: string;
  returnDate?: string;
  categoryName?: string;
  brandName?: string;
  sku?: string;
  description?: string;
  color?: string;
  size?: string;
  unitPrice?: number;
  
  totals: WholesaleReturnTotals;
  children: WholesaleReturnTreeNode[];
}
