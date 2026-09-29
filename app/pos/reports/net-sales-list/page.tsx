"use client";

import React from "react";
import { NetSalesListView } from "@/components/reports/net-sales-list/net-sales-list-view";

export default function PosNetSalesListPage() {
  return <NetSalesListView isPosLevel={true} />;
}
