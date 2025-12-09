"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Search, Printer, Download, MoreHorizontal, Eye } from "lucide-react";
import { getAllExitClearances, deleteExitClearance } from "@/lib/actions/exit-clearance";
import type { ExitClearance } from "@/lib/actions/exit-clearance";

export default function ExitClearanceListPage() {
  const [records, setRecords] = useState<ExitClearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ExitClearance | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const result = await getAllExitClearances();
        if (result.status && result.data) {
          setRecords(result.data);
        } else {
          toast.error(result.message || "Failed to load records");
        }
      } catch (error) {
        console.error("Failed to fetch records:", error);
        toast.error("Failed to load records");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  const filtered = records.filter(
    (r) =>
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (record: ExitClearance) => {
    setDeletingRecord(record);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    startTransition(async () => {
      try {
        const result = await deleteExitClearance(deletingRecord.id);

        if (result.status) {
          setRecords(records.filter((r) => r.id !== deletingRecord.id));
          toast.success(result.message || "Record deleted successfully");
        } else {
          toast.error(result.message || "Failed to delete record");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to delete record");
      } finally {
        setDeleteDialog(false);
      }
    });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Exit Clearance List</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}h1{text-align:center}</style>
      </head><body><h1>Exit Clearance List</h1>
      <table><thead><tr><th>S.No</th><th>Employee Name</th><th>Dep/Sub Dep</th><th>Designation</th><th>Last Working Date</th><th>Status</th></tr></thead>
      <tbody>${filtered.map((r, i) => `<tr><td>${i + 1}</td><td>${r.employeeName}</td><td>${r.department && r.subDepartment ? `${r.department} / ${r.subDepartment}` : r.department || '-'}</td><td>${r.designation}</td><td>${r.lastWorkingDate}</td><td>${r.approvalStatus}</td></tr>`).join("")}</tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = ["S.No", "Employee Name", "Department", "Sub Department", "Designation", "Last Working Date", "Approval Status"];
    const rows = filtered.map((r, i) => [i + 1, r.employeeName, r.department, r.subDepartment, r.designation, r.lastWorkingDate, r.approvalStatus]);
    const csv = [headers.join(","), ...rows.map((row) => row.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `exit_clearance_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV exported");
  };

  const statusVariant = (status: string) => {
    if (status === "approved") return "default";
    if (status === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exit Clearance</h2>
          <p className="text-muted-foreground">Manage employee exit clearance records</p>
        </div>
        <Link href="/dashboard/exit-clearance/create">
          <Button><Plus className="h-4 w-4 mr-2" />Create Clearance</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Clearance List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print"><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV"><Download className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{search ? "No records found" : "No clearance records yet."}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">S.No</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Dep/Sub Dep</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Last Working Date</TableHead>
                    <TableHead>Approval Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{record.employeeName}</TableCell>
                      <TableCell>{record.department && record.subDepartment ? `${record.department} / ${record.subDepartment}` : record.department || '-'}</TableCell>
                      <TableCell>{record.designation}</TableCell>
                      <TableCell>{new Date(record.lastWorkingDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(record.approvalStatus)}>{record.approvalStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/exit-clearance/list/${record.id}`}>
                                <Eye className="h-4 w-4 mr-2" />View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/exit-clearance/edit/${record.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(record)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete clearance for &quot;{deletingRecord?.employeeName}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

