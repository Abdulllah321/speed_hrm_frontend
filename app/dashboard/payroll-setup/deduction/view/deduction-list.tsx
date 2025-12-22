"use client";

import { useState, useEffect, useMemo } from "react";
import DataTable from "@/components/common/data-table";
import { columns, type DeductionRow } from "./columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Printer, Download, Plus } from "lucide-react";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { getDeductions, getDeductionHeads, type Deduction, type DeductionHead } from "@/lib/actions/deduction";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

interface DeductionListProps {
  initialData?: Deduction[];
}

const formatMonthYear = (month: string, year: string) => {
  if (!month || !year) return "—";
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthIndex = parseInt(month) - 1;
  return `${monthNames[monthIndex] || month} ${year}`;
};

export function DeductionList({ initialData = [] }: DeductionListProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [deductionHeads, setDeductionHeads] = useState<DeductionHead[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [filters, setFilters] = useState({
    department: "all",
    subDepartment: "all",
    employeeId: "all",
    deductionHeadId: "all",
    month: "",
    year: "",
    status: "all",
  });

  const [data, setData] = useState<DeductionRow[]>([]);

  // Transform API data to row format
  const transformToRows = (deductions: Deduction[]): DeductionRow[] => {
    return deductions.map((deduction, index) => ({
      id: deduction.id,
      sNo: index + 1,
      employeeId: deduction.employeeId,
      employeeName: deduction.employee?.employeeName || "—",
      employeeCode: deduction.employee?.employeeId || "—",
      department: deduction.employee?.department?.name || "—",
      subDepartment: deduction.employee?.subDepartment?.name || "—",
      deductionHeadId: deduction.deductionHeadId,
      deductionHeadName: deduction.deductionHead?.name || "—",
      amount: Number(deduction.amount),
      month: deduction.month || "",
      year: deduction.year || "",
      monthYear: formatMonthYear(deduction.month || "", deduction.year || ""),
      isTaxable: deduction.isTaxable || false,
      taxPercentage: deduction.taxPercentage ? Number(deduction.taxPercentage) : null,
      notes: deduction.notes || null,
      status: deduction.status || "active",
      createdAt: deduction.createdAt,
    }));
  };

  // Initialize data from props
  useEffect(() => {
    if (initialData.length > 0) {
      setData(transformToRows(initialData));
    }
  }, [initialData]);

  // Fetch departments and deduction heads on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptResult, headsResult] = await Promise.all([
          getDepartments(),
          getDeductionHeads(),
        ]);
        if (deptResult.status && deptResult.data) {
          setDepartments(deptResult.data);
        }
        if (headsResult.status && headsResult.data) {
          setDeductionHeads(headsResult.data.filter((h) => h.status === "active"));
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const result = await getEmployeesForDropdown();
        if (result.status && result.data) {
          setEmployees(result.data);
        } else {
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error:", error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDepartments = async () => {
      if (filters.department && filters.department !== "all") {
        try {
          const result = await getSubDepartmentsByDepartment(filters.department);
          if (result.status && result.data) {
            setSubDepartments(result.data);
          } else {
            setSubDepartments([]);
          }
        } catch (error) {
          console.error("Failed to fetch sub-departments:", error);
          setSubDepartments([]);
        }
      } else {
        setSubDepartments([]);
        setFilters((prev) => ({ ...prev, subDepartment: "all" }));
      }
    };

    fetchSubDepartments();
  }, [filters.department]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const params: any = {};
      
      if (filters.employeeId && filters.employeeId !== "all") {
        params.employeeId = filters.employeeId;
      }
      
      if (filters.deductionHeadId && filters.deductionHeadId !== "all") {
        params.deductionHeadId = filters.deductionHeadId;
      }
      
      if (filters.month) {
        params.month = filters.month.padStart(2, "0");
      }
      
      if (filters.year) {
        params.year = filters.year;
      }
      
      if (filters.status && filters.status !== "all") {
        params.status = filters.status;
      }

      const result = await getDeductions(params);
      if (result.status && result.data) {
        setData(transformToRows(result.data));
        toast.success(`Found ${result.data.length} deduction(s)`);
      } else {
        setData([]);
        toast.error(result.message || "No deductions found");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to search deductions");
      setData([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "S.No",
      "Employee ID",
      "Employee Name",
      "Department",
      "Sub Department",
      "Deduction Type",
      "Amount",
      "Taxable",
      "Tax %",
      "Month-Year",
      "Status",
      "Notes",
    ];

    const rows = data.map((row) => [
      row.sNo,
      row.employeeCode,
      row.employeeName,
      row.department,
      row.subDepartment,
      row.deductionHeadName,
      row.amount.toString(),
      row.isTaxable ? "Yes" : "No",
      row.taxPercentage?.toString() || "—",
      row.monthYear,
      row.status,
      row.notes || "—",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `deduction_list_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Data exported successfully");
  };

  // Filter employees based on department and sub-department
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (filters.department && filters.department !== "all") {
      filtered = filtered.filter((emp) => emp.departmentId === filters.department);
    }

    if (filters.subDepartment && filters.subDepartment !== "all") {
      filtered = filtered.filter((emp) => emp.subDepartmentId === filters.subDepartment);
    }

    return filtered;
  }, [employees, filters.department, filters.subDepartment]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            View Employee Deduction List
          </h2>
          <p className="text-muted-foreground">
            Search and view employee deduction records
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/payroll-setup/deduction/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Deduction
            </Button>
          </Link>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Use filters to search for deduction records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    department: value,
                    subDepartment: "all",
                    employeeId: "all",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Select
                value={filters.subDepartment === "all" ? undefined : filters.subDepartment}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    subDepartment: value,
                    employeeId: "all",
                  }))
                }
                disabled={filters.department === "all" || !filters.department || subDepartments.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      filters.department === "all" || !filters.department
                        ? "Select department first"
                        : subDepartments.length === 0
                        ? "No sub departments available"
                        : "Select Sub Department"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subDepartments.length === 0 ? (
                    <SelectItem value="no-subdept" disabled>
                      {filters.department === "all" || !filters.department
                        ? "Select department first"
                        : "No sub departments found"}
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="all">All Sub Departments</SelectItem>
                      {subDepartments.map((subDept) => (
                        <SelectItem key={subDept.id} value={subDept.id}>
                          {subDept.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={filters.employeeId === "all" ? undefined : filters.employeeId}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      employeeId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {filteredEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{e.employeeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {e.employeeId}
                            {e.departmentName && ` • ${e.departmentName}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Deduction Type</Label>
              <Select
                value={filters.deductionHeadId === "all" ? undefined : filters.deductionHeadId}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, deductionHeadId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deduction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {deductionHeads.map((head) => (
                    <SelectItem key={head.id} value={head.id}>
                      {head.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={filters.month || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, month: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNum = String(i + 1).padStart(2, "0");
                    const monthNames = [
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ];
                    return (
                      <SelectItem key={monthNum} value={monthNum}>
                        {monthNames[i]}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={filters.year}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, year: e.target.value }))
                }
                placeholder="e.g., 2024"
                min="2020"
                max="2099"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto">
            <DataTable
              columns={columns}
              data={data}
              searchFields={[
                { key: "employeeName", label: "Employee Name" },
                { key: "employeeCode", label: "Employee ID" },
                { key: "department", label: "Department" },
                { key: "deductionHeadName", label: "Deduction Type" },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
