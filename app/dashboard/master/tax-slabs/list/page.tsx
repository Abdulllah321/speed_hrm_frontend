"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2, Printer, FileDown, Search } from "lucide-react";

type Tax = {
  id: number;
  name: string;
  taxYear: string;
  salaryFrom: number;
  salaryTo: number;
  percentage: number;
  amountPerYear: number;
  status: "Active" | "Inactive";
};

const mockData: Tax[] = [
  { id: 1, name: "Income Tax Slab 1", taxYear: "2024", salaryFrom: 0, salaryTo: 50000, percentage: 0, amountPerYear: 0, status: "Active" },
  { id: 2, name: "Income Tax Slab 2", taxYear: "2024", salaryFrom: 50001, salaryTo: 100000, percentage: 5, amountPerYear: 30000, status: "Active" },
  { id: 3, name: "Income Tax Slab 3", taxYear: "2024", salaryFrom: 100001, salaryTo: 200000, percentage: 10, amountPerYear: 120000, status: "Active" },
  { id: 4, name: "Income Tax Slab 4", taxYear: "2023", salaryFrom: 200001, salaryTo: 500000, percentage: 15, amountPerYear: 540000, status: "Inactive" },
];

export default function TaxListPage() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Tax[]>(mockData);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<Tax | null>(null);
  const [editForm, setEditForm] = useState({ name: "", percentage: "", salaryFrom: "", salaryTo: "" });

  const filtered = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.taxYear.includes(search)
  );

  const handleView = (item: Tax) => {
    setSelected(item);
    setViewDialog(true);
  };

  const handleEdit = (item: Tax) => {
    setSelected(item);
    setEditForm({
      name: item.name,
      percentage: item.percentage.toString(),
      salaryFrom: item.salaryFrom.toString(),
      salaryTo: item.salaryTo.toString(),
    });
    setEditDialog(true);
  };

  const handleEditSave = () => {
    if (!selected || !editForm.name.trim()) return;
    setData(
      data.map((d) =>
        d.id === selected.id
          ? {
              ...d,
              name: editForm.name,
              percentage: parseFloat(editForm.percentage),
              salaryFrom: parseFloat(editForm.salaryFrom),
              salaryTo: parseFloat(editForm.salaryTo),
            }
          : d
      )
    );
    toast.success("Tax updated successfully");
    setEditDialog(false);
  };

  const handleDelete = (item: Tax) => {
    setSelected(item);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (!selected) return;
    setData(data.filter((d) => d.id !== selected.id));
    toast.success("Tax deleted successfully");
    setDeleteDialog(false);
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const csv = [
      ["S.No", "Tax Name", "Tax Year", "Status"],
      ...filtered.map((item, i) => [i + 1, item.name, item.taxYear, item.status]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tax-list.csv";
    a.click();
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">View Tax List</h2>
          <p className="text-sm text-muted-foreground">Manage tax slabs</p>
        </div>
        <Link href="/dashboard/master/tax-slabs/add">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Tax
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="text-lg">Tax List</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
                  <Printer className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
                  <FileDown className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Tax Name</TableHead>
                <TableHead>Tax Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.taxYear}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Active" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleView(item)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View Tax Details</DialogTitle>
            <DialogDescription>Tax slab information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Tax Name</Label>
                <p className="font-medium">{selected?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Tax Year</Label>
                <p className="font-medium">{selected?.taxYear}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Salary Range From</Label>
                <p className="font-medium">{selected?.salaryFrom?.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Salary Range To</Label>
                <p className="font-medium">{selected?.salaryTo?.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Percentage</Label>
                <p className="font-medium">{selected?.percentage}%</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Amount Per Year</Label>
                <p className="font-medium">{selected?.amountPerYear?.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p>
                  <Badge variant={selected?.status === "Active" ? "default" : "secondary"}>
                    {selected?.status}
                  </Badge>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tax</DialogTitle>
            <DialogDescription>Update the tax details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salary Range From</Label>
                <Input
                  type="number"
                  value={editForm.salaryFrom}
                  onChange={(e) => setEditForm({ ...editForm, salaryFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Range To</Label>
                <Input
                  type="number"
                  value={editForm.salaryTo}
                  onChange={(e) => setEditForm({ ...editForm, salaryTo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Percentage</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.percentage}
                onChange={(e) => setEditForm({ ...editForm, percentage: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

