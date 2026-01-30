"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  History,
  UserX,
  Upload,
  MoreHorizontal,
  Download,
  LayoutDashboard,
  MapPin,
} from "lucide-react";
import {
  getEmployees,
  deleteEmployee,
  updateEmployee,
  type Employee,
} from "@/lib/actions/employee";
import { uploadEmployeeCsv } from "@/lib/actions/employee-import";
import { FileUpload } from "@/components/ui/file-upload";
import { getDepartments, type Department } from "@/lib/actions/department";
import { getDesignations, type Designation } from "@/lib/actions/designation";
import { getCitiesByState, type City } from "@/lib/actions/city";
import DataTable, { type FilterConfig } from "@/components/common/data-table";
import { ColumnDef } from "@tanstack/react-table";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EmployeeListPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [impersonatePendingId, setImpersonatePendingId] = useState<string | null>(null);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null
  );

  const [errorDialog, setErrorDialog] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{
    row: Record<string, string>;
    error: string;
  }>>([]);

  // Dropdown data for mapping IDs to names
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [citiesMap, setCitiesMap] = useState<Record<string, City[]>>({});

  // Define columns for DataTable
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "employeeId",
      header: "Employee ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("employeeId")}</div>
      ),
    },
    {
      accessorKey: "employeeName",
      header: "Employee Details",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium">{employee.employeeName}</div>
            <div className="text-xs text-muted-foreground">
              {employee.employeeId}
            </div>
            <div className="text-xs text-muted-foreground">
              {getDepartmentName(employee.department)} • {getDesignationName(employee.designation)}
            </div>
            <div className="text-xs text-muted-foreground">
              {employee.contactNumber}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "bankDetails",
      header: "Bank Details",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="space-y-1">
            <div className="text-sm">{employee.bankName}</div>
            <div className="text-xs text-muted-foreground">
              {employee.accountNumber}
            </div>
            <div className="text-xs text-muted-foreground">
              {employee.accountTitle}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="space-y-1">
            <div className="text-sm">{getCityName(employee.city, employee.province)}</div>
            <div className="text-xs text-muted-foreground">
              {employee.currentAddress}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "employeeSalary",
      header: "Salary",
      cell: ({ row }) => {
        const salary = parseFloat(row.getValue("employeeSalary"));
        return (
          <div className="font-medium">
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
            }).format(salary)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "active"
                ? "default"
                : status === "inactive"
                  ? "secondary"
                  : "destructive"
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/hr/employee/view/${employee.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/hr/employee/edit/${employee.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/hr/employee/transfer?employeeId=${employee.id}`}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Transfer
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="flex w-full items-center"
                  onClick={() => handleDashboardAccess(employee)}
                  disabled={!!impersonatePendingId}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {impersonatePendingId === employee.id ? "Opening..." : "Dashboard Access"}
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusToggle(employee)}
                disabled={isPending}
              >
                <UserX className="h-4 w-4 mr-2" />
                {employee.status === "active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Fetch all data in a single useEffect to avoid multiple API calls
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch employees, departments, and designations in parallel
        const [employeesRes, deptsRes, designationsRes] = await Promise.all([
          getEmployees(),
          getDepartments(),
          getDesignations(),
        ]);

        // Set departments and designations
        if (deptsRes.status) setDepartments(deptsRes.data || []);
        if (designationsRes.status) setDesignations(designationsRes.data || []);

        // Set employees
        if (employeesRes.status && employeesRes.data) {
          setEmployees(employeesRes.data);

          // Fetch cities only for unique provinces found in employee data
          const uniqueProvinces = [...new Set(employeesRes.data.map(e => e.province).filter(Boolean))];

          if (uniqueProvinces.length > 0) {
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
          }
        } else {
          toast.error(employeesRes.message || "Failed to fetch employees");
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
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

  const handleStatusToggle = (employee: Employee) => {
    const newStatus = employee.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      try {
        const result = await updateEmployee(employee.id, {
          status: newStatus,
        });
        if (result.status) {
          setEmployees(
            employees.map((e) =>
              e.id === employee.id ? { ...e, status: newStatus } : e
            )
          );
          toast.success(
            `Employee ${newStatus === "active" ? "activated" : "deactivated"} successfully`
          );
        } else {
          toast.error(result.message || "Failed to update status");
        }
      } catch (error) {
        console.error("Error toggling employee status:", error);
        toast.error("Failed to update status");
      }
    });
  };

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

  const handleDashboardAccess = async (employee: Employee) => {
    try {
      setImpersonatePendingId(employee.id);

      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

      const res = await fetch(`${apiBase}/auth/impersonate-by-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ employeeId: employee.id }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.status) {
        toast.error(
          payload.message ||
          "Failed to open dashboard. Make sure user account & dashboard access exist."
        );
        return;
      }

      window.open("/hr/my-dashboard", "_blank");
    } catch (error) {
      console.error("Error impersonating user:", error);
      toast.error("Failed to open dashboard");
    } finally {
      setImpersonatePendingId(null);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Employee List</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}h1{text-align:center}</style>
      </head><body><h1>Employee List</h1>
      <table><thead><tr><th>S.No</th><th>Emp ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Contact</th><th>Bank</th><th>Salary</th><th>Status</th></tr></thead>
      <tbody>${employees
        .map(
          (e, i) =>
            `<tr><td>${i + 1}</td><td>${e.employeeId}</td><td>${e.employeeName
            }</td><td>${getDepartmentName(e.department)}</td><td>${getDesignationName(e.designation)
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
      "Employee ID",
      "Employee Name",
      "Father / Husband Name",
      "Department",
      "Sub Department",
      "Employee Grade",
      "Attendance ID",
      "Designation",
      "Marital Status",
      "Employment Status",
      "Probation Expiry Date",
      "CNIC Number",
      "CNIC Expiry Date",
      "Lifetime CNIC",
      "Joining Date",
      "Date of Birth",
      "Nationality",
      "Gender",
      "Contact Number",
      "Emergency Contact Number",
      "Emergency Contact Person",
      "Personal Email",
      "Official Email",
      "Country",
      "State",
      "City",
      "Area",
      "Employee Salary",
      "EOBI",
      "EOBI ID",
      "EOBI Code",
      "EOBI Number",
      "Provident Fund",
      "Overtime Applicable",
      "Days Off",
      "Reporting Manager",
      "Working Hours Policy",
      "Branch",
      "Leaves Policy",
      "Allocation",
      "Allow Remote Attendance",
      "Current Address",
      "Permanent Address",
      "Bank Name",
      "Account Number",
      "Account Title",
    ];

    const csv = [
      headers.join(","),
      ...employees.map((emp: any) => {
        return [
          emp.employeeId || "",
          emp.employeeName || "",
          emp.fatherHusbandName || "",
          emp.departmentName || "",
          emp.subDepartmentName || "",
          emp.employeeGradeName || "",
          emp.attendanceId || "",
          emp.designationName || "",
          emp.maritalStatusName || "",
          emp.employmentStatusName || "",
          emp.probationExpiryDate || "",
          emp.cnicNumber || "",
          emp.cnicExpiryDate || "",
          emp.lifetimeCnic || "",
          emp.joiningDate || "",
          emp.dateOfBirth || "",
          emp.nationality || "",
          emp.gender || "",
          emp.contactNumber || "",
          emp.emergencyContactNumber || "",
          emp.emergencyContactPerson || "",
          emp.personalEmail || "",
          emp.officialEmail || "",
          emp.countryName || "",
          emp.provinceName || "",
          emp.cityName || "",
          emp.area || "",
          emp.employeeSalary || "",
          emp.eobi ? "YES" : "",
          emp.eobiId || "",
          emp.eobiCode || "",
          emp.eobiNumber || "",
          emp.providentFund || "",
          emp.overtimeApplicable || "",
          emp.daysOff || "",
          emp.reportingManager || "",
          emp.workingHoursPolicyName || "",
          emp.locationName || "",
          emp.leavesPolicyName || "",
          emp.allocationName || "",
          emp.allowRemoteAttendance || "",
          emp.currentAddress || "",
          emp.permanentAddress || "",
          emp.bankName || "",
          emp.accountNumber || "",
          emp.accountTitle || "",
        ].map((c) => `"${c}"`).join(",");
      }),
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
        if (res.errors && res.errors.length > 0) {
          setImportErrors(res.errors);
          setErrorDialog(true);
        }
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
          <Link href="/hr/employee/create">
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

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          data={employees}
          columns={columns}
          toggleAction={() => setUploadDialog(true)}
          actionText="Upload CSV"
          searchFields={[
            { key: "employeeName", label: "Employee Name" },
            { key: "employeeId", label: "Employee ID" },
            { key: "contactNumber", label: "Contact Number" },
          ]}
        />
      )}

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
              <Button asChild variant="outline" size="sm" className="bg-primary! text-white! hover:bg-primary/90!">
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

      <Dialog open={errorDialog} onOpenChange={setErrorDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-destructive">Import Errors</DialogTitle>
            <DialogDescription>
              {importErrors.length} records failed to import. Please review the errors below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Row</TableHead>
                    <TableHead>Key Data</TableHead>
                    <TableHead>Error Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importErrors.map((err, i) => (
                    <TableRow key={i} className="bg-destructive/5">
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate" title={JSON.stringify(err.row, null, 2)}>
                        {err.row['Employee ID'] || err.row['Employee Name'] || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-destructive font-medium">
                        {err.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
