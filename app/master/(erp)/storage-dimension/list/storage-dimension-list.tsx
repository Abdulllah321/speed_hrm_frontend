"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { useAuth } from "@/hooks/use-auth";
import { columns, StorageDimensionRow } from "./columns";
import {
  StorageDimension,
  deleteStorageDimension,
  updateStorageDimension,
} from "@/lib/actions/storage-dimension";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StorageDimensionListProps {
  initialData: StorageDimension[];
  newItemId?: string;
}

export function StorageDimensionList({
  initialData,
  newItemId,
}: StorageDimensionListProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<{ id: string; name: string }[]>([]);

  const handleToggle = () => {
    router.push("/master/storage-dimension/add");
  };

  const showAddAction = true;

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      let successCount = 0;
      for (const id of ids) {
          const result = await deleteStorageDimension(id);
          if (result.status) successCount++;
      }
      
      if (successCount > 0) {
        toast.success(`Deleted ${successCount} items successfully`);
        router.refresh();
      } else {
        toast.error("Failed to delete items");
      }
    });
  };

  const handleBulkEdit = (items: StorageDimensionRow[]) => {
    setEditRows(
      items.map((item) => ({
        id: item.id,
        name: item.name,
      }))
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (id: string, value: string) => {
    setEditRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, name: value } : r))
    );
  };

  const handleBulkEditSubmit = async () => {
    const validRows = editRows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      let successCount = 0;
      for (const row of validRows) {
          const formData = new FormData();
          formData.append("name", row.name);
          const result = await updateStorageDimension(row.id, formData);
          if (result.status) successCount++;
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} items successfully`);
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to update items");
      }
    });
  };

  // Transform data to include string id for DataTable
  const data: StorageDimensionRow[] = initialData.map((item) => ({
    ...item,
    id: item.id.toString(),
  }));

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        filterColumn="name"
        newItemId={newItemId}
        onDelete={handleMultiDelete}
        onEdit={handleBulkEdit}
        toggleLabel="Add Storage Dimension"
        onToggle={showAddAction ? handleToggle : undefined}
      />

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Storage Dimensions</DialogTitle>
            <DialogDescription>
              Edit multiple items at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
            {editRows.map((row) => (
              <div key={row.id} className="grid grid-cols-4 items-center gap-4">
                <Input
                  value={row.name}
                  onChange={(e) => updateEditRow(row.id, e.target.value)}
                  className="col-span-4"
                  placeholder="Name"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkEditSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
