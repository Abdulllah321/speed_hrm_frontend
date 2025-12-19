"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export interface AdvanceSalaryRow {
  id: string;
  sNo: number;
  empId: string;
  empName: string;
  amountNeeded: number;
  salaryNeedOn: string;
  deductionMonthYear: string;
  approval1: string;
  status: string;
}

export const columns: ColumnDef<AdvanceSalaryRow>[] = [
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
    accessorKey: "empId",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        EMP ID
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
        Employee Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.empName}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "amountNeeded",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Amount Needed
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold">
        {new Intl.NumberFormat("en-PK", {
          style: "currency",
          currency: "PKR",
          minimumFractionDigits: 0,
        }).format(row.original.amountNeeded)}
      </div>
    ),
    size: 130,
  },
  {
    accessorKey: "salaryNeedOn",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Salary Need On
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.salaryNeedOn}</div>
    ),
    size: 130,
  },
  {
    accessorKey: "deductionMonthYear",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Deduction Month/year
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.deductionMonthYear}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "approval1",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Approval 1
      </div>
    ),
    cell: ({ row }) => {
      const approval = row.original.approval1;
      const variant =
        approval === "Approved"
          ? "default"
          : approval === "Pending"
          ? "secondary"
          : "destructive";
      return (
        <Badge variant={variant} className="font-medium">
          {approval}
        </Badge>
      );
    },
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

