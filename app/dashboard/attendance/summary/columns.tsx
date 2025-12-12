"use client";

import { ColumnDef } from "@tanstack/react-table";

export interface AttendanceProgressRow {
  id: string;
  sNo: number;
  employeeId: string;
  employeeName: string;
  department: string;
  departmentName?: string;
  subDepartment?: string;
  subDepartmentName?: string;
  designation?: string;
  designationName?: string;
  days: number;
  scheduleDays: number;
  offDays: number;
  present: number;
  presentOnHoliday: number;
  leaves: number;
  absents: number;
  late: number;
  halfDay: number;
  shortDays: number;
  scheduleTime: string;
  actualWorkedTime: string;
  breakTime: string;
  absentTime: string;
  overtimeBeforeTime: string;
  overtimeAfterTime: string;
  shortExcessTime: string;
}

export const columns: ColumnDef<AttendanceProgressRow>[] = [
  {
    accessorKey: "sNo",
    header: "S.no",
    size: 60,
  },
  {
    accessorKey: "employee",
    header: "Employee",
    cell: ({ row }) => {
      const employeeName = row.original.employeeName || "-";
      return (
        <div className="font-medium">{employeeName}</div>
      );
    },
    size: 150,
  },
  {
    accessorKey: "empDetail",
    header: "Emp Detail",
    cell: ({ row }) => {
      const employeeId = row.original.employeeId || "-";
      const department = row.original.departmentName || "-";
      const designation = row.original.designationName || "-";
      return (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">ID: {employeeId}</div>
          <div className="text-xs text-muted-foreground">{department}</div>
          <div className="text-xs text-muted-foreground">{designation}</div>
        </div>
      );
    },
    size: 180,
  },
  {
    accessorKey: "days",
    header: "Days",
    cell: ({ row }) => row.original.days || "0",
    size: 80,
  },
  {
    accessorKey: "scheduleDays",
    header: "Schedule Days",
    cell: ({ row }) => row.original.scheduleDays || "0",
    size: 120,
  },
  {
    accessorKey: "offDays",
    header: "Off Days",
    cell: ({ row }) => row.original.offDays || "0",
    size: 100,
  },
  {
    accessorKey: "present",
    header: "Present",
    cell: ({ row }) => row.original.present || "0",
    size: 100,
  },
  {
    accessorKey: "presentOnHoliday",
    header: "Present On Holiday",
    cell: ({ row }) => row.original.presentOnHoliday || "0",
    size: 140,
  },
  {
    accessorKey: "leaves",
    header: "Leaves",
    cell: ({ row }) => row.original.leaves || "0",
    size: 100,
  },
  {
    accessorKey: "absents",
    header: "Absents",
    cell: ({ row }) => row.original.absents || "0",
    size: 100,
  },
  {
    accessorKey: "late",
    header: "Late",
    cell: ({ row }) => row.original.late || "0",
    size: 80,
  },
  {
    accessorKey: "halfDay",
    header: "Half Day",
    cell: ({ row }) => row.original.halfDay || "0",
    size: 100,
  },
  {
    accessorKey: "shortDays",
    header: "Short Days",
    cell: ({ row }) => row.original.shortDays || "0",
    size: 110,
  },
  {
    accessorKey: "scheduleTime",
    header: "Schedule Time",
    cell: ({ row }) => row.original.scheduleTime || "0h",
    size: 120,
  },
  {
    accessorKey: "actualWorkedTime",
    header: "Actual Worked Time",
    cell: ({ row }) => row.original.actualWorkedTime || "0h",
    size: 150,
  },
  {
    accessorKey: "breakTime",
    header: "Break Time",
    cell: ({ row }) => row.original.breakTime || "0h",
    size: 110,
  },
  {
    accessorKey: "absentTime",
    header: "Absent Time",
    cell: ({ row }) => row.original.absentTime || "0h",
    size: 120,
  },
  {
    accessorKey: "overtimeBeforeTime",
    header: "Overtime Before Time",
    cell: ({ row }) => row.original.overtimeBeforeTime || "0h",
    size: 160,
  },
  {
    accessorKey: "overtimeAfterTime",
    header: "Overtime After Time",
    cell: ({ row }) => row.original.overtimeAfterTime || "0h",
    size: 150,
  },
  {
    accessorKey: "shortExcessTime",
    header: "Short Excess Time",
    cell: ({ row }) => row.original.shortExcessTime || "0h",
    size: 140,
  },
];

