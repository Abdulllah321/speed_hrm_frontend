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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  MoreHorizontal,
  Eye,
  History,
  UserX,
  Upload,
} from "lucide-react";
import {
  getEmployees,
  deleteEmployee,
  type Employee,
} from "@/lib/actions/employee";
import { uploadEmployeeCsv } from "@/lib/actions/employee-import";
import { FileUpload } from "@/components/ui/file-upload";
import { getDepartments, type Department } from "@/lib/actions/department";
import { getDesignations, type Designation } from "@/lib/actions/designation";
import { getCitiesByState, type City } from "@/lib/actions/city";

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const tableRef = useRef<HTMLTableElement>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPending, setUploadPending] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null
  );

  // Dropdown data for mapping IDs to names
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [citiesMap, setCitiesMap] = useState<Record<string, City[]>>({});

  // Fetch dropdown data for mapping
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [deptsRes, designationsRes] = await Promise.all([
          getDepartments(),
          getDesignations(),
        ]);

        if (deptsRes.status) setDepartments(deptsRes.data || []);
        if (designationsRes.status) setDesignations(designationsRes.data || []);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch cities for employees
  useEffect(() => {
    const fetchCities = async () => {
      if (employees.length === 0) return;
      
      const uniqueProvinces = [...new Set(employees.map(e => e.province).filter(Boolean))];
      const citiesData: Record<string, City[]> = {};
      
      await Promise.all(
        uniqueProvinces.map(async (province) => {
          if (!province) return;
          try {
            const res = await getCitiesByState(province);
            if (res.status && res.data) {
              citiesData[province] = res.data;
            }
          } catch (error) {
            console.error(`Error fetching cities for ${province}:`, error);
          }
        })
      );
      
      setCitiesMap(citiesData);
    };

    fetchCities();
  }, [employees]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const result = await getEmployees();
        if (result.status && result.data) {
          setEmployees(result.data);
        } else {
          toast.error(result.message || "Failed to fetch employees");
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employees");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Helper functions to map IDs to names
  const getDepartmentName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const dept = departments.find(d => d.id === id);
    return dept?.name || id;
  };

  const getDesignationName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const designation = designations.find(d => d.id === id);
    return designation?.name || id;
  };

  const getCityName = (id: string | null | undefined, province: string | null | undefined) => {
    if (!id || !province) return "N/A";
    const cities = citiesMap[province] || [];
    const city = cities.find(c => c.id === id);
    return city?.name || id;
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      getDepartmentName(e.department).toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (employee: Employee) => {
    setDeletingEmployee(employee);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEmployee) return;
    startTransition(async () => {
      try {
        const result = await deleteEmployee(deletingEmployee.id);
        if (result.status) {
          setEmployees(employees.filter((e) => e.id !== deletingEmployee.id));
          toast.success(result.message || "Employee deleted successfully");
          setDeleteDialog(false);
        } else {
          toast.error(result.message || "Failed to delete employee");
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
        toast.error("Failed to delete employee");
      }
    });
  };

  const handleToggleStatus = (employee: Employee) => {
    // TODO: Implement API call to update employee status
    setEmployees(
      employees.map((e) =>
        e.id === employee.id
          ? { ...e, status: e.status === "active" ? "inactive" : "active" }
          : e
      )
    );
    toast.success(
      `Employee ${employee.status === "active" ? "deactivated" : "activated"}`
    );
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Employee List</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}h1{text-align:center}</style>
      </head><body><h1>Employee List</h1>
      <table><thead><tr><th>S.No</th><th>Emp ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Contact</th><th>Bank</th><th>Salary</th><th>Status</th></tr></thead>
      <tbody>${filteredEmployees
        .map(
          (e, i) =>
            `<tr><td>${i + 1}</td><td>${e.employeeId}</td><td>${
              e.employeeName
            }</td><td>${getDepartmentName(e.department)}</td><td>${
              getDesignationName(e.designation)
            }</td><td>${e.contactNumber}</td><td>${e.bankName}</td><td>${Number(
              e.employeeSalary
            ).toLocaleString()}</td><td>${e.status}</td></tr>`
        )
        .join("")}</tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = [
      "S.No",
      "Emp ID",
      "Name",
      "Department",
      "Designation",
      "Contact",
      "Email",
      "Bank",
      "Account",
      "Address",
      "City",
      "Salary",
      "Status",
    ];
    const rows = filteredEmployees.map((e, i) => [
      i + 1,
      e.employeeId,
      e.employeeName,
      getDepartmentName(e.department),
      getDesignationName(e.designation),
      e.contactNumber,
      e.officialEmail,
      e.bankName || "N/A",
      e.accountNumber || "N/A",
      e.currentAddress || "N/A",
      getCityName(e.city, e.province),
      Number(e.employeeSalary),
      e.status,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `employees_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV exported");
  };

  const handleCsvUpload = async () => {
    if (!selectedFile) {
      toast.error("Please choose a CSV file first");
      return;
    }
    setUploadPending(true);
    try {
      const res = await uploadEmployeeCsv(selectedFile);
      if (res.status && res.data) {
        toast.success(
          res.data.inserted !== undefined
            ? `Uploaded. Inserted ${res.data.inserted}/${res.data.total || res.data.inserted}`
            : "CSV uploaded successfully"
        );
        const refreshed = await getEmployees();
        if (refreshed.status && refreshed.data) {
          setEmployees(refreshed.data);
        }
        setUploadDialog(false);
      } else {
        toast.error(res.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast.error("Failed to upload CSV");
    } finally {
      setUploadPending(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage employee records</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/employee/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Employees CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Employee List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
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
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search
                ? "No employees found"
                : "No employees. Create one to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ref={tableRef}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">S.No</TableHead>
                    <TableHead>Employee Details</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Employee Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp, index) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{emp.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.employeeId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getDepartmentName(emp.department)}{" "}
                            •{" "}
                            {getDesignationName(emp.designation)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {emp.contactNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{emp.bankName || "N/A"}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.accountNumber || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-[200px]">
                          <div className="text-sm truncate">
                            {emp.currentAddress || "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getCityName(emp.city, emp.province)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          PKR {Number(emp.employeeSalary).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            emp.status === "active" ? "default" : "secondary"
                          }
                        >
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <History className="h-4 w-4 mr-2" />
                              View Log
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/employee/view/${emp.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/employee/edit/${emp.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(emp)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              {emp.status === "active"
                                ? "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(emp)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deletingEmployee?.employeeName}&quot;? This action cannot be
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

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Employees CSV</DialogTitle>
            <DialogDescription>
              Select a CSV file. It will be stored in backend public/csv and parsed here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FileUpload
              id="employee-csv-upload"
              accept=".csv,text/csv"
              onChange={(files) => {
                if (files && files.length > 0) {
                  setSelectedFile(files[0]);
                } else {
                  setSelectedFile(null);
                }
              }}
            />
            <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
              <p className="text-sm text-primary mb-2">Need a template?</p>
              <Button asChild variant="outline" size="sm" className="!bg-primary !text-white hover:!bg-primary/90">
  <a href="/employee_samples.xlsx" download>
    <Download className="h-4 w-4 mr-2" />
    Download Sample Template
  </a>
</Button>

            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadDialog(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCsvUpload}
              disabled={uploadPending || !selectedFile}
            >
              {uploadPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
