"use client";

import { useState, useEffect, useTransition, useRef } from "react";
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
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Printer,
  Download,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

interface Qualification {
  id: number;
  instituteName: string;
  qualification: string;
  country: string;
  city: string;
  subDepartment: string;
  createdBy?: string;
  status?: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
export default function QualificationListPage() {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const tableRef = useRef<HTMLTableElement>(null);

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingQualification, setEditingQualification] =
    useState<Qualification | null>(null);
  const [editData, setEditData] = useState({
    instituteName: "",
    qualification: "",
    country: "",
    city: "",
    subDepartment: "",
  });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingQualification, setDeletingQualification] =
    useState<Qualification | null>(null);

  const fetchQualifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/qualifications`);
      const data = await res.json();
      if (data.status && data.data.length > 0) {
        setQualifications(data.data);
      } else {
        // Sample data
        setQualifications([
          {
            id: 1,
            instituteName: "COMSATS Institute of Information Technology",
            qualification: "BS Computer Science",
            country: "Pakistan",
            city: "Islamabad",
            subDepartment: "Computer Science",
            createdBy: "Admin",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch qualifications:", error);
      // Sample data on error
      setQualifications([
        {
          id: 1,
          instituteName: "COMSATS Institute of Information Technology",
          qualification: "BS Computer Science",
          country: "Pakistan",
          city: "Islamabad",
          subDepartment: "Computer Science",
          createdBy: "Admin",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualifications();
  }, []);

  const filteredQualifications = qualifications.filter(
    (q) =>
      q.qualification.toLowerCase().includes(search.toLowerCase()) ||
      q.instituteName.toLowerCase().includes(search.toLowerCase()) ||
      q.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (qualification: Qualification) => {
    setEditingQualification(qualification);
    setEditData({
      instituteName: qualification.instituteName,
      qualification: qualification.qualification,
      country: qualification.country,
      city: qualification.city,
      subDepartment: qualification.subDepartment,
    });
    setEditDialog(true);
  };

  const handleEditSubmit = async () => {
    if (!editingQualification || !editData.qualification.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/qualifications/${editingQualification.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editData),
          }
        );
        const data = await res.json();
        if (data.status) {
          toast.success(data.message || "Qualification updated successfully");
          setEditDialog(false);
          fetchQualifications();
        } else {
          toast.error(data.message || "Failed to update qualification");
        }
      } catch (error) {
        toast.error("Failed to update qualification");
      }
    });
  };

  const handleDelete = (qualification: Qualification) => {
    setDeletingQualification(qualification);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQualification) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/qualifications/${deletingQualification.id}`,
          {
            method: "DELETE",
          }
        );
        const data = await res.json();
        if (data.status) {
          toast.success(data.message || "Qualification deleted successfully");
          setDeleteDialog(false);
          fetchQualifications();
        } else {
          toast.error(data.message || "Failed to delete qualification");
        }
      } catch (error) {
        toast.error("Failed to delete qualification");
      }
    });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Qualification List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f4f4f4; }
            h1 { text-align: center; }
          </style>
        </head>
        <body>
          <h1>Qualification List</h1>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Institute Name</th>
                <th>Qualification</th>
                <th>Country</th>
                <th>City</th>
                <th>Sub Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredQualifications
                .map(
                  (q, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${q.instituteName}</td>
                  <td>${q.qualification}</td>
                  <td>${q.country}</td>
                  <td>${q.city}</td>
                  <td>${q.subDepartment}</td>
                  <td>${q.status || "Active"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = [
      "S.No",
      "Institute Name",
      "Qualification",
      "Country",
      "City",
      "Sub Department",
      "Created By",
      "Status",
    ];
    const rows = filteredQualifications.map((q, i) => [
      i + 1,
      q.instituteName,
      q.qualification,
      q.country,
      q.city,
      q.subDepartment,
      q.createdBy || "Admin",
      q.status || "Active",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qualifications_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Qualifications</h2>
          <p className="text-muted-foreground">
            Manage qualifications for your organization
          </p>
        </div>
        <Link href="/dashboard/master/qualification/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Qualification
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Qualification List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search qualifications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrint}
                title="Print"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportCSV}
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQualifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search
                ? "No qualifications found matching your search"
                : "No qualifications found. Create one to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ref={tableRef}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Institute Name</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Sub Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQualifications.map((qual, index) => (
                    <TableRow key={qual.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={qual.instituteName}
                      >
                        {qual.instituteName}
                      </TableCell>
                      <TableCell>{qual.qualification}</TableCell>
                      <TableCell>{qual.country}</TableCell>
                      <TableCell>{qual.city}</TableCell>
                      <TableCell>{qual.subDepartment}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            qual.status === "inactive" ? "secondary" : "default"
                          }
                        >
                          {qual.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(qual)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(qual)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Qualification</DialogTitle>
            <DialogDescription>
              Update the qualification details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Institute Name</Label>
              <Input
                value={editData.instituteName}
                onChange={(e) =>
                  setEditData({ ...editData, instituteName: e.target.value })
                }
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input
                value={editData.qualification}
                onChange={(e) =>
                  setEditData({ ...editData, qualification: e.target.value })
                }
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={editData.country}
                  onChange={(e) =>
                    setEditData({ ...editData, country: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={editData.city}
                  onChange={(e) =>
                    setEditData({ ...editData, city: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Input
                value={editData.subDepartment}
                onChange={(e) =>
                  setEditData({ ...editData, subDepartment: e.target.value })
                }
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Qualification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deletingQualification?.qualification}&quot; from{" "}
              {deletingQualification?.instituteName}? This action cannot be
              undone.
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
