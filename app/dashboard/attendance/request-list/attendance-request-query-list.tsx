"use client";

import { useState, useMemo } from "react";
import DataTable from "@/components/common/data-table";
import { columns, AttendanceRequestQueryRow } from "./columns";
import { AttendanceRequestQuery } from "@/lib/actions/attendance-request-query";
import type { Employee } from "@/lib/actions/exit-clearance";

interface AttendanceRequestQueryListProps {
  initialQueries: AttendanceRequestQuery[];
  employees: Employee[];
  newItemId?: string;
}

export function AttendanceRequestQueryList({
  initialQueries,
  employees,
  newItemId,
}: AttendanceRequestQueryListProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Get unique departments from both employees and requests
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    // Add departments from employees
    employees.forEach((emp) => {
      if (emp.department) deptSet.add(emp.department);
    });
    // Add departments from requests (in case employee is removed but request exists)
    initialQueries.forEach((query) => {
      if (query.department) deptSet.add(query.department);
    });
    return Array.from(deptSet).sort();
  }, [employees, initialQueries]);

  // Filter employees based on selected department
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === "all") {
      return employees;
    }
    return employees.filter((emp) => emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Handle filter changes from DataTable
  const handleFilterChange = (key: string, value: string) => {
    if (key === "department") {
      setSelectedDepartment(value);
    }
  };

  // Transform data for DataTable
  const data: AttendanceRequestQueryRow[] = initialQueries.map((query, index) => ({
    ...query,
    id: query.id,
    sNo: index + 1,
  }));

  // Prepare filter options for DataTable
  // Department filter options
  const departmentOptions = [
    { value: "all", label: "All Departments" },
    ...departments.map((dept) => ({ value: dept, label: dept })),
  ];

  // Employee filter options - filtered by selected department
  const employeeOptions = useMemo(() => {
    return [
      { value: "all", label: "All Employees" },
      ...filteredEmployees.map((emp) => ({
        value: emp.id,
        label: `${emp.employeeName} (${emp.employeeId})`,
      })),
    ];
  }, [filteredEmployees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Request Queries</h2>
          <p className="text-muted-foreground">Manage employee attendance correction requests</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        newItemId={newItemId}
        searchFields={[
          { key: "employeeName", label: "Employee" },
          { key: "query", label: "Query" },
          { key: "department", label: "Department" },
          { key: "subDepartment", label: "Sub Department" },
        ]}
        filters={[
          {
            key: "department",
            label: "Department",
            options: departmentOptions,
          },
          {
            key: "employeeId",
            label: "Employee",
            options: employeeOptions,
          }
        ]}
        onFilterChange={handleFilterChange}
        resetFilterKey={selectedDepartment}
      />
    </div>
  );
}

