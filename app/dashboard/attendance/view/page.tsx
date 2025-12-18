"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";
import { Loader2, Download, Printer, CalendarDays, Clock, UserCircle } from "lucide-react";
import { getEmployees } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { getAttendances, type Attendance } from "@/lib/actions/attendance";
import type { Employee } from "@/lib/actions/employee";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, eachDayOfInterval, isWeekend, isSameDay } from "date-fns";
import { getHolidays } from "@/lib/actions/holiday";

interface Holiday {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

interface DailyAttendanceRecord {
  date: Date;
  dayOfWeek: string;
  serialNo: number;
  status: "present" | "absent" | "holiday" | "weekly-off" | "leave" | "late" | "half-day";
  checkIn?: string | null;
  checkOut?: string | null;
  workingHours?: number | null;
  overtimeHours?: number | null;
  isHoliday: boolean;
  holidayName?: string;
  isWeeklyOff: boolean;
  isOvertime: boolean; // Present on holiday/weekly-off
  notes?: string | null;
}

export default function ViewEmployeeAttendanceDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Initialize filters - Department first, then sub-department, then employee
  const [filters, setFilters] = useState({
    department: searchParams.get('department') || "all",
    subDepartment: searchParams.get('subDepartment') || "all",
    employeeId: searchParams.get('employeeId') || "",
  });

  // Default date range: current month
  const getInitialDateRange = (): DateRange => {
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const now = new Date();
    return {
      from: fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1),
      to: toDate ? new Date(toDate) : now,
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesResult, departmentsResult, holidaysResult] = await Promise.all([
          getEmployees(),
          getDepartments(),
          getHolidays(),
        ]);

        if (employeesResult.status && employeesResult.data) {
          setEmployees(employeesResult.data);
        } else {
          toast.error(employeesResult.message || "Failed to load employees");
        }

        if (departmentsResult.status && departmentsResult.data) {
          setDepartments(departmentsResult.data);
        }

        if (holidaysResult.status && holidaysResult.data) {
          setHolidays(holidaysResult.data);
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

  // Filter employees based on department/sub-department (frontend filtering)
  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (filters.department && filters.department !== "all") {
      const dept = departments.find((d) => d.id === filters.department);
      if (dept) {
        result = result.filter(
          (emp) =>
            emp.departmentName === dept.name ||
            emp.department === dept.name ||
            emp.department === filters.department
        );
      }
    }

    if (filters.subDepartment && filters.subDepartment !== "all") {
      const subDept = subDepartments.find((sd) => sd.id === filters.subDepartment);
      if (subDept) {
        result = result.filter(
          (emp) =>
            emp.subDepartmentName === subDept.name ||
            emp.subDepartment === subDept.name ||
            emp.subDepartment === filters.subDepartment
        );
      }
    }

    return result;
  }, [employees, filters.department, filters.subDepartment, departments, subDepartments]);

  // Get selected employee details
  const selectedEmployee = useMemo(() => {
    if (!filters.employeeId) return null;
    return employees.find((e) => e.id === filters.employeeId) || null;
  }, [employees, filters.employeeId]);

  // Check if a date is a holiday
  const isHolidayDate = (date: Date): { isHoliday: boolean; name?: string } => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    for (const holiday of holidays) {
      if (holiday.status !== 'active') continue;
      
      const from = new Date(holiday.dateFrom);
      const to = new Date(holiday.dateTo);
      const fromMonth = from.getMonth() + 1;
      const fromDay = from.getDate();
      const toMonth = to.getMonth() + 1;
      const toDay = to.getDate();
      
      if (fromMonth === toMonth) {
        if (month === fromMonth && day >= fromDay && day <= toDay) {
          return { isHoliday: true, name: holiday.name };
        }
      } else {
        if ((month === fromMonth && day >= fromDay) || (month === toMonth && day <= toDay)) {
          return { isHoliday: true, name: holiday.name };
        }
      }
    }
    return { isHoliday: false };
  };

  // Generate daily attendance records for the selected date range
  const dailyRecords = useMemo((): DailyAttendanceRecord[] => {
    if (!dateRange.from || !dateRange.to || !filters.employeeId) {
      return [];
    }

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return days.map((date, index) => {
      const dayOfWeek = format(date, 'EEEE');
      const holidayInfo = isHolidayDate(date);
      const isWeeklyOffDay = isWeekend(date); // TODO: Check employee's working hours policy for custom weekly offs
      
      // Find attendance record for this date
      const attendanceRecord = attendanceRecords.find((record) => {
        const recordDate = new Date(record.date);
        return isSameDay(recordDate, date);
      });

      let status: DailyAttendanceRecord["status"] = "absent";
      let isOvertime = false;

      if (attendanceRecord) {
        const recordStatus = attendanceRecord.status?.toLowerCase() || '';
        
        if (holidayInfo.isHoliday || isWeeklyOffDay) {
          // Employee worked on a holiday or weekly off
          isOvertime = true;
          status = "present";
        } else if (recordStatus === 'present') {
          status = "present";
        } else if (recordStatus === 'late') {
          status = "late";
        } else if (recordStatus === 'half-day' || recordStatus === 'halfday') {
          status = "half-day";
        } else if (recordStatus === 'absent') {
          status = "absent";
        } else if (recordStatus === 'on-leave' || recordStatus === 'leave') {
          status = "leave";
        } else {
          status = "present";
        }
      } else {
        // No attendance record
        if (holidayInfo.isHoliday) {
          status = "holiday";
        } else if (isWeeklyOffDay) {
          status = "weekly-off";
        } else {
          status = "absent";
        }
      }

      return {
        date,
        dayOfWeek,
        serialNo: index + 1,
        status,
        checkIn: attendanceRecord?.checkIn || null,
        checkOut: attendanceRecord?.checkOut || null,
        workingHours: attendanceRecord?.workingHours || null,
        overtimeHours: attendanceRecord?.overtimeHours || null,
        isHoliday: holidayInfo.isHoliday,
        holidayName: holidayInfo.name,
        isWeeklyOff: isWeeklyOffDay,
        isOvertime,
        notes: attendanceRecord?.notes || null,
      };
    });
  }, [dateRange.from, dateRange.to, filters.employeeId, attendanceRecords, holidays]);

  // Update URL params
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
  };

  // Fetch attendance records when employee is selected and search is triggered
  const handleSearch = async () => {
    if (!filters.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select a date range");
      return;
    }

    try {
      setLoadingAttendance(true);
      setHasSearched(true);

      const result = await getAttendances({
        employeeId: filters.employeeId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });

      if (result.status && result.data) {
        setAttendanceRecords(result.data);
      } else {
        setAttendanceRecords([]);
        toast.error(result.message || "Failed to load attendance");
      }

      // Update URL
      const params = new URLSearchParams();
      if (filters.department !== "all") params.set('department', filters.department);
      if (filters.subDepartment !== "all") params.set('subDepartment', filters.subDepartment);
      params.set('employeeId', filters.employeeId);
      params.set('fromDate', dateRange.from.toISOString());
      params.set('toDate', dateRange.to.toISOString());
      router.push(`/dashboard/attendance/view?${params.toString()}`);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance records");
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const getStatusBadge = (record: DailyAttendanceRecord) => {
    if (record.isOvertime) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
          Overtime {record.isHoliday ? '(Holiday)' : '(Off Day)'}
        </Badge>
      );
    }

    switch (record.status) {
      case "present":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Present</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "holiday":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">{record.holidayName || 'Holiday'}</Badge>;
      case "weekly-off":
        return <Badge variant="secondary">Weekly Off</Badge>;
      case "leave":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">On Leave</Badge>;
      case "late":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Late</Badge>;
      case "half-day":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Half Day</Badge>;
      default:
        return <Badge variant="outline">{record.status}</Badge>;
    }
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return "-";
    try {
      const date = new Date(time);
      return format(date, 'hh:mm a');
    } catch {
      return time;
    }
  };

  const handleExport = () => {
    if (dailyRecords.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["S.No", "Date", "Day", "Clock In", "Clock Out", "Status", "Working Hours", "Overtime", "Notes"];
    const rows = dailyRecords.map((record) => [
      record.serialNo,
      format(record.date, 'dd MMM yyyy'),
      record.dayOfWeek,
      formatTime(record.checkIn),
      formatTime(record.checkOut),
      record.isOvertime ? `Overtime (${record.isHoliday ? 'Holiday' : 'Off Day'})` : record.status,
      record.workingHours ? `${record.workingHours}h` : '-',
      record.overtimeHours ? `${record.overtimeHours}h` : '-',
      record.notes || '-',
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${selectedEmployee?.employeeName || 'employee'}_${format(dateRange.from!, 'yyyy-MM-dd')}_to_${format(dateRange.to!, 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Data exported successfully");
  };

  const handlePrint = () => {
    if (dailyRecords.length === 0) {
      toast.error("No data to print");
      return;
    }
    window.print();
  };

  // Summary statistics
  const summary = useMemo(() => {
    const stats = {
      totalDays: dailyRecords.length,
      present: 0,
      absent: 0,
      holidays: 0,
      weeklyOffs: 0,
      leaves: 0,
      late: 0,
      overtime: 0,
    };

    dailyRecords.forEach((record) => {
      if (record.isOvertime) stats.overtime++;
      if (record.status === 'present' || record.status === 'late' || record.status === 'half-day') stats.present++;
      if (record.status === 'absent') stats.absent++;
      if (record.status === 'holiday') stats.holidays++;
      if (record.status === 'weekly-off') stats.weeklyOffs++;
      if (record.status === 'leave') stats.leaves++;
      if (record.status === 'late') stats.late++;
    });

    return stats;
  }, [dailyRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">View Employee Attendance Detail</h2>
          <p className="text-muted-foreground">View detailed daily attendance records for an employee</p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select department, employee, and date range to view attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  onValueChange={(value) => {
                    updateFilters({ 
                      department: value || "all", 
                      subDepartment: "all",
                      employeeId: "", // Reset employee when department changes
                    });
                  }}
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
                  onValueChange={(value) => {
                    updateFilters({ 
                      subDepartment: value || "all",
                      employeeId: "", // Reset employee when sub-department changes
                    });
                  }}
                  placeholder={filters.department !== "all" ? "Select sub-department" : "Select department first"}
                  searchPlaceholder="Search sub department..."
                  emptyMessage="No sub departments found"
                  disabled={!filters.department || filters.department === "all" || loadingSubDepartments}
                  isLoading={loadingSubDepartments}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Employee <span className="text-destructive">*</span></Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Autocomplete
                  options={filteredEmployees.map((emp) => ({
                    value: emp.id,
                    label: `${emp.employeeName} (${emp.employeeId})`,
                    description: emp.departmentName,
                  }))}
                  value={filters.employeeId}
                  onValueChange={(value) => updateFilters({ employeeId: value || "" })}
                  placeholder="Select employee"
                  searchPlaceholder="Search employee..."
                  emptyMessage="No employees found"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                initialDateFrom={dateRange.from}
                initialDateTo={dateRange.to}
                showCompare={false}
                onUpdate={(values) => {
                  if (values.range) {
                    setDateRange(values.range);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading || !filters.employeeId || loadingAttendance}>
              {loadingAttendance ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  View Attendance
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={dailyRecords.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={dailyRecords.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ department: "all", subDepartment: "all", employeeId: "" });
                setDateRange({
                  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  to: new Date(),
                });
                setAttendanceRecords([]);
                setHasSearched(false);
                router.push('/dashboard/attendance/view');
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Info & Summary */}
      {selectedEmployee && hasSearched && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-semibold">{selectedEmployee.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{selectedEmployee.employeeId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Present Days</p>
                  <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Absent Days</p>
                  <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Holidays</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.holidays}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Offs</p>
                  <p className="text-2xl font-bold text-gray-600">{summary.weeklyOffs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overtime Days</p>
                  <p className="text-2xl font-bold text-amber-600">{summary.overtime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Late Days</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Detail Table */}
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Daily Attendance Records</CardTitle>
          <CardDescription>
            {hasSearched && selectedEmployee
              ? `Showing ${dailyRecords.length} days for ${selectedEmployee.employeeName}`
              : "Select an employee and click 'View Attendance' to see records"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No Employee Selected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Select an employee from the filters above and click "View Attendance" to see their detailed daily attendance records.
              </p>
            </div>
          ) : loadingAttendance ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading attendance records...</span>
            </div>
          ) : dailyRecords.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No attendance records found for the selected date range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">S.No</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Day</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Clock In</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Clock Out</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Working Hours</th>
                    <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRecords.map((record, index) => (
                    <tr 
                      key={record.serialNo} 
                      className={cn(
                        "border-b transition-colors",
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/10",
                        record.status === 'absent' && "bg-red-50 dark:bg-red-950/20",
                        record.status === 'holiday' && "bg-purple-50 dark:bg-purple-950/20",
                        record.status === 'weekly-off' && "bg-gray-50 dark:bg-gray-950/20",
                        record.isOvertime && "bg-amber-50 dark:bg-amber-950/20",
                      )}
                    >
                      <td className="p-3 text-sm">{record.serialNo}</td>
                      <td className="p-3 text-sm font-medium">{format(record.date, 'dd MMM yyyy')}</td>
                      <td className="p-3 text-sm text-muted-foreground">{record.dayOfWeek}</td>
                      <td className="p-3 text-sm">
                        {record.checkIn ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-green-600" />
                            {formatTime(record.checkIn)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {record.checkOut ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-red-600" />
                            {formatTime(record.checkOut)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">{getStatusBadge(record)}</td>
                      <td className="p-3 text-sm">
                        {record.workingHours != null ? (
                          <span>
                            {Number(record.workingHours).toFixed(1)}h
                            {record.overtimeHours != null && Number(record.overtimeHours) > 0 && (
                              <span className="text-amber-600 ml-1">(+{Number(record.overtimeHours).toFixed(1)}h OT)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {record.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
