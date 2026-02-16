import { getStockLedger } from "@/lib/actions/stock-ledger";
import { StockReceivedList } from "./stock-received-list";
import { ListError } from "@/components/dashboard/list-error";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { MovementType } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function StockReceivedPage() {
    try {
        const result = await getStockLedger({
            movementType: MovementType.INBOUND
        });

        // Handle potential backend errors or empty data
        if (!result || (result.status === false)) {
            return (
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Stock Received</h2>
                    </div>
                    <ListError
                        title="Failed to load stock received"
                        message={result?.message || "Unable to fetch stock transactions. Please check your connection and try again."}
                    />
                </div>
            );
        }

        const data = Array.isArray(result) ? result : (result.data || []);

        return (
            <PermissionGuard permissions={["inventory.read"]}>
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Stock Received</h2>
                    </div>

                    <StockReceivedList initialEntries={data} />
                </div>
            </PermissionGuard>
        );
    } catch (error) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Stock Received</h2>
                </div>
                <ListError
                    title="Failed to load stock received"
                    message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
                />
            </div>
        );
    }
}
