"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Department, SubDepartment, updateSubDepartment, deleteSubDepartment } from "@/lib/actions/department";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";

interface SubDepartmentListProps {
  initialSubDepartments: SubDepartment[];
  departments: Department[];
}

export function SubDepartmentList({ initialSubDepartments, departments }: SubDepartmentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingSubDept, setEditingSubDept] = useState<SubDepartment | null>(null);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingSubDept, setDeletingSubDept] = useState<SubDepartment | null>(null);

  const filteredSubDepartments = initialSubDepartments.filter(
    (subDept) =>
      subDept.name.toLowerCase().includes(search.toLowerCase()) ||
      subDept.department?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (subDept: SubDepartment) => {
    setEditingSubDept(subDept);
    setEditDialog(true);
  };

  const handleEditSubmit = async (formData: FormData) => {
    if (!editingSubDept) return;

    startTransition(async () => {
      const result = await updateSubDepartment(editingSubDept.id, formData);
      if (result.status) {
        toast.success(result.message);
        setEditDialog(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = (subDept: SubDepartment) => {
    setDeletingSubDept(subDept);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubDept) return;

    startTransition(async () => {
      const result = await deleteSubDepartment(deletingSubDept.id);
      if (result.status) {
        toast.success(result.message);
        setDeleteDialog(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sub-Departments</h2>
          <p className="text-muted-foreground">Manage sub-departments under departments</p>
        </div>
        <Link href="/dashboard/master/sub-department/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Sub-Department
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sub-Department List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sub-departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubDepartments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No sub-departments found matching your search" : "No sub-departments found. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubDepartments.map((subDept, index) => (
                  <TableRow key={subDept.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{subDept.name}</TableCell>
                    <TableCell>{subDept.department?.name}</TableCell>
                    <TableCell>{new Date(subDept.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(subDept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(subDept)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Department</DialogTitle>
            <DialogDescription>Update the sub-department details</DialogDescription>
          </DialogHeader>
          <form action={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Select name="departmentId" defaultValue={editingSubDept?.departmentId.toString()}>
                  <SelectTrigger className="w-full min-w-[280px]">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Sub-Department Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingSubDept?.name}
                  disabled={isPending}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingSubDept?.name}&quot;? This action cannot be undone.
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
    </div>
  );
}

