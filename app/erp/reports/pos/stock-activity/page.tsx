"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ErpPosStockActivityReportPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/erp/reports/stock-activity");
  }, [router]);
  return null;
}
