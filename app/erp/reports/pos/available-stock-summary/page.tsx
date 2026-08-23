"use client";

import React from "react";
import { AvailableStockSummaryView } from "@/components/reports/available-stock-summary/available-stock-summary-view";

export default function ErpPosAvailableStockSummaryPage() {
    return <AvailableStockSummaryView title="Available Stock Summary (ERP POS)" isPosLevel={false} />;
}
