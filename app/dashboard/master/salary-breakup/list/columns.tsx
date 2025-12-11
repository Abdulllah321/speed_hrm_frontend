"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { HighlightText } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { EllipsisIcon, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type SalaryBreakupRow = {
  id: string;
  salaryType: string;
  percent: number;
  isTaxable: boolean;
  createdBy: string;
  status: "Active" | "Inactive";
  breakupId: string; // Original salary breakup ID
  breakupName: string; // Original salary breakup name
};

export const columns: ColumnDef<SalaryBreakupRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
    size: 28,
  },
  {
    header: "Breakup Name",
    accessorKey: "breakupName",
    size: 200,
    enableSorting: true,
    cell: ({ row }) => <HighlightText text={row.original.breakupName} />,
  },
  {
    header: "Salary Type",
    accessorKey: "salaryType",
    size: 200,
    enableSorting: true,
    cell: ({ row }) => <HighlightText text={row.original.salaryType} />,
  },
  {
    header: "Percent (%)",
    accessorKey: "percent",
    size: 120,
    enableSorting: true,
    cell: ({ row }) => `${row.original.percent}%`,
  },
  {
    header: "Taxable",
    accessorKey: "isTaxable",
    size: 100,
    enableSorting: true,
    cell: ({ row }) => (
      <Badge variant={row.original.isTaxable ? "default" : "secondary"}>
        {row.original.isTaxable ? "Yes" : "No"}
      </Badge>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    size: 120,
    enableSorting: true,
    cell: ({ row }) => (
      <Badge variant={row.original.status === "Active" ? "default" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    header: "Created By",
    accessorKey: "createdBy",
    size: 150,
    enableSorting: true,
    cell: ({ row }) => row.original.createdBy || "—",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
  },
];

type RowActionsProps = { row: Row<SalaryBreakupRow> };

function RowActions({ row }: RowActionsProps) {
  const item = row.original;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    salaryType: item.salaryType,
    percent: item.percent.toString(),
    isTaxable: item.isTaxable,
  });

  const handleEditSubmit = async () => {
    if (!editForm.salaryType.trim()) {
      toast.error("Salary type is required");
      return;
    }
    const percent = parseFloat(editForm.percent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      toast.error("Percent must be between 0 and 100");
      return;
    }
    // TODO: Implement update action when backend endpoint is available
    toast.info("Update functionality will be available soon");
    setEditDialog(false);
  };

  const handleDeleteConfirm = async () => {
    // TODO: Implement delete action when backend endpoint is available
    toast.info("Delete functionality will be available soon");
    setDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button size="icon" variant="ghost" className="shadow-none" aria-label="Actions">
              <EllipsisIcon size={16} />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteDialog(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Salary Breakup Entry</DialogTitle>
            <DialogDescription>Update the salary breakup entry details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-salary-type">Salary Type</Label>
              <Input
                id="edit-salary-type"
                value={editForm.salaryType}
                onChange={(e) => setEditForm({ ...editForm, salaryType: e.target.value })}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-percent">Percent (%)</Label>
              <Input
                id="edit-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editForm.percent}
                onChange={(e) => setEditForm({ ...editForm, percent: e.target.value })}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-taxable">Taxable</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-taxable"
                  checked={editForm.isTaxable}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isTaxable: !!checked })}
                  disabled={isPending}
                />
                <Label htmlFor="edit-taxable" className="font-normal cursor-pointer">
                  This salary component is taxable
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Breakup Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{item.salaryType}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

