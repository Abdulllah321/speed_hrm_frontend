"use client";

import React from "react";
import { SalesRegisterView } from "@/components/reports/sales-register/sales-register-view";

export default function PosSalesRegisterReportPage() {
  return <SalesRegisterView isPosLevel={true} />;
}
