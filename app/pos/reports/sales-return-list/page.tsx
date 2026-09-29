"use client";

import React from "react";
import { SalesReturnListView } from "@/components/reports/sales-return-list/sales-return-list-view";

export default function PosSalesReturnListReportPage() {
  return <SalesReturnListView isPosLevel={true} />;
}
