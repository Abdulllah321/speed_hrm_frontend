"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { AttendanceExemptionRow } from "./attendance-exemptions-list";
import { format } from "date-fns";

const statusVariant = (status: string): "default" | "secondary" | "destructive" => {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
};

const formatDate = (date: string): string => {
  try {
    return format(new Date(date), "MMM dd, yyyy");
  } catch {
    return date;
  }
};

export const columns: ColumnDef<AttendanceExemptionRow>[] = [
  {
    accessorKey: "sNo",
    header: "S.No",
    size: 60,
  },
  {
    accessorKey: "employeeName",
    header: "Employee",
    cell: ({ row }) => {
      const employeeName = row.original.employeeName || "-";
      const employeeId = row.original.employeeId || "";
      return (
        <div>
          <div className="font-medium">{employeeName}</div>
          {employeeId && <div className="text-xs text-muted-foreground">{employeeId}</div>}
        </div>
      );
    },
    size: 150,
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => {
      return row.original.department || "-";
    },
    size: 120,
  },
  {
    accessorKey: "subDepartment",
    header: "Sub Department",
    cell: ({ row }) => {
      return row.original.subDepartment || "-";
    },
    size: 140,
  },
  {
    accessorKey: "attendanceDate",
    header: "Attendance Date",
    cell: ({ row }) => {
      return formatDate(row.original.attendanceDate);
    },
    size: 140,
  },
  {
    accessorKey: "flagType",
    header: "Flag Type",
    cell: ({ row }) => {
      return row.original.flagType || "-";
    },
    size: 120,
  },
  {
    accessorKey: "exemptionType",
    header: "Exemption Type",
    cell: ({ row }) => {
      return row.original.exemptionType || "-";
    },
    size: 150,
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      const reason = row.original.reason || "-";
      return (
        <div className="max-w-[300px] truncate" title={reason}>
          {reason}
        </div>
      );
    },
    size: 200,
  },
  {
    accessorKey: "approvalStatus",
    header: "Approval Status",
    cell: ({ row }) => {
      return (
        <Badge variant={statusVariant(row.original.approvalStatus)}>
          {row.original.approvalStatus}
        </Badge>
      );
    },
    size: 120,
  },
];

