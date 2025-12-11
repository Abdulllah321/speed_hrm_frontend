"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Loader2, Search, Download, Printer } from "lucide-react";
import { getEmployees } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import type { Employee } from "@/lib/actions/employee";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ViewEmployeeAttendanceListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);

  const [filters, setFilters] = useState({
    employeeId: "all",
    department: "all",
    subDepartment: "all",
    fromDate: "",
    toDate: "",
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesResult, departmentsResult] = await Promise.all([
          getEmployees(),
          getDepartments(),
        ]);

        if (employeesResult.status && employeesResult.data) {
          setEmployees(employeesResult.data);
        } else {
          toast.error(employeesResult.message || "Failed to load employees");
        }

        if (departmentsResult.status && departmentsResult.data) {
          setDepartments(departmentsResult.data);
        } else {
          toast.error(departmentsResult.message || "Failed to load departments");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDepartments = async () => {
      if (!filters.department || filters.department === "all") {
        setSubDepartments([]);
        return;
      }

      try {
        setLoadingSubDepartments(true);
        const result = await getSubDepartmentsByDepartment(filters.department);
        if (result.status && result.data) {
          setSubDepartments(result.data);
        } else {
          setSubDepartments([]);
        }
      } catch (error) {
        console.error("Error fetching sub-departments:", error);
        setSubDepartments([]);
      } finally {
        setLoadingSubDepartments(false);
      }
    };

    fetchSubDepartments();
  }, [filters.department]);

  // Handle employee selection - auto-populate department and sub-department
  const handleEmployeeChange = (employeeId: string) => {
    if (employeeId === "all") {
      setFilters((prev) => ({
        ...prev,
        employeeId: "all",
        department: "all",
        subDepartment: "all",
      }));
    } else {
      const selectedEmployee = employees.find((e) => e.id === employeeId);
      if (selectedEmployee) {
        setFilters((prev) => ({
          ...prev,
          employeeId,
          department: selectedEmployee.department || "all",
          subDepartment: selectedEmployee.subDepartment || "all",
        }));
      }
    }
  };

  // Get department name for display
  const getDepartmentName = useMemo(() => {
    return (deptId: string) => {
      const dept = departments.find((d) => d.id === deptId);
      return dept?.name || deptId;
    };
  }, [departments]);

  // Get sub-department name for display
  const getSubDepartmentName = useMemo(() => {
    return (subDeptId: string) => {
      const subDept = subDepartments.find((sd) => sd.id === subDeptId);
      return subDept?.name || subDeptId;
    };
  }, [subDepartments]);

  // Filter employees based on selected filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (filters.employeeId && filters.employeeId !== "all") {
      filtered = filtered.filter((e) => e.id === filters.employeeId);
    }

    if (filters.department && filters.department !== "all") {
      filtered = filtered.filter((e) => e.department === filters.department);
    }

    if (filters.subDepartment && filters.subDepartment !== "all") {
      filtered = filtered.filter((e) => e.subDepartment === filters.subDepartment);
    }

    return filtered;
  }, [employees, filters.employeeId, filters.department, filters.subDepartment]);

  // Mock attendance data - replace with actual API call
  const attendanceData = useMemo(() => {
    // This would come from an API call filtered by dates
    return filteredEmployees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      department: emp.departmentName || getDepartmentName(emp.department) || "N/A",
      subDepartment: emp.subDepartmentName || (emp.subDepartment ? getSubDepartmentName(emp.subDepartment) : "N/A"),
      // Mock attendance data - replace with actual data
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0,
    }));
  }, [filteredEmployees, getDepartmentName, getSubDepartmentName]);

  const handleSearch = () => {
    if (!filters.fromDate || !filters.toDate) {
      toast.error("Please select both from date and to date");
      return;
    }
    if (new Date(filters.fromDate) > new Date(filters.toDate)) {
      toast.error("From date cannot be greater than to date");
      return;
    }
    // TODO: Call API to fetch attendance data for the selected date range
    toast.success("Searching attendance records...");
  };

  const handleExport = () => {
    // TODO: Export filtered data to CSV
    toast.success("Exporting data...");
  };

  const handlePrint = () => {
    // TODO: Print attendance list
    toast.success("Preparing print...");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">View Employee Attendance List</h2>
          <p className="text-muted-foreground">View and filter employee attendance records</p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter attendance records by employee, department, and date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={filters.employeeId}
                  onValueChange={handleEmployeeChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employeeName} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={filters.department}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, department: value, subDepartment: "all" }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
              )}
            </div>

            <div className="space-y-2">
              <Label>Sub Department</Label>
              {loading || loadingSubDepartments ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={filters.subDepartment}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, subDepartment: value }))
                  }
                  disabled={loading || !filters.department || filters.department === "all" || loadingSubDepartments}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filters.department && filters.department !== "all" ? "Select sub-department" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub Departments</SelectItem>
                    {subDepartments.map((subDept) => (
                      <SelectItem key={subDept.id} value={subDept.id}>
                        {subDept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <DatePicker
                value={filters.fromDate}
                onChange={(value) => setFilters((prev) => ({ ...prev, fromDate: value || "" }))}
                placeholder="Select from date"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <DatePicker
                value={filters.toDate}
                onChange={(value) => setFilters((prev) => ({ ...prev, toDate: value || "" }))}
                placeholder="Select to date"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading || !filters.fromDate || !filters.toDate}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={attendanceData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={attendanceData.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  employeeId: "all",
                  department: "all",
                  subDepartment: "all",
                  fromDate: "",
                  toDate: "",
                })
              }
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {attendanceData.length > 0
              ? `Showing ${attendanceData.length} employee(s)`
              : "No attendance records found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filters.fromDate && filters.toDate
                ? "No attendance records found for the selected filters"
                : "Please select date range and click Search to view attendance records"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">S.No</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Sub Department</TableHead>
                    <TableHead className="text-right">Total Days</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Early Leave</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((record, index) => (
                    <TableRow key={record.employeeId}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{record.employeeId}</TableCell>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.subDepartment}</TableCell>
                      <TableCell className="text-right">{record.totalDays}</TableCell>
                      <TableCell className="text-right text-green-600">{record.presentDays}</TableCell>
                      <TableCell className="text-right text-red-600">{record.absentDays}</TableCell>
                      <TableCell className="text-right text-yellow-600">{record.lateDays}</TableCell>
                      <TableCell className="text-right text-orange-600">{record.earlyLeaveDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

