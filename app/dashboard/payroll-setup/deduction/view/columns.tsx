"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import type { Deduction } from "@/lib/actions/deduction";

export interface DeductionRow {
  id: string;
  sNo: number;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  subDepartment: string;
  deductionHeadId: string;
  deductionHeadName: string;
  amount: number;
  month: string;
  year: string;
  monthYear: string;
  isTaxable: boolean;
  taxPercentage: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

const formatMonthYear = (month: string, year: string) => {
  if (!month || !year) return "—";
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthIndex = parseInt(month) - 1;
  return `${monthNames[monthIndex] || month} ${year}`;
};

export const columns: ColumnDef<DeductionRow>[] = [
  {
    accessorKey: "sNo",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        S.No
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium text-muted-foreground w-12 text-center">
        {row.original.sNo}
      </div>
    ),
    size: 60,
    enableHiding: false,
  },
  {
    accessorKey: "employee",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Employee
      </div>
    ),
    cell: ({ row }) => (
      <div className="space-y-0.5 min-w-[180px]">
        <div className="text-sm font-semibold">{row.original.employeeName}</div>
        <div className="text-xs text-muted-foreground">ID: {row.original.employeeCode}</div>
      </div>
    ),
    size: 200,
    enableSorting: true,
  },
  {
    accessorKey: "departmentInfo",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Department
      </div>
    ),
    cell: ({ row }) => (
      <div className="space-y-0.5 min-w-[160px]">
        <div className="text-sm">{row.original.department || "—"}</div>
        {row.original.subDepartment && (
          <div className="text-xs text-muted-foreground">{row.original.subDepartment}</div>
        )}
      </div>
    ),
    size: 180,
    enableSorting: true,
  },
  {
    accessorKey: "deductionHeadName",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Deduction Type
      </div>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium">
        {row.original.deductionHeadName}
      </Badge>
    ),
    size: 150,
    enableSorting: true,
  },
  {
    accessorKey: "amount",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">
        Amount
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-right text-destructive">
        {new Intl.NumberFormat("en-PK", {
          style: "currency",
          currency: "PKR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(row.original.amount))}
      </div>
    ),
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: "taxInfo",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Tax Info
      </div>
    ),
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <Badge variant={row.original.isTaxable ? "default" : "secondary"} className="text-xs">
          {row.original.isTaxable ? "Taxable" : "Non-Taxable"}
        </Badge>
        {row.original.isTaxable && row.original.taxPercentage && (
          <div className="text-xs text-muted-foreground">
            {Number(row.original.taxPercentage).toFixed(2)}%
          </div>
        )}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "monthYear",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Month-Year
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatMonthYear(row.original.month, row.original.year)}
      </div>
    ),
    size: 120,
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Status
      </div>
    ),
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase() || "active";
      const variant =
        status === "active"
          ? "default"
          : status === "inactive"
          ? "secondary"
          : "destructive";
      return (
        <Badge variant={variant} className="font-medium capitalize">
          {row.original.status || "Active"}
        </Badge>
      );
    },
    size: 100,
    enableSorting: true,
  },
  {
    accessorKey: "notes",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Notes
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={row.original.notes || ""}>
        {row.original.notes || "—"}
      </div>
    ),
    size: 200,
  },
  {
    id: "actions",
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Actions
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // Handle edit action
                console.log("Edit", row.original.id);
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // Handle delete action
                console.log("Delete", row.original.id);
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    size: 80,
    enableHiding: false,
  },
];
