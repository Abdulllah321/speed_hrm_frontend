import { getStockLedger } from "@/lib/actions/stock-ledger";
import { StockReceivedList } from "./stock-received-list";
import { ListError } from "@/components/dashboard/list-error";
import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function StockLedgerPage() {
    try {
        const result = await getStockLedger({ page: 1, limit: 50 });

        if (!result || result.status === false) {
            return (
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <h2 className="text-3xl font-bold tracking-tight">Stock Ledger</h2>
                    <ListError
                        title="Failed to load stock ledger"
                        message={result?.message || "Unable to fetch stock transactions. Please check your connection and try again."}
                    />
                </div>
            );
        }

        const data = Array.isArray(result) ? result : (result.data ?? []);
        const meta = result.meta;

        return (
            <PermissionGuard permissions={["inventory.read"]}>
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Stock Ledger</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            All stock movements — inbound, outbound, transfers, adjustments
                        </p>
                    </div>
                    <StockReceivedList initialEntries={data} initialMeta={meta} />
                </div>
            </PermissionGuard>
        );
    } catch (error) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight">Stock Ledger</h2>
                <ListError
                    title="Failed to load stock ledger"
                    message={error instanceof Error ? error.message : "An unexpected error occurred."}
                />
            </div>
        );
    }
}
