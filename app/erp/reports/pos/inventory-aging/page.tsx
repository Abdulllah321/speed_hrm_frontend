"use client";

import React from "react";
import { InventoryAgingView } from "@/components/reports/inventory-aging/inventory-aging-view";

export default function ErpPosInventoryAgingReportPage() {
  return <InventoryAgingView isPosLevel={false} />;
}
