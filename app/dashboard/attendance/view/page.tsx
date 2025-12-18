"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";
import { Loader2, Search, Download, Printer } from "lucide-react";
import { getEmployees } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { getAttendances, type Attendance } from "@/lib/actions/attendance";
import type { Employee } from "@/lib/actions/employee";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  halfDayDays: number;
  shortDays: number;
  leaves: number;
  onLeaveDays: number;
}

export default function ViewEmployeeAttendanceListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Initialize filters from URL params or defaults
  const getInitialDateRange = (): DateRange => {
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    return {
      from: fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: toDate ? new Date(toDate) : new Date(),
    };
  };

  const [filters, setFilters] = useState({
    employeeId: searchParams.get('employeeId') || "all",
    department: searchParams.get('department') || "all",
    subDepartment: searchParams.get('subDepartment') || "all",
  });

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());

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
      updateFilters({
        employeeId: "all",
        department: "all",
        subDepartment: "all",
      });
    } else {
      const selectedEmployee = employees.find((e) => e.id === employeeId);
      if (selectedEmployee) {
        updateFilters({
          employeeId,
          department: selectedEmployee.department || "all",
          subDepartment: selectedEmployee.subDepartment || "all",
        });
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

  // Calculate attendance summary from actual attendance records
  const attendanceData = useMemo(() => {
    if (!attendanceRecords.length) return [];

    // Group attendance records by employee
    const employeeMap = new Map<string, {
      employee: Employee;
      records: Attendance[];
    }>();

    // First, map attendance records to employees
    attendanceRecords.forEach(record => {
      const empId = record.employeeId;
      if (!employeeMap.has(empId)) {
        const employee = employees.find(e => e.id === empId);
        if (employee) {
          employeeMap.set(empId, {
            employee,
            records: [record],
          });
        }
      } else {
        employeeMap.get(empId)!.records.push(record);
      }
    });

    // Calculate statistics for each employee
    const summaries: AttendanceSummary[] = [];

    employeeMap.forEach(({ employee, records }) => {
      // Apply department and sub-department filters if set
      if (filters.department && filters.department !== "all" && employee.department !== filters.department) {
        return; // Skip this employee if department doesn't match
      }
      if (filters.subDepartment && filters.subDepartment !== "all" && employee.subDepartment !== filters.subDepartment) {
        return; // Skip this employee if sub-department doesn't match
      }

      const totalDays = records.length;
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let earlyLeaveDays = 0;
      let halfDayDays = 0;
      let shortDays = 0;
      let onLeaveDays = 0;

      records.forEach(record => {
        const status = record.status?.toLowerCase() || '';
        
        if (status === 'present') {
          presentDays++;
          if (record.lateMinutes && record.lateMinutes > 0) {
            lateDays++;
          }
        } else if (status === 'late') {
          presentDays++;
          lateDays++;
        } else if (status === 'absent') {
          absentDays++;
        } else if (status === 'half-day' || status === 'halfday') {
          halfDayDays++;
          presentDays++; // Half day is partially present
        } else if (status === 'short-day' || status === 'shortday') {
          shortDays++;
          presentDays++; // Short day is still present
        } else if (status === 'on-leave' || status === 'onleave') {
          onLeaveDays++;
        }

        if (record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0) {
          earlyLeaveDays++;
        }
      });

      summaries.push({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.departmentName || getDepartmentName(employee.department) || "N/A",
        subDepartment: employee.subDepartmentName || (employee.subDepartment ? getSubDepartmentName(employee.subDepartment) : "N/A"),
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        earlyLeaveDays,
        halfDayDays,
        shortDays,
        leaves: onLeaveDays,
        onLeaveDays,
      });
    });

    return summaries;
  }, [attendanceRecords, employees, filters.department, filters.subDepartment, getDepartmentName, getSubDepartmentName]);

  // Update URL params when filters change
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    const params = new URLSearchParams();
    if (updated.employeeId !== "all") params.set('employeeId', updated.employeeId);
    if (updated.department !== "all") params.set('department', updated.department);
    if (updated.subDepartment !== "all") params.set('subDepartment', updated.subDepartment);
    if (dateRange.from) params.set('fromDate', dateRange.from.toISOString());
    if (dateRange.to) params.set('toDate', dateRange.to.toISOString());
    
    router.push(`/dashboard/attendance/view?${params.toString()}`);
  };

  // Update date range and URL
  const updateDateRange = (range: DateRange) => {
    setDateRange(range);
    const params = new URLSearchParams(searchParams.toString());
    if (range.from) params.set('fromDate', range.from.toISOString());
    if (range.to) params.set('toDate', range.to.toISOString());
    router.push(`/dashboard/attendance/view?${params.toString()}`);
  };

  // Fetch attendance records when filters or date range changes
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!dateRange.from || !dateRange.to) {
        setAttendanceRecords([]);
        return;
      }

      if (dateRange.from > dateRange.to) {
        return; // Invalid date range
      }

      try {
        setLoadingAttendance(true);
        
        // Build query filters
        const queryFilters: {
          dateFrom?: Date;
          dateTo?: Date;
          employeeId?: string;
        } = {
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
        };

        // If specific employee is selected, filter by employee
        if (filters.employeeId && filters.employeeId !== "all") {
          queryFilters.employeeId = filters.employeeId;
        }

        const result = await getAttendances(queryFilters);

        if (result.status && result.data) {
          setAttendanceRecords(result.data);
        } else {
          setAttendanceRecords([]);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendanceRecords([]);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.employeeId, dateRange.from, dateRange.to]);

  const handleSearch = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select both from date and to date");
      return;
    }
    if (dateRange.from > dateRange.to) {
      toast.error("From date cannot be greater than to date");
      return;
    }

    // Trigger refetch by updating URL
    updateDateRange(dateRange);
  };

  const handleExport = () => {
    if (attendanceData.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Create CSV content
      const headers = [
        "S.No",
        "Employee ID",
        "Employee Name",
        "Department",
        "Sub Department",
        "Total Days",
        "Present",
        "Absent",
        "Late",
        "Early Leave",
        "Half Day",
        "Short Days",
        "Leaves",
      ];

      const rows = attendanceData.map((record, index) => [
        index + 1,
        record.employeeId,
        record.employeeName,
        record.department,
        record.subDepartment,
        record.totalDays,
        record.presentDays,
        record.absentDays,
        record.lateDays,
        record.earlyLeaveDays,
        record.halfDayDays,
        record.shortDays,
        record.leaves,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const fromDateStr = dateRange.from ? dateRange.from.toISOString().split('T')[0] : '';
      const toDateStr = dateRange.to ? dateRange.to.toISOString().split('T')[0] : '';
      link.setAttribute("download", `attendance_${fromDateStr}_to_${toDateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const handlePrint = () => {
    if (attendanceData.length === 0) {
      toast.error("No data to print");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Employee Attendance Report</h1>
          <p><strong>Date Range:</strong> ${dateRange.from ? dateRange.from.toLocaleDateString() : ''} to ${dateRange.to ? dateRange.to.toLocaleDateString() : ''}</p>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Sub Department</th>
                <th class="text-right">Total Days</th>
                <th class="text-right">Present</th>
                <th class="text-right">Absent</th>
                <th class="text-right">Late</th>
                <th class="text-right">Early Leave</th>
                <th class="text-right">Half Day</th>
                <th class="text-right">Short Days</th>
                <th class="text-right">Leaves</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceData
                .map(
                  (record, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${record.employeeId}</td>
                  <td>${record.employeeName}</td>
                  <td>${record.department}</td>
                  <td>${record.subDepartment}</td>
                  <td class="text-right">${record.totalDays}</td>
                  <td class="text-right">${record.presentDays}</td>
                  <td class="text-right">${record.absentDays}</td>
                  <td class="text-right">${record.lateDays}</td>
                  <td class="text-right">${record.earlyLeaveDays}</td>
                  <td class="text-right">${record.halfDayDays}</td>
                  <td class="text-right">${record.shortDays}</td>
                  <td class="text-right">${record.leaves}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
              <Label>Employee</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Autocomplete
                  options={[
                    { value: "all", label: "All Employees" },
                    ...employees.map((emp) => ({
                      value: emp.id,
                      label: `${emp.employeeName} (${emp.employeeId})`,
                    })),
                  ]}
                  value={filters.employeeId}
                  onValueChange={handleEmployeeChange}
                  placeholder="Select employee"
                  searchPlaceholder="Search employee..."
                  emptyMessage="No employees found"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Autocomplete
                  options={[
                    { value: "all", label: "All Departments" },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                    })),
                  ]}
                  value={filters.department}
                  onValueChange={(value) =>
                    updateFilters({ department: value || "all", subDepartment: "all" })
                  }
                  placeholder="Select department"
                  searchPlaceholder="Search department..."
                  emptyMessage="No departments found"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Sub Department</Label>
              {loading || loadingSubDepartments ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Autocomplete
                  options={[
                    { value: "all", label: "All Sub Departments" },
                    ...subDepartments.map((subDept) => ({
                      value: subDept.id,
                      label: subDept.name,
                    })),
                  ]}
                  value={filters.subDepartment}
                  onValueChange={(value) =>
                    updateFilters({ subDepartment: value || "all" })
                  }
                  placeholder={filters.department && filters.department !== "all" ? "Select sub-department" : "Select department first"}
                  searchPlaceholder="Search sub department..."
                  emptyMessage="No sub departments found"
                  disabled={!filters.department || filters.department === "all" || loadingSubDepartments}
                  isLoading={loadingSubDepartments}
                />
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Date Range</Label>
              <DateRangePicker
                initialDateFrom={dateRange.from}
                initialDateTo={dateRange.to}
                showCompare={false}
                onUpdate={(values) => {
                  if (values.range) {
                    updateDateRange(values.range);
                  }
                }}

              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading || !dateRange.from || !dateRange.to || loadingAttendance}>
              {loadingAttendance ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
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
              onClick={() => {
                setFilters({
                  employeeId: "all",
                  department: "all",
                  subDepartment: "all",
                });
                const defaultRange = {
                  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  to: new Date(),
                };
                updateDateRange(defaultRange);
                router.push('/dashboard/attendance/view');
              }}
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
          {loadingAttendance ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading attendance records...</span>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {dateRange.from && dateRange.to
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
                    <TableHead className="text-right">Half Day</TableHead>
                    <TableHead className="text-right">Short Days</TableHead>
                    <TableHead className="text-right">Leaves</TableHead>
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
                      <TableCell className="text-right text-green-600 font-medium">{record.presentDays}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{record.absentDays}</TableCell>
                      <TableCell className="text-right text-yellow-600 font-medium">{record.lateDays}</TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">{record.earlyLeaveDays}</TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">{record.halfDayDays}</TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">{record.shortDays}</TableCell>
                      <TableCell className="text-right text-cyan-600 font-medium">{record.leaves}</TableCell>
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

