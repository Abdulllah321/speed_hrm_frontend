"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ChevronDown } from "lucide-react";

export interface DeductionRow {
  id: string;
  sNo: number;
  empId: string;
  empName: string;
  department: string;
  subDepartment: string;
  deductionType: string;
  deduction: string;
  monthYear: string;
  status: string;
}

export const columns: ColumnDef<DeductionRow>[] = [
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
        EMP ID / Employee Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="text-sm font-medium">{row.original.empId}</div>
        <div className="text-sm text-muted-foreground">{row.original.empName}</div>
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "departmentInfo",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Department / Sub Department
      </div>
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="text-sm">{row.original.department || "-"}</div>
        <div className="text-sm text-muted-foreground">{row.original.subDepartment || "-"}</div>
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "deductionType",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Deduction Type
      </div>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium">
        {row.original.deductionType}
      </Badge>
    ),
    size: 130,
  },
  {
    accessorKey: "deduction",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Deduction
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.deduction}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "monthYear",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Month-Year
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.monthYear}</div>
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

