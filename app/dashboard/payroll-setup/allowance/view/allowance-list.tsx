"use client";

import { useState, useEffect, useMemo } from "react";
import DataTable from "@/components/common/data-table";
import { columns, type AllowanceRow } from "./columns";
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
import { Search, Printer, Download } from "lucide-react";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { toast } from "sonner";
import { format } from "date-fns";

interface AllowanceListProps {
  initialData?: AllowanceRow[];
}

export function AllowanceList({ initialData = [] }: AllowanceListProps) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [filters, setFilters] = useState({
    department: "all",
    subDepartment: "all",
    employeeId: "",
    monthlyRecurring: "",
    fromMonthYear: "",
    toMonthYear: "",
  });

  const [data, setData] = useState<AllowanceRow[]>(initialData);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const result = await getDepartments();
        if (result.status && result.data) {
          setDepartments(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    fetchDepartments();
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
    if (!filters.employeeId || !filters.monthlyRecurring || !filters.fromMonthYear || !filters.toMonthYear) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Replace with actual API call
      // const result = await searchAllowances(filters);
      // For now, using mock data
      const mockData: AllowanceRow[] = [];
      setData(mockData);
      toast.success("Search completed");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to search allowances");
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
      "EMP ID",
      "Emp Name",
      "Department",
      "Sub Department",
      "Allowance Type",
      "Monthly/Recurring",
      "Month-Year",
      "Amount",
      "Status",
    ];

    const rows = data.map((row) => [
      row.sNo,
      row.empId,
      row.empName,
      row.department,
      row.subDepartment,
      row.allowanceType,
      row.monthlyRecurring,
      row.monthYear,
      row.amount.toString(),
      row.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `allowance_list_${format(new Date(), "yyyy-MM-dd")}.csv`;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            View Employee Allowance List
          </h2>
          <p className="text-muted-foreground">
            Search and view employee allowance records
          </p>
        </div>
        <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Use filters to search for allowance records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    department: value,
                    subDepartment: "all",
                    employeeId: "",
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
                value={filters.subDepartment}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    subDepartment: value,
                    employeeId: "",
                  }))
                }
                disabled={filters.department === "all" || !filters.department || subDepartments.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Record Found" />
                </SelectTrigger>
                <SelectContent>
                  {subDepartments.length === 0 ? (
                    <SelectItem value="no-subdept" disabled>
                      No Record Found
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
              <Label>
                Employee <span className="text-red-500">*</span>
              </Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={filters.employeeId}
                  onValueChange={async (value) => {
                    const selectedEmp = employees.find((e) => e.id === value);
                    if (selectedEmp) {
                      // Auto-select department from employee
                      const empDepartmentId = selectedEmp.departmentId || "all";
                      
                      // Fetch sub-departments for the employee's department
                      if (selectedEmp.departmentId) {
                        try {
                          const result = await getSubDepartmentsByDepartment(selectedEmp.departmentId);
                          if (result.status && result.data) {
                            setSubDepartments(result.data);
                          }
                        } catch (error) {
                          console.error("Failed to fetch sub-departments:", error);
                        }
                      }
                      
                      // Update filters with employee's department and sub-department
                      setFilters((prev) => ({
                        ...prev,
                        employeeId: value,
                        department: empDepartmentId,
                        subDepartment: selectedEmp.subDepartmentId || "all",
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmployees.length === 0 ? (
                      <SelectItem value="no-employees" disabled>
                        No employees found
                      </SelectItem>
                    ) : (
                      filteredEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.employeeId} -- {e.employeeName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Recurring/Monthly <span className="text-red-500">*</span>
              </Label>
              <Select
                value={filters.monthlyRecurring}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, monthlyRecurring: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>
                From Month-Year <span className="text-red-500">*</span>
              </Label>
              <Input
                type="month"
                value={filters.fromMonthYear}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, fromMonthYear: e.target.value }))
                }
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>
                To Month-Year <span className="text-red-500">*</span>
              </Label>
              <Input
                type="month"
                value={filters.toMonthYear}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, toMonthYear: e.target.value }))
                }
                className="w-full"
              />
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

      <div className="w-full max-w-full overflow-x-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchFields={[
            { key: "empName", label: "Employee Name" },
            { key: "empId", label: "Employee ID" },
            { key: "department", label: "Department" },
          ]}
        />
      </div>
    </div>
  );
}

