import { authFetch } from "@/lib/auth";
import {
  InventoryAgingRecord,
  InventoryAgingTotals,
  LocationHeader,
  WarehouseHeader,
} from "@/components/reports/inventory-aging/types";

export interface InventoryAgingReportData {
  flatItemsList: InventoryAgingRecord[];
  grandTotals: InventoryAgingTotals;
  locations: LocationHeader[];
  warehouses: WarehouseHeader[];
}

export async function queueInventoryAgingPreview(params: {
  locationId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  reportType?: "merged" | "separate";
}) {
  try {
    const res = await authFetch("/stock-ledger/inventory-aging/queue", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res?.data ?? { status: false, message: "No response from server" };
  } catch (error: any) {
    return { status: false, message: error.message || "Failed to queue inventory aging calculation" };
  }
}

export async function getInventoryAgingResult(jobId: string) {
  try {
    const res = await authFetch(`/stock-ledger/inventory-aging/result/${jobId}`, {
      method: "GET",
    });
    return res?.data ?? { status: false, message: "No response from server" };
  } catch (error: any) {
    return { status: false, message: error.message || "Failed to fetch inventory aging result" };
  }
}

export async function registerInventoryAgingClientExport(formData: FormData) {
  try {
    const res = await authFetch("/stock-ledger/inventory-aging/export/register-client-export", {
      method: "POST",
      body: formData,
    });
    return res?.data ?? { status: false, message: "No response from server" };
  } catch (error: any) {
    return { status: false, message: error.message || "Failed to register export record" };
  }
}
