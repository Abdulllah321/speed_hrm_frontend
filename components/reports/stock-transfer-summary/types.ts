export interface TransferItemRecord {
    id: string;
    itemId: string;
    sku: string;
    articleName: string;
    barCode: string;
    brand: string;
    division: string;
    category: string;
    gender: string;
    silhouette: string;
    size: string;
    color: string;
    sentQty: number;
    receivedQty: number;
    pendingQty: number;
    unitCost: number;
    unitPrice: number;
    totalCost: number;
    totalRetail: number;
}

export interface TransferRecord {
    id: string;
    requestNo: string;
    outboundNo?: string;
    inboundNo?: string;
    receiptNo?: string | null;
    transferType: string;
    status: string;
    requestDate: string;
    expectedDate?: string | null;
    createdAt: string;
    updatedAt: string;
    sourceName: string;
    sourceCode?: string;
    sourceType: "Warehouse" | "Outlet";
    destinationName: string;
    destinationCode?: string;
    destinationType: "Warehouse" | "Outlet";
    fromWarehouseId?: string | null;
    toWarehouseId?: string | null;
    fromLocationId?: string | null;
    toLocationId?: string | null;
    creatorName?: string | null;
    createdById?: string | null;
    checkerName?: string | null;
    checkedById?: string | null;
    checkedAt?: string | null;
    authorizerName?: string | null;
    authorizedById?: string | null;
    authorizedAt?: string | null;
    sourceApprovedByName?: string | null;
    sourceApprovedById?: string | null;
    sourceApprovedAt?: string | null;
    acceptedByName?: string | null;
    acceptedById?: string | null;
    acceptedAt?: string | null;
    dispatchType?: string | null;
    courierName?: string | null;
    trackingNumber?: string | null;
    dispatchDate?: string | null;
    estimatedDeliveryDate?: string | null;
    riderName?: string | null;
    riderPhone?: string | null;
    vehicleNumber?: string | null;
    receiverPerson?: string | null;
    shippingCost?: number;
    dispatchNotes?: string | null;
    notes?: string | null;
    requisitionNo?: string | null;
    totalSentQty: number;
    totalReceivedQty: number;
    totalPendingQty: number;
    totalCostValue: number;
    totalRetailValue: number;
    itemCount: number;
    items: TransferItemRecord[];
}

export interface TransferGrandTotals {
    totalTransfers: number;
    totalItems: number;
    totalSentQty: number;
    totalReceivedQty: number;
    totalPendingQty: number;
    totalCostValue: number;
    totalRetailValue: number;
    statusCounts: {
        completed: number;
        pending: number;
        inTransit: number;
        cancelled: number;
    };
    typeCounts: {
        warehouseToOutlet: number;
        outletToWarehouse: number;
        outletToOutlet: number;
        warehouseToWarehouse: number;
        other?: number;
    };
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
