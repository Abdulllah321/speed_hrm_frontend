"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PosStockPositionReportPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/erp/reports/stock-position");
  }, [router]);
  return null;
}
