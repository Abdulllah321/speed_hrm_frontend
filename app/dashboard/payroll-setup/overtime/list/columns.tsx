"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";

export interface OvertimeRow {
  id: string;
  sNo: number;
  employeeName: string;
  overtimeType: string;
  weekdayOvertimeHours: number;
  holidayOvertimeHours: number;
  date: string;
  approval1: string;
}

export const columns: ColumnDef<OvertimeRow>[] = [
  {
    accessorKey: "sNo",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        S.No
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium text-muted-foreground w-8">
        {row.original.sNo}
      </div>
    ),
    size: 60,
  },
  {
    accessorKey: "employeeName",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Employee Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.employeeName}</div>
    ),
    size: 180,
  },
  {
    accessorKey: "overtimeType",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Overtime Type
      </div>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium">
        {row.original.overtimeType}
      </Badge>
    ),
    size: 130,
  },
  {
    accessorKey: "weekdayOvertimeHours",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Weekday Overtime Hours
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.original.weekdayOvertimeHours.toFixed(2)}
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "holidayOvertimeHours",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Holiday Overtime Hours
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.original.holidayOvertimeHours.toFixed(2)}
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "date",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Date
      </div>
    ),
    cell: ({ row }) => {
      try {
        const date = new Date(row.original.date);
        return (
          <div className="text-sm">
            {format(date, "dd-MMM-yyyy")}
          </div>
        );
      } catch {
        return <div className="text-sm">{row.original.date}</div>;
      }
    },
    size: 120,
  },
  {
    accessorKey: "approval1",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Approval 1
      </div>
    ),
    cell: ({ row }) => {
      const status = row.original.approval1;
      const variant =
        status === "Approved"
          ? "default"
          : status === "Pending"
          ? "secondary"
          : "destructive";
      return (
        <Badge variant={variant} className="font-medium">
          {status}
        </Badge>
      );
    },
    size: 120,
  },
  {
    id: "actions",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Action
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Handle action dropdown
            console.log("Action", row.original.id);
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    ),
    size: 100,
  },
];

