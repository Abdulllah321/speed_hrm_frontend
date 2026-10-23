"use client";

import { StockPositionView } from "@/components/reports/stock-position/stock-position-view";

export default function ErpStockPositionReportPage() {
  return <StockPositionView isPosLevel={false} title="Stock Position Report" />;
}
