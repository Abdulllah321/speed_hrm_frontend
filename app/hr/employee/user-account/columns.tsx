"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  roleName: string;
  employeeName: string;
  department: string;
  designation: string;
  status: string;
}

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "employeeName",
    header: "Employee Name",
  },
  {
    accessorKey: "email",
    header: "Email / Username",
  },
  {
    accessorKey: "roleName",
    header: "Assigned Role",
    cell: ({ row }) => {
        return row.original.roleName ? <Badge variant="outline">{row.original.roleName}</Badge> : <span className="text-muted-foreground text-sm">No Role</span>;
    }
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
    accessorKey: "designation",
    header: "Designation",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      return <Badge variant={row.original.status === 'active' ? "default" : "destructive"}>{row.original.status}</Badge>;
    },
  },
];
