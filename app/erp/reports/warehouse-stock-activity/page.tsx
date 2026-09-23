"use client";

import { StockActivityView } from "@/components/reports/stock-activity/stock-activity-view";

export default function WarehouseStockActivityReportPage() {
  return (
    <StockActivityView
      isPosLevel={false}
      isWarehouseOnly={true}
      warehouseCode="C40001"
      title="Warehouse Stock Activity Report (C40001)"
    />
  );
}
