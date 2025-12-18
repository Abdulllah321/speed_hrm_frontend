"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import DataTable from "@/components/common/data-table";
import { columns } from "./columns";
import type { AttendanceProgressRow } from "./columns";
import type { Employee } from "@/lib/actions/employee";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { getDepartments, type Department } from "@/lib/actions/department";
import {
  getSubDepartmentsByDepartment,
  type SubDepartment,
} from "@/lib/actions/department";
import { getEmployees } from "@/lib/actions/employee";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import type { AttendanceProgress } from "@/lib/actions/attendance";

interface AttendanceProgressSummaryProps {
  initialData: AttendanceProgress[];
  employees: Employee[];
  departments: Department[];
  newItemId?: string;
}

// Column selection options - defined outside component as constant
const COLUMN_OPTIONS = [
  { value: "sNo", label: "S.no" },
  { value: "employee", label: "Employee" },
  { value: "empDetail", label: "Emp Detail" },
  { value: "days", label: "Days" },
  { value: "scheduleDays", label: "Schedule Days" },
  { value: "offDays", label: "Off Days" },
  { value: "present", label: "Present" },
  { value: "presentOnHoliday", label: "Present On Holiday" },
  { value: "leaves", label: "Leaves" },
  { value: "absents", label: "Absents" },
  { value: "late", label: "Late" },
  { value: "halfDay", label: "Half Day" },
  { value: "shortDays", label: "Short Days" },
  { value: "scheduleTime", label: "Schedule Time" },
  { value: "actualWorkedTime", label: "Actual Worked Time" },
  { value: "breakTime", label: "Break Time" },
  { value: "absentTime", label: "Absent Time" },
  { value: "overtimeBeforeTime", label: "Overtime Before Time" },
  { value: "overtimeAfterTime", label: "Overtime After Time" },
  { value: "shortExcessTime", label: "Short Excess Time" },
] as const;

export function AttendanceProgressSummary({
  initialData,
  employees,
  departments: initialDepartments,
  newItemId,
}: AttendanceProgressSummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params or defaults
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    searchParams.get("employeeId") || "all"
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    searchParams.get("departmentId") || "all"
  );
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<string>(
    searchParams.get("subDepartmentId") || "all"
  );
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    COLUMN_OPTIONS.map((col) => col.value)
  );
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);

  const getInitialDateRange = (): DateRange => {
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    return {
      from: dateFrom
        ? new Date(dateFrom)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: dateTo ? new Date(dateTo) : new Date(),
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());

  // Update URL params when filters change to trigger server refetch
  const updateFilters = (updates: {
    employeeId?: string;
    departmentId?: string;
    subDepartmentId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.employeeId !== undefined) {
      if (updates.employeeId === "all") {
        params.delete("employeeId");
      } else {
        params.set("employeeId", updates.employeeId);
      }
    }

    if (updates.departmentId !== undefined) {
      if (updates.departmentId === "all") {
        params.delete("departmentId");
      } else {
        params.set("departmentId", updates.departmentId);
      }
    }

    if (updates.subDepartmentId !== undefined) {
      if (updates.subDepartmentId === "all") {
        params.delete("subDepartmentId");
      } else {
        params.set("subDepartmentId", updates.subDepartmentId);
      }
    }

    if (updates.dateFrom) {
      params.set("dateFrom", updates.dateFrom.toISOString());
    }

    if (updates.dateTo) {
      params.set("dateTo", updates.dateTo.toISOString());
    }

    router.push(`/dashboard/attendance/summary?${params.toString()}`);
  };

  // Fetch sub-departments when department changes
  useEffect(() => {
    if (selectedDepartment === "all" || !selectedDepartment) {
      setSubDepartments([]);
      setSelectedSubDepartment("all");
      return;
    }

    const fetchSubDepartments = async () => {
      try {
        setLoadingSubDepartments(true);
        const result = await getSubDepartmentsByDepartment(selectedDepartment);
        if (result.status && result.data) {
          setSubDepartments(result.data);
        }
      } catch (error) {
        console.error("Error fetching sub-departments:", error);
      } finally {
        setLoadingSubDepartments(false);
      }
    };

    fetchSubDepartments();
  }, [selectedDepartment]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = initialData;

    if (selectedEmployeeId !== "all") {
      const selectedEmployee = employees.find(
        (e) => e.id === selectedEmployeeId
      );
      if (selectedEmployee) {
        filtered = filtered.filter(
          (item) => item.employeeId === selectedEmployee.employeeId
        );
      }
    }

    if (selectedDepartment !== "all") {
      const selectedDept = initialDepartments.find(
        (d) => d.id === selectedDepartment
      );
      if (selectedDept) {
        filtered = filtered.filter(
          (item) => item.department === selectedDept.id
        );
      }
    }

    if (selectedSubDepartment !== "all" && selectedSubDepartment) {
      filtered = filtered.filter(
        (item) => item.subDepartment === selectedSubDepartment
      );
    }

    return filtered;
  }, [
    initialData,
    selectedEmployeeId,
    selectedDepartment,
    selectedSubDepartment,
    employees,
    initialDepartments,
  ]);

  // Transform data for DataTable
  const data: AttendanceProgressRow[] = filteredData.map((item, index) => ({
    ...item,
    id: item.id || `row-${index}`,
    sNo: index + 1,
  }));

  // Prepare filter options
  const employeeOptions = [
    { value: "all", label: "All Employees" },
    ...employees.map((emp) => ({
      value: emp.id,
      label: `${emp.employeeName} (${emp.employeeId})`,
    })),
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    ...initialDepartments.map((dept) => ({
      value: dept.id,
      label: dept.name,
    })),
  ];

  const subDepartmentOptions = [
    { value: "all", label: "All Sub Departments" },
    ...subDepartments.map((subDept) => ({
      value: subDept.id,
      label: subDept.name,
    })),
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            View Employee Attendance Progress Summary
          </h2>
          <p className="text-muted-foreground">
            View detailed attendance progress for employees
          </p>
        </div>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          {/* <CardTitle>Filters</CardTitle>
          <CardDescription>Filter attendance data by employee, department, date range, and columns</CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 max-w-3xl">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Autocomplete
                options={employeeOptions}
                value={selectedEmployeeId}
                onValueChange={(value) => {
                  const newValue = value || "all";
                  setSelectedEmployeeId(newValue);
                  updateFilters({ employeeId: newValue });
                  if (value && value !== "all") {
                    const selectedEmployee = employees.find(
                      (e) => e.id === value
                    );
                    if (selectedEmployee && selectedEmployee.department) {
                      setSelectedDepartment(selectedEmployee.department);
                      updateFilters({
                        employeeId: newValue,
                        departmentId: selectedEmployee.department,
                      });
                    }
                  }
                }}
                placeholder="Select employee"
                searchPlaceholder="Search employee..."
                emptyMessage="No employees found"
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Autocomplete
                options={departmentOptions}
                value={selectedDepartment}
                onValueChange={(value) => {
                  setSelectedDepartment(value || "all");
                  setSelectedSubDepartment("all");
                }}
                placeholder="Select department"
                searchPlaceholder="Search department..."
                emptyMessage="No departments found"
              />
            </div>

            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Autocomplete
                options={subDepartmentOptions}
                value={selectedSubDepartment}
                onValueChange={(value) => {
                  const newValue = value || "all";
                  setSelectedSubDepartment(newValue);
                  updateFilters({ subDepartmentId: newValue });
                }}
                placeholder={
                  selectedDepartment === "all"
                    ? "Select department first"
                    : "Select sub department"
                }
                searchPlaceholder="Search sub department..."
                emptyMessage="No sub departments found"
                disabled={selectedDepartment === "all" || loadingSubDepartments}
                isLoading={loadingSubDepartments}
              />
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
                    updateFilters({
                      dateFrom: values.range.from,
                      dateTo: values.range.to,
                    });
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Columns</Label>
            <Popover
              open={columnPopoverOpen}
              onOpenChange={setColumnPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedColumns.length === COLUMN_OPTIONS.length
                    ? "All Columns Selected"
                    : `${selectedColumns.length} Column${
                        selectedColumns.length !== 1 ? "s" : ""
                      } Selected`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Label className="text-sm font-semibold">
                      Select Columns
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (selectedColumns.length === COLUMN_OPTIONS.length) {
                          setSelectedColumns([]);
                        } else {
                          setSelectedColumns(
                            COLUMN_OPTIONS.map((col) => col.value)
                          );
                        }
                      }}
                    >
                      {selectedColumns.length === COLUMN_OPTIONS.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 p-2">
                      {COLUMN_OPTIONS.map((col) => (
                        <div
                          key={col.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={col.value}
                            checked={selectedColumns.includes(col.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedColumns([
                                  ...selectedColumns,
                                  col.value,
                                ]);
                              } else {
                                setSelectedColumns(
                                  selectedColumns.filter((c) => c !== col.value)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={col.value}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {col.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-full overflow-x-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchFields={[
            { key: "employeeName", label: "Employee" },
            { key: "employeeId", label: "Employee ID" },
          ]}
        />
      </div>
    </div>
  );
}
