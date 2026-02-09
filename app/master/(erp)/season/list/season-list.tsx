"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DataTable from "@/components/common/data-table";
import { useAuth } from "@/components/providers/auth-provider";
import { Season, bulkUpdateSeasons, bulkDeleteSeasons } from "@/lib/actions/season";
import { columns, SeasonRow } from "./columns";

interface SeasonListProps {
    initialData: Season[];
}

export function SeasonList({ initialData }: SeasonListProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { hasPermission, isAdmin } = useAuth();
    const tableId = useId();

    const canEdit = isAdmin() || hasPermission("erp.season.update");
    const canDelete = isAdmin() || hasPermission("erp.season.delete");

    const onBulkEdit = async (rows: SeasonRow[]) => {
        if (!canEdit) {
            toast.error("You don't have permission to edit seasons");
            return;
        }

        startTransition(async () => {
            const result = await bulkUpdateSeasons(rows);
            if (result.status) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const onMultiDelete = async (ids: string[]) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete seasons");
            return;
        }

        startTransition(async () => {
            const result = await bulkDeleteSeasons(ids);
            if (result.status) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const data: SeasonRow[] = initialData.map((item) => ({
        ...item,
        id: item.id,
    }));

    return (
        <DataTable
            columns={columns}
            data={data}
            searchFields={[{ key: "name", label: "Name" }]}
            onBulkEdit={canEdit ? onBulkEdit : undefined}
            onMultiDelete={canDelete ? onMultiDelete : undefined}
            tableId={tableId}
            canBulkEdit={canEdit}
            canBulkDelete={canDelete}
        />
    );
}
