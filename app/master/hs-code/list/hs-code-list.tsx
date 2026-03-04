"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { useAuth } from "@/components/providers/auth-provider";
import { columns, HsCodeRow } from "./columns";
import { HsCode, deleteHsCode } from "@/lib/actions/hs-code";
import { toast } from "sonner";

interface HsCodeListProps {
    initialHsCodes: HsCode[];
    newItemId?: string;
}

export function HsCodeList({ initialHsCodes, newItemId }: HsCodeListProps) {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        router.push("/master/hs-code/add");
    };

    const showAddAction = hasPermission("hs-code.create");
    const canBulkDelete = hasPermission("hs-code.delete");

    const handleMultiDelete = (ids: string[]) => {
        // Implementing simple delete for each since I don't have bulk delete for HS Code yet
        startTransition(async () => {
            for (const id of ids) {
                await deleteHsCode(id);
            }
            toast.success("Items deleted successfully");
            router.refresh();
        });
    };

    // Transform data to ensure string id
    const data: HsCodeRow[] = initialHsCodes.map((item) => ({
        ...item,
        id: item.id.toString(),
    }));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">HS Codes</h2>
                <p className="text-muted-foreground">
                    Manage Harmonized System Codes and tax percentages
                </p>
            </div>

            <DataTable<HsCodeRow>
                columns={columns}
                data={data}
                actionText={showAddAction ? "Add HS Code" : undefined}
                toggleAction={showAddAction ? handleToggle : undefined}
                newItemId={newItemId}
                searchFields={[{ key: "hsCode", label: "HS Code" }]}
                onMultiDelete={canBulkDelete ? handleMultiDelete : undefined}
                tableId="hs-code-list"
            />
        </div>
    );
}
