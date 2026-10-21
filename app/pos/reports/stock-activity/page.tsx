"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PosStockActivityReportPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/erp/reports/stock-activity");
  }, [router]);
  return null;
}
