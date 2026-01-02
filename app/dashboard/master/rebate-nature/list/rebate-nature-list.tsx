"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { columns, RebateNatureRow } from "./columns";
import {
  RebateNature,
  deleteRebateNature,
} from "@/lib/actions/rebate-nature";
import { toast } from "sonner";

interface RebateNatureListProps {
  initialRebateNatures: RebateNature[];
  newItemId?: string;
}

export function RebateNatureList({
  initialRebateNatures,
  newItemId,
}: RebateNatureListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    router.push("/dashboard/master/rebate-nature/add");
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      let successCount = 0;
      for (const id of ids) {
        const result = await deleteRebateNature(id);
        if (result.status) successCount++;
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} item${successCount > 1 ? "s" : ""}`);
        router.refresh();
      } else {
        toast.error("Failed to delete items");
      }
    });
  };

  const handleBulkEdit = (items: RebateNatureRow[]) => {
    toast.info("Bulk edit is not available for rebate natures due to complex fields. Please edit items individually.");
  };

  // Transform data to include string id for DataTable
  const data: RebateNatureRow[] = initialRebateNatures.map((item) => ({
    ...item,
    id: item.id.toString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Rebate Natures</h2>
        <p className="text-muted-foreground">
          Manage tax rebate natures and limits
        </p>
      </div>

      <DataTable<RebateNatureRow>
        columns={columns}
        data={data}
        actionText="Add Rebate Nature"
        toggleAction={handleToggle}
        newItemId={newItemId}
        searchFields={[{ key: "name", label: "Name" }]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
        tableId="rebate-nature-list"
      />
    </div>
  );
}
