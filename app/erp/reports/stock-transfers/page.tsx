"use client";

import React from "react";
import { StockTransferSummaryView } from "@/components/reports/stock-transfer-summary/stock-transfer-summary-view";

export default function ErpStockTransfersReportPage() {
    return <StockTransferSummaryView title="Stock Transfer Movement & Status Report" isPosLevel={false} />;
}
