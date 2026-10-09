import { getWarehouses } from "@/lib/actions/warehouse";
import { getLocations } from "@/lib/actions/location";
import { NewStockAdjustmentForm } from "./new-stock-adjustment-form";
import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function NewStockAdjustmentPage() {
    // Fetch warehouses and locations in parallel
    const [warehouses, locationsResult] = await Promise.all([
        getWarehouses(),
        getLocations(true),
    ]);

    const activeWarehouses = Array.isArray(warehouses)
        ? warehouses.filter((w) => w.isActive)
        : [];

    const locationsArray = Array.isArray(locationsResult) 
        ? locationsResult 
        : (locationsResult?.status && Array.isArray(locationsResult.data) ? locationsResult.data : []);

    const activeLocations = locationsArray.filter((l) => l.status === "active");

    return (
        <PermissionGuard permissions="erp.inventory.stock-ledger.read">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <NewStockAdjustmentForm
                    warehouses={activeWarehouses}
                    locations={locationsResult}
                />
            </div>
        </PermissionGuard>
    );
}
