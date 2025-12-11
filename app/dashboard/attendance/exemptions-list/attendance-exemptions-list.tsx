"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import DataTable from "@/components/common/data-table";
import { columns, AttendanceExemptionRow } from "./columns";
import type { Employee } from "@/lib/actions/employee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export interface AttendanceExemption {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment?: string;
  attendanceDate: string;
  flagType: string;
  exemptionType: string;
  reason: string;
  approvalStatus: string;
  createdAt: string;
}

interface AttendanceExemptionsListProps {
  initialExemptions: AttendanceExemption[];
  employees: Employee[];
  newItemId?: string;
}

export function AttendanceExemptionsList({
  initialExemptions,
  employees,
  newItemId,
}: AttendanceExemptionsListProps) {
  const router = useRouter();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<string>("all");

  // Get unique departments and sub-departments from employees
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) deptSet.add(emp.department);
    });
    return Array.from(deptSet).sort();
  }, [employees]);

  const subDepartments = useMemo(() => {
    const subDeptSet = new Set<string>();
    employees.forEach((emp) => {
      if (emp.subDepartment) subDeptSet.add(emp.subDepartment);
    });
    return Array.from(subDeptSet).sort();
  }, [employees]);

  // Handle employee selection - auto-populate department and sub-department
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId === "all") {
      setSelectedDepartment("all");
      setSelectedSubDepartment("all");
    } else {
      const selectedEmployee = employees.find((e) => e.id === employeeId);
      if (selectedEmployee) {
        setSelectedDepartment(selectedEmployee.department || "all");
        setSelectedSubDepartment(selectedEmployee.subDepartment || "all");
      }
    }
  };

  // Filter exemptions based on selected filters
  const filteredExemptions = useMemo(() => {
    let filtered = initialExemptions;

    if (selectedEmployeeId !== "all") {
      const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
      if (selectedEmployee) {
        filtered = filtered.filter((ex) => ex.employeeId === selectedEmployee.employeeId);
      }
    }

    if (selectedDepartment !== "all") {
      filtered = filtered.filter((ex) => ex.department === selectedDepartment);
    }

    if (selectedSubDepartment !== "all") {
      filtered = filtered.filter((ex) => ex.subDepartment === selectedSubDepartment);
    }

    return filtered;
  }, [initialExemptions, selectedEmployeeId, selectedDepartment, selectedSubDepartment, employees]);

  // Transform data for DataTable
  const data: AttendanceExemptionRow[] = filteredExemptions.map((exemption, index) => ({
    ...exemption,
    id: exemption.id,
    sNo: index + 1,
  }));

  const handleToggle = () => {
    router.push("/dashboard/attendance/exemptions");
  };

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
    ...departments.map((dept) => ({ value: dept, label: dept })),
  ];

  const subDepartmentOptions = [
    { value: "all", label: "All Sub Departments" },
    ...subDepartments.map((subDept) => ({ value: subDept, label: subDept })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Exemptions</h2>
          <p className="text-muted-foreground">Manage employee attendance exemption requests</p>
        </div>
        <Link href="/dashboard/attendance/exemptions">
          <Button><Plus className="h-4 w-4 mr-2" />Create Exemption</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter exemptions by employee, department, or sub-department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Select value={selectedSubDepartment} onValueChange={setSelectedSubDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-department" />
                </SelectTrigger>
                <SelectContent>
                  {subDepartmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data}
        toggleAction={handleToggle}
        actionText="Create Exemption"
        newItemId={newItemId}
        searchFields={[
          { key: "employeeName", label: "Employee" },
          { key: "reason", label: "Reason" },
        ]}
      />
    </div>
  );
}

