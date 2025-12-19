"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

export interface AllowanceRow {
  id: string;
  sNo: number;
  empId: string;
  empName: string;
  department: string;
  subDepartment: string;
  allowanceType: string;
  monthlyRecurring: string;
  monthYear: string;
  amount: number;
  status: string;
}

export const columns: ColumnDef<AllowanceRow>[] = [
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
        Emp Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.original.empName}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "department",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Department
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.department || "-"}</div>
    ),
    size: 130,
  },
  {
    accessorKey: "subDepartment",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sub Department
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.subDepartment || "-"}</div>
    ),
    size: 130,
  },
  {
    accessorKey: "allowanceType",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Allowance Type
      </div>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium">
        {row.original.allowanceType}
      </Badge>
    ),
    size: 130,
  },
  {
    accessorKey: "monthlyRecurring",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Monthly/Recurring
      </div>
    ),
    cell: ({ row }) => (
      <Badge
        variant={row.original.monthlyRecurring === "Monthly" ? "default" : "secondary"}
        className="font-medium"
      >
        {row.original.monthlyRecurring}
      </Badge>
    ),
    size: 140,
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
    accessorKey: "amount",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Amount
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold">
        {new Intl.NumberFormat("en-PK", {
          style: "currency",
          currency: "PKR",
          minimumFractionDigits: 0,
        }).format(row.original.amount)}
      </div>
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
        Actions
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Handle edit action
            console.log("Edit", row.original.id);
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Handle delete action
            console.log("Delete", row.original.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),
    size: 100,
  },
];

