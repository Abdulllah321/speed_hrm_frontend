export interface FlatItemRecord {
    locationId?: string | null;
    warehouseId?: string | null;
    locationName: string;
    locationType?: 'OUTLET' | 'WAREHOUSE';
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
    bf: number;
    inbound: number;
    outbound: number;
    quantity: number; // Available stock
    transit: number;
    reserved: number;
    total: number; // Total balance = quantity + transit + reserved
    unitPrice: number;
    value: number;
    unitCost: number;
    costingValue: number;
}

export interface GroupingLevels {
    brand: boolean;
    division: boolean;
    category: boolean;
    gender: boolean;
    silhouette: boolean;
    article: boolean;
    variant: boolean;
}

export interface StockTotals {
    quantity: number;
    transit: number;
    reserved: number;
    total: number;
    unitPrice: number;
    value: number;
    unitCost: number;
    costingValue: number;
}

export interface TreeNode {
    level: string;
    value: string;
    sku?: string;
    articleName?: string;
    color?: string;
    size?: string;
    barCode?: string;
    totals: StockTotals;
    children: TreeNode[];
}
