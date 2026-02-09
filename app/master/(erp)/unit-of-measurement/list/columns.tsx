"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Uom, deleteUom, updateUom } from "@/lib/actions/uom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EllipsisIcon, Trash2, Pencil, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type UomRow = Uom;

export const columns: ColumnDef<UomRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    id: "sn",
    header: () => <div className="text-center">S.No</div>,
    cell: ({ row, table }) => <div className="text-center">{table.getSortedRowModel().flatRows.indexOf(row) + 1}</div>,
    size: 60,
  },
  {
    accessorKey: "name",
    header: "Unit of Measurement",
  },
  {
    id: "actions",
    header: () => <div className="text-center">Action</div>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 80,
  },
];

function RowActions({ row }: { row: Row<UomRow> }) {
  const item = row.original;
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(item.name);

  const canUpdate = hasPermission("erp.uom.update");
  const canDelete = hasPermission("erp.uom.delete");

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
    startTransition(async () => {
      const result = await deleteUom(item.id);
      if (result.status) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    startTransition(async () => {
      const result = await updateUom(item.id, { name: name.trim() });
      if (result.status) {
        toast.success(result.message);
        setEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-center">
            <Button variant="ghost" size="icon">
              <EllipsisIcon className="h-4 w-4" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit UOM</DialogTitle>
            <DialogDescription>Update the UOM name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="uom-name">UOM Name</Label>
              <Input
                id="uom-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
