"use client";

import { StockActivityView } from "@/components/reports/stock-activity/stock-activity-view";

export default function PosStockActivityReportPage() {
  return <StockActivityView isPosLevel={true} />;
}
