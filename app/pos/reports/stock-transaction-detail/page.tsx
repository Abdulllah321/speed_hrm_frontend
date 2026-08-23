"use client";

import { StockTransactionDetailView } from "@/components/reports/stock-transaction-detail/stock-transaction-detail-view";

export default function PosStockTransactionDetailReportPage() {
    return <StockTransactionDetailView title="POS - Stock Transaction Detail Report" isPosLevel={true} />;
}
