"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { HighlightText } from "@/components/common/data-table";
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
import { EllipsisIcon, Loader2, Pencil, Trash2, Eye } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeavesPolicy, deleteLeavesPolicy } from "@/lib/actions/leaves-policy";

export type LeavesPolicyRow = LeavesPolicy & { id: string };

export const columns: ColumnDef<LeavesPolicyRow>[] = [
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
      <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 28,
  },
  { header: "Name", accessorKey: "name", size: 250, enableSorting: true, cell: ({ row }) => <HighlightText text={row.original.name} /> },
  { 
    header: "Policy Date From", 
    accessorKey: "policyDateFrom", 
    size: 150, 
    cell: ({ row }) => row.original.policyDateFrom ? new Date(row.original.policyDateFrom).toLocaleDateString() : "—",
    enableSorting: true 
  },
  { 
    header: "Policy Date Till", 
    accessorKey: "policyDateTill", 
    size: 150, 
    cell: ({ row }) => row.original.policyDateTill ? new Date(row.original.policyDateTill).toLocaleDateString() : "—",
    enableSorting: true 
  },
  { header: "Details", accessorKey: "details", size: 200, cell: ({ row }) => row.original.details || "—" },
  { header: "Created By", accessorKey: "createdBy", size: 150, enableSorting: true, cell: ({ row }) => row.original.createdBy || "—" },
  { header: "Created At", accessorKey: "createdAt", size: 150, cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(), enableSorting: true },
  { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <RowActions row={row} />, size: 60, enableHiding: false },
];

function RowActions({ row }: { row: Row<LeavesPolicyRow> }) {
  const lp = row.original;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleDeleteConfirm = async () => {
    startTransition(async () => {
      const result = await deleteLeavesPolicy(lp.id);
      if (result.status) { toast.success(result.message); setDeleteDialog(false); router.refresh(); }
      else toast.error(result.message);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button size="icon" variant="ghost" className="shadow-none" aria-label="Actions"><EllipsisIcon size={16} /></Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/dashboard/master/leaves-policy/view/${lp.id}`)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/master/leaves-policy/edit/${lp.id}`)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteDialog(true)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Leave Policy</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete &quot;{lp.name}&quot;? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

