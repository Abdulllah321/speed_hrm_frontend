"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ErpPosStockPositionReportPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/erp/reports/stock-position");
  }, [router]);
  return null;
}
