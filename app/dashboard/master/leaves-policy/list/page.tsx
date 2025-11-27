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

type LeavePolicy = {
  id: number;
  name: string;
  monthYearFrom: string;
  monthYearTill: string;
  createdBy: string;
  status: "Active" | "Inactive";
  fullDayRate: number;
  halfDayRate: number;
  shortLeaveRate: number;
};

const mockData: LeavePolicy[] = [
  { id: 1, name: "Standard Policy 2024", monthYearFrom: "Jan 2024", monthYearTill: "Dec 2024", createdBy: "Admin", status: "Active", fullDayRate: 1, halfDayRate: 0.5, shortLeaveRate: 0.25 },
  { id: 2, name: "Probation Policy", monthYearFrom: "Jan 2024", monthYearTill: "Jun 2024", createdBy: "Admin", status: "Active", fullDayRate: 1.5, halfDayRate: 0.75, shortLeaveRate: 0.5 },
  { id: 3, name: "Senior Staff Policy", monthYearFrom: "Jan 2024", monthYearTill: "Dec 2024", createdBy: "HR Manager", status: "Inactive", fullDayRate: 1, halfDayRate: 0.5, shortLeaveRate: 0.25 },
];

export default function LeavesPolicyListPage() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<LeavePolicy[]>(mockData);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<LeavePolicy | null>(null);
  const [editForm, setEditForm] = useState({ name: "", fullDayRate: "", halfDayRate: "", shortLeaveRate: "" });

  const filtered = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleView = (item: LeavePolicy) => {
    setSelected(item);
    setViewDialog(true);
  };

  const handleEdit = (item: LeavePolicy) => {
    setSelected(item);
    setEditForm({
      name: item.name,
      fullDayRate: item.fullDayRate.toString(),
      halfDayRate: item.halfDayRate.toString(),
      shortLeaveRate: item.shortLeaveRate.toString(),
    });
    setEditDialog(true);
  };

  const handleEditSave = () => {
    if (!selected || !editForm.name.trim()) return;
    setData(data.map((d) =>
      d.id === selected.id
        ? { ...d, name: editForm.name, fullDayRate: parseFloat(editForm.fullDayRate), halfDayRate: parseFloat(editForm.halfDayRate), shortLeaveRate: parseFloat(editForm.shortLeaveRate) }
        : d
    ));
    toast.success("Leave policy updated successfully");
    setEditDialog(false);
  };

  const handleDelete = (item: LeavePolicy) => {
    setSelected(item);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (!selected) return;
    setData(data.filter((d) => d.id !== selected.id));
    toast.success("Leave policy deleted successfully");
    setDeleteDialog(false);
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const csv = [
      ["Id", "Leave Policy Name", "Policy Month/Year From", "Policy Month/Year Till", "Created By", "Status"],
      ...filtered.map((item) => [item.id, item.name, item.monthYearFrom, item.monthYearTill, item.createdBy, item.status]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaves-policy.csv";
    a.click();
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Leaves Policy</h2>
          <p className="text-sm text-muted-foreground">Manage leave policies for your organization</p>
        </div>
        <Link href="/dashboard/master/leaves-policy/add">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Leave Policy
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="text-lg">Leave Policy List</CardTitle>
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
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Id</TableHead>
                <TableHead>Leave Policy Name</TableHead>
                <TableHead>Policy Month/Year From</TableHead>
                <TableHead>Policy Month/Year Till</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.monthYearFrom}</TableCell>
                  <TableCell>{item.monthYearTill}</TableCell>
                  <TableCell>{item.createdBy}</TableCell>
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
            <DialogTitle>View Leave Policy</DialogTitle>
            <DialogDescription>Policy details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Policy Name</Label><p className="font-medium">{selected?.name}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><p><Badge variant={selected?.status === "Active" ? "default" : "secondary"}>{selected?.status}</Badge></p></div>
              <div><Label className="text-muted-foreground">From</Label><p className="font-medium">{selected?.monthYearFrom}</p></div>
              <div><Label className="text-muted-foreground">Till</Label><p className="font-medium">{selected?.monthYearTill}</p></div>
              <div><Label className="text-muted-foreground">Full Day Rate</Label><p className="font-medium">{selected?.fullDayRate}</p></div>
              <div><Label className="text-muted-foreground">Half Day Rate</Label><p className="font-medium">{selected?.halfDayRate}</p></div>
              <div><Label className="text-muted-foreground">Short Leave Rate</Label><p className="font-medium">{selected?.shortLeaveRate}</p></div>
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
            <DialogTitle>Edit Leave Policy</DialogTitle>
            <DialogDescription>Update the leave policy</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Policy Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Full Day Rate</Label>
                <Input type="number" step="0.01" value={editForm.fullDayRate} onChange={(e) => setEditForm({ ...editForm, fullDayRate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Half Day Rate</Label>
                <Input type="number" step="0.01" value={editForm.halfDayRate} onChange={(e) => setEditForm({ ...editForm, halfDayRate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Short Leave Rate</Label>
                <Input type="number" step="0.01" value={editForm.shortLeaveRate} onChange={(e) => setEditForm({ ...editForm, shortLeaveRate: e.target.value })} />
              </div>
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
            <AlertDialogTitle>Delete Leave Policy</AlertDialogTitle>
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

