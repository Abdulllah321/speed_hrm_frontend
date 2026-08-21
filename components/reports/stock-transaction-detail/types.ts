export interface TransactionRecord {
    id: string;
    date: string;
    docType: string;
    docRef: string;
    docRefId?: string;
    remarks: string;
    inQty: number;
    outQty: number;
    isInTransit?: boolean;
    runningBalance?: number;
}

export interface FlatItemRecord {
    itemId: string;
    brand: string;
    division: string;
    category: string;
    gender: string;
    silhouette: string;
    sku: string;
    articleName: string;
    color: string;
    size: string;
    barCode: string;
    openingBalance: number;
    inQty: number;
    outQty: number;
    inTransitQty: number;
    closingBalance: number;
    transactions: TransactionRecord[];
}

export interface TransactionTotals {
    totalItems: number;
    openingBalance: number;
    totalInQty: number;
    totalOutQty: number;
    inTransitQty: number;
    closingBalance: number;
}

export interface AttributeOptions {
    brands: string[];
    divisions: string[];
    categories: string[];
    genders: string[];
    silhouettes: string[];
    sizes: string[];
    colors: string[];
}
