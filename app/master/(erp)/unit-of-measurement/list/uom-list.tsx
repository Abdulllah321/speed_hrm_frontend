"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { useAuth } from "@/components/providers/auth-provider";
import { columns, UomRow } from "./columns";
import { Uom, deleteUom } from "@/lib/actions/uom";
import { toast } from "sonner";

interface UomListProps {
  initialUoms: Uom[];
  newItemId?: string;
}

export function UomList({ initialUoms, newItemId }: UomListProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    router.push("/master/unit-of-measurement/add");
  };

  const showAddAction = hasPermission("erp.uom.create");
  const canBulkDelete = hasPermission("erp.uom.delete");

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      for (const id of ids) {
        await deleteUom(id);
      }
      toast.success("UOMs deleted successfully");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Unit of Measurement</h2>
        <p className="text-muted-foreground">Manage your organization units of measurement</p>
      </div>

      <DataTable<UomRow>
        columns={columns}
        data={initialUoms}
        actionText={showAddAction ? "Add UOM" : undefined}
        toggleAction={showAddAction ? handleToggle : undefined}
        newItemId={newItemId}
        searchFields={[{ key: "name", label: "Name" }]}
        onMultiDelete={handleMultiDelete}
        canBulkDelete={canBulkDelete}
        tableId="uom-list"
      />
    </div>
  );
}
