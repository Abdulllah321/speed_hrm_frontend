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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Printer, FileDown, Search } from "lucide-react";

type LocationAllowance = {
  id: number;
  empId: string;
  employeeName: string;
  station: string;
  amount: number;
  status: "Active" | "Inactive";
};

const mockData: LocationAllowance[] = [
  { id: 1, empId: "EMP001", employeeName: "John Doe", station: "IN Station", amount: 5000, status: "Active" },
  { id: 2, empId: "EMP002", employeeName: "Jane Smith", station: "OUT Station", amount: 8000, status: "Active" },
  { id: 3, empId: "EMP003", employeeName: "Mike Johnson", station: "IN Station Food/Fuel", amount: 3000, status: "Inactive" },
];

export default function LocationAllowanceListPage() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<LocationAllowance[]>(mockData);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<LocationAllowance | null>(null);
  const [editForm, setEditForm] = useState({ station: "", amount: "" });

  const departments = ["HR", "IT", "Finance", "Marketing", "Operations"];
  const employees = [
    { id: "EMP001", name: "John Doe" },
    { id: "EMP002", name: "Jane Smith" },
    { id: "EMP003", name: "Mike Johnson" },
    { id: "EMP004", name: "Sarah Williams" },
  ];

  const filtered = data.filter(
    (item) =>
      item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      item.empId.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (item: LocationAllowance) => {
    setSelected(item);
    setEditForm({ station: item.station, amount: item.amount.toString() });
    setEditDialog(true);
  };

  const handleEditSave = () => {
    if (!selected) return;
    setData(data.map((d) => (d.id === selected.id ? { ...d, station: editForm.station, amount: parseFloat(editForm.amount) } : d)));
    toast.success("Allowance updated successfully");
    setEditDialog(false);
  };

  const handleDelete = (item: LocationAllowance) => {
    setSelected(item);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (!selected) return;
    setData(data.filter((d) => d.id !== selected.id));
    toast.success("Allowance deleted successfully");
    setDeleteDialog(false);
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const csv = [
      ["S.No", "Emp ID", "Employee Name", "Station", "Amount", "Status"],
      ...filtered.map((item, i) => [i + 1, item.empId, item.employeeName, item.station, item.amount, item.status]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "location-allowances.csv";
    a.click();
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">View Location Allowance List</h2>
          <p className="text-sm text-muted-foreground">Manage location allowances</p>
        </div>
        <Link href="/dashboard/master/location/add-allowance">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Allowance
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="text-lg">Location Allowance List</CardTitle>
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
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Emp ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.empId}</TableCell>
                  <TableCell>{item.employeeName}</TableCell>
                  <TableCell>{item.station}</TableCell>
                  <TableCell>{item.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Active" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allowance</DialogTitle>
            <DialogDescription>Update allowance details for {selected?.employeeName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Input value={selected?.employeeName || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Station</Label>
              <Select
                value={editForm.station}
                onValueChange={(value) => setEditForm({ ...editForm, station: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN Station">IN Station</SelectItem>
                  <SelectItem value="OUT Station">OUT Station</SelectItem>
                  <SelectItem value="IN Station Food/Fuel">IN Station Food/Fuel</SelectItem>
                  <SelectItem value="OUT Station Food/Fuel">OUT Station Food/Fuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allowance Amount</Label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allowance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete allowance for &quot;{selected?.employeeName}&quot;? This action cannot be undone.
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

