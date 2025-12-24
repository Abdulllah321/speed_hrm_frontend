"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { RebateNature } from "@/lib/actions/rebate-nature";

export type RebateNatureRow = RebateNature;

export const columns: ColumnDef<RebateNatureRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "maxInvestmentPercentage",
    header: "Max %",
    cell: ({ row }) => {
      const val = row.getValue("maxInvestmentPercentage") as number | null;
      return val ? `${val}%` : "-";
    },
  },
  {
    accessorKey: "maxInvestmentAmount",
    header: "Max Amount",
    cell: ({ row }) => {
      const val = row.getValue("maxInvestmentAmount") as number | null;
      return val ? val.toLocaleString() : "-";
    },
  },
  {
    accessorKey: "isAgeDependent",
    header: "Age Dependent",
    cell: ({ row }) => (row.getValue("isAgeDependent") ? "Yes" : "No"),
  },
  {
    accessorKey: "status",
    header: "Status",
     cell: ({ row }) => (
      <span className={`capitalize ${row.original.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
        {row.original.status}
      </span>
    ),
  },
];
