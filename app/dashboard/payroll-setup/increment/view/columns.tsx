"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Eye, FileText } from "lucide-react";

export interface IncrementRow {
  id: string;
  sNo: number;
  empId: string;
  empName: string;
  department: string;
  subDepartment: string;
  designation: string;
  increment: string;
  salary: string;
  date: string;
  status: string;
}

export const columns: ColumnDef<IncrementRow>[] = [
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
    accessorKey: "employee",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Emp ID
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.empId}</div>
    ),
    size: 100,
  },
  {
    accessorKey: "empName",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Emp Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.empName}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "departmentInfo",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Dept / Subdept
      </div>
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="text-sm">{row.original.department || "-"}</div>
        <div className="text-sm text-muted-foreground">{row.original.subDepartment || "-"}</div>
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: "designation",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Designation
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.designation}</div>
    ),
    size: 180,
  },
  {
    accessorKey: "increment",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Increment
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.increment}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "salary",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Salary
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.salary}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "date",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Date
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.date}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "status",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Status
      </div>
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === "Active" || status === "Approved"
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
    size: 100,
  },
  {
    id: "download",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Download
      </div>
    ),
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          // Handle download
          console.log("Download", row.original.id);
        }}
      >
        <FileText className="h-4 w-4 text-destructive" />
      </Button>
    ),
    size: 100,
  },
  {
    id: "view",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        View
      </div>
    ),
    cell: ({ row }) => (
      <Button
        variant="link"
        size="sm"
        onClick={() => {
          // Handle view
          console.log("View", row.original.id);
        }}
      >
        View
      </Button>
    ),
    size: 80,
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

