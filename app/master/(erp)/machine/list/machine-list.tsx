"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { useAuth } from "@/hooks/use-auth";
import { columns, MachineRow } from "./columns";
import {
  Machine,
  deleteMachines,
  updateMachines,
} from "@/lib/actions/machine";
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

interface MachineListProps {
  initialMachines: Machine[];
  newItemId?: string;
}

export function MachineList({
  initialMachines,
  newItemId,
}: MachineListProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<{ id: string; name: string }[]>([]);

  const handleToggle = () => {
    router.push("/master/machine/add");
  };

  // const showAddAction = hasPermission("machine.create");
  const showAddAction = true;

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      const result = await deleteMachines(ids);
      if (result.status) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleBulkEdit = (items: MachineRow[]) => {
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
      const result = await updateMachines(validRows);
      if (result.status) {
        toast.success(result.message);
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  // Transform data to include string id for DataTable
  const data: MachineRow[] = initialMachines.map((item) => ({
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
        toggleLabel="Add Machine"
        onToggle={showAddAction ? handleToggle : undefined}
      />

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Machines</DialogTitle>
            <DialogDescription>
              Edit multiple machines at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
            {editRows.map((row) => (
              <div key={row.id} className="grid grid-cols-4 items-center gap-4">
                <Input
                  value={row.name}
                  onChange={(e) => updateEditRow(row.id, e.target.value)}
                  className="col-span-4"
                  placeholder="Machine Name"
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
