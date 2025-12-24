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
      // Current generic delete does one by one or bulk?
      // The action I wrote `deleteRebateNature` is single.
      // I should write a loop or add a bulk delete endpoint.
      // For now I'll just loop sequentially for simplicity, or modify the action.
      // Actually, checking `department-list` it calls `deleteDepartments` (plural). 
      // I implemented `deleteRebateNature` (singular). 
      // I will implement a loop here for now.
      
      let successCount = 0;
      for (const id of ids) {
          const result = await deleteRebateNature(id);
          if (result.status) successCount++;
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} items`);
        router.refresh();
      } else {
        toast.error("Failed to delete items");
      }
    });
  };

  // Skip bulk edit for now as it's complex for multi-field forms
  const handleBulkEdit = () => {
      toast.info("Bulk edit not supported for Rebate Nature yet");
  };

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
        data={initialRebateNatures}
        actionText="Add Rebate Nature"
        toggleAction={handleToggle}
        newItemId={newItemId}
        searchFields={[{ key: "name", label: "Name" }]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
      />
    </div>
  );
}
