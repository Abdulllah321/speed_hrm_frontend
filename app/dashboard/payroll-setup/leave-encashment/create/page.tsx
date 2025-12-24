"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/ui/date-picker";
import { Search, ArrowLeft, Plus, Minus, Printer, Download } from "lucide-react";
import Link from "next/link";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { toast } from "sonner";
import { format } from "date-fns";
import DataTable, { HighlightText } from "@/components/common/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export default function CreateLeaveEncashmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sample data structure for results
  interface LeaveEncashmentResult {
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    country?: string;
    province?: string;
    city?: string;
    area?: string;
    station?: string;
    department?: string;
    subDepartment?: string;
    designation?: string;
    encashmentDate: string;
    encashmentDays: number;
    gross: number;
    annual: number;
    perDay: number;
    totalEncashment: number;
  }

  interface LeaveEncashmentRow extends LeaveEncashmentResult {
    sNo: number;
  }

  const [filters, setFilters] = useState({
    departmentId: "",
    subDepartmentId: "",
    employeeId: "",
    encashmentDate: "",
  });

  // Fetch departments on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const deptResult = await getDepartments();
        if (deptResult.status && deptResult.data) {
          setDepartments(deptResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
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
      }
    };

    fetchEmployees();
  }, []);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDepartments = async () => {
      if (filters.departmentId) {
        setLoadingSubDepartments(true);
        try {
          const result = await getSubDepartmentsByDepartment(filters.departmentId);
          if (result.status && result.data) {
            setSubDepartments(result.data);
          } else {
            setSubDepartments([]);
          }
        } catch (error) {
          console.error("Failed to fetch sub-departments:", error);
          setSubDepartments([]);
        } finally {
          setLoadingSubDepartments(false);
        }
      } else {
        setSubDepartments([]);
        setFilters((prev) => ({ ...prev, subDepartmentId: "" }));
      }
    };

    fetchSubDepartments();
  }, [filters.departmentId]);

  // Filter employees based on department and sub-department
  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    if (filters.departmentId) {
      filtered = filtered.filter((emp) => emp.departmentId === filters.departmentId);
    }

    if (filters.subDepartmentId) {
      filtered = filtered.filter((emp) => emp.subDepartmentId === filters.subDepartmentId);
    }

    return filtered;
  }, [employees, filters.departmentId, filters.subDepartmentId]);

  // Employee options for Autocomplete
  const employeeOptions = useMemo(() => {
    return filteredEmployees.map((emp) => ({
      value: emp.id,
      label: `${emp.employeeId} -- ${emp.employeeName}`,
      description: emp.departmentName || undefined,
    }));
  }, [filteredEmployees]);

  const handleSearch = async () => {
    if (!filters.encashmentDate) {
      toast.error("Encashment Date is required");
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // const result = await searchLeaveEncashment({
      //   employeeIds: filters.employeeId ? [filters.employeeId] : filteredEmployees.map(e => e.id),
      //   encashmentDate: filters.encashmentDate,
      //   departmentId: filters.departmentId || undefined,
      //   subDepartmentId: filters.subDepartmentId || undefined,
      // });

      // Temporary sample data for frontend-only implementation
      const selectedEmployees = filters.employeeId 
        ? filteredEmployees.filter(e => e.id === filters.employeeId)
        : filteredEmployees;

      const sampleResults: LeaveEncashmentResult[] = selectedEmployees.map((emp) => ({
        id: emp.id,
        employeeId: emp.employeeId,
        employeeCode: emp.employeeId,
        employeeName: emp.employeeName,
        country: "Pakistan",
        province: "Sindh",
        city: "Karachi",
        area: "Karachi",
        station: "HeadOffice",
        department: emp.departmentName || "—",
        subDepartment: "",
        designation: "—",
        encashmentDate: filters.encashmentDate,
        encashmentDays: 12,
        gross: 0,
        annual: 0,
        perDay: 0,
        totalEncashment: 0,
      }));

      setSearchResults(sampleResults);
      toast.success(`Found ${sampleResults.length} employee(s). Backend integration pending.`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to search leave encashment records");
    } finally {
      setIsSearching(false);
    }
  };

  const handleEncashmentDaysChangeById = (id: string, delta: number) => {
    setSearchResults((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newDays = Math.max(0, r.encashmentDays + delta);
        const newTotal = r.perDay > 0 ? newDays * r.perDay : r.totalEncashment;
        return { ...r, encashmentDays: newDays, totalEncashment: newTotal };
      })
    );
  };

  const handleEncashmentDaysInputChangeById = (id: string, value: string) => {
    const days = Math.max(0, parseFloat(value) || 0);
    setSearchResults((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newTotal = r.perDay > 0 ? days * r.perDay : r.totalEncashment;
        return { ...r, encashmentDays: days, totalEncashment: newTotal };
      })
    );
  };

  const handleTotalEncashmentChangeById = (id: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setSearchResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, totalEncashment: amount } : r))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (searchResults.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "S.No",
      "Employee Name",
      "Employee Code",
      "Encashment Date",
      "Encashment Days",
      "Total Encashment",
    ];

    const rows = searchResults.map((result, index) => [
      index + 1,
      `(${result.employeeCode}) ${result.employeeName}`,
      result.employeeCode,
      result.encashmentDate ? format(new Date(result.encashmentDate), "dd-MMM-yyyy") : "—",
      result.encashmentDays.toString(),
      result.totalEncashment.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leave_encashment_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Data exported successfully");
  };

  const handleClearForm = () => {
    setFilters({
      departmentId: "",
      subDepartmentId: "",
      employeeId: "",
      encashmentDate: "",
    });
    setSearchResults([]);
  };

  const tableData: LeaveEncashmentRow[] = useMemo(
    () =>
      searchResults.map((r, i) => ({
        ...r,
        sNo: i + 1,
      })),
    [searchResults]
  );

  const columns: ColumnDef<LeaveEncashmentRow>[] = useMemo(
    () => [
      {
        header: "S.No",
        accessorKey: "sNo",
        enableSorting: false,
        size: 60,
        cell: ({ row }) => row.original.sNo,
      },
      {
        header: "Employee Name",
        accessorKey: "employeeName",
        size: 220,
        cell: ({ row }) => (
          <HighlightText
            text={`(${row.original.employeeCode}) ${row.original.employeeName}`}
          />
        ),
      },
      {
        header: "Emp Details",
        accessorKey: "department",
        size: 240,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs space-y-0.5">
            <div>Country: {row.original.country || "—"}</div>
            <div>Province: {row.original.province || "—"}</div>
            <div>City: {row.original.city || "—"}</div>
            <div>Area: {row.original.area || "—"}</div>
            <div>Stn: {row.original.station || "—"}</div>
            <div>Dept: {row.original.department || "—"}</div>
            <div>Sub-Dept: {row.original.subDepartment || "—"}</div>
            <div>Designation: {row.original.designation || "—"}</div>
          </div>
        ),
      },
      {
        header: "Encashment Period",
        accessorKey: "encashmentDate",
        size: 160,
        cell: ({ row }) =>
          `Effected Date: ${
            row.original.encashmentDate
              ? format(new Date(row.original.encashmentDate), "dd-MMM-yyyy")
              : "—"
          }`,
      },
      {
        header: "Encashment Days",
        accessorKey: "encashmentDays",
        size: 180,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEncashmentDaysChangeById(row.original.id, -1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={row.original.encashmentDays}
              onChange={(e) =>
                handleEncashmentDaysInputChangeById(row.original.id, e.target.value)
              }
              className="w-16 h-8 text-center"
              min="0"
              step="0.5"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEncashmentDaysChangeById(row.original.id, 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
      {
        header: "Salary Details",
        accessorKey: "gross",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs space-y-0.5">
            <div>Gross: {row.original.gross.toLocaleString("en-US")}</div>
            <div>Annual: {row.original.annual.toLocaleString("en-US")}</div>
            <div>PerDay: {row.original.perDay.toLocaleString("en-US")}</div>
          </div>
        ),
      },
      {
        header: "Total Encashment",
        accessorKey: "totalEncashment",
        size: 160,
        cell: ({ row }) => (
          <Input
            type="number"
            value={row.original.totalEncashment}
            onChange={(e) =>
              handleTotalEncashmentChangeById(row.original.id, e.target.value)
            }
            min="0"
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/payroll-setup/leave-encashment/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card className="border-0 shadow-none">
       <CardHeader className="pb-4 bg-background">
  <div className="flex items-center justify-between">
    <div>
      <CardTitle className="text-2xl font-bold text-foreground">
        Leave Encashment Form
      </CardTitle>
      <CardDescription className="mt-1 text-muted-foreground">
        Filter and view leave encashment records
      </CardDescription>
    </div>

    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  </div>
</CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded-md animate-pulse" />
              ) : (
                <Autocomplete
                  options={[
                    { value: "", label: "Select Department" },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                    })),
                  ]}
                  value={filters.departmentId}
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      departmentId: value || "",
                      subDepartmentId: "",
                      employeeId: "",
                    });
                  }}
                  placeholder="Select Department"
                  searchPlaceholder="Search department..."
                  emptyMessage="No departments found"
                />
              )}
            </div>

            {/* Sub Department */}
            <div className="space-y-2">
              <Label htmlFor="subDepartment">Sub Department</Label>
              {loadingSubDepartments ? (
                <div className="h-10 bg-muted rounded-md animate-pulse" />
              ) : (
                <Autocomplete
                  options={[
                    { value: "", label: subDepartments.length === 0 ? "No Record Found" : "Select Sub Department" },
                    ...subDepartments.map((subDept) => ({
                      value: subDept.id,
                      label: subDept.name,
                    })),
                  ]}
                  value={filters.subDepartmentId}
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      subDepartmentId: value || "",
                      employeeId: "",
                    });
                  }}
                  placeholder={!filters.departmentId ? "Select department first" : subDepartments.length === 0 ? "No Record Found" : "Select Sub Department"}
                  searchPlaceholder="Search sub department..."
                  emptyMessage="No sub departments found"
                  disabled={!filters.departmentId || subDepartments.length === 0}
                />
              )}
            </div>

            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employee">
                Employee <span className="text-destructive">*</span>
              </Label>
              <Autocomplete
                options={employeeOptions}
                value={filters.employeeId}
                onValueChange={(value) => {
                  setFilters({ ...filters, employeeId: value || "" });
                }}
                placeholder={filters.employeeId ? `All selected (${filteredEmployees.length})` : "Select Employee"}
                searchPlaceholder="Search employees..."
                emptyMessage="No employees found"
              />
            </div>

            {/* Encashment Date */}
            <div className="space-y-2">
              <Label htmlFor="encashmentDate">
                Encashment Date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={filters.encashmentDate}
                onChange={(value) => {
                  setFilters({ ...filters, encashmentDate: value || "" });
                }}
                placeholder="Select Encashment Date"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-end">
            <Button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {tableData.length > 0 && (
            <DataTable<LeaveEncashmentRow>
              columns={columns}
              data={tableData}
              searchFields={[
                { key: "employeeName", label: "Employee Name" },
                { key: "employeeCode", label: "Employee Code" },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

